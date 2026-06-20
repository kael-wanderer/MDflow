import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import { initActivityBar } from "./activitybar";
import {
  DEFAULT_AI_SETTINGS_JSON,
  extractLegacyKeys,
  parseAISettings,
  type AISettings,
} from "./ai/aisettings";
import { createAIPanel, type AIPanel } from "./ai/panel";
import { showComparison } from "./compareview";
import { showContextMenu, type MenuItem } from "./contextmenu";
import { initExplorer, openFolder, setExplorerActivePath } from "./explorer";
import { revealExplorerPath } from "./explorer";
import {
  getInitialFile,
  openFile,
  pickExportPath,
  pickSavePath,
  writeFile,
} from "./files";
import {
  getAISettingsFile,
  getSettingsFile,
  listFilesRecursive,
  pickFolder,
  copyText,
  revealInFinder,
} from "./filesys";
import { createPalette, type PaletteItem } from "./palette";
import { breadcrumbsPath, joinPath, relativePath } from "./paths";
import { renderPdf } from "./pdfview";
import { isExcalidrawFile, isHtmlFile, isMindmapFile } from "./document-kind";
import type { EditorDocumentKind, SoftWrapMode } from "./editor";
import {
  exportOptionsFor,
  type ExportFormat,
  type ExportItem,
} from "./export-options";
import { initResize } from "./resize";
import {
  applySettings,
  DEFAULT_SETTINGS_JSON,
  normalizeThemeName,
  parseSettings,
  type Settings,
} from "./settings";
import { createSettingsPanel } from "./settingspanel";
import { checkForUpdates, startDailyUpdateChecks } from "./updater";
import { loadState, saveState, type ViewMode } from "./state";
import { getState, refreshDir, setState, subscribe, getWindow, mainWindow, activeWindow, patchWindow } from "./store";
import {
  nextActiveAfterClose,
  otherTabIds,
  savedTabIds,
  tabIdsRightOf,
  type TabMeta,
} from "./tabops";
import { findTabByPath } from "./windowops";
import { createWindowView, type WindowView } from "./windowview";
import helpDoc from "../HELP.md?raw";

const windowsHost = document.getElementById("windows")!;

const startupUi = loadState();
let ui = { ...startupUi };
let currentSettings = parseSettings("{}");
let settingsPath = "";
let aiSettingsPath = "";
let currentAISettings: AISettings = parseAISettings("{}");
let aiPanel: AIPanel | null = null;
let fileList: string[] = [];
let indexedFolder: string | null = null;
let tabSeq = 0;
const nextId = () => `t${++tabSeq}`;

function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

function editorKind(pathOrName: string | null): EditorDocumentKind {
  if (isExcalidrawFile(pathOrName) || isMindmapFile(pathOrName)) return "plain";
  return isHtmlFile(pathOrName) ? "html" : "markdown";
}

const views = new Map<string, WindowView>();

async function loadSettings(): Promise<void> {
  try {
    const file = await getSettingsFile(DEFAULT_SETTINGS_JSON);
    settingsPath = file.path;
    currentSettings = parseSettings(file.contents);
  } catch {
    currentSettings = parseSettings("{}");
  }
  applySettings(currentSettings);
  applySoftWrap();
  syncViewMenu();
}

async function loadAISettings(): Promise<void> {
  try {
    const file = await getAISettingsFile(DEFAULT_AI_SETTINGS_JSON);
    aiSettingsPath = file.path;
    const { cleaned, keys } = extractLegacyKeys(file.contents);
    if (keys.length) {
      for (const { id, secret } of keys) {
        try {
          await invoke("set_secret", { id, secret });
        } catch {
          /* Leave the plaintext key for a later migration attempt. */
        }
      }
      const stored = await Promise.all(
        keys.map(({ id }) => invoke<boolean>("has_secret", { id })),
      );
      if (stored.every(Boolean)) {
        await writeFile(aiSettingsPath, cleaned);
        currentAISettings = parseAISettings(cleaned);
      } else {
        currentAISettings = parseAISettings(file.contents);
      }
    } else {
      if (cleaned !== file.contents) {
        await writeFile(aiSettingsPath, cleaned);
      }
      currentAISettings = parseAISettings(cleaned);
    }
    aiPanel?.render();
  } catch {
    aiSettingsPath = "";
    currentAISettings = parseAISettings("{}");
  }
}

async function refreshFileList(): Promise<void> {
  const folder = getState().folder;
  fileList = folder ? await listFilesRecursive(folder).catch(() => []) : [];
}

function openSettings(): void {
  if (settingsPath) void doOpenPath(settingsPath);
}

function openAISettings(): void {
  if (aiSettingsPath) void doOpenPath(aiSettingsPath);
}

function saveSettingsFromPanel(settings: Settings): void {
  currentSettings = settings;
  applySettings(currentSettings);
  applySoftWrap();
  syncViewMenu();
  requestWindowMeasure();
  if (settingsPath) {
    void writeFile(settingsPath, JSON.stringify(settings, null, 2));
  }
}

function saveAISettingsFromPanel(settings: AISettings): void {
  currentAISettings = settings;
  aiPanel?.render();
  if (aiSettingsPath) {
    void writeFile(aiSettingsPath, JSON.stringify(settings, null, 2));
  }
}

