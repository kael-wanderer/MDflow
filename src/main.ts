import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import { initActivityBar } from "./activitybar";
import {
  DEFAULT_AI_SETTINGS_JSON,
  parseAISettings,
  type AISettings,
} from "./ai/aisettings";
import { createAIPanel, type AIPanel } from "./ai/panel";
import { showContextMenu } from "./contextmenu";
import { initExplorer, openFolder, setExplorerActivePath } from "./explorer";
import { getInitialFile, openFile, pickSavePath, writeFile } from "./files";
import {
  getAISettingsFile,
  getSettingsFile,
  listFilesRecursive,
  pickFolder,
} from "./filesys";
import { createPalette, type PaletteItem } from "./palette";
import { joinPath } from "./paths";
import { initResize } from "./resize";
import {
  applySettings,
  DEFAULT_SETTINGS_JSON,
  parseSettings,
} from "./settings";
import { loadState, saveState, type ViewMode } from "./state";
import { getState, refreshDir, setState, subscribe, getWindow, mainWindow, activeWindow, patchWindow } from "./store";
import { nextActiveAfterClose, type TabMeta } from "./tabops";
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
}

async function loadAISettings(): Promise<void> {
  try {
    const file = await getAISettingsFile(DEFAULT_AI_SETTINGS_JSON);
    aiSettingsPath = file.path;
    currentAISettings = parseAISettings(file.contents);
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
    command("softwrap", "Toggle Soft Wrap", toggleSoftWrap),
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

function makeView(windowId: string, isMain: boolean): WindowView {
  const v = createWindowView(windowsHost, windowId, isMain, handlers);
  v.setLineNumbersFlag(ui.lineNumbers);
  v.editor.setSoftWrap(ui.softWrap);
  v.editor.setLineNumbers(ui.lineNumbers);
  views.set(windowId, v);
  return v;
}

function renderAll(): void {
  for (const v of views.values()) v.render();
  document.getElementById("windows")!.classList.toggle("has-sub", getState().windows.length > 1);
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
  v.renderPreview(text);
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
  views.get(windowId)!.editor.openState(id, opts.text);
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
    schedulePreview(windowId, text);
  }
}

const timers = new Map<string, number>();
function schedulePreview(windowId: string, text: string): void {
  clearTimeout(timers.get(windowId));
  timers.set(
    windowId,
    window.setTimeout(() => {
      views.get(windowId)!.renderPreview(text);
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

function newDoc(): void {
  openInWindow(getState().activeWindowId, { path: null, name: "Untitled", text: "" });
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
    syncExplorerActivePath();
    renderAll();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    await message(text, { title: "Save file", kind: "error" });
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

function toggleSoftWrap(): void {
  ui = { ...ui, softWrap: !ui.softWrap };
  for (const v of views.values()) {
    v.editor.setSoftWrap(ui.softWrap);
  }
  saveState(ui);
  void invoke("set_soft_wrap", { on: ui.softWrap });
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
      views.get("main")!.editor.openState(id, subView.editor.getText(t.id));
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
    setState({ windows: [...s.windows, { id: "sub", tabs: [], activeTabId: null, mode: "split" }], activeWindowId: "sub" });
    addSplitter();
    makeView("sub", false);
    applySettings(currentSettings);
    renderAll();
    requestWindowMeasure();
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
  });
}

function applyAIVisibility(): void {
  document.body.classList.toggle("ai-hidden", !ui.aiVisible);
  const button = document.getElementById("ab-ai")!;
  button.classList.toggle("active", ui.aiVisible);
  button.setAttribute("aria-pressed", String(ui.aiVisible));
}

function toggleAI(): void {
  ui = { ...ui, aiVisible: !ui.aiVisible };
  applyAIVisibility();
  if (ui.aiVisible && !aiPanel) buildAIPanel();
  saveState(ui);
  requestWindowMeasure();
  requestAnimationFrame(() => aiPanel?.resize());
}

async function openInSub(path: string): Promise<void> {
  if (getState().windows.length < 2) await toggleSub();
  // move if already open in main
  const found = findTabByPath(getState().windows, path);
  if (found && found.windowId === "main") {
    const closed = await closeTab("main", found.tab.id);
    if (!closed) return;
  }
  const contents = await invoke<string>("read_file", { path });
  openInWindow("sub", { path, name: basename(path), text: contents });
}
(window as any).mdflowOpenInSub = (p: string) => void openInSub(p);



setState({
  folder: null,
  explorerVisible: ui.explorerVisible,
  explorerWidth: ui.explorerWidth,
});
document.documentElement.style.setProperty("--explorer-w", `${ui.explorerWidth}px`);
document.body.classList.toggle("explorer-hidden", !ui.explorerVisible);
document.documentElement.style.setProperty("--ai-w", `${ui.aiWidth}px`);
applyAIVisibility();

initActivityBar(
  requestWindowMeasure,
  () => palette.open(),
  (x, y) => {
    showContextMenu(x, y, [
      { label: "Editor Settings", action: openSettings },
      { label: "AI Settings", action: openAISettings },
    ]);
  },
  toggleAI,
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
initExplorer((path) => void doOpenPath(path), handleExplorerPathChange);

makeView("main", true);
if (ui.aiVisible) buildAIPanel();
patchWindow("main", { mode: ui.viewMode });
for (const v of views.values()) {
  v.editor.setSoftWrap(ui.softWrap);
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
  switch (event.payload) {
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
    case "view.split":
      return setMode(wid, "split");
    case "view.editor":
      return setMode(wid, "editor");
    case "view.read":
      return setMode(wid, "preview");
    case "view.softwrap":
      return toggleSoftWrap();
    case "help.guide":
      return openHelp();
  }
});

window.addEventListener("keydown", (e) => {
  if (
    (e.metaKey || e.ctrlKey) &&
    (e.key.toLowerCase() === "k" ||
      (e.key.toLowerCase() === "p" && !e.shiftKey))
  ) {
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
void invoke("set_soft_wrap", { on: ui.softWrap });

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

void boot();
