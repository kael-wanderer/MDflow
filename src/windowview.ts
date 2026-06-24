import { createEditor, type EditorHandle } from "./editor";
import {
  documentViewModes,
  fileLanguageInfo,
  htmlPreviewFrameScale,
  htmlWithPreviewZoom,
  isExcalidrawFile,
  isHtmlFile,
  isMarkdownFile,
  isMindmapFile,
  isPdfFile,
  normalizeDocumentViewMode,
} from "./document-kind";
import { glyphs } from "./glyphs";
import { renderMarkdown } from "./preview";
import { enhancePreview } from "./render-extras";
import { getWindow, getState } from "./store";
import type { ViewMode } from "./state";
import type { MarkdownFormat } from "./markdown-format";
import { THEME_OPTIONS, type ThemeName } from "./settings";
import { renderPdf, scrollPdfToPage, type PdfFindHandle } from "./pdfview";
import { FILE_ICON_TEXT, fileIcon } from "./icons";
import {
  activateTextMatch,
  clearTextHighlights,
  highlightText,
} from "./preview-find";

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
  onSave: (windowId: string) => void;
  onOpen: (windowId: string) => void;
  onResetMindmap: (windowId: string) => void;
  onThemeChange: (theme: ThemeName) => void;
  getTheme: () => ThemeName;
  onEditorContextMenu: (windowId: string, x: number, y: number) => void;
};

