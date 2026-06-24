import { describe, expect, it } from "vitest";
import { MD_FIT_MIN_ZOOM, MD_PANE_PADDING, mdFitZoom } from "../md-fit";

describe("mdFitZoom", () => {
  it("returns 1 when the widest block already fits the usable width", () => {
    expect(mdFitZoom(700, 800)).toBe(1);
  });

  it("scales down to fit a wide block", () => {
    expect(mdFitZoom(1488, 800)).toBeCloseTo(0.5, 5);
    expect(mdFitZoom(930, 800)).toBeCloseTo(0.8, 5);
  });

  it("floors at MD_FIT_MIN_ZOOM", () => {
    expect(mdFitZoom(100000, 800)).toBe(MD_FIT_MIN_ZOOM);
  });

  it("guards zero / non-finite inputs", () => {
    expect(mdFitZoom(0, 800)).toBe(1);
    expect(mdFitZoom(1000, 0)).toBe(MD_FIT_MIN_ZOOM);
    expect(mdFitZoom(Number.NaN, 800)).toBe(1);
  });

  it("exposes the padding constant", () => {
    expect(MD_PANE_PADDING).toBe(28);
  });
});