function commandItems(): PaletteItem[] {
  const command = (
    id: string,
    label: string,
    run: () => void,
  ): PaletteItem => ({ id, label, kind: "command", run });
  const activeWindowId = (): string => getState().activeWindowId;

  return [
    command("new", "New File", newDoc),
    command("open", "Open File…", () => void doOpen()),
    command("openFolder", "Open Folder…", () => {
      void pickFolder().then(async (folder) => {
        if (!folder) return;
        await openFolder(folder);
        await refreshFileList();
      });
    }),
    command("save", "Save", () => void doSave(false)),
    command("saveAs", "Save As…", () => void doSave(true)),
    command("close", "Close Tab", () => {
      const windowState = activeWindow();
      if (windowState.activeTabId) {
        void closeTab(windowState.id, windowState.activeTabId);
      }
    }),
    command("split", "View: Split", () => setMode(activeWindowId(), "split")),
    command("editor", "View: Editor", () => setMode(activeWindowId(), "editor")),
    command("read", "View: Read", () => setMode(activeWindowId(), "preview")),
    command("softwrap", "Cycle Soft Wrap", cycleSoftWrap),
    command("lines", "Toggle Line Numbers", toggleLineNumbers),
    command("sub", "Toggle Sub Window", () => void toggleSub()),
    command("explorer", "Toggle Explorer", () => {
      document.getElementById("ab-explorer")?.click();
    }),
    command("settings", "Open Settings", openSettings),
    command("help", "MDflow Help", openHelp),
  ];
}

function fileItems(): PaletteItem[] {
  const folder = getState().folder;
  if (!folder) return [];
  return fileList.map((relativePath) => ({
    id: `file:${relativePath}`,
    label: relativePath,
    kind: "file",
    run: () => void doOpenPath(joinPath(folder, relativePath)),
  }));
}

const palette = createPalette(() => [...fileItems(), ...commandItems()]);

const handlers = {
  onActivateTab: (wid: string, tid: string) => activateTab(wid, tid),
  onCloseTab: (wid: string, tid: string) => void closeTab(wid, tid),
  onTabContextMenu: (
    wid: string,
    tid: string,
    x: number,
    y: number,
  ) => showTabContextMenu(wid, tid, x, y),
  onSetMode: (wid: string, m: ViewMode) => setMode(wid, m),
  onToggleLineNumbers: () => toggleLineNumbers(),
  onToggleSub: () => toggleSub(),
  onFocusWindow: (wid: string) => {
    if (getState().activeWindowId !== wid) {
      setState({ activeWindowId: wid });
      renderAll();
    }
  },
  onDocChange: (wid: string, tid: string, text: string) => onDocChange(wid, tid, text),
};

async function closeTabs(windowId: string, tabIds: string[]): Promise<void> {
  for (const tabId of tabIds) {
    if (!(await closeTab(windowId, tabId))) break;
  }
}

function pinTab(windowId: string, tabId: string): void {
  const windowState = getWindow(windowId);
  if (!windowState) return;
  const target = windowState.tabs.find((tab) => tab.id === tabId);
  if (!target) return;
  const pinned = !target.pinned;
  const updated = { ...target, pinned };
  const rest = windowState.tabs.filter((tab) => tab.id !== tabId);
  patchWindow(windowId, {
    tabs: pinned ? [updated, ...rest] : [...rest, updated],
  });
  renderAll();
}

function showTabContextMenu(
  windowId: string,
  tabId: string,
  x: number,
  y: number,
): void {
  const windowState = getWindow(windowId);
  const tab = windowState?.tabs.find((candidate) => candidate.id === tabId);
  if (!windowState || !tab) return;
  const folder = getState().folder;
  const pathItems: MenuItem[] = tab.path
    ? [
        "separator",
        {
          label: "Copy Path",
          action: () => void copyText(tab.path!),
        },
        {
          label: "Copy Relative Path",
          action: () =>
            void copyText(folder ? relativePath(folder, tab.path!) : tab.path!),
        },
        {
          label: "Copy Breadcrumbs Path",
          action: () =>
            void copyText(breadcrumbsPath(folder, tab.path!)),
        },
      ]
    : [];
  showContextMenu(x, y, [
    ...(tab.path
      ? [
          {
            label: "Reveal in Finder",
            action: () => void revealInFinder(tab.path!),
          } satisfies MenuItem,
          {
            label: "Reveal in Explorer View",
            action: () => {
              if (!getState().explorerVisible) {
                document.getElementById("ab-explorer")?.click();
              }
              void revealExplorerPath(tab.path!);
            },
          } satisfies MenuItem,
          "separator" as const,
        ]
      : []),
    {
      label: tab.pinned ? "Unpin" : "Pin",
      action: () => pinTab(windowId, tabId),
    },
    "separator",
    {
      label: "Split Right",
      action: () =>
        void moveTabToWindow(windowId, tabId, windowId === "main" ? "sub" : "main"),
    },
    {
      label: "Split & Move",
      children: [
        {
          label: "Main Window",
          disabled: windowId === "main",
          action: () => void moveTabToWindow(windowId, tabId, "main"),
        },
        {
          label: "Sub Window",
          disabled: windowId === "sub",
          action: () => void moveTabToWindow(windowId, tabId, "sub"),
        },
      ],
    },
    "separator",
    { label: "Close", action: () => void closeTab(windowId, tabId) },
    {
      label: "Close Others",
      action: () => void closeTabs(windowId, otherTabIds(windowState.tabs, tabId)),
    },
    {
      label: "Close to the Right",
      action: () => void closeTabs(windowId, tabIdsRightOf(windowState.tabs, tabId)),
    },
    {
      label: "Close Saved",
      action: () => void closeTabs(windowId, savedTabIds(windowState.tabs)),
    },
    {
      label: "Close All",
      action: () =>
        void closeTabs(windowId, windowState.tabs.map((candidate) => candidate.id)),
    },
    ...pathItems,
  ]);
}

