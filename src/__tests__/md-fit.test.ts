import { describe, expect, it } from "vitest";
import { MD_FIT_MIN_ZOOM, mdFitZoom } from "../md-fit";

describe("mdFitZoom", () => {
  it("returns 1 when the article content already fits the pane", () => {
    expect(mdFitZoom(700, 800)).toBe(1);
    expect(mdFitZoom(800, 800)).toBe(1);
  });

  it("scales down to fit content wider than the pane", () => {
    expect(mdFitZoom(1600, 800)).toBeCloseTo(0.5, 5);
    expect(mdFitZoom(1000, 800)).toBeCloseTo(0.8, 5);
  });

  it("floors at MD_FIT_MIN_ZOOM", () => {
    expect(mdFitZoom(100000, 800)).toBe(MD_FIT_MIN_ZOOM);
  });

  it("guards zero / non-finite inputs", () => {
    expect(mdFitZoom(0, 800)).toBe(1);
    expect(mdFitZoom(1000, 0)).toBe(MD_FIT_MIN_ZOOM);
    expect(mdFitZoom(Number.NaN, 800)).toBe(1);
  });
});
