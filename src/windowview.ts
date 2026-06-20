import { createEditor, type EditorHandle } from "./editor";
import {
  htmlWithPreviewZoom,
  isHtmlFile,
} from "./document-kind";
import { glyphs } from "./glyphs";
import { renderMarkdown } from "./preview";
import { enhancePreview } from "./render-extras";
import { getWindow, getState } from "./store";
import type { ViewMode } from "./state";

export type WindowHandlers = {
  onActivateTab: (windowId: string, tabId: string) => void;
  onCloseTab: (windowId: string, tabId: string) => void;
  onTabContextMenu: (
    windowId: string,
    tabId: string,
    x: number,
    y: number,
  ) => void;
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
  renderPreview: (text: string, pathOrName?: string | null) => void;
  adjustFocusedZoom: (delta: number) => void;
  resetFocusedZoom: () => void;
  requestMeasure: () => void;
  focus: () => void;
  destroy: () => void;
  setLineNumbersFlag: (on: boolean) => void;
};

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

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
        <div class="wt-group">
          <button class="wt-btn" data-mode="editor" type="button" title="Editor (⌘E)">${glyphs.editor}</button>
          <button class="wt-btn" data-mode="preview" type="button" title="Read">${glyphs.read}</button>
          <button class="wt-btn" data-mode="split" type="button" title="Split (⌘B)">${glyphs.split}</button>
        </div>
        <div class="wt-group preview-zoom-group">
          <button class="wt-btn wt-preview-zoom" data-preview-zoom="out" type="button" title="Zoom preview out (⌘−)">−</button>
          <button class="wt-btn wt-preview-reset" data-preview-zoom="reset" type="button" title="Reset preview zoom (⌘0)">100%</button>
          <button class="wt-btn wt-preview-zoom" data-preview-zoom="in" type="button" title="Zoom preview in (⌘+)">+</button>
        </div>
        <button class="wt-btn wt-icon wt-lines" type="button" title="Line numbers">${glyphs.lineNumbers}</button>
        ${
          isMain
            ? `<button class="wt-btn wt-icon wt-sub" type="button" title="Toggle Sub window">${glyphs.subToggle}</button>`
            : `<button class="wt-btn wt-icon wt-subclose" type="button" title="Close Sub window">${glyphs.subClose}</button>`
        }
      </div>
    </div>
    <div class="window-panes">
      <div class="pane pane-editor"></div>
      <div class="seam"></div>
      <div class="pane pane-preview"></div>
    </div>
    <div class="window-status">
      <span class="ws-name"></span>
      <span class="ws-words">0 words</span>
    </div>`;
  host.appendChild(root);

  const tabbarEl = root.querySelector<HTMLElement>(".tabbar")!;
  const editorPane = root.querySelector<HTMLElement>(".pane-editor")!;
  const previewPane = root.querySelector<HTMLElement>(".pane-preview")!;
  const wsName = root.querySelector<HTMLElement>(".ws-name")!;
  const wsWords = root.querySelector<HTMLElement>(".ws-words")!;

  let lineNums = true;
  let focusedPane: "editor" | "preview" = "editor";
  let editorZoom = 1;
  let previewZoom = 1;
  let previewAutoFit = true;
  let previewText = "";
  let previewPathOrName: string | null = null;
  let lastMode: ViewMode | null = null;

  root.addEventListener("mousedown", () => h.onFocusWindow(windowId));
  editorPane.addEventListener("mousedown", () => {
    focusedPane = "editor";
  });
  previewPane.addEventListener("mousedown", () => {
    focusedPane = "preview";
  });

  root.querySelectorAll<HTMLElement>("[data-mode]").forEach((btn) =>
    btn.addEventListener("click", () => h.onSetMode(windowId, btn.dataset.mode as ViewMode))
  );
  root.querySelector(".wt-lines")!.addEventListener("click", () => h.onToggleLineNumbers());
  root.querySelector(".wt-sub")?.addEventListener("click", () => h.onToggleSub());
  root.querySelector(".wt-subclose")?.addEventListener("click", () => h.onToggleSub());

  const seam = root.querySelector<HTMLElement>(".seam")!;
  seam.addEventListener("mousedown", (event) => {
    event.preventDefault();
    const panes = root.querySelector<HTMLElement>(".window-panes")!;
    document.body.classList.add("resizing-panes");
    const onMove = (moveEvent: MouseEvent): void => {
      const rect = panes.getBoundingClientRect();
      const ratio = Math.max(
        0.2,
        Math.min(0.8, (moveEvent.clientX - rect.left) / rect.width),
      );
      editorPane.style.flex = `0 0 ${ratio * 100}%`;
      previewPane.style.flex = "1 1 0";
      editor.requestMeasure();
    };
    const onUp = (): void => {
      document.body.classList.remove("resizing-panes");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      editor.requestMeasure();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  const editor = createEditor(editorPane, (tabId, text) => h.onDocChange(windowId, tabId, text));

  function render(): void {
    const w = getWindow(windowId);
    if (!w) return;
    // mode class
    root.classList.remove("window-mode-editor", "window-mode-preview", "window-mode-split");
    root.classList.add(`window-mode-${w.mode}`);
    if (
      lastMode !== null &&
      lastMode !== w.mode &&
      isHtmlFile(previewPathOrName)
    ) {
      previewAutoFit = true;
      renderPreview(previewText, previewPathOrName);
    }
    lastMode = w.mode;
    root.classList.toggle("active", getState().activeWindowId === windowId);
    // toolbar active states
    root.querySelectorAll<HTMLElement>("[data-mode]").forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.mode === w.mode)
    );
    root.querySelector(".wt-lines")!.classList.toggle("active", lineNums);
    const sub = root.querySelector(".wt-sub");
    if (sub) sub.classList.toggle("active", getState().windows.length > 1);
    const active = w.tabs.find((tab) => tab.id === w.activeTabId);
    wsName.textContent = active?.path ?? active?.name ?? "";
    // tabs
    tabbarEl.innerHTML = "";
    tabbarEl.classList.toggle("empty", w.tabs.length === 0);
    for (const t of w.tabs) {
      const tab = document.createElement("div");
      tab.className =
        "tab" +
        (t.id === w.activeTabId ? " active" : "") +
        (t.pinned ? " pinned" : "");
      tab.addEventListener("click", () => h.onActivateTab(windowId, t.id));
      tab.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        h.onTabContextMenu(
          windowId,
          t.id,
          event.clientX,
          event.clientY,
        );
      });
      const dot = document.createElement("span");
      dot.className =
        "tab-dot" +
        (t.dirty ? " dirty" : "") +
        (t.pinned ? " pinned" : "");
      dot.textContent = t.pinned ? "•" : "";
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

  function renderPreview(
    text: string,
    pathOrName: string | null = null,
  ): void {
    previewText = text;
    previewPathOrName = pathOrName;
    previewPane.replaceChildren();
    if (isHtmlFile(pathOrName)) {
      const autoFit =
        previewAutoFit && getWindow(windowId)?.mode === "split";
      const frame = document.createElement("iframe");
      frame.className = "html-preview-frame";
      frame.title = `Preview of ${pathOrName ?? "HTML document"}`;
      frame.setAttribute("sandbox", "allow-forms allow-scripts");
      frame.srcdoc = htmlWithPreviewZoom(text, previewZoom, autoFit);
      frame.addEventListener("focus", () => {
        focusedPane = "preview";
      });
      previewPane.appendChild(frame);
    } else {
      const article = document.createElement("article");
      article.className = "doc";
      article.style.zoom = String(previewZoom);
      article.innerHTML = renderMarkdown(text);
      previewPane.appendChild(article);
      enhancePreview(previewPane);
    }
    const count = countWords(text);
    wsWords.textContent = `${count} ${count === 1 ? "word" : "words"}`;
  }

  function setPreviewZoom(next: number): void {
    previewZoom = Math.max(0.25, Math.min(2, next));
    root.querySelector<HTMLElement>(".wt-preview-reset")!.textContent =
      previewAutoFit &&
      isHtmlFile(previewPathOrName) &&
      getWindow(windowId)?.mode === "split"
        ? "Fit"
        : `${Math.round(previewZoom * 100)}%`;
    renderPreview(previewText, previewPathOrName);
  }

  function setEditorZoom(next: number): void {
    editorZoom = Math.max(0.5, Math.min(2, next));
    root.style.setProperty("--editor-zoom", String(editorZoom));
    editor.requestMeasure();
  }

  root
    .querySelectorAll<HTMLElement>("[data-preview-zoom]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.previewZoom;
        if (action === "in") {
          previewAutoFit = false;
          setPreviewZoom(previewZoom + 0.1);
        } else if (action === "out") {
          previewAutoFit = false;
          setPreviewZoom(previewZoom - 0.1);
        } else {
          previewAutoFit = true;
          setPreviewZoom(1);
        }
      });
    });

  return {
    id: windowId,
    editor,
    render,
    renderPreview,
    adjustFocusedZoom: (delta) => {
      if (focusedPane === "editor") {
        setEditorZoom(editorZoom + delta);
      } else {
        previewAutoFit = false;
        setPreviewZoom(previewZoom + delta);
      }
    },
    resetFocusedZoom: () => {
      if (focusedPane === "editor") {
        setEditorZoom(1);
      } else {
        previewAutoFit = true;
        setPreviewZoom(1);
      }
    },
    requestMeasure: () => editor.requestMeasure(),
    focus: () => {
      focusedPane = "editor";
      editor.focus();
    },
    destroy: () => root.remove(),
    setLineNumbersFlag: (on: boolean) => {
      lineNums = on;
    },
  };
}
