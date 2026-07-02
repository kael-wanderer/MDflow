import { describe, expect, it } from "vitest";
import {
  inspectPdfPageFonts,
  pdfDisplayFontName,
  pdfFontSignalMessage,
  pdfStandardFontMatch,
} from "../pdf-font-inspection";

describe("pdf font inspection", () => {
  it("matches common PDF font names to standard substitutes", () => {
    expect(pdfStandardFontMatch("ABCDEF+Helvetica-Bold")).toBe("Helvetica");
    expect(pdfStandardFontMatch('"TimesNewRomanPSMT", serif')).toBe("Times");
    expect(pdfStandardFontMatch("CourierNewPS-ItalicMT")).toBe("Courier");
    expect(pdfStandardFontMatch("FancyInvoiceGlyphs")).toBeNull();
  });

  it("cleans display names without losing custom font identity", () => {
    expect(pdfDisplayFontName("ABCDEF+CustomSerif")).toBe("CustomSerif");
    expect(pdfDisplayFontName(undefined)).toBe("Unknown font");
  });

  it("summarizes page fonts from pdf.js text content styles", () => {
    const signal = inspectPdfPageFonts(
      2,
      {
        f1: { fontFamily: "ABCDEF+Helvetica-Bold" },
        f2: { fontFamily: "CustomInvoiceGlyphs" },
      },
      [
        { str: "Hello", fontName: "f1" },
        { str: "world", fontName: "f1" },
        { str: "42", fontName: "f2" },
      ],
    );

    expect(signal).toEqual({
      page: 2,
      fonts: [
        {
          id: "f2",
          displayName: "CustomInvoiceGlyphs",
          rawFamily: "CustomInvoiceGlyphs",
          standardMatch: null,
          subset: false,
          custom: true,
          samples: ["42"],
        },
        {
          id: "f1",
          displayName: "Helvetica-Bold",
          rawFamily: "ABCDEF+Helvetica-Bold",
          standardMatch: "Helvetica",
          subset: true,
          custom: false,
          samples: ["Hello", "world"],
        },
      ],
    });
    expect(pdfFontSignalMessage(signal)).toBe(
      "Fonts: 2 fonts, 2 embedded/custom, 1 standard match",
    );
  });

  it("reports empty font signals", () => {
    expect(pdfFontSignalMessage({ page: 1, fonts: [] })).toBe(
      "Fonts: no selectable text fonts detected",
    );
  });
});