function makeView(windowId: string, isMain: boolean): WindowView {
  const v = createWindowView(windowsHost, windowId, isMain, handlers);
  v.setLineNumbersFlag(ui.lineNumbers);
  v.editor.setSoftWrapMode(currentSettings.softWrapMode, currentSettings.wrapColumn);
  v.editor.setLineNumbers(ui.lineNumbers);
  views.set(windowId, v);
  return v;
}

function renderAll(): void {
  for (const v of views.values()) v.render();
  document.getElementById("windows")!.classList.toggle("has-sub", getState().windows.length > 1);
  const tab = activeMeta();
  const exportButton = document.getElementById("ab-export") as HTMLButtonElement | null;
  if (exportButton) {
    exportButton.disabled =
      !tab || exportOptionsFor(tab.path ?? tab.name).length === 0;
  }
}

function requestWindowMeasure(): void {
  requestAnimationFrame(() => {
    for (const view of views.values()) view.requestMeasure();
  });
}

function activeView(): WindowView {
  return views.get(getState().activeWindowId)!;
}

function activeMeta(): TabMeta | undefined {
  const w = activeWindow();
  return w.tabs.find((t) => t.id === w.activeTabId);
}

function activateTab(windowId: string, tabId: string): void {
  setState({ activeWindowId: windowId });
  patchWindow(windowId, { activeTabId: tabId });
  const v = views.get(windowId)!;
  v.editor.switchTo(tabId);
  const text = v.editor.getText(tabId);
  const tab = getWindow(windowId)?.tabs.find((item) => item.id === tabId);
  v.renderPreview(text, tab?.path ?? tab?.name);
  syncExplorerActivePath();
  renderAll();
  v.focus();
}

function openInWindow(windowId: string, opts: { path: string | null; name: string; text: string }): void {
  if (opts.path) {
    const found = findTabByPath(getState().windows, opts.path);
    if (found) {
      activateTab(found.windowId, found.tab.id);
      return;
    }
  }
  const id = nextId();
  const w = getWindow(windowId)!;
  patchWindow(windowId, {
    tabs: [...w.tabs, { id, path: opts.path, name: opts.name, dirty: false }],
    activeTabId: id,
  });
  views
    .get(windowId)!
    .editor.openState(
      id,
      opts.text,
      editorKind(opts.path ?? opts.name),
    );
  activateTab(windowId, id);
}

async function closeTab(windowId: string, tabId: string): Promise<boolean> {
  const w = getWindow(windowId)!;
  const t = w.tabs.find((x) => x.id === tabId);
  if (!t) return true;

  if (t.dirty) {
    const approved = await confirm(`Discard unsaved changes to "${t.name}"?`, {
      title: "Close tab",
      kind: "warning",
    });
    if (!approved) return false;
  }

  const next = nextActiveAfterClose(w.tabs, tabId, w.activeTabId);
  views.get(windowId)!.editor.closeState(tabId);
  patchWindow(windowId, {
    tabs: w.tabs.filter((x) => x.id !== tabId),
    activeTabId: next,
  });

  if (next) {
    activateTab(windowId, next);
  } else {
    views.get(windowId)!.renderPreview("");
    if (windowId === getState().activeWindowId) {
      clearDocumentSurface();
    } else {
      renderAll();
    }
  }
  return true;
}

function onDocChange(windowId: string, tabId: string, text: string): void {
  const w = getWindow(windowId)!;
  const t = w.tabs.find((x) => x.id === tabId);
  if (t && !t.dirty) {
    patchWindow(windowId, {
      tabs: w.tabs.map((x) => (x.id === tabId ? { ...x, dirty: true } : x)),
    });
  }
  if (windowId === getState().activeWindowId && tabId === w.activeTabId) {
    if (isExcalidrawFile(t?.path ?? t?.name) || isMindmapFile(t?.path ?? t?.name)) return;
    schedulePreview(windowId, tabId, text);
  }
}

const timers = new Map<string, number>();
function schedulePreview(
  windowId: string,
  tabId: string,
  text: string,
): void {
  clearTimeout(timers.get(windowId));
  timers.set(
    windowId,
    window.setTimeout(() => {
      const tab = getWindow(windowId)?.tabs.find(
        (item) => item.id === tabId,
      );
      views
        .get(windowId)!
        .renderPreview(text, tab?.path ?? tab?.name);
    }, 300)
  );
}

function clearDocumentSurface(): void {
  clearTimeout(timers.get(getState().activeWindowId));
  setExplorerActivePath(null);
  renderAll();
}

function syncExplorerActivePath(): void {
  const t = activeMeta();
  setExplorerActivePath(t?.path ?? null);
}

async function showOpenError(error: unknown): Promise<void> {
  const text = error instanceof Error ? error.message : String(error);
  await message(text, { title: "Open file", kind: "error" });
}

async function doOpenPath(path: string): Promise<void> {
  if (path.toLowerCase().endsWith(".pdf")) {
    openPdf(path);
    return;
  }
  try {
    const contents = await invoke<string>("read_file", { path });
    openInWindow("main", { path, name: basename(path), text: contents });
  } catch (error) {
    await showOpenError(error);
  }
}

