export function isHtmlFile(pathOrName: string | null | undefined): boolean {
  return /\.html?$/i.test(pathOrName ?? "");
}

export function htmlWithPreviewZoom(
  html: string,
  zoom: number,
  autoFit = false,
): string {
  const style = `<style data-mdflow-preview-zoom>html{zoom:${zoom}!important}</style>`;
  const script = autoFit
    ? `<script data-mdflow-preview-fit>
(() => {
  const fit = () => {
    const root = document.documentElement;
    root.style.zoom = "1";
    requestAnimationFrame(() => {
      const target =
        document.querySelector("#frame,[data-mdflow-fit],svg,canvas,img") ||
        document.body;
      const rect = target.getBoundingClientRect();
      const width = Math.max(rect.width, target.scrollWidth || 0, 1);
      const height = Math.max(rect.height, target.scrollHeight || 0, 1);
      const scale = Math.min(innerWidth / width, innerHeight / height, 1);
      root.style.zoom = String(Math.max(0.1, scale));
    });
  };
  addEventListener("DOMContentLoaded", fit, { once: true });
  addEventListener("resize", fit);
  setTimeout(fit, 100);
})();
</script>`
    : "";
  const injection = `${style}${script}`;
  const headEnd = html.search(/<\/head\s*>/i);
  if (headEnd >= 0) {
    return `${html.slice(0, headEnd)}${injection}${html.slice(headEnd)}`;
  }
  return `${injection}${html}`;
}
