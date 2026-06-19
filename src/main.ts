import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import { initActivityBar } from "./activitybar";
import { createEditor } from "./editor";
import { initExplorer, openFolder, setExplorerActivePath } from "./explorer";
import { getInitialFile, openFile, pickSavePath, writeFile } from "./files";
import { renderMarkdown } from "./preview";
import { initResize } from "./resize";
import { loadState, saveState, type ViewMode } from "./state";
import { getState, refreshDir, setState, subscribe } from "./store";
import { initTabbar } from "./tabbar";
import { findByPath, nextActiveAfterClose, type TabMeta } from "./tabops";
import { applyViewMode, applyZoom } from "./views";
import helpDoc from "../HELP.md?raw";

const editorEl = document.getElementById("editor")!;
const previewEl = document.getElementById("preview")!;
const statusPath = document.getElementById("status-path")!;
const statusWords = document.getElementById("status-words")!;

editorEl.replaceChildren();
previewEl.replaceChildren();

let ui = loadState();
let tabSequence = 0;
let previewTimer: number | undefined;
let previewVersion = 0;

const nextTabId = (): string => `t${++tabSequence}`;

function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

function activeTab(): TabMeta | undefined {
  const { tabs, activeTabId } = getState();
  return tabs.find((tab) => tab.id === activeTabId);
}

function setTabs(tabs: TabMeta[], activeTabId: string | null): void {
  setState({ tabs, activeTabId });
}

function patchTab(id: string, patch: Partial<TabMeta>): void {
  setState({
    tabs: getState().tabs.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)),
  });
}

async function updatePreview(text: string): Promise<void> {
  const version = ++previewVersion;
  previewEl.innerHTML = `<article class="doc">${renderMarkdown(text)}</article>`;
  const wordCount = await invoke<number>("word_count", { text });
  if (version !== previewVersion) return;
  statusWords.textContent = `${wordCount} ${wordCount === 1 ? "word" : "words"}`;
}

function schedulePreview(text: string): void {
  clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => void updatePreview(text), 300);
}

function clearDocumentSurface(): void {
  clearTimeout(previewTimer);
  previewVersion += 1;
  previewEl.replaceChildren();
  setExplorerActivePath(null);
  statusPath.textContent = "Untitled";
  statusWords.textContent = "0 words";
}

function onDocChange(id: string, text: string): void {
  const tab = getState().tabs.find((candidate) => candidate.id === id);
  if (tab && !tab.dirty) patchTab(id, { dirty: true });
  if (id === getState().activeTabId) schedulePreview(text);
}

const editor = createEditor(editorEl, onDocChange);

function activate(id: string): void {
  const tab = getState().tabs.find((candidate) => candidate.id === id);
  if (!tab) return;

  clearTimeout(previewTimer);
  editor.switchTo(id);
  setState({ activeTabId: id });
  setExplorerActivePath(tab.path);
  statusPath.textContent = tab.path ?? tab.name;
  void updatePreview(editor.getText(id));
  editor.focus();
}

function openDoc(options: { path: string | null; name: string; text: string }): void {
  if (options.path) {
    const existing = findByPath(getState().tabs, options.path);
    if (existing) {
      activate(existing.id);
      return;
    }
  }

  const id = nextTabId();
  const tab: TabMeta = {
    id,
    path: options.path,
    name: options.name,
    dirty: false,
  };
  editor.openState(id, options.text);
  setTabs([...getState().tabs, tab], id);
  activate(id);
}

async function closeTab(id: string): Promise<void> {
  const { tabs, activeTabId } = getState();
  const tab = tabs.find((candidate) => candidate.id === id);
  if (!tab) return;

  if (tab.dirty) {
    const approved = await confirm(`Discard unsaved changes to "${tab.name}"?`, {
      title: "Close tab",
      kind: "warning",
    });
    if (!approved) return;
  }

  const wasActive = id === activeTabId;
  const next = nextActiveAfterClose(tabs, id, activeTabId);
  editor.closeState(id);
  setTabs(
    tabs.filter((candidate) => candidate.id !== id),
    next,
  );

  if (wasActive) {
    if (next) activate(next);
    else clearDocumentSurface();
  }
}

