export function isHtmlFile(pathOrName: string | null | undefined): boolean {
  return /\.html?$/i.test(pathOrName ?? "");
}

export function isExcalidrawFile(
  pathOrName: string | null | undefined,
): boolean {
  return /\.excalidraw$/i.test(pathOrName ?? "");
}

export function isMindmapFile(
  pathOrName: string | null | undefined,
): boolean {
  return /\.mind$/i.test(pathOrName ?? "");
}

export function isMarkdownFile(pathOrName: string | null | undefined): boolean {
  if (!pathOrName || !/[.]/.test(pathOrName.split(/[\\/]/).pop() ?? "")) {
    return true;
  }
  return /\.(md|markdown)$/i.test(pathOrName);
}

// Inject only a zoom style. The preview iframe runs no scripts (sandbox is
// allow-same-origin), so the parent reads contentDocument to apply zoom and
// auto-fit in place — no reload, no white flash.
export function htmlWithPreviewZoom(html: string, zoom: number): string {
  const injection = `<style data-mdflow-preview-zoom>html{zoom:${zoom}!important}</style>`;
  const headEnd = html.search(/<\/head\s*>/i);
  if (headEnd >= 0) {
    return `${html.slice(0, headEnd)}${injection}${html.slice(headEnd)}`;
  }
  return `${injection}${html}`;
}
