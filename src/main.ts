import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { createEditor } from "./editor";
import { renderMarkdown } from "./preview";
import { openFile, saveFile, getInitialFile } from "./files";
import { applyViewMode, applyZoom } from "./views";
import { loadState, saveState, type ViewMode } from "./state";

const editorEl = document.getElementById("editor")!;
const previewEl = document.getElementById("preview")!;
const statusPath = document.getElementById("status-path")!;
const statusWords = document.getElementById("status-words")!;

// Clear the static mockup content before mounting the live editor/preview.
editorEl.innerHTML = "";
previewEl.innerHTML = "";

let currentPath: string | null = null;
let ui = loadState();

const editor = createEditor(editorEl, schedulePreview);

let timer: number | undefined;
function schedulePreview(doc: string): void {
  clearTimeout(timer);
  timer = window.setTimeout(() => updatePreview(doc), 300);
}

async function updatePreview(doc: string): Promise<void> {
  previewEl.innerHTML = `<article class="doc">${renderMarkdown(doc)}</article>`;
  const n = await invoke<number>("word_count", { text: doc });
  statusWords.textContent = `${n} ${n === 1 ? "word" : "words"}`;
}

function setPath(path: string | null): void {
  currentPath = path;
  statusPath.textContent = path ?? "Untitled";
}

function setMode(mode: ViewMode): void {
  ui = { ...ui, viewMode: mode };
  applyViewMode(mode);
  saveState(ui);
}

function newDoc(): void {
  editor.setDoc("");
  setPath(null);
  updatePreview("");
  editor.focus();
}

async function doOpen(): Promise<void> {
  const r = await openFile();
  if (!r) return;
  editor.setDoc(r.contents);
  setPath(r.path);
  updatePreview(r.contents);
}

async function doSave(saveAs = false): Promise<void> {
  const written = await saveFile(saveAs ? null : currentPath, editor.getDoc());
  if (written) setPath(written);
}

function toggleSoftWrap(): void {
  ui = { ...ui, softWrap: !ui.softWrap };
  editor.setSoftWrap(ui.softWrap);
  saveState(ui);
}

listen<string>("menu", (e) => {
  switch (e.payload) {
    case "file.new": return newDoc();
    case "file.open": return void doOpen();
    case "file.save": return void doSave(false);
    case "file.save_as": return void doSave(true);
    case "view.split": return setMode("split");
    case "view.editor": return setMode("editor");
    case "view.read": return setMode("preview");
    case "view.softwrap": return toggleSoftWrap();
  }
});

// Initial state
applyViewMode(ui.viewMode);
applyZoom(ui.zoom);
editor.setSoftWrap(ui.softWrap);
invoke("set_soft_wrap", { on: ui.softWrap });

getInitialFile().then((r) => {
  if (!r) return;
  editor.setDoc(r.contents);
  setPath(r.path);
  updatePreview(r.contents);
});
