export const PDF_PAGE_PADDING = 18;

export function pdfClampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.max(0.25, Math.min(4, zoom));
}

export function pdfFitWidthZoom(
  maxPagePointWidth: number,
  paneClientWidth: number,
): number {
  if (!Number.isFinite(maxPagePointWidth) || maxPagePointWidth <= 0) {
    return 1;
  }
  const usable = Math.max(1, paneClientWidth - PDF_PAGE_PADDING * 2);
  return pdfClampZoom(usable / maxPagePointWidth);
}

export function pdfPageBox(
  pointWidth: number,
  pointHeight: number,
  zoom: number,
): { width: string; height: string } {
  const safeZoom = pdfClampZoom(zoom);
  return {
    width: `${Math.max(1, pointWidth) * safeZoom}px`,
    height: `${Math.max(1, pointHeight) * safeZoom}px`,
  };
}

export function pdfInnerTransform(zoom: number, renderedZoom: number): string {
  const safeRendered =
    Number.isFinite(renderedZoom) && renderedZoom > 0 ? renderedZoom : 1;
  return `scale(${pdfClampZoom(zoom) / safeRendered})`;
}
