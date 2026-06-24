export const MD_PANE_PADDING = 28;
export const MD_FIT_MIN_ZOOM = 0.5;

export function mdFitZoom(
  widestBlockPx: number,
  paneClientWidth: number,
): number {
  if (!Number.isFinite(widestBlockPx) || widestBlockPx <= 0) return 1;
  const usable = paneClientWidth - MD_PANE_PADDING * 2;
  if (!Number.isFinite(usable) || usable <= 0) return MD_FIT_MIN_ZOOM;
  const ratio = usable / widestBlockPx;
  if (ratio >= 1) return 1;
  return Math.max(MD_FIT_MIN_ZOOM, ratio);
}
