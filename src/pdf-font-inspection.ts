export type PdfFontStandardMatch = "Helvetica" | "Times" | "Courier";

export type PdfTextContentStyleLike = {
  fontFamily?: string;
};

export type PdfTextContentItemLike = {
  str?: string;
  fontName?: string;
};

export type PdfDetectedFont = {
  id: string;
  displayName: string;
  rawFamily: string;
  standardMatch: PdfFontStandardMatch | null;
  subset: boolean;
  custom: boolean;
  samples: string[];
};

export type PdfPageFontSignal = {
  page: number;
  fonts: PdfDetectedFont[];
};

const STANDARD_MATCHES: Array<[PdfFontStandardMatch, RegExp]> = [
  ["Helvetica", /helvetica|arial|liberationsans|nimbussans|sans/i],
  ["Times", /times|timesnewroman|liberationserif|nimbusroman|serif/i],
  ["Courier", /courier|couriernew|liberationmono|nimbusmono|mono/i],
];

function cleanFontName(value: string): string {
  return value
    .replace(/^["']|["']$/g, "")
    .replace(/^[A-Z]{6}\+/, "")
    .replace(/[\s_-]+/g, "")
    .trim();
}

function firstFontFamily(value: string | undefined): string {
  return value?.split(",")[0]?.trim().replace(/^["']|["']$/g, "") ?? "";
}

export function pdfStandardFontMatch(
  fontName: string | undefined,
): PdfFontStandardMatch | null {
  const cleaned = cleanFontName(fontName ?? "");
  if (!cleaned) return null;
  return STANDARD_MATCHES.find(([, pattern]) => pattern.test(cleaned))?.[0] ?? null;
}

export function pdfDisplayFontName(fontName: string | undefined): string {
  const raw = firstFontFamily(fontName) || "Unknown font";
  return raw.replace(/^[A-Z]{6}\+/, "");
}

export function inspectPdfPageFonts(
  page: number,
  styles: Record<string, PdfTextContentStyleLike>,
  items: PdfTextContentItemLike[],
): PdfPageFontSignal {
  const byId = new Map<string, PdfDetectedFont>();
  items.forEach((item) => {
    if (!item.fontName) return;
    const style = styles[item.fontName] ?? {};
    const rawFamily = firstFontFamily(style.fontFamily) || item.fontName;
    const standardMatch = pdfStandardFontMatch(rawFamily) ?? pdfStandardFontMatch(item.fontName);
    const displayName = pdfDisplayFontName(rawFamily || item.fontName);
    const existing = byId.get(item.fontName);
    const sample = item.str?.trim();
    if (existing) {
      if (sample && existing.samples.length < 3) existing.samples.push(sample);
      return;
    }
    byId.set(item.fontName, {
      id: item.fontName,
      displayName,
      rawFamily,
      standardMatch,
      subset: /^[A-Z]{6}\+/.test(rawFamily) || /^[A-Z]{6}\+/.test(item.fontName),
      custom: standardMatch === null,
      samples: sample ? [sample] : [],
    });
  });
  return {
    page,
    fonts: Array.from(byId.values()).sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    ),
  };
}

export function pdfFontSignalMessage(signal: PdfPageFontSignal): string {
  if (!signal.fonts.length) return "Fonts: no selectable text fonts detected";
  const embedded = signal.fonts.filter((font) => font.subset || font.custom).length;
  const standard = signal.fonts.filter((font) => font.standardMatch).length;
  const parts = [
    `${signal.fonts.length} font${signal.fonts.length === 1 ? "" : "s"}`,
    embedded ? `${embedded} embedded/custom` : "",
    standard ? `${standard} standard match${standard === 1 ? "" : "es"}` : "",
  ].filter(Boolean);
  return `Fonts: ${parts.join(", ")}`;
}