async function doOpen(): Promise<void> {
  try {
    const result = await openFile();
    if (result) {
      if (result.path.toLowerCase().endsWith(".pdf")) {
        openPdf(result.path);
        return;
      }
      openInWindow(getState().activeWindowId, {
        path: result.path,
        name: basename(result.path),
        text: result.contents,
      });
    }
  } catch (error) {
    await showOpenError(error);
  }
}

function openPdf(path: string): void {
  const windowId = getState().activeWindowId;
  const pane = document.querySelector<HTMLElement>(
    `.window[data-window-id="${windowId}"] .pane-preview`,
  );
  setMode(windowId, "preview");
  if (!pane) return;
  void renderPdf(pane, path).catch((error) => {
    pane.textContent =
      error instanceof Error ? error.message : String(error);
  });
}

function newDoc(): void {
  openInWindow(getState().activeWindowId, { path: null, name: "Untitled", text: "" });
}

function newBoard(kind: "excalidraw" | "mind"): void {
  const name =
    kind === "excalidraw" ? "Untitled.excalidraw" : "Untitled.mind";
  openInWindow(getState().activeWindowId, { path: null, name, text: "" });
}

async function doSave(saveAs = false): Promise<void> {
  const t = activeMeta();
  if (!t) return;
  const view = activeView();

  try {
    let target = saveAs ? null : t.path;
    if (!target) {
      target = await pickSavePath();
      if (!target) return;

      const found = findTabByPath(getState().windows, target);
      if (found) {
        await message("That file is already open in another tab.", {
          title: "Save As",
          kind: "warning",
        });
        activateTab(found.windowId, found.tab.id);
        return;
      }
    }

    const text = view.editor.getText(t.id);
    await writeFile(target, text);
    if (target === settingsPath) {
      currentSettings = parseSettings(text);
      applySettings(currentSettings);
      applySoftWrap();
      syncViewMenu();
      requestWindowMeasure();
    }
    if (target === aiSettingsPath) {
      currentAISettings = parseAISettings(text);
      aiPanel?.render();
    }
    patchWindow(getState().activeWindowId, {
      tabs: activeWindow().tabs.map((x) =>
        x.id === t.id ? { ...x, path: target, name: basename(target), dirty: false } : x
      ),
    });
    view.editor.setDocumentKind(t.id, editorKind(target));
    view.renderPreview(text, target);
    syncExplorerActivePath();
    renderAll();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    await message(text, { title: "Save file", kind: "error" });
  }
}

