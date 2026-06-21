import { describe, it, expect } from "vitest";
import {
  clampFontSize,
  normalizeShape,
  shapeClass,
  readNodeStyle,
  DEFAULT_FONT_SIZE,
} from "../mindmap-style";

describe("clampFontSize", () => {
  it("clamps below and above the range", () => {
    expect(clampFontSize(4)).toBe(10);
    expect(clampFontSize(999)).toBe(40);
  });
  it("rounds and falls back on non-numbers", () => {
    expect(clampFontSize(17.6)).toBe(18);
    expect(clampFontSize("nope")).toBe(DEFAULT_FONT_SIZE);
    expect(clampFontSize(undefined)).toBe(DEFAULT_FONT_SIZE);
  });
});

describe("normalizeShape / shapeClass", () => {
  it("keeps known shapes", () => {
    expect(normalizeShape("none")).toBe("none");
    expect(normalizeShape("circle")).toBe("circle");
    expect(shapeClass("pill")).toBe("mm-shape-pill");
  });
  it("falls back to text-only for unknown or missing shapes", () => {
    expect(normalizeShape("blob")).toBe("none");
    expect(normalizeShape(undefined)).toBe("none");
    expect(shapeClass(42)).toBe("mm-shape-none");
  });
});

describe("readNodeStyle", () => {
  it("returns defaults for empty data", () => {
    expect(readNodeStyle(undefined)).toEqual({
      shape: "none",
      fill: "",
      text: "",
      fontSize: DEFAULT_FONT_SIZE,
      bold: false,
    });
  });
  it("reads jsMind + mm-shape keys", () => {
    expect(
      readNodeStyle({
        "background-color": "#ffcc80",
        "foreground-color": "#1a1a1a",
        "font-size": 24,
        "font-weight": "bold",
        "mm-shape": "circle",
      }),
    ).toEqual({
      shape: "circle",
      fill: "#ffcc80",
      text: "#1a1a1a",
      fontSize: 24,
      bold: true,
    });
  });
  it("treats numeric/700 weight as bold and clamps size", () => {
    const s = readNodeStyle({ "font-weight": 700, "font-size": 99 });
    expect(s.bold).toBe(true);
    expect(s.fontSize).toBe(40);
  });
});
