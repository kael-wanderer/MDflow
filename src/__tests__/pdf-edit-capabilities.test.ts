import { describe, expect, it } from "vitest";
import {
  classifyPdfPageCapability,
  pdfCapabilityDetail,
  pdfCapabilityDetails,
  pdfCapabilityMessage,
  pdfPageCapabilityMessage,
  summarizePdfCapabilities,
} from "../pdf-edit-capabilities";

describe("pdf edit capabilities", () => {
  it("marks pages without selectable text as OCR-needed", () => {
    expect(classifyPdfPageCapability({ page: 1, text: "", itemCount: 0 })).toBe(
      "ocr-needed",
    );
  });

  it("marks small selectable-text pages as direct-simple candidates", () => {
    expect(
      classifyPdfPageCapability({
        page: 1,
        text: "Invoice total",
        itemCount: 12,
      }),
    ).toBe("direct-simple");
  });

  it("marks dense text pages as visual replacement candidates", () => {
    expect(
      classifyPdfPageCapability({
        page: 1,
        text: "word ".repeat(4000),
        itemCount: 400,
      }),
    ).toBe("replace-visual");
  });

  it("summarizes mixed PDFs", () => {
    const summary = summarizePdfCapabilities([
      { page: 1, text: "Selectable", itemCount: 1 },
      { page: 2, text: "", itemCount: 0 },
    ]);

    expect(summary).toEqual({
      pages: [
        { page: 1, capability: "direct-simple" },
        { page: 2, capability: "ocr-needed" },
      ],
      hasSelectableText: true,
      hasScannedPages: true,
      directSimplePages: 1,
    });
    expect(pdfCapabilityMessage(summary)).toBe(
      "Mixed PDF: visual edits available, some pages need OCR",
    );
  });

  it("explains page-level editing limits", () => {
    expect(
      pdfCapabilityDetail({ page: 1, capability: "direct-simple" }),
    ).toMatchObject({
      label: "Simple text",
      directEditingSafe: true,
      recommendedAction: "direct",
    });
    expect(
      pdfCapabilityDetail({ page: 2, capability: "ocr-needed" }),
    ).toMatchObject({
      label: "OCR needed",
      directEditingSafe: false,
      recommendedAction: "ocr",
    });
    expect(
      pdfCapabilityDetail({ page: 3, capability: "unsupported-direct" }),
    ).toMatchObject({
      label: "Complex page",
      directEditingSafe: false,
      recommendedAction: "avoid-direct",
    });
  });

  it("builds page messages from summarized capabilities", () => {
    const summary = summarizePdfCapabilities([
      { page: 1, text: "Selectable", itemCount: 1 },
      { page: 2, text: "", itemCount: 0 },
    ]);

    expect(pdfCapabilityDetails(summary).map((detail) => detail.label)).toEqual([
      "Simple text",
      "OCR needed",
    ]);
    expect(pdfPageCapabilityMessage(summary, 2)).toContain(
      "Page 2: OCR needed.",
    );
    expect(pdfPageCapabilityMessage(summary, 9)).toBe(
      "Mixed PDF: visual edits available, some pages need OCR",
    );
  });
});
