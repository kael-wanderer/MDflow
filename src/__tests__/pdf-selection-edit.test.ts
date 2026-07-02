import { describe, expect, it } from "vitest";
import {
  cssColorToHex,
  estimatePdfFontSizeFromSelectionHeight,
  estimatePdfFontSizeFromSelectionRects,
  pdfSelectionClientRectsToPageRects,
  pdfSelectionClientRectToPageRect,
  pdfTextStyleFromSelectionCss,
} from "../pdf-selection-edit";
import { DEFAULT_PDF_TEXT_STYLE } from "../pdf-edit-document";

describe("pdf selection edit geometry", () => {
  it("maps a browser selection rect into PDF page coordinates", () => {
    expect(
      pdfSelectionClientRectToPageRect(
        { page: 1, width: 600, height: 800 },
        { left: 100, top: 200, width: 840, height: 1120 },
        { left: 240, top: 340, width: 280, height: 28 },
        1.4,
        2,
      ),
    ).toEqual({
      x: 98,
      y: 98,
      width: 204,
      height: 24,
    });
  });

  it("clamps selections that run outside the visible page box", () => {
    expect(
      pdfSelectionClientRectToPageRect(
        { page: 2, width: 300, height: 400 },
        { left: 100, top: 100, width: 420, height: 560 },
        { left: 80, top: 90, width: 500, height: 620 },
        1.4,
        0,
      ),
    ).toEqual({
      x: 0,
      y: 0,
      width: 300,
      height: 400,
    });
  });

  it("maps multi-line browser selection rects into sorted PDF page rectangles", () => {
    expect(
      pdfSelectionClientRectsToPageRects(
        { page: 1, width: 600, height: 800 },
        { left: 100, top: 200, width: 840, height: 1120 },
        [
          { left: 240, top: 370, width: 160, height: 28 },
          { left: 240, top: 340, width: 280, height: 28 },
          { left: 240, top: 340, width: 280, height: 28 },
          { left: 200, top: 330, width: 0, height: 28 },
        ],
        1.4,
        2,
      ),
    ).toEqual([
      { x: 98, y: 98, width: 204, height: 24 },
      { x: 98, y: 119.42857142857143, width: 118.28571428571429, height: 24 },
    ]);
  });

  it("estimates a practical PDF font size from selected browser text height", () => {
    expect(estimatePdfFontSizeFromSelectionHeight(28, 1.4)).toBe(18);
    expect(estimatePdfFontSizeFromSelectionHeight(0, 1.4, 13)).toBe(13);
    expect(estimatePdfFontSizeFromSelectionHeight(400, 1)).toBe(96);
  });

  it("estimates multi-line selection size from line boxes instead of total height", () => {
    expect(
      estimatePdfFontSizeFromSelectionRects(
        [
          { left: 0, top: 0, width: 200, height: 22 },
          { left: 0, top: 24, width: 180, height: 22 },
          { left: 0, top: 48, width: 140, height: 22 },
        ],
        1.4,
        13,
      ),
    ).toBe(14);
    expect(estimatePdfFontSizeFromSelectionRects([], 1.4, 13)).toBe(13);
  });

  it("normalizes selected CSS colors and font hints into PDF text style", () => {
    expect(cssColorToHex("rgb(51, 102, 153)", "#111111")).toBe("#336699");
    expect(cssColorToHex("#AABBCC", "#111111")).toBe("#aabbcc");
    expect(cssColorToHex("canvastext", "#111111")).toBe("#111111");

    expect(
      pdfTextStyleFromSelectionCss(
        {
          fontFamily: '"ABCDEF+Helvetica Neue", Arial, sans-serif',
          fontStyle: "italic",
          fontWeight: "700",
          color: "rgba(170, 0, 51, 0.8)",
        },
        16,
        DEFAULT_PDF_TEXT_STYLE,
      ),
    ).toEqual({
      ...DEFAULT_PDF_TEXT_STYLE,
      fontFamily: "Helvetica",
      fontSize: 16,
      color: "#aa0033",
      bold: true,
      italic: true,
    });
  });
});
