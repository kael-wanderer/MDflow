export type PdfPageTextSignal = {
  page: number;
  text: string;
  itemCount: number;
};

export type PdfPageEditCapability =
  | "overlay"
  | "replace-visual"
  | "direct-simple"
  | "ocr-needed"
  | "unsupported-direct";

export type PdfCapabilitySummary = {
  pages: { page: number; capability: PdfPageEditCapability }[];
  hasSelectableText: boolean;
  hasScannedPages: boolean;
  directSimplePages: number;
};

export type PdfCapabilityDetail = {
  page: number;
  capability: PdfPageEditCapability;
  label: string;
  message: string;
  directEditingSafe: boolean;
  recommendedAction: "direct" | "visual" | "ocr" | "avoid-direct";
};

export function classifyPdfPageCapability(
  signal: PdfPageTextSignal,
): PdfPageEditCapability {
  const text = signal.text.replace(/\s+/g, " ").trim();
  if (!text || signal.itemCount === 0) return "ocr-needed";
  if (signal.itemCount <= 250 && text.length <= 12_000) return "direct-simple";
  if (signal.itemCount <= 900) return "replace-visual";
  return "unsupported-direct";
}

export function summarizePdfCapabilities(
  signals: PdfPageTextSignal[],
): PdfCapabilitySummary {
  const pages = signals.map((signal) => ({
    page: signal.page,
    capability: classifyPdfPageCapability(signal),
  }));
  return {
    pages,
    hasSelectableText: pages.some((page) => page.capability !== "ocr-needed"),
    hasScannedPages: pages.some((page) => page.capability === "ocr-needed"),
    directSimplePages: pages.filter((page) => page.capability === "direct-simple")
      .length,
  };
}

export function pdfCapabilityMessage(summary: PdfCapabilitySummary): string {
  if (!summary.pages.length) return "PDF editing ready";
  if (!summary.hasSelectableText) {
    return "Scanned PDF: visual edits available, OCR needed for text editing";
  }
  if (summary.directSimplePages === summary.pages.length) {
    return "Text PDF: visual edits available, simple direct edits may be possible later";
  }
  if (summary.hasScannedPages) {
    return "Mixed PDF: visual edits available, some pages need OCR";
  }
  return "Complex PDF: visual replacement available, direct editing is limited";
}

export function pdfCapabilityDetail(
  page: { page: number; capability: PdfPageEditCapability },
): PdfCapabilityDetail {
  if (page.capability === "direct-simple") {
    return {
      page: page.page,
      capability: page.capability,
      label: "Simple text",
      message: "Direct rewrite can be tried. Save still falls back visually if the PDF stream is unsafe.",
      directEditingSafe: true,
      recommendedAction: "direct",
    };
  }
  if (page.capability === "replace-visual") {
    return {
      page: page.page,
      capability: page.capability,
      label: "Visual replacement",
      message: "Use Edit Text or Replace. Direct rewriting is limited by dense or split text content.",
      directEditingSafe: false,
      recommendedAction: "visual",
    };
  }
  if (page.capability === "ocr-needed") {
    return {
      page: page.page,
      capability: page.capability,
      label: "OCR needed",
      message: "Run OCR Page, review the OCR blocks, then add visual edits or export a searchable layer.",
      directEditingSafe: false,
      recommendedAction: "ocr",
    };
  }
  if (page.capability === "unsupported-direct") {
    return {
      page: page.page,
      capability: page.capability,
      label: "Complex page",
      message: "Avoid direct editing here. Use visual cover-and-replace so the original PDF stays recoverable.",
      directEditingSafe: false,
      recommendedAction: "avoid-direct",
    };
  }
  return {
    page: page.page,
    capability: page.capability,
    label: "Overlay only",
    message: "Add text boxes and cover patches; direct text editing is not available.",
    directEditingSafe: false,
    recommendedAction: "visual",
  };
}

export function pdfCapabilityDetails(
  summary: PdfCapabilitySummary,
): PdfCapabilityDetail[] {
  return summary.pages.map(pdfCapabilityDetail);
}

export function pdfPageCapabilityMessage(
  summary: PdfCapabilitySummary,
  pageNumber: number,
): string {
  const page = summary.pages.find((item) => item.page === pageNumber);
  if (!page) return pdfCapabilityMessage(summary);
  const detail = pdfCapabilityDetail(page);
  return `Page ${detail.page}: ${detail.label}. ${detail.message}`;
}
