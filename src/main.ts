import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import { initActivityBar } from "./activitybar";
import { initExplorer, openFolder, setExplorerActivePath } from "./explorer";
import { getInitialFile, openFile, pickSavePath, writeFile } from "./files";
import { initResize } from "./resize";
import { loadState, saveState, type ViewMode } from "./state";
import { getState, refreshDir, setState, subscribe, getWindow, activeWindow, patchWindow } from "./store";
import { nextActiveAfterClose, type TabMeta } from "./tabops";
import { findTabByPath } from "./windowops";
import { createWindowView, type WindowView } from "./windowview";
import helpDoc from "../HELP.md?raw";

const windowsHost = document.getElementById("windows")!;
const statusPath = document.getElementById("status-path")!;
const statusWords = document.getElementById("status-words")!;

let ui = loadState();
let tabSeq = 0;
const nextId = () => `t${++tabSeq}`;

function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

const views = new Map<string, WindowView>();

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
  views.set(windowId, v);
  return v;
}

function renderAll(): void {
  for (const v of views.values()) v.render();
  document.getElementById("windows")!.classList.toggle("has-sub", getState().windows.length > 1);
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
  if (windowId === getState().activeWindowId) {
    updateStatus();
  }
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

async function closeTab(windowId: string, tabId: string): Promise<void> {
  const w = getWindow(windowId)!;
  const t = w.tabs.find((x) => x.id === tabId);
  if (!t) return;

  if (t.dirty) {
    const approved = await confirm(`Discard unsaved changes to "${t.name}"?`, {
      title: "Close tab",
      kind: "warning",
    });
    if (!approved) return;
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
    window.setTimeout(async () => {
      views.get(windowId)!.renderPreview(text);
      if (windowId === getState().activeWindowId) {
        const n = await invoke<number>("word_count", { text });
        statusWords.textContent = `${n} ${n === 1 ? "word" : "words"}`;
      }
    }, 300)
  );
}

function clearDocumentSurface(): void {
  clearTimeout(timers.get(getState().activeWindowId));
  statusPath.textContent = "Untitled";
  statusWords.textContent = "0 words";
  setExplorerActivePath(null);
  renderAll();
}

function updateStatus(): void {
  const t = activeMeta();
  statusPath.textContent = t?.path ?? t?.name ?? "Untitled";
  const text = t ? activeView().editor.getText(t.id) : "";
  invoke<number>("word_count", { text }).then((n) => {
    statusWords.textContent = `${n} ${n === 1 ? "word" : "words"}`;
  });
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
    patchWindow(getState().activeWindowId, {
      tabs: activeWindow().tabs.map((x) =>
        x.id === t.id ? { ...x, path: target, name: basename(target), dirty: false } : x
      ),
    });
    updateStatus();
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

  const current = activeMeta();
  statusPath.textContent = current?.path ?? current?.name ?? "Untitled";
  renderAll();
}

function setMode(windowId: string, mode: ViewMode): void {
  patchWindow(windowId, { mode });
  views.get(windowId)!.render();
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

function toggleSub(): void {}

setState({
  folder: ui.folder,
  explorerVisible: ui.explorerVisible,
  explorerWidth: ui.explorerWidth,
});
document.documentElement.style.setProperty("--explorer-w", `${ui.explorerWidth}px`);
document.body.classList.toggle("explorer-hidden", !ui.explorerVisible);

initActivityBar();
initResize((explorerWidth) => setState({ explorerWidth }));
initExplorer((path) => void doOpenPath(path), handleExplorerPathChange);

makeView("main", true);
patchWindow("main", { mode: ui.viewMode });
for (const v of views.values()) {
  v.editor.setSoftWrap(ui.softWrap);
  v.editor.setLineNumbers(ui.lineNumbers);
}
renderAll();

subscribe(() => {
  const shell = getState();
  const main = shell.windows[0]; // always present
  const openPaths = main.tabs
    .map((tab) => tab.path)
    .filter((path): path is string => path !== null);
  const current = main.tabs.find((tab) => tab.id === main.activeTabId);
  ui = {
    ...ui,
    folder: shell.folder,
    explorerVisible: shell.explorerVisible,
    explorerWidth: shell.explorerWidth,
    openPaths,
    activePath: current?.path ?? null,
  };
  saveState(ui);
});

window.addEventListener("focus", () => {
  const folder = getState().folder;
  if (folder) void refreshDir(folder).catch(() => {});
});

listen<string>("menu", (event) => {
  const wid = getState().activeWindowId;
  switch (event.payload) {
    case "file.new":
      return newDoc();
    case "file.open":
      return void doOpen();
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

function applyZoom(zoom: number): void {
  document.getElementById("app")?.style.setProperty("--zoom", String(zoom));
}
applyZoom(ui.zoom);
void invoke("set_soft_wrap", { on: ui.softWrap });

if (ui.folder) {
  void openFolder(ui.folder).catch(() => {
    setState({ folder: null, tree: null });
  });
}

async function restoreTabs(): Promise<void> {
  const paths = [...ui.openPaths];
  const savedActivePath = ui.activePath;

  for (const path of paths) {
    try {
      const contents = await invoke<string>("read_file", { path });
      openInWindow("main", { path, name: basename(path), text: contents });
    } catch {
      // A session file may have moved or been deleted while the app was closed.
    }
  }

  if (savedActivePath) {
    const found = findTabByPath(getState().windows, savedActivePath);
    if (found && found.windowId === "main") {
      activateTab("main", found.tab.id);
    }
  }
}

async function restoreDocuments(): Promise<void> {
  await restoreTabs();
  const result = await getInitialFile();
  if (result) {
    openInWindow("main", { path: result.path, name: basename(result.path), text: result.contents });
  }
}

void restoreDocuments();
