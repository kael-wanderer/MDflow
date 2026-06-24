import { invoke } from "@tauri-apps/api/core";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  pdfClampZoom,
  pdfFitWidthZoom,
  pdfInnerTransform,
  pdfPageBox,
} from "./pdf-zoom";
import { installReadableStreamAsyncIterator } from "./readable-stream-iter";

type PdfPageProxy = import("pdfjs-dist").PDFPageProxy;

export type PdfViewHandle = {
  setQuery: (query: string) => number;
  move: (delta: number) => { count: number; active: number };
  clear: () => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  fitWidthZoom: (paneClientWidth: number) => number;
  maxPagePointWidth: number;
};

export type PdfFindHandle = PdfViewHandle;

type PageInfo = {
  index: number;
  page: PdfPageProxy;
  wrap: HTMLElement;
  inner: HTMLElement;
  canvas: HTMLCanvasElement;
  pointWidth: number;
  pointHeight: number;
  text: string;
};

const RERENDER_DELAY_MS = 200;

function supersample(): number {
  return Math.min(
    2,
    Math.max(
      1,
      typeof window.devicePixelRatio === "number" ? window.devicePixelRatio : 1,
    ),
  );
}

export async function renderPdf(
  host: HTMLElement,
  path: string,
  options?: { initialPage?: number; initialZoom?: number },
): Promise<PdfViewHandle> {
  host.innerHTML = '<div class="pdf-loading">Loading PDF…</div>';
  installReadableStreamAsyncIterator();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const bytes = await invoke<number[]>("read_file_bytes", { path });
  const document = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
  }).promise;
  host.innerHTML = "";
  const container = window.document.createElement("div");
  container.className = "pdf-document";
  container.dataset.path = path;
  host.appendChild(container);

  const pages: PageInfo[] = [];
  let matches: number[] = [];
  let active = -1;
  let currentQuery = "";
  let zoom = pdfClampZoom(options?.initialZoom ?? 1);
  let renderedZoom = zoom;
  let rerenderToken = 0;
  let rerenderTimer: ReturnType<typeof setTimeout> | undefined;
  let maxPagePointWidth = 0;

  async function paintPage(info: PageInfo, atZoom: number): Promise<void> {
    const cssViewport = info.page.getViewport({ scale: atZoom });
    const pixelViewport = info.page.getViewport({
      scale: atZoom * supersample(),
    });
    const nextCanvas = window.document.createElement("canvas");
    nextCanvas.className = "pdf-page";
    nextCanvas.width = pixelViewport.width;
    nextCanvas.height = pixelViewport.height;
    nextCanvas.style.width = `${cssViewport.width}px`;
    nextCanvas.style.height = `${cssViewport.height}px`;
    const context = nextCanvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is unavailable");
    await info.page.render({
      canvas: nextCanvas,
      canvasContext: context,
      viewport: pixelViewport,
    }).promise;

    const oldTextLayer = info.inner.querySelector(".pdf-text-layer");
    let nextTextLayer: HTMLElement | null = null;
    try {
      const textContent = await info.page.getTextContent();
      const textLayer = window.document.createElement("div");
      textLayer.className = "pdf-text-layer";
      textLayer.style.visibility = "hidden";
      textLayer.style.setProperty(
        "--total-scale-factor",
        String(cssViewport.scale),
      );
      info.inner.appendChild(textLayer);
      await new pdfjs.TextLayer({
        textContentSource: textContent,
        container: textLayer,
        viewport: cssViewport,
      }).render();
      nextTextLayer = textLayer;
    } catch {
      // Page stays visible; it just will not expose a text layer until a later paint.
    }

    info.canvas.replaceWith(nextCanvas);
    info.canvas = nextCanvas;
    oldTextLayer?.remove();
    if (nextTextLayer) nextTextLayer.style.visibility = "";
  }

  function applyInstantZoom(): void {
    for (const info of pages) {
      const box = pdfPageBox(info.pointWidth, info.pointHeight, zoom);
      info.wrap.style.width = box.width;
      info.wrap.style.height = box.height;
      info.inner.style.transform = pdfInnerTransform(zoom, renderedZoom);
    }
  }

  function clearDecorations(): void {
    pages.forEach(({ wrap }) => {
      wrap.classList.remove("pdf-find-page", "active");
      wrap.querySelector(".pdf-find-count")?.remove();
      wrap
        .querySelectorAll(".pdf-text-match")
        .forEach((match) => match.classList.remove("pdf-text-match"));
    });
    matches = [];
    active = -1;
  }

  function clear(): void {
    clearDecorations();
    currentQuery = "";
  }

  function move(delta: number): { count: number; active: number } {
    if (!matches.length) return { count: 0, active: 0 };
    active = (active + delta + matches.length) % matches.length;
    pages.forEach(({ wrap }) => wrap.classList.remove("active"));
    const page = pages[matches[active]];
    page.wrap.classList.add("active");
    page.wrap.scrollIntoView({ block: "center", behavior: "smooth" });
    return { count: matches.length, active: active + 1 };
  }

  function applyQuery(query: string, preferredActive = 0): number {
    clearDecorations();
    currentQuery = query;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!escaped) return 0;
    const pattern = new RegExp(escaped, "gi");
    pages.forEach((page, pageIndex) => {
      const count = [...page.text.matchAll(pattern)].length;
      if (!count) return;
      page.wrap.classList.add("pdf-find-page");
      page.inner
        .querySelectorAll<HTMLElement>(".pdf-text-layer span")
        .forEach((span) => {
          pattern.lastIndex = 0;
          if (pattern.test(span.textContent ?? "")) {
            span.classList.add("pdf-text-match");
          }
        });
      const badge = window.document.createElement("span");
      badge.className = "pdf-find-count";
      badge.textContent = `${count} match${count === 1 ? "" : "es"}`;
      page.wrap.appendChild(badge);
      for (let index = 0; index < count; index += 1) matches.push(pageIndex);
    });
    if (matches.length) {
      active = Math.max(-1, Math.min(preferredActive - 1, matches.length - 2));
      move(1);
    }
    return matches.length;
  }

  async function crispRerender(): Promise<void> {
    const token = ++rerenderToken;
    const targetZoom = zoom;
    for (const info of visibleFirstPages()) {
      if (token !== rerenderToken) return;
      await paintPage(info, targetZoom);
      info.inner.style.transform = "scale(1)";
    }
    if (token !== rerenderToken) return;
    renderedZoom = targetZoom;
    applyInstantZoom();
    if (currentQuery) applyQuery(currentQuery, active);
  }

  function scheduleCrispRerender(): void {
    if (rerenderTimer) clearTimeout(rerenderTimer);
    rerenderTimer = setTimeout(() => void crispRerender(), RERENDER_DELAY_MS);
  }

  function visibleFirstPages(): PageInfo[] {
    const hostRect = host.getBoundingClientRect();
    const distance = (info: PageInfo): number => {
      const rect = info.wrap.getBoundingClientRect();
      if (rect.bottom >= hostRect.top && rect.top <= hostRect.bottom) return 0;
      return Math.min(
        Math.abs(rect.top - hostRect.bottom),
        Math.abs(hostRect.top - rect.bottom),
      );
    };
    return [...pages].sort((a, b) => distance(a) - distance(b));
  }

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const pointViewport = page.getViewport({ scale: 1 });
    const pointWidth = pointViewport.width;
    const pointHeight = pointViewport.height;
    maxPagePointWidth = Math.max(maxPagePointWidth, pointWidth);

    const wrap = window.document.createElement("div");
    wrap.className = "pdf-page-wrap";
    wrap.dataset.page = String(pageNumber);
    const inner = window.document.createElement("div");
    inner.className = "pdf-page-inner";
    const canvas = window.document.createElement("canvas");
    canvas.className = "pdf-page";
    inner.appendChild(canvas);
    wrap.appendChild(inner);
    container.appendChild(wrap);

    const info: PageInfo = {
      index: pageNumber - 1,
      page,
      wrap,
      inner,
      canvas,
      pointWidth,
      pointHeight,
      text: "",
    };
    pages.push(info);
    applyInstantZoom();
    await paintPage(info, renderedZoom);

    try {
      const textContent = await page.getTextContent();
      info.text = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
    } catch {
      info.text = "";
    }

    if (pageNumber === options?.initialPage) {
      wrap.scrollIntoView({ block: "start" });
    }
  }
  applyInstantZoom();

  return {
    setQuery: applyQuery,
    move,
    clear,
    setZoom: (next) => {
      zoom = pdfClampZoom(next);
      applyInstantZoom();
      scheduleCrispRerender();
    },
    getZoom: () => zoom,
    fitWidthZoom: (paneClientWidth) =>
      pdfFitWidthZoom(maxPagePointWidth, paneClientWidth),
    maxPagePointWidth,
  };
}

export function scrollPdfToPage(host: HTMLElement, page: number): boolean {
  const element = host.querySelector<HTMLElement>(
    `.pdf-page-wrap[data-page="${page}"]`,
  );
  element?.scrollIntoView({ block: "start", behavior: "smooth" });
  return Boolean(element);
}
