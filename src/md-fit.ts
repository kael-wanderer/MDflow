export const MD_FIT_MIN_ZOOM = 0.5;

// Given the rendered article's content width (its scrollWidth, which already includes
// the article padding) and the pane's client width, return the zoom that makes the
// content fit, floored so text stays legible. Returns 1 when the content already fits —
// the normal case, since wide tables/code/diagrams self-scroll and so do not widen the
// article.
export function mdFitZoom(
  contentWidthPx: number,
  paneClientWidth: number,
): number {
  if (!Number.isFinite(contentWidthPx) || contentWidthPx <= 0) return 1;
  if (!Number.isFinite(paneClientWidth) || paneClientWidth <= 0) {
    return MD_FIT_MIN_ZOOM;
  }
  const ratio = paneClientWidth / contentWidthPx;
  if (ratio >= 1) return 1;
  return Math.max(MD_FIT_MIN_ZOOM, ratio);
}
