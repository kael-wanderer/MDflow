import { createEditor, type EditorHandle } from "./editor";
import { renderMarkdown } from "./preview";
import { getWindow, getState } from "./store";
import type { ViewMode } from "./state";

export type WindowHandlers = {
  onActivateTab: (windowId: string, tabId: string) => void;
  onCloseTab: (windowId: string, tabId: string) => void;
  onSetMode: (windowId: string, mode: ViewMode) => void;
  onToggleLineNumbers: () => void;
  onToggleSub: () => void;
  onFocusWindow: (windowId: string) => void;
  onDocChange: (windowId: string, tabId: string, text: string) => void;
};

export type WindowView = {
  id: string;
  editor: EditorHandle;
  render: () => void;
  renderPreview: (text: string) => void;
  focus: () => void;
  destroy: () => void;
  setLineNumbersFlag: (on: boolean) => void;
};

export function createWindowView(
  host: HTMLElement,
  windowId: string,
  isMain: boolean,
  h: WindowHandlers
): WindowView {
  const root = document.createElement("div");
  root.className = "window";
  root.dataset.windowId = windowId;
  root.innerHTML = `
    <div class="editor-header">
      <div class="tabbar"></div>
      <div class="window-toolbar">
        <button class="wt-btn" data-mode="editor" type="button" title="Editor (⌘E)">Editor</button>
        <button class="wt-btn" data-mode="preview" type="button" title="Read (⌘P)">Read</button>
        <button class="wt-btn" data-mode="split" type="button" title="Split (⌘B)">Split</button>
        <span class="wt-sep"></span>
        <button class="wt-btn wt-icon wt-lines" type="button" title="Line numbers">#</button>
        ${isMain ? `<span class="wt-sep"></span>
        <button class="wt-btn wt-icon wt-sub" type="button" title="Toggle Sub window">⊞</button>
        <button class="wt-btn wt-icon wt-ai" type="button" title="AI panel (coming soon)" disabled>✦</button>` : ""}
      </div>
    </div>
    <div class="window-panes">
      <div class="pane pane-editor"></div>
      <div class="seam"></div>
      <div class="pane pane-preview"></div>
    </div>`;
  host.appendChild(root);

  const tabbarEl = root.querySelector<HTMLElement>(".tabbar")!;
  const editorPane = root.querySelector<HTMLElement>(".pane-editor")!;
  const previewPane = root.querySelector<HTMLElement>(".pane-preview")!;

  let lineNums = true;

  root.addEventListener("mousedown", () => h.onFocusWindow(windowId));

  root.querySelectorAll<HTMLElement>("[data-mode]").forEach((btn) =>
    btn.addEventListener("click", () => h.onSetMode(windowId, btn.dataset.mode as ViewMode))
  );
  root.querySelector(".wt-lines")!.addEventListener("click", () => h.onToggleLineNumbers());
  root.querySelector(".wt-sub")?.addEventListener("click", () => h.onToggleSub());

  const editor = createEditor(editorPane, (tabId, text) => h.onDocChange(windowId, tabId, text));

  function render(): void {
    const w = getWindow(windowId);
    if (!w) return;
    // mode class
    root.classList.remove("window-mode-editor", "window-mode-preview", "window-mode-split");
    root.classList.add(`window-mode-${w.mode}`);
    root.classList.toggle("active", getState().activeWindowId === windowId);
    // toolbar active states
    root.querySelectorAll<HTMLElement>("[data-mode]").forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.mode === w.mode)
    );
    root.querySelector(".wt-lines")!.classList.toggle("active", lineNums);
    const sub = root.querySelector(".wt-sub");
    if (sub) sub.classList.toggle("active", getState().windows.length > 1);
    // tabs
    tabbarEl.innerHTML = "";
    tabbarEl.classList.toggle("empty", w.tabs.length === 0);
    for (const t of w.tabs) {
      const tab = document.createElement("div");
      tab.className = "tab" + (t.id === w.activeTabId ? " active" : "");
      tab.addEventListener("click", () => h.onActivateTab(windowId, t.id));
      const dot = document.createElement("span");
      dot.className = "tab-dot" + (t.dirty ? " dirty" : "");
      const name = document.createElement("span");
      name.className = "tab-name";
      name.textContent = t.name;
      const close = document.createElement("button");
      close.className = "tab-close";
      close.type = "button";
      close.textContent = "×";
      close.addEventListener("click", (e) => { e.stopPropagation(); h.onCloseTab(windowId, t.id); });
      tab.append(dot, name, close);
      tabbarEl.appendChild(tab);
    }
  }

  function renderPreview(text: string): void {
    previewPane.innerHTML = `<article class="doc">${renderMarkdown(text)}</article>`;
  }

  return {
    id: windowId,
    editor,
    render,
    renderPreview,
    focus: () => editor.focus(),
    destroy: () => root.remove(),
    setLineNumbersFlag: (on: boolean) => {
      lineNums = on;
    },
  };
}
