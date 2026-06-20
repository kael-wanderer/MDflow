export const SHAPES = ["rect", "rounded", "pill", "circle"] as const;
export type MindShape = (typeof SHAPES)[number];

export type NodeStyle = {
  shape: MindShape;
  fill: string;
  text: string;
  fontSize: number;
  bold: boolean;
};

export const FILL_SWATCHES = [
  "#ef9a9a",
  "#ffcc80",
  "#fff59d",
  "#a5d6a7",
  "#80deea",
  "#90caf9",
  "#ce93d8",
  "#bcaaa4",
] as const;

export const TEXT_SWATCHES = [
  "#1a1a1a",
  "#ffffff",
  "#b71c1c",
  "#1b5e20",
  "#0d47a1",
  "#4a148c",
  "#e65100",
  "#37474f",
] as const;

export const DEFAULT_FONT_SIZE = 16;

export function clampFontSize(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return DEFAULT_FONT_SIZE;
  return Math.min(40, Math.max(10, Math.round(v)));
}

export function normalizeShape(shape: unknown): MindShape {
  return SHAPES.includes(shape as MindShape) ? (shape as MindShape) : "rounded";
}

export function shapeClass(shape: unknown): string {
  return `mm-shape-${normalizeShape(shape)}`;
}

export function readNodeStyle(data: unknown): NodeStyle {
  const d = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  const weight = d["font-weight"];
  return {
    shape: normalizeShape(d["mm-shape"]),
    fill: typeof d["background-color"] === "string" ? (d["background-color"] as string) : "",
    text: typeof d["foreground-color"] === "string" ? (d["foreground-color"] as string) : "",
    fontSize: d["font-size"] === undefined ? DEFAULT_FONT_SIZE : clampFontSize(d["font-size"]),
    bold: weight === "bold" || weight === 700 || weight === "700",
  };
}
