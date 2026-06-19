export function isHtmlFile(pathOrName: string | null | undefined): boolean {
  return /\.html?$/i.test(pathOrName ?? "");
}

export function htmlWithPreviewZoom(
  html: string,
  zoom: number,
): string {
  const style = `<style data-mdflow-preview-zoom>html{zoom:${zoom}!important}</style>`;
  const headEnd = html.search(/<\/head\s*>/i);
  if (headEnd >= 0) {
    return `${html.slice(0, headEnd)}${style}${html.slice(headEnd)}`;
  }
  return `${style}${html}`;
}