function exportError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function exportDocument(kind: "pdf" | "docx"): Promise<void> {
  const tab = activeMeta();
  if (!tab) return;
  const out = await pickExportPath(kind);
  if (!out) return;
  try {
    const { buildExportHtml } = await import("./export-render");
    const html = await buildExportHtml(activeView().editor.getText(tab.id), {
      rasterizeSvg: kind === "docx",
    });
    await invoke(
      kind === "pdf" ? "export_pdf_html" : "export_docx_html",
      { html, out },
    );
  } catch (error) {
    await message(exportError(error), { title: "Export", kind: "error" });
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.split(",")[1];
  if (!encoded) throw new Error("Could not encode image");
  return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
}

async function captureActive(): Promise<HTMLCanvasElement> {
  const tab = activeMeta()!;
  if (isMindmapFile(tab.path ?? tab.name) || isExcalidrawFile(tab.path ?? tab.name)) {
    const board = activeView().captureBoard();
    if (board) return board.png();
    throw new Error("The board is still loading.");
  }
  const text = activeView().editor.getText(tab.id);
  const capture = await import("./capture");
  if (isHtmlFile(tab.path ?? tab.name)) {
    return capture.htmlToCanvas(text);
  }
  const { buildExportHtml } = await import("./export-render");
  return capture.htmlToCanvas(
    await buildExportHtml(text, { rasterizeSvg: false }),
  );
}

async function activeSvg(): Promise<string> {
  const tab = activeMeta();
  if (!tab) throw new Error("No document is active.");
  const name = tab.path ?? tab.name;
  const board = activeView().captureBoard();
  if (isExcalidrawFile(name)) {
    if (board?.svg) return board.svg();
    throw new Error("The Excalidraw board is still loading.");
  }
  if (isMindmapFile(name)) {
    throw new Error("SVG export is not available for mindmaps.");
  }
  const text = activeView().editor.getText(tab.id);
  const capture = await import("./capture");
  if (isHtmlFile(name)) return capture.htmlToSvg(text);
  const { buildExportHtml } = await import("./export-render");
  return capture.htmlToSvg(
    await buildExportHtml(text, { rasterizeSvg: false }),
  );
}

async function exportImage(kind: "png" | "svg"): Promise<void> {
  if (!activeMeta()) return;
  const out = await pickExportPath(kind);
  if (!out) return;
  try {
    if (kind === "svg") {
      await invoke("save_file", { path: out, contents: await activeSvg() });
    } else {
      const canvas = await captureActive();
      const bytes = dataUrlToBytes(canvas.toDataURL("image/png"));
      await invoke("save_bytes", { path: out, bytes: Array.from(bytes) });
    }
  } catch (error) {
    await message(exportError(error), { title: "Export", kind: "error" });
  }
}

function openHelp(): void {
  openInWindow(getState().activeWindowId, { path: null, name: "MDflow Help", text: helpDoc });
}

function handleExplorerPathChange(from: string, to: string | null): void {
  const separatorMatches = (path: string): boolean =>
    path === from || path.startsWith(`${from}/`) || path.startsWith(`${from}\\`);

  const updatedWindows = getState().windows.map((w) => {
    const tabs = w.tabs.map((tab) => {
      if (!tab.path || !separatorMatches(tab.path)) return tab;
      if (to === null) {
        return { ...tab, path: null, dirty: true };
      }
      const path = `${to}${tab.path.slice(from.length)}`;
      return { ...tab, path, name: basename(path) };
    });
    return { ...w, tabs };
  });
  setState({ windows: updatedWindows });
  for (const windowState of updatedWindows) {
    const view = views.get(windowState.id);
    if (!view) continue;
    for (const tab of windowState.tabs) {
      view.editor.setDocumentKind(
        tab.id,
        editorKind(tab.path ?? tab.name),
      );
    }
    const activeTab = windowState.tabs.find(
      (tab) => tab.id === windowState.activeTabId,
    );
    if (activeTab) {
      view.renderPreview(
        view.editor.getText(activeTab.id),
        activeTab.path ?? activeTab.name,
      );
    }
  }

  syncExplorerActivePath();
  renderAll();
}

function setMode(windowId: string, mode: ViewMode): void {
  patchWindow(windowId, { mode });
  const view = views.get(windowId)!;
  view.render();
  requestAnimationFrame(() => view.requestMeasure());
}

function toggleLineNumbers(): void {
  ui = { ...ui, lineNumbers: !ui.lineNumbers };
  for (const v of views.values()) {
    v.editor.setLineNumbers(ui.lineNumbers);
    v.setLineNumbersFlag(ui.lineNumbers);
  }
  saveState(ui);
  renderAll();
}

function applySoftWrap(): void {
  for (const v of views.values()) {
    v.editor.setSoftWrapMode(
      currentSettings.softWrapMode,
      currentSettings.wrapColumn,
    );
  }
}

function syncViewMenu(): void {
  void invoke("sync_view_menu", {
    wrap: currentSettings.softWrapMode,
    theme: currentSettings.theme,
    font: currentSettings.main.font,
    size: currentSettings.main.size,
    explorerSize: currentSettings.explorer.size,
  });
}

function persistCurrentSettings(): void {
  applySettings(currentSettings);
  requestWindowMeasure();
  syncViewMenu();
  if (settingsPath) {
    void writeFile(settingsPath, JSON.stringify(currentSettings, null, 2));
  }
}

function setWrapMode(mode: SoftWrapMode): void {
  currentSettings = { ...currentSettings, softWrapMode: mode };
  applySoftWrap();
  persistCurrentSettings();
}

function cycleSoftWrap(): void {
  const order: SoftWrapMode[] = ["off", "window", "guide"];
  const next = order[(order.indexOf(currentSettings.softWrapMode) + 1) % order.length];
  setWrapMode(next);
}

function setMenuFont(value: string): void {
  currentSettings = {
    ...currentSettings,
    main: { ...currentSettings.main, font: value },
    sub: { ...currentSettings.sub, font: value },
  };
  persistCurrentSettings();
}

function setMenuSize(size: number): void {
  currentSettings = {
    ...currentSettings,
    main: { ...currentSettings.main, size },
    sub: { ...currentSettings.sub, size },
  };
  persistCurrentSettings();
}

function setMenuExplorerSize(size: number): void {
  currentSettings = {
    ...currentSettings,
    explorer: { ...currentSettings.explorer, size },
  };
  persistCurrentSettings();
}

function setMenuTheme(theme: string): void {
  currentSettings = {
    ...currentSettings,
    theme: normalizeThemeName(theme) ?? currentSettings.theme,
  };
  persistCurrentSettings();
}

function ensureSubWindow(): void {
  const state = getState();
  if (state.windows.length > 1) return;
  setState({
    windows: [
      ...state.windows,
      { id: "sub", tabs: [], activeTabId: null, mode: "split" },
    ],
  });
  addSplitter();
  makeView("sub", false);
  applySettings(currentSettings);
  renderAll();
  requestWindowMeasure();
}

async function moveTabToWindow(
  sourceId: string,
  tabId: string,
  targetId: "main" | "sub",
): Promise<void> {
  if (sourceId === targetId) {
    activateTab(sourceId, tabId);
    return;
  }
  if (targetId === "sub") ensureSubWindow();
  const source = getWindow(sourceId);
  const target = getWindow(targetId);
  const tab = source?.tabs.find((candidate) => candidate.id === tabId);
  if (!source || !target || !tab) return;

  const sourceView = views.get(sourceId)!;
  const targetView = views.get(targetId)!;
  const text = sourceView.editor.getText(tabId);
  const sourceNext = nextActiveAfterClose(
    source.tabs,
    tabId,
    source.activeTabId,
  );
  sourceView.editor.closeState(tabId);
  patchWindow(sourceId, {
    tabs: source.tabs.filter((candidate) => candidate.id !== tabId),
    activeTabId: sourceNext,
  });
  if (sourceNext) {
    sourceView.editor.switchTo(sourceNext);
    const nextTab = getWindow(sourceId)?.tabs.find(
      (candidate) => candidate.id === sourceNext,
    );
    sourceView.renderPreview(
      sourceView.editor.getText(sourceNext),
      nextTab?.path ?? nextTab?.name,
    );
  } else {
    sourceView.renderPreview("");
  }

  const movedId = nextId();
  targetView.editor.openState(
    movedId,
    text,
    editorKind(tab.path ?? tab.name),
  );
  patchWindow(targetId, {
    tabs: [...target.tabs, { ...tab, id: movedId }],
    activeTabId: movedId,
  });
  activateTab(targetId, movedId);
}

async function toggleSub(): Promise<void> {
  const s = getState();
  if (s.windows.length > 1) {
    // close sub: move its tabs back to main (confirm dirty)
    const sub = getWindow("sub")!;
    for (const t of sub.tabs) {
      if (t.dirty && !(await confirm(`Discard unsaved changes to "${t.name}"?`, { title: "Close Sub window", kind: "warning" }))) return;
    }
    const subView = views.get("sub")!;
    const main = mainWindow();
    const moved: TabMeta[] = [];
    for (const t of sub.tabs) {
      const id = nextId();
      moved.push({ ...t, id });
      views
        .get("main")!
        .editor.openState(
          id,
          subView.editor.getText(t.id),
          editorKind(t.path ?? t.name),
        );
    }
    subView.destroy();
    views.delete("sub");
    setState({
      windows: [{ ...main, tabs: [...main.tabs, ...moved] }],
      activeWindowId: "main",
    });
    removeSplitter();
    renderAll();
    requestWindowMeasure();
    if (mainWindow().activeTabId) {
      activateTab("main", mainWindow().activeTabId!);
    } else if (moved.length > 0) {
      activateTab("main", moved[0].id);
    }
  } else {
    ensureSubWindow();
    setState({ activeWindowId: "sub" });
    renderAll();
  }
}

function addSplitter(): void {
  if (document.getElementById("window-splitter")) return;
  const splitter = document.createElement("div");
  splitter.id = "window-splitter";
  // insert between the two .window elements
  const mainEl = windowsHost.querySelector<HTMLElement>('.window[data-window-id="main"]')!;
  mainEl.after(splitter);
  let dragging = false;
  const onMove = (e: MouseEvent) => {
    if (!dragging) return;
    const rect = windowsHost.getBoundingClientRect();
    const ratio = Math.max(0.2, Math.min(0.8, (e.clientX - rect.left) / rect.width));
    const main = windowsHost.querySelector<HTMLElement>('.window[data-window-id="main"]')!;
    const sub = windowsHost.querySelector<HTMLElement>('.window[data-window-id="sub"]')!;
    main.style.flex = `${ratio} 1 0`;
    sub.style.flex = `${1 - ratio} 1 0`;
  };
  const onUp = () => { dragging = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  splitter.addEventListener("mousedown", (e) => { e.preventDefault(); dragging = true; document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp); });
}

function removeSplitter(): void {
  document.getElementById("window-splitter")?.remove();
  windowsHost.querySelectorAll<HTMLElement>(".window").forEach((el) => (el.style.flex = ""));
}

const aiPanelElement = document.getElementById("ai-panel")!;

function buildAIPanel(): void {
  aiPanel = createAIPanel(aiPanelElement, {
    getSettings: () => currentAISettings,
    onSettingsChange: saveAISettingsFromPanel,
    getDoc: () => {
      const view = activeView();
      const tab = activeMeta();
      const selection = view.editor.getSelection();
      return {
        text: tab ? view.editor.getText(tab.id) : "",
        selection: selection.text,
      };
    },
    onApply: (newText) => {
      const editor = activeView().editor;
      const selection = editor.getSelection();
      if (selection.text) {
        editor.replaceRange(selection.from, selection.to, newText);
      } else {
        editor.setText(newText);
      }
    },
    onInsert: (text) => {
      const editor = activeView().editor;
      const selection = editor.getSelection();
      editor.replaceRange(selection.from, selection.to, text);
    },
    onClose: () => setAIVisible(false),
  });
}

function applyAIVisibility(): void {
  document.body.classList.toggle("ai-hidden", !ui.aiVisible);
  const button = document.getElementById("ab-ai")!;
  button.classList.toggle("active", ui.aiVisible);
  button.setAttribute("aria-pressed", String(ui.aiVisible));
}

function setAIVisible(aiVisible: boolean): void {
  ui = { ...ui, aiVisible };
  applyAIVisibility();
  if (aiVisible && !aiPanel) buildAIPanel();
  saveState(ui);
  requestWindowMeasure();
  requestAnimationFrame(() => aiPanel?.resize());
}

function toggleAI(): void {
  setAIVisible(!ui.aiVisible);
}

async function openInSub(path: string): Promise<void> {
  ensureSubWindow();
  const found = findTabByPath(getState().windows, path);
  if (found && found.windowId === "main") {
    await moveTabToWindow("main", found.tab.id, "sub");
    return;
  }
  if (found) {
    activateTab(found.windowId, found.tab.id);
    return;
  }
  const contents = await invoke<string>("read_file", { path });
  openInWindow("sub", { path, name: basename(path), text: contents });
}
(window as any).mdflowOpenInSub = (p: string) => void openInSub(p);

async function compareFiles(
  selectedPath: string,
  path: string,
): Promise<void> {
  try {
    const [selectedText, text] = await Promise.all([
      invoke<string>("read_file", { path: selectedPath }),
      invoke<string>("read_file", { path }),
    ]);
    showComparison(
      document.getElementById("editorarea")!,
      {
        name: basename(selectedPath),
        path: selectedPath,
        text: selectedText,
      },
      {
        name: basename(path),
        path,
        text,
      },
    );
  } catch (error) {
    await message(
      error instanceof Error ? error.message : String(error),
      { title: "Compare files", kind: "error" },
    );
  }
}



setState({
  folder: null,
  explorerVisible: ui.explorerVisible,
  explorerWidth: ui.explorerWidth,
});
document.documentElement.style.setProperty("--explorer-w", `${ui.explorerWidth}px`);
document.body.classList.toggle("explorer-hidden", !ui.explorerVisible);
document.documentElement.style.setProperty("--ai-w", `${ui.aiWidth}px`);
applyAIVisibility();

const settingsPanel = createSettingsPanel({
  getSettings: () => currentSettings,
  getAISettings: () => currentAISettings,
  onSettingsChange: saveSettingsFromPanel,
  onAISettingsChange: saveAISettingsFromPanel,
  onOpenSettingsFile: openSettings,
  onOpenAISettingsFile: openAISettings,
  onCheckForUpdates: () => void checkForUpdates(),
});

async function setAsDefault(role: "markdown" | "pdf"): Promise<void> {
  const label = role === "pdf" ? "PDF" : "Markdown";
  try {
    await invoke("set_default_handler", { role });
    await message(`MDflow is now your default ${label} app.`, {
      title: "Set as Default",
      kind: "info",
    });
  } catch (error) {
    await invoke("open_default_apps_settings").catch(() => {});
    await message(
      `macOS did not allow changing the default automatically. Choose MDflow in System Settings ▸ Apps ▸ Default Apps, or use Finder ▸ Get Info ▸ Open with ▸ Change All.\n\n${exportError(error)}`,
      { title: "Set as Default", kind: "info" },
    );
  }
}

function openExportMenu(x: number, y: number): void {
  const tab = activeMeta();
  if (!tab) return;
  const options = exportOptionsFor(tab.path ?? tab.name);
  if (options.length === 0) return;
  const toMenuItem = (item: ExportItem): MenuItem => {
    if ("children" in item) {
      return {
        label: item.label,
        children: item.children.map(toMenuItem),
      };
    }
    return {
      label: item.label,
      action: () => runExportFormat(item.format),
    };
  };
  const items = options.map(toMenuItem);
  showContextMenu(x, y, items);
}

function runExportFormat(format: ExportFormat): void {
  if (format === "doc-pdf") return void exportDocument("pdf");
  if (format === "doc-docx") return void exportDocument("docx");
  if (format === "img-png") return void exportImage("png");
  void exportImage("svg");
}

async function runNativeExport(format: ExportFormat): Promise<void> {
  const tab = activeMeta();
  const available = tab
    ? exportOptionsFor(tab.path ?? tab.name).flatMap((item) =>
        "children" in item ? item.children : [item],
      )
    : [];
  if (!available.some((item) => "format" in item && item.format === format)) {
    await message("That export format is not available for this document.", {
      title: "Export",
      kind: "info",
    });
    return;
  }
  runExportFormat(format);
}

initActivityBar(
  requestWindowMeasure,
  () => palette.open(),
  (x, y) => settingsPanel.open(x, y),
  toggleAI,
  openExportMenu,
  newBoard,
);
initResize((explorerWidth) => setState({ explorerWidth }));
const aiResize = document.getElementById("ai-resize")!;
aiResize.addEventListener("mousedown", (event) => {
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = ui.aiWidth;
  document.body.classList.add("resizing-ai");
  const onMove = (moveEvent: MouseEvent): void => {
    const width = Math.max(
      240,
      Math.min(560, startWidth + startX - moveEvent.clientX),
    );
    ui = { ...ui, aiWidth: width };
    document.documentElement.style.setProperty("--ai-w", `${width}px`);
    requestWindowMeasure();
    aiPanel?.resize();
  };
  const onUp = (): void => {
    document.body.classList.remove("resizing-ai");
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    saveState(ui);
    requestWindowMeasure();
    aiPanel?.resize();
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
});
initExplorer(
  (path) => void doOpenPath(path),
  handleExplorerPathChange,
  {
    onOpenPreview: (path) => {
      void doOpenPath(path).then(() => {
        const windowId = getState().activeWindowId;
        setMode(windowId, "preview");
      });
    },
    onOpenSide: (path) => void openInSub(path),
    onCompare: (selectedPath, path) =>
      void compareFiles(selectedPath, path),
    onAddToChat: (path) => {
      void doOpenPath(path).then(() => setAIVisible(true));
    },
    onHideExplorer: () => {
      if (getState().explorerVisible) document.getElementById("ab-explorer")!.click();
    },
    onToggleLineNumbers: () => toggleLineNumbers(),
  },
);

makeView("main", true);
if (ui.aiVisible) buildAIPanel();
patchWindow("main", { mode: ui.viewMode });
for (const v of views.values()) {
  v.editor.setSoftWrapMode(currentSettings.softWrapMode, currentSettings.wrapColumn);
  v.editor.setLineNumbers(ui.lineNumbers);
}
renderAll();

subscribe(() => {
  const s = getState();
  if (s.folder !== indexedFolder) {
    indexedFolder = s.folder;
    void refreshFileList();
  }
  ui = {
    ...ui,
    folder: s.folder,
    explorerVisible: s.explorerVisible,
    explorerWidth: s.explorerWidth,
    windows: s.windows.map((w) => ({
      openPaths: w.tabs.map((t) => t.path).filter((p): p is string => !!p),
      activePath: w.tabs.find((t) => t.id === w.activeTabId)?.path ?? null,
      mode: w.mode,
    })),
    activeWindowIndex: s.windows.findIndex((w) => w.id === s.activeWindowId),
  };
  saveState(ui);
});

window.addEventListener("focus", () => {
  const folder = getState().folder;
  if (folder) {
    void refreshDir(folder).catch(() => {});
    void refreshFileList();
  }
});

listen<string>("menu", (event) => {
  const wid = getState().activeWindowId;
  const id = event.payload;
  if (id.startsWith("view.wrap.")) {
    return setWrapMode(id.slice("view.wrap.".length) as SoftWrapMode);
  }
  if (id.startsWith("view.font.")) {
    return setMenuFont(id.slice("view.font.".length));
  }
  if (id.startsWith("view.explorer_size.")) {
    return setMenuExplorerSize(Number(id.slice("view.explorer_size.".length)));
  }
  if (id.startsWith("view.size.")) {
    return setMenuSize(Number(id.slice("view.size.".length)));
  }
  if (id.startsWith("view.theme.")) {
    return setMenuTheme(id.slice("view.theme.".length));
  }
  switch (id) {
    case "file.new":
      return newDoc();
    case "file.open":
      return void doOpen();
    case "file.open_folder":
      return void pickFolder().then(async (directory) => {
        if (!directory) return;
        await openFolder(directory);
        await refreshFileList();
      });
    case "file.save":
      return void doSave(false);
    case "file.save_as":
      return void doSave(true);
    case "file.close": {
      const w = activeWindow();
      return w.activeTabId ? void closeTab(w.id, w.activeTabId) : undefined;
    }
    case "export.document.pdf":
      return void runNativeExport("doc-pdf");
    case "export.document.docx":
      return void runNativeExport("doc-docx");
    case "export.image.png":
      return void runNativeExport("img-png");
    case "export.image.svg":
      return void runNativeExport("img-svg");
    case "view.toggle_explorer":
      return void document.getElementById("ab-explorer")?.click();
    case "view.toggle_preview":
      return setMode(wid, activeWindow().mode === "split" ? "editor" : "split");
    case "view.reading":
      return setMode(wid, activeWindow().mode === "preview" ? "split" : "preview");
    case "view.toggle_lines":
      return toggleLineNumbers();
    case "view.zoom_in":
      return activeView().adjustFocusedZoom(0.1);
    case "view.zoom_out":
      return activeView().adjustFocusedZoom(-0.1);
    case "view.zoom_reset":
      return activeView().resetFocusedZoom();
    case "window.fullscreen":
      return void invoke("window_fullscreen_toggle");
    case "window.left_half":
      return void invoke("window_tile", { side: "left" });
    case "window.right_half":
      return void invoke("window_tile", { side: "right" });
    case "default.markdown":
      return void setAsDefault("markdown");
    case "default.pdf":
      return void setAsDefault("pdf");
    case "help.guide":
      return openHelp();
    case "help.check_updates":
      return void checkForUpdates();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey) {
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      activeView().adjustFocusedZoom(0.1);
      return;
    }
    if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      activeView().adjustFocusedZoom(-0.1);
      return;
    }
    if (e.key === "0") {
      e.preventDefault();
      activeView().resetFocusedZoom();
      return;
    }
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    palette.open();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
    e.preventDefault();
    const w = activeWindow();
    if (w.activeTabId) void closeTab(w.id, w.activeTabId);
  }
});

