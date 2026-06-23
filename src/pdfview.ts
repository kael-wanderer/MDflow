import { invoke } from "@tauri-apps/api/core";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { installReadableStreamAsyncIterator } from "./readable-stream-iter";

export type PdfFindHandle = {
  setQuery: (query: string) => number;
  move: (delta: number) => { count: number; active: number };
  clear: () => void;
};

export async function renderPdf(
  host: HTMLElement,
  path: string,
  initialPage?: number,
): Promise<PdfFindHandle> {
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
  const pages: { element: HTMLElement; text: string }[] = [];
  let matches: number[] = [];
  let active = -1;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.4 });
    const pageElement = window.document.createElement("div");
    pageElement.className = "pdf-page-wrap";
    pageElement.dataset.page = String(pageNumber);
    const canvas = window.document.createElement("canvas");
    canvas.className = "pdf-page";
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    pageElement.appendChild(canvas);
    container.appendChild(pageElement);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is unavailable");
    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;
    // Text extraction powers the find feature; never let it block the visible
    // page render (it can fail per-file on some PDFs).
    let pageText = "";
    try {
      const textContent = await page.getTextContent();
      const textLayer = window.document.createElement("div");
      textLayer.className = "pdf-text-layer";
      textLayer.style.setProperty(
        "--total-scale-factor",
        String(viewport.scale),
      );
      pageElement.appendChild(textLayer);
      await new pdfjs.TextLayer({
        textContentSource: textContent,
        container: textLayer,
        viewport,
      }).render();
      pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
    } catch {
      // Page stays visible; it just won't be searchable.
    }
    pages.push({ element: pageElement, text: pageText });
    if (pageNumber === initialPage) {
      pageElement.scrollIntoView({ block: "start" });
    }
  }

  const clear = (): void => {
    pages.forEach(({ element }) => {
      element.classList.remove("pdf-find-page", "active");
      element.querySelector(".pdf-find-count")?.remove();
      element
        .querySelectorAll(".pdf-text-match")
        .forEach((match) => match.classList.remove("pdf-text-match"));
    });
    matches = [];
    active = -1;
  };
  const move = (delta: number): { count: number; active: number } => {
    if (!matches.length) return { count: 0, active: 0 };
    active = (active + delta + matches.length) % matches.length;
    pages.forEach(({ element }) => element.classList.remove("active"));
    const page = pages[matches[active]];
    page.element.classList.add("active");
    page.element.scrollIntoView({ block: "center", behavior: "smooth" });
    return { count: matches.length, active: active + 1 };
  };
  return {
    setQuery: (query) => {
      clear();
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!escaped) return 0;
      const pattern = new RegExp(escaped, "gi");
      pages.forEach((page, pageIndex) => {
        const count = [...page.text.matchAll(pattern)].length;
        if (!count) return;
        page.element.classList.add("pdf-find-page");
        page.element
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
        page.element.appendChild(badge);
        for (let index = 0; index < count; index += 1) matches.push(pageIndex);
      });
      if (matches.length) move(1);
      return matches.length;
    },
    move,
    clear,
  };
}

export function scrollPdfToPage(host: HTMLElement, page: number): boolean {
  const element = host.querySelector<HTMLElement>(
    `.pdf-page-wrap[data-page="${page}"]`,
  );
  element?.scrollIntoView({ block: "start", behavior: "smooth" });
  return Boolean(element);
}