async function showOpenError(error: unknown): Promise<void> {
  const text = error instanceof Error ? error.message : String(error);
  await message(text, { title: "Open file", kind: "error" });
}

async function doOpenPath(path: string): Promise<void> {
  const existing = findByPath(getState().tabs, path);
  if (existing) {
    activate(existing.id);
    return;
  }

  try {
    const contents = await invoke<string>("read_file", { path });
    openDoc({ path, name: basename(path), text: contents });
  } catch (error) {
    await showOpenError(error);
  }
}

async function doOpen(): Promise<void> {
  try {
    const result = await openFile();
    if (result) {
      openDoc({ path: result.path, name: basename(result.path), text: result.contents });
    }
  } catch (error) {
    await showOpenError(error);
  }
}

function newDoc(): void {
  openDoc({ path: null, name: "Untitled", text: "" });
}

async function doSave(saveAs = false): Promise<void> {
  const tab = activeTab();
  if (!tab) return;

  try {
    let target = saveAs ? null : tab.path;
    if (!target) {
      target = await pickSavePath();
      if (!target) return;

      const existing = findByPath(getState().tabs, target);
      if (existing && existing.id !== tab.id) {
        await message("That file is already open in another tab.", {
          title: "Save As",
          kind: "warning",
        });
        activate(existing.id);
        return;
      }
    }

    await writeFile(target, editor.getText(tab.id));
    patchTab(tab.id, {
      path: target,
      name: basename(target),
      dirty: false,
    });
    statusPath.textContent = target;
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    await message(text, { title: "Save file", kind: "error" });
  }
}

function openHelp(): void {
  openDoc({ path: null, name: "MDflow Help", text: helpDoc });
}

function handleExplorerPathChange(from: string, to: string | null): void {
  const separatorMatches = (path: string): boolean =>
    path === from || path.startsWith(`${from}/`) || path.startsWith(`${from}\\`);

  const tabs = getState().tabs.map((tab) => {
    if (!tab.path || !separatorMatches(tab.path)) return tab;
    if (to === null) {
      return { ...tab, path: null, dirty: true };
    }
    const path = `${to}${tab.path.slice(from.length)}`;
    return { ...tab, path, name: basename(path) };
  });
  setState({ tabs });

  const current = activeTab();
  statusPath.textContent = current?.path ?? current?.name ?? "Untitled";
}

function setMode(mode: ViewMode): void {
  ui = { ...ui, viewMode: mode };
  applyViewMode(mode);
  saveState(ui);
}

function toggleSoftWrap(): void {
  ui = { ...ui, softWrap: !ui.softWrap };
  editor.setSoftWrap(ui.softWrap);
  saveState(ui);
}

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
initTabbar({
  onActivate: activate,
  onClose: (id) => void closeTab(id),
});

subscribe(() => {
  const shell = getState();
  const openPaths = shell.tabs
    .map((tab) => tab.path)
    .filter((path): path is string => path !== null);
  const current = shell.tabs.find((tab) => tab.id === shell.activeTabId);
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
      const id = getState().activeTabId;
      return id ? void closeTab(id) : undefined;
    }
    case "view.split":
      return setMode("split");
    case "view.editor":
      return setMode("editor");
    case "view.read":
      return setMode("preview");
    case "view.softwrap":
      return toggleSoftWrap();
    case "help.guide":
      return openHelp();
  }
});

applyViewMode(ui.viewMode);
applyZoom(ui.zoom);
editor.setSoftWrap(ui.softWrap);
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
      openDoc({ path, name: basename(path), text: contents });
    } catch {
      // A session file may have moved or been deleted while the app was closed.
    }
  }

  if (savedActivePath) {
    const savedActive = findByPath(getState().tabs, savedActivePath);
    if (savedActive) activate(savedActive.id);
  }
}

async function restoreDocuments(): Promise<void> {
  await restoreTabs();
  const result = await getInitialFile();
  if (result) {
    openDoc({ path: result.path, name: basename(result.path), text: result.contents });
  }
}

void restoreDocuments();
