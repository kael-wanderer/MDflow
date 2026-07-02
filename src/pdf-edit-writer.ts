import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
  type PDFImage,
  type RGB,
} from "pdf-lib";
import {
  DEFAULT_PDF_TEXT_STYLE,
  pdfEditOperationsForPage,
  pdfUiRectToWriterRect,
  type PdfEditDocument,
  type PdfEditOperation,
  type PdfPageBox,
  type PdfRect,
  type PdfTextStyle,
} from "./pdf-edit-document";
import { tryDirectTextRewrite } from "./pdf-direct-rewrite";
import { pdfStandardFontMatch } from "./pdf-font-inspection";

type LoadedFonts = Partial<Record<StandardFonts, PDFFont>>;
type LoadedImages = Record<string, PDFImage>;

export function pdfEditColor(value: string): RGB {
  const hex = value.trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return rgb(0, 0, 0);
  const int = Number.parseInt(match[1], 16);
  return rgb(
    ((int >> 16) & 255) / 255,
    ((int >> 8) & 255) / 255,
    (int & 255) / 255,
  );
}

export function standardFontFor(style: PdfTextStyle): StandardFonts {
  const standardMatch = pdfStandardFontMatch(style.fontFamily);
  if (standardMatch === "Courier") {
    if (style.bold && style.italic) return StandardFonts.CourierBoldOblique;
    if (style.bold) return StandardFonts.CourierBold;
    if (style.italic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  if (standardMatch === "Times") {
    if (style.bold && style.italic) return StandardFonts.TimesRomanBoldItalic;
    if (style.bold) return StandardFonts.TimesRomanBold;
    if (style.italic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  if (standardMatch === "Helvetica") {
    if (style.bold && style.italic) return StandardFonts.HelveticaBoldOblique;
    if (style.bold) return StandardFonts.HelveticaBold;
    if (style.italic) return StandardFonts.HelveticaOblique;
    return StandardFonts.Helvetica;
  }
  const family = style.fontFamily.toLowerCase();
  if (family.includes("courier") || family.includes("mono")) {
    if (style.bold && style.italic) return StandardFonts.CourierBoldOblique;
    if (style.bold) return StandardFonts.CourierBold;
    if (style.italic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  if (family.includes("times") || family.includes("serif")) {
    if (style.bold && style.italic) return StandardFonts.TimesRomanBoldItalic;
    if (style.bold) return StandardFonts.TimesRomanBold;
    if (style.italic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  if (style.bold && style.italic) return StandardFonts.HelveticaBoldOblique;
  if (style.bold) return StandardFonts.HelveticaBold;
  if (style.italic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

async function loadFont(
  pdf: PDFDocument,
  fonts: LoadedFonts,
  style: PdfTextStyle,
): Promise<PDFFont> {
  const name = standardFontFor(style);
  fonts[name] = fonts[name] ?? (await pdf.embedFont(name));
  return fonts[name];
}

function drawCover(
  page: PDFPage,
  pageBox: PdfPageBox,
  rect: PdfRect,
  color: string,
  opacity: number,
): void {
  const writerRect = pdfUiRectToWriterRect(rect, pageBox);
  page.drawRectangle({
    ...writerRect,
    color: pdfEditColor(color),
    opacity,
    borderOpacity: 0,
  });
}

function textX(
  rect: ReturnType<typeof pdfUiRectToWriterRect>,
  style: PdfTextStyle,
  font: PDFFont,
  line: string,
): number {
  if (style.align === "left") return rect.x;
  const width = font.widthOfTextAtSize(line, style.fontSize);
  if (style.align === "right") return rect.x + Math.max(0, rect.width - width);
  return rect.x + Math.max(0, rect.width - width) / 2;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

async function drawTextBox(
  pdf: PDFDocument,
  fonts: LoadedFonts,
  page: PDFPage,
  pageBox: PdfPageBox,
  rect: PdfRect,
  text: string,
  style: PdfTextStyle,
): Promise<void> {
  const font = await loadFont(pdf, fonts, style);
  const writerRect = pdfUiRectToWriterRect(rect, pageBox);
  const lineHeight = style.fontSize * 1.25;
  const lines = wrapText(text, font, style.fontSize, writerRect.width);
  const maxLines = Math.max(1, Math.floor(writerRect.height / lineHeight));
  const visibleLines = lines.slice(0, maxLines);
  const topY = writerRect.y + writerRect.height - style.fontSize;

  visibleLines.forEach((line, index) => {
    page.drawText(line, {
      x: textX(writerRect, style, font, line),
      y: topY - index * lineHeight,
      size: style.fontSize,
      font,
      color: pdfEditColor(style.color),
      opacity: style.opacity,
    });
  });
}

async function applyOperation(
  pdf: PDFDocument,
  fonts: LoadedFonts,
  images: LoadedImages,
  page: PDFPage,
  pageBox: PdfPageBox,
  operation: PdfEditOperation,
  directAppliedIds: Set<string>,
): Promise<void> {
  if (operation.type === "directTextEdit") {
    if (directAppliedIds.has(operation.id)) return;
    (operation.fallbackCoverRects ?? [operation.rect]).forEach((rect) => {
      drawCover(page, pageBox, rect, "#ffffff", 1);
    });
    await drawTextBox(
      pdf,
      fonts,
      page,
      pageBox,
      operation.rect,
      operation.replacementText,
      operation.fallbackStyle ?? DEFAULT_PDF_TEXT_STYLE,
    );
    return;
  }
  if (operation.type === "coverPatch") {
    drawCover(page, pageBox, operation.rect, operation.color, operation.opacity);
    return;
  }
  if (operation.type === "textBox") {
    await drawTextBox(
      pdf,
      fonts,
      page,
      pageBox,
      operation.rect,
      operation.text,
      operation.style,
    );
    return;
  }
  if (operation.type === "replacementText") {
    (operation.cover.rects ?? [operation.cover.rect]).forEach((rect) => {
      drawCover(page, pageBox, rect, operation.cover.color, operation.cover.opacity);
    });
    await drawTextBox(
      pdf,
      fonts,
      page,
      pageBox,
      operation.text.rect,
      operation.text.value,
      operation.text.style,
    );
    return;
  }
  if (operation.type === "imageBox") {
    const imageKey = operation.id;
    images[imageKey] =
      images[imageKey] ??
      (operation.mimeType === "image/png"
        ? await pdf.embedPng(new Uint8Array(operation.bytes))
        : await pdf.embedJpg(new Uint8Array(operation.bytes)));
    page.drawImage(images[imageKey], pdfUiRectToWriterRect(operation.rect, pageBox));
    return;
  }
  if (operation.type === "ocrTextBlock") {
    await drawTextBox(
      pdf,
      fonts,
      page,
      pageBox,
      operation.rect,
      operation.text,
      { ...DEFAULT_PDF_TEXT_STYLE, opacity: 0 },
    );
  }
}

export async function writeEditedPdf(
  originalBytes: Uint8Array,
  edits: PdfEditDocument,
): Promise<Uint8Array> {
  const directRewrite = tryDirectTextRewrite(originalBytes, edits);
  const pdf = await PDFDocument.load(directRewrite.bytes);
  const fonts: LoadedFonts = {};
  const images: LoadedImages = {};
  const pages = pdf.getPages();

  for (const [index, page] of pages.entries()) {
    const size = page.getSize();
    const pageBox = {
      page: index + 1,
      width: size.width,
      height: size.height,
    };
    const operations = pdfEditOperationsForPage(edits, pageBox.page);
    for (const operation of operations) {
      await applyOperation(
        pdf,
        fonts,
        images,
        page,
        pageBox,
        operation,
        directRewrite.appliedIds,
      );
    }
  }

  return pdf.save();
}