export type WindowView = {
  id: string;
  editor: EditorHandle;
  render: () => void;
  renderPreview: (text: string, pathOrName?: string | null) => void;
  adjustFocusedZoom: (delta: number) => void;
  resetFocusedZoom: () => void;
  requestMeasure: () => void;
  captureBoard: () => {
    png: () => Promise<HTMLCanvasElement>;
    svg?: () => Promise<string>;
  } | null;
  focus: () => void;
  destroy: () => void;
  setLineNumbersFlag: (on: boolean) => void;
  openPdfPage: (page: number) => void;
  openFind: () => boolean;
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
          <button class="wt-btn" data-mode="split" type="button" title="Editor + Preview">${glyphs.split}</button>
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
      <div class="pane pane-editor">
        <div class="format-toolbar" role="toolbar" aria-label="Markdown formatting">
          <button type="button" data-format="bold" title="Bold" aria-label="Bold"><strong>B</strong></button>
          <button type="button" data-format="italic" title="Italic" aria-label="Italic"><em>I</em></button>
          <button type="button" data-format="heading" title="Cycle heading" aria-label="Cycle heading">H</button>
          <button type="button" data-format="link" title="Link" aria-label="Link">↗</button>
          <button type="button" data-format="code" title="Inline code" aria-label="Inline code">&lt;/&gt;</button>
          <button type="button" data-format="quote" title="Quote" aria-label="Quote">❯</button>
          <button type="button" data-format="bullet" title="Bullet list" aria-label="Bullet list">•</button>
          <button type="button" data-format="task" title="Task list" aria-label="Task list">☑</button>
          <button type="button" data-format="table" title="Insert table" aria-label="Insert table">▦</button>
          <button type="button" data-format="rule" title="Horizontal rule" aria-label="Horizontal rule">—</button>
        </div>
        <div class="editor-surface"></div>
      </div>
      <div class="seam"></div>
      <div class="pane pane-preview"></div>
      <div class="preview-find hidden" role="search">
        <input type="text" aria-label="Find in reading view" placeholder="Find" />
        <span class="preview-find-status">0/0</span>
        <button type="button" data-find="previous" title="Previous match">↑</button>
        <button type="button" data-find="next" title="Next match">↓</button>
        <button type="button" data-find="close" title="Close">×</button>
      </div>
    </div>
    <div class="window-status">
      <span class="ws-name"></span>
      <div class="ws-right">
        <select class="ws-theme" aria-label="Theme" title="Quick theme"></select>
        <span class="ws-words">0 words</span>
        <span class="ws-cursor">Ln 1, Col 1</span>
        <span class="ws-language">
          <span class="ws-file-icon"></span>
          <span class="ws-language-label">Plain text</span>
        </span>
      </div>
    </div>`;
  host.appendChild(root);

  const tabbarEl = root.querySelector<HTMLElement>(".tabbar")!;
  const editorPane = root.querySelector<HTMLElement>(".pane-editor")!;
  const editorSurface = root.querySelector<HTMLElement>(".editor-surface")!;
  const formatToolbar = root.querySelector<HTMLElement>(".format-toolbar")!;
  const previewPane = root.querySelector<HTMLElement>(".pane-preview")!;
  previewPane.tabIndex = -1;
  const wsName = root.querySelector<HTMLElement>(".ws-name")!;
  const wsWords = root.querySelector<HTMLElement>(".ws-words")!;
  const wsCursor = root.querySelector<HTMLElement>(".ws-cursor")!;
  const wsFileIcon = root.querySelector<HTMLElement>(".ws-file-icon")!;
  const wsLanguage = root.querySelector<HTMLElement>(".ws-language")!;
  const wsLanguageLabel = root.querySelector<HTMLElement>(".ws-language-label")!;
  const themeSelect = root.querySelector<HTMLSelectElement>(".ws-theme")!;
  for (const theme of THEME_OPTIONS) {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.label;
    themeSelect.appendChild(option);
  }
  themeSelect.addEventListener("change", () => {
    h.onThemeChange(themeSelect.value as ThemeName);
  });

  let lineNums = true;
  let focusedPane: "editor" | "preview" = "editor";
  let editorZoom = 1;
  let previewZoom = 1;
  let previewAutoFit = true;
  let previewText = "";
  let previewPathOrName: string | null = null;
  let pdfTargetPage: number | undefined;
  let pdfFind: PdfFindHandle | null = null;
  let textFindMatches: HTMLElement[] = [];
  let textFindIndex = -1;
  let previewFrame: HTMLIFrameElement | null = null;
  let previewCanvas: HTMLElement | null = null;
  let lastMode: ViewMode | null = null;
  let boardDestroy: (() => void) | null = null;
  let boardCapture: {
    png: () => Promise<HTMLCanvasElement>;
    svg?: () => Promise<string>;
  } | null = null;
  let boardZoom: {
    zoomBy: (delta: number) => void;
    reset: () => void;
  } | null = null;
  let boardRenderToken = 0;
  const findBar = root.querySelector<HTMLElement>(".preview-find")!;
  const findInput = findBar.querySelector<HTMLInputElement>("input")!;
  const findStatus =
    findBar.querySelector<HTMLElement>(".preview-find-status")!;

  const updateFindStatus = (count: number, active: number): void => {
    findStatus.textContent = `${active}/${count}`;
  };
  const runFind = (): void => {
    if (pdfFind) {
      const count = pdfFind.setQuery(findInput.value);
      updateFindStatus(count, count ? 1 : 0);
      return;
    }
    const article = previewPane.querySelector<HTMLElement>("article.doc");
    textFindMatches = article ? highlightText(article, findInput.value) : [];
    textFindIndex = textFindMatches.length ? 0 : -1;
    const result = activateTextMatch(textFindMatches, textFindIndex);
    updateFindStatus(result.count, result.active);
  };
  const moveFind = (delta: number): void => {
    if (pdfFind) {
      const result = pdfFind.move(delta);
      updateFindStatus(result.count, result.active);
      return;
    }
    if (!textFindMatches.length) return;
    textFindIndex =
      (textFindIndex + delta + textFindMatches.length) %
      textFindMatches.length;
    const result = activateTextMatch(textFindMatches, textFindIndex);
    updateFindStatus(result.count, result.active);
  };
  const closeFind = (): void => {
    findBar.classList.add("hidden");
    pdfFind?.clear();
    const article = previewPane.querySelector<HTMLElement>("article.doc");
    if (article) clearTextHighlights(article);
    textFindMatches = [];
    textFindIndex = -1;
    previewPane.focus();
  };
  findInput.addEventListener("input", runFind);
  findInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      moveFind(event.shiftKey ? -1 : 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeFind();
    }
  });
  findBar.querySelector('[data-find="previous"]')!.addEventListener(
    "click",
    () => moveFind(-1),
  );
  findBar.querySelector('[data-find="next"]')!.addEventListener(
    "click",
    () => moveFind(1),
  );
  findBar.querySelector('[data-find="close"]')!.addEventListener(
    "click",
    closeFind,
  );

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

  const editor = createEditor(
    editorSurface,
    (tabId, text) => h.onDocChange(windowId, tabId, text),
    ({ line, column }) => {
      wsCursor.textContent = `Ln ${line}, Col ${column}`;
    },
  );
  editorSurface.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    h.onEditorContextMenu(windowId, event.clientX, event.clientY);
  });
  formatToolbar
    .querySelectorAll<HTMLButtonElement>("[data-format]")
    .forEach((button) => {
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        editor.applyMarkdownFormat(
          button.dataset.format as MarkdownFormat,
        );
      });
    });

  function render(): void {
    const w = getWindow(windowId);
    if (!w) return;
    const active = w.tabs.find((tab) => tab.id === w.activeTabId);
    const activeName = active?.path ?? active?.name;
    const isBoard = isExcalidrawFile(activeName) || isMindmapFile(activeName);
    const modes = documentViewModes(activeName);
    const effectiveMode = normalizeDocumentViewMode(activeName, w.mode);
    const language = fileLanguageInfo(activeName);
    // mode class
    root.classList.remove(
      "window-mode-editor",
      "window-mode-preview",
      "window-mode-split",
    );
    root.classList.add(`window-mode-${effectiveMode}`);
    root.classList.toggle("window-document-board", isBoard);
    // Drop any seam-resize inline flex outside split mode so the single visible
    // pane fills the row instead of keeping its split width.
    if (effectiveMode !== "split") {
      editorPane.style.flex = "";
      previewPane.style.flex = "";
    }
    if (
      lastMode !== null &&
      lastMode !== effectiveMode &&
      isHtmlFile(previewPathOrName)
    ) {
      previewAutoFit = true;
      renderPreview(previewText, previewPathOrName);
    }
    lastMode = effectiveMode;
    root.classList.toggle("active", getState().activeWindowId === windowId);
    // toolbar active states
    root.querySelectorAll<HTMLElement>("[data-mode]").forEach((btn) => {
      const mode = btn.dataset.mode as "editor" | "preview" | "split";
      btn.hidden = !modes.includes(mode);
      btn.classList.toggle("active", mode === effectiveMode);
    });
    root.querySelector<HTMLElement>(".preview-zoom-group")!.hidden =
      !modes.includes("preview") && !modes.includes("split");
    root.querySelector<HTMLElement>(".wt-lines")!.hidden =
      !modes.includes("editor") && !modes.includes("split");
    wsWords.hidden = !active;
    wsCursor.hidden =
      !active || (!modes.includes("editor") && !modes.includes("split"));
    wsLanguage.hidden = !active;
    root.querySelector(".wt-lines")!.classList.toggle("active", lineNums);
    const sub = root.querySelector(".wt-sub");
    if (sub) sub.classList.toggle("active", getState().windows.length > 1);
    formatToolbar.classList.toggle(
      "hidden",
      !active || !isMarkdownFile(active.path ?? active.name),
    );
    wsName.textContent = active?.path ?? active?.name ?? "";
    const detectedIcon = activeName ? fileIcon(activeName, false) : "file";
    const iconType = detectedIcon === "file" ? language.icon : detectedIcon;
    wsFileIcon.className = `ws-file-icon type-${iconType}`;
    wsFileIcon.textContent = FILE_ICON_TEXT[iconType] ?? "·";
    wsLanguageLabel.textContent = language.label;
    themeSelect.value = h.getTheme();
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
      const detectedTabIcon = fileIcon(t.path ?? t.name, false);
      const tabIconType =
        detectedTabIcon === "file"
          ? fileLanguageInfo(t.path ?? t.name).icon
          : detectedTabIcon;
      const tabIcon = document.createElement("span");
      tabIcon.className = `tab-file-icon type-${tabIconType}`;
      tabIcon.textContent = FILE_ICON_TEXT[tabIconType] ?? "·";
      const close = document.createElement("button");
      close.className = "tab-close";
      close.type = "button";
      close.textContent = "×";
      close.addEventListener("click", (e) => { e.stopPropagation(); h.onCloseTab(windowId, t.id); });
      tab.append(dot, tabIcon, name, close);
      tabbarEl.appendChild(tab);
    }
  }

  function renderPreview(
    text: string,
    pathOrName: string | null = null,
  ): void {
    previewText = text;
    previewPathOrName = pathOrName;
    if (isPdfFile(pathOrName)) {
      const token = ++boardRenderToken;
      boardDestroy?.();
      boardDestroy = null;
      boardCapture = null;
      boardZoom = null;
      previewFrame = null;
      previewCanvas = null;
      pdfFind = null;
      previewPane.innerHTML = '<div class="board-loading">Loading PDF…</div>';
      wsWords.textContent = "PDF";
      void renderPdf(previewPane, pathOrName!, pdfTargetPage)
        .then((handle) => {
          if (token !== boardRenderToken) {
            handle.clear();
            return;
          }
          pdfFind = handle;
          if (!findBar.classList.contains("hidden") && findInput.value) runFind();
        })
        .catch((error) => {
          if (token !== boardRenderToken) return;
          previewPane.textContent =
            error instanceof Error ? error.message : String(error);
        });
      return;
    }
    if (isExcalidrawFile(pathOrName)) {
      previewFrame = null;
      previewCanvas = null;
      const token = ++boardRenderToken;
      boardDestroy?.();
      boardDestroy = null;
      boardCapture = null;
      boardZoom = null;
      previewPane.innerHTML =
        '<div class="board-loading">Loading Excalidraw…</div>';
      wsWords.textContent = "Excalidraw board";
      void import("./excalidrawview")
        .then(({ mountExcalidrawBoard }) =>
          mountExcalidrawBoard(previewPane, text, (serialized) => {
            editor.setText(serialized);
          }),
        )
        .then((handle) => {
          if (token !== boardRenderToken) {
            handle.destroy();
            return;
          }
          boardDestroy = handle.destroy;
          boardCapture = {
            png: handle.exportPng,
            svg: handle.exportSvg,
          };
          boardZoom = null;
        })
        .catch((error) => {
          if (token !== boardRenderToken) return;
          previewPane.innerHTML = "";
          const message = document.createElement("div");
          message.className = "board-error";
          message.textContent =
            error instanceof Error ? error.message : String(error);
          previewPane.appendChild(message);
        });
      return;
    }
    if (isMindmapFile(pathOrName)) {
      previewFrame = null;
      previewCanvas = null;
      const token = ++boardRenderToken;
      boardDestroy?.();
      boardDestroy = null;
      boardCapture = null;
      boardZoom = null;
      previewPane.innerHTML = '<div class="board-loading">Loading mindmap…</div>';
      wsWords.textContent = "Mindmap";
      void import("./mindmapview")
        .then(({ mountMindmapBoard }) =>
          mountMindmapBoard(
            previewPane,
            text,
            (serialized) => editor.setText(serialized),
            () => h.onOpen(windowId),
            () => h.onSave(windowId),
            () => h.onResetMindmap(windowId),
          ),
        )
        .then((handle) => {
          if (token !== boardRenderToken) {
            handle.destroy();
            return;
          }
          boardDestroy = handle.destroy;
          boardCapture = { png: handle.capture };
          boardZoom = {
            zoomBy: handle.zoomBy,
            reset: handle.resetZoom,
          };
        })
        .catch((error) => {
          if (token !== boardRenderToken) return;
          previewPane.innerHTML = "";
          const message = document.createElement("div");
          message.className = "board-error";
          message.textContent =
            error instanceof Error ? error.message : String(error);
          previewPane.appendChild(message);
        });
      return;
    }
    boardRenderToken += 1;
    boardDestroy?.();
    boardDestroy = null;
    boardCapture = null;
    boardZoom = null;
    previewFrame = null;
    previewCanvas = null;
    pdfFind = null;
    previewPane.replaceChildren();
    if (!isMarkdownFile(pathOrName) && !isHtmlFile(pathOrName)) {
      const count = countWords(text);
      wsWords.textContent = `${count} ${count === 1 ? "word" : "words"}`;
      return;
    }
    if (isHtmlFile(pathOrName)) {
      const frame = document.createElement("iframe");
      frame.className = "html-preview-frame";
      frame.title = `Preview of ${pathOrName ?? "HTML document"}`;
      // allow-same-origin (no scripts) lets the parent read contentDocument to
      // apply zoom/fit live; untrusted HTML still can't run scripts.
      frame.setAttribute("sandbox", "allow-same-origin");
      // Keep the iframe document at native scale. Preview zoom is applied to the
      // already-painted iframe surface so WebKit does not relayout a large HTML/SVG
      // document and flash white on every zoom step.
      frame.srcdoc = htmlWithPreviewZoom(text, 1);
      frame.addEventListener("focus", () => {
        focusedPane = "preview";
      });
      frame.addEventListener("load", () => {
        if (frame.contentDocument) bindHtmlPreviewNav(frame.contentDocument);
        if (previewAutoFit && getWindow(windowId)?.mode === "split") {
          fitHtmlPreview();
        } else {
          applyHtmlZoom(previewZoom);
        }
      });
      const canvas = document.createElement("div");
      canvas.className = "html-preview-canvas";
      canvas.appendChild(frame);
      previewPane.appendChild(canvas);
      previewFrame = frame;
      previewCanvas = canvas;
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

  function updateZoomLabel(): void {
    root.querySelector<HTMLElement>(".wt-preview-reset")!.textContent =
      previewAutoFit &&
      isHtmlFile(previewPathOrName) &&
      getWindow(windowId)?.mode === "split"
        ? "Fit"
        : `${Math.round(previewZoom * 100)}%`;
  }

  // The HTML iframe swallows mouse/wheel events, so navigation is bound to its
  // same-origin contentDocument and drives the outer pane's scroll offsets.
  function bindHtmlPreviewNav(doc: Document): void {
    doc.addEventListener(
      "wheel",
      (event) => {
        if (event.ctrlKey) return; // leave pinch-zoom gestures alone
        if (event.metaKey || event.shiftKey) {
          const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
          if (delta !== 0) {
            previewPane.scrollLeft += delta;
            event.preventDefault();
          }
          return;
        }
        previewPane.scrollTop += event.deltaY;
        previewPane.scrollLeft += event.deltaX;
        event.preventDefault();
      },
      { passive: false },
    );

    let panning = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let startScrollX = 0;
    let startScrollY = 0;

    doc.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      panning = true;
      moved = false;
      startX = event.clientX;
      startY = event.clientY;
      startScrollX = previewPane.scrollLeft;
      startScrollY = previewPane.scrollTop;
    });

    doc.addEventListener("mousemove", (event) => {
      if (!panning) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      previewCanvas?.classList.add("panning");
      previewPane.scrollLeft = startScrollX - dx;
      previewPane.scrollTop = startScrollY - dy;
      event.preventDefault();
    });

    const endPan = (): void => {
      panning = false;
      previewCanvas?.classList.remove("panning");
    };
    doc.addEventListener("mouseup", endPan);
    doc.addEventListener("mouseleave", endPan);
  }

  // Scale the already-painted iframe surface. This stays on the compositor path,
  // avoiding the multi-second document reflow/repaint caused by CSS `zoom`.
  function applyHtmlZoom(zoom: number): void {
    if (!previewFrame || !previewCanvas) return;
    const scaled = htmlPreviewFrameScale(zoom);
    previewFrame.style.transform = scaled.transform;
    previewFrame.style.width = scaled.width;
    previewFrame.style.height = scaled.height;
    previewCanvas.style.width = scaled.canvasWidth;
    previewCanvas.style.height = scaled.canvasHeight;
  }

  // Scale the HTML preview to fit the pane (used in split auto-fit mode).
  function fitHtmlPreview(): void {
    const doc = previewFrame?.contentDocument;
    if (!doc) return;
    applyHtmlZoom(1);
    requestAnimationFrame(() => {
      const target =
        doc.querySelector<HTMLElement>("#frame,[data-mdflow-fit],svg,canvas,img") ??
        doc.body;
      if (!target) return;
      const width = Math.max(target.scrollWidth, target.offsetWidth ?? 0, 1);
      const height = Math.max(target.scrollHeight, target.offsetHeight ?? 0, 1);
      const scale = Math.max(
        0.1,
        Math.min(previewPane.clientWidth / width, previewPane.clientHeight / height, 1),
      );
      previewZoom = scale;
      applyHtmlZoom(scale);
      updateZoomLabel();
    });
  }

  function setPreviewZoom(next: number): void {
    previewZoom = Math.max(0.25, Math.min(2, next));
    updateZoomLabel();
    // HTML preview: update in place (no iframe reload, no white flash).
    if (isHtmlFile(previewPathOrName) && previewFrame) {
      if (previewAutoFit && getWindow(windowId)?.mode === "split") {
        fitHtmlPreview();
      } else {
        applyHtmlZoom(previewZoom);
      }
      return;
    }
    renderPreview(previewText, previewPathOrName);
  }

  function setEditorZoom(next: number): void {
    editorZoom = Math.max(0.5, Math.min(2, next));
    root.style.setProperty("--editor-zoom", String(editorZoom));
    editor.requestMeasure();
  }

  const previewResizeObserver = new ResizeObserver(() => {
    if (
      isHtmlFile(previewPathOrName) &&
      previewFrame &&
      previewAutoFit &&
      getWindow(windowId)?.mode === "split"
    ) {
      fitHtmlPreview();
    }
  });
  previewResizeObserver.observe(previewPane);

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
      if (isMindmapFile(previewPathOrName)) {
        boardZoom?.zoomBy(delta);
        return;
      }
      if (isExcalidrawFile(previewPathOrName)) return;
      if (focusedPane === "editor") {
        setEditorZoom(editorZoom + delta);
      } else {
        previewAutoFit = false;
        setPreviewZoom(previewZoom + delta);
      }
    },
    resetFocusedZoom: () => {
      if (isMindmapFile(previewPathOrName)) {
        boardZoom?.reset();
        return;
      }
      if (isExcalidrawFile(previewPathOrName)) return;
      if (focusedPane === "editor") {
        setEditorZoom(1);
      } else {
        previewAutoFit = true;
        setPreviewZoom(1);
      }
    },
    requestMeasure: () => editor.requestMeasure(),
    captureBoard: () => boardCapture,
    focus: () => {
      if (isExcalidrawFile(previewPathOrName) || isMindmapFile(previewPathOrName)) {
        focusedPane = "preview";
        previewPane.focus();
        return;
      }
      focusedPane = "editor";
      editor.focus();
    },
    destroy: () => {
      boardRenderToken += 1;
      boardDestroy?.();
      previewResizeObserver.disconnect();
      root.remove();
    },
    setLineNumbersFlag: (on: boolean) => {
      lineNums = on;
    },
    openPdfPage: (page: number) => {
      pdfTargetPage = page;
      let attempts = 0;
      const scrollWhenReady = (): void => {
        attempts += 1;
        if (!scrollPdfToPage(previewPane, page) && attempts < 40) {
          window.setTimeout(scrollWhenReady, 100);
        }
      };
      scrollWhenReady();
    },
    openFind: () => {
      const state = getWindow(windowId);
      const tab = state?.tabs.find((item) => item.id === state.activeTabId);
      const effectiveMode = normalizeDocumentViewMode(
        tab?.path ?? tab?.name,
        state?.mode ?? "editor",
      );
      if (
        !isPdfFile(previewPathOrName) &&
        effectiveMode !== "preview" &&
        focusedPane !== "preview"
      ) {
        return false;
      }
      if (!isPdfFile(previewPathOrName) && !isMarkdownFile(previewPathOrName)) {
        return false;
      }
      findBar.classList.remove("hidden");
      findInput.focus();
      findInput.select();
      if (findInput.value) runFind();
      return true;
    },
  };
}
