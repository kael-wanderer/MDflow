import { describe, expect, it } from "vitest";
import {
  PDF_PAGE_PADDING,
  pdfClampZoom,
  pdfFitWidthZoom,
  pdfInnerTransform,
  pdfPageBox,
} from "../pdf-zoom";

describe("pdfClampZoom", () => {
  it("clamps to the supported PDF zoom range", () => {
    expect(pdfClampZoom(0.1)).toBe(0.25);
    expect(pdfClampZoom(10)).toBe(4);
    expect(pdfClampZoom(1.5)).toBe(1.5);
  });
});

describe("pdfFitWidthZoom", () => {
  it("fits the widest page into the usable pane width", () => {
    expect(pdfFitWidthZoom(612, 800)).toBeCloseTo(764 / 612, 5);
  });

  it("clamps and guards invalid page widths", () => {
    expect(pdfFitWidthZoom(50, 5000)).toBe(4);
    expect(pdfFitWidthZoom(0, 800)).toBe(1);
    expect(pdfFitWidthZoom(Number.NaN, 800)).toBe(1);
  });

  it("uses document padding on both sides", () => {
    expect(PDF_PAGE_PADDING).toBe(18);
  });
});

describe("pdfPageBox", () => {
  it("scales page points into CSS pixel dimensions", () => {
    expect(pdfPageBox(612, 792, 1)).toEqual({
      width: "612px",
      height: "792px",
    });
    expect(pdfPageBox(612, 792, 0.5)).toEqual({
      width: "306px",
      height: "396px",
    });
  });
});

describe("pdfInnerTransform", () => {
  it("returns the instant scale ratio between display and rendered zoom", () => {
    expect(pdfInnerTransform(2, 1)).toBe("scale(2)");
    expect(pdfInnerTransform(1, 2)).toBe("scale(0.5)");
  });

  it("guards invalid rendered zoom", () => {
    expect(pdfInnerTransform(2, 0)).toBe("scale(2)");
    expect(pdfInnerTransform(2, Number.NaN)).toBe("scale(2)");
  });
});
