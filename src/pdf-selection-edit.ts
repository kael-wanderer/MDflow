import {
  normalizePdfRect,
  type PdfPageBox,
  type PdfRect,
  type PdfTextStyle,
} from "./pdf-edit-document";
import { pdfStandardFontMatch } from "./pdf-font-inspection";

export type ClientRectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function pdfSelectionClientRectToPageRect(
  page: PdfPageBox,
  pageClientRect: ClientRectLike,
  selectionClientRect: ClientRectLike,
  renderScale: number,
  padding = 1.5,
): PdfRect {
  const scale = renderScale > 0 ? renderScale : 1;
  const x = (selectionClientRect.left - pageClientRect.left) / scale - padding;
  const y = (selectionClientRect.top - pageClientRect.top) / scale - padding;
  const width = selectionClientRect.width / scale + padding * 2;
  const height = selectionClientRect.height / scale + padding * 2;
  return normalizePdfRect(
    {
      x,
      y,
      width: Math.max(4, width),
      height: Math.max(4, height),
    },
    page,
  );
}

export function pdfSelectionClientRectsToPageRects(
  page: PdfPageBox,
  pageClientRect: ClientRectLike,
  selectionClientRects: ClientRectLike[],
  renderScale: number,
  padding = 1.5,
): PdfRect[] {
  const rects = selectionClientRects
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) =>
      pdfSelectionClientRectToPageRect(page, pageClientRect, rect, renderScale, padding),
    );
  const unique = new Map<string, PdfRect>();
  rects.forEach((rect) => {
    unique.set(
      [
        Math.round(rect.x * 10),
        Math.round(rect.y * 10),
        Math.round(rect.width * 10),
        Math.round(rect.height * 10),
      ].join(":"),
      rect,
    );
  });
  return Array.from(unique.values()).sort((left, right) =>
    left.y === right.y ? left.x - right.x : left.y - right.y,
  );
}

export function estimatePdfFontSizeFromSelectionHeight(
  selectionClientHeight: number,
  renderScale: number,
  fallback = 14,
): number {
  const scale = renderScale > 0 ? renderScale : 1;
  const size = selectionClientHeight / scale;
  if (!Number.isFinite(size) || size <= 0) return fallback;
  return Math.round(Math.max(6, Math.min(96, size * 0.9)));
}

export function estimatePdfFontSizeFromSelectionRects(
  selectionRects: ClientRectLike[],
  renderScale: number,
  fallback = 14,
): number {
  const heights = selectionRects
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => rect.height)
    .sort((a, b) => a - b);
  if (!heights.length) return fallback;
  const middle = Math.floor(heights.length / 2);
  const median =
    heights.length % 2 === 0
      ? (heights[middle - 1] + heights[middle]) / 2
      : heights[middle];
  return estimatePdfFontSizeFromSelectionHeight(median, renderScale, fallback);
}

export type PdfSelectionCssStyle = {
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: string;
  color?: string;
};

export function cssColorToHex(value: string | undefined, fallback: string): string {
  const raw = value?.trim();
  if (!raw) return fallback;
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (hex) return `#${hex[1].toLowerCase()}`;
  const rgb = /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i.exec(raw);
  if (!rgb) return fallback;
  const parts = rgb.slice(1, 4).map((part) =>
    Math.max(0, Math.min(255, Math.round(Number(part)))),
  );
  return `#${parts.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

export function pdfTextStyleFromSelectionCss(
  css: PdfSelectionCssStyle,
  fontSize: number,
  base: PdfTextStyle,
): PdfTextStyle {
  const weight = css.fontWeight?.trim().toLowerCase() ?? "";
  const numericWeight = Number.parseInt(weight, 10);
  const bold =
    weight === "bold" ||
    weight === "bolder" ||
    (Number.isFinite(numericWeight) && numericWeight >= 600);
  const fontFamily = css.fontFamily?.split(",")[0]?.replace(/^["']|["']$/g, "").trim();
  const standardMatch = pdfStandardFontMatch(fontFamily);
  return {
    ...base,
    fontFamily: standardMatch ?? fontFamily ?? base.fontFamily,
    fontSize,
    color: cssColorToHex(css.color, base.color),
    bold,
    italic: /italic|oblique/i.test(css.fontStyle ?? ""),
  };
}