function applyZoom(zoom: number): void {
  document.getElementById("app")?.style.setProperty("--zoom", String(zoom));
}
applyZoom(ui.zoom);

async function restoreWindows(): Promise<void> {
  const saved = startupUi.windows;
  if (saved[1]) {
    setState({ windows: [...getState().windows, { id: "sub", tabs: [], activeTabId: null, mode: saved[1].mode }] });
    addSplitter();
    makeView("sub", false);
    applySettings(currentSettings);
  }
  patchWindow("main", { mode: saved[0]?.mode ?? "split" });
  for (let i = 0; i < saved.length; i++) {
    const windowId = i === 0 ? "main" : "sub";
    for (const path of saved[i].openPaths) {
      try {
        const contents = await invoke<string>("read_file", { path });
        openInWindow(windowId, { path, name: basename(path), text: contents });
      } catch {
        /* vanished */
      }
    }
    if (saved[i].activePath) {
      const found = findTabByPath(getState().windows, saved[i].activePath!);
      if (found && found.windowId === windowId) {
        activateTab(windowId, found.tab.id);
      }
    }
  }
  const ai = startupUi.activeWindowIndex === 1 ? "sub" : "main";
  if (getWindow(ai)) {
    setState({ activeWindowId: ai });
  }

  const result = await getInitialFile();
  if (result) {
    openInWindow(getState().activeWindowId, { path: result.path, name: basename(result.path), text: result.contents });
  }

  renderAll();
}

async function boot(): Promise<void> {
  await loadSettings();
  await loadAISettings();
  startDailyUpdateChecks(() => currentSettings.updateMode === "auto");

  if (currentSettings.restoreSession) {
    if (startupUi.folder) {
      try {
        await openFolder(startupUi.folder);
      } catch {
        setState({ folder: null, tree: null });
      }
    }
    await refreshFileList();
    await restoreWindows();
  } else {
    const result = await getInitialFile();
    if (result) {
      openInWindow(getState().activeWindowId, {
        path: result.path,
        name: basename(result.path),
        text: result.contents,
      });
    }
    renderAll();
  }
}

void listen<string>("open-path", (event) => {
  void doOpenPath(event.payload);
}).then(() =>
  invoke<string[]>("take_open_paths").then((paths) => {
    for (const path of paths) {
      void doOpenPath(path);
    }
  }),
).catch(() => {});

void boot();
