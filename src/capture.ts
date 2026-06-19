export async function toCanvas(
  node: HTMLElement,
): Promise<HTMLCanvasElement> {
  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(node.scrollHeight));
  const clone = node.cloneNode(true) as HTMLElement;
  const html = new XMLSerializer().serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    '<foreignObject width="100%" height="100%">' +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;background:#fff;color:#111;padding:16px;width:${width}px">${html}</div>` +
    "</foreignObject></svg>";
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("Could not rasterize preview"));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is unavailable");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0);
  return canvas;
}
