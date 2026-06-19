import { convertFileSrc } from "@tauri-apps/api/core";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export async function renderPdf(
  host: HTMLElement,
  path: string,
): Promise<void> {
  host.innerHTML = '<div class="pdf-loading">Loading PDF…</div>';
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const document = await pdfjs.getDocument({
    url: convertFileSrc(path),
  }).promise;
  host.innerHTML = "";
  const container = window.document.createElement("div");
  container.className = "pdf-document";
  host.appendChild(container);

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.4 });
    const canvas = window.document.createElement("canvas");
    canvas.className = "pdf-page";
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    container.appendChild(canvas);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is unavailable");
    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;
  }
}
