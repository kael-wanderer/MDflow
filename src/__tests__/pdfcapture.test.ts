import { describe, expect, it } from "vitest";
import { imageToPdf } from "../pdfcapture";

const latin1 = (bytes: Uint8Array): string =>
  String.fromCharCode(...bytes);

describe("imageToPdf", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
  const pdf = imageToPdf(jpeg, 200, 100);
  const text = latin1(pdf);

  it("emits a PDF header and EOF", () => {
    expect(text.startsWith("%PDF-1.3")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("embeds the image bytes and page size", () => {
    expect(text).toContain("/MediaBox [0 0 200 100]");
    expect(text).toContain("/Filter /DCTDecode");
    expect(text).toContain(`/Length ${jpeg.length}`);
  });

  it("writes a startxref offset that lands on the xref table", () => {
    const match = text.match(/startxref\n(\d+)\n%%EOF/);
    expect(match).not.toBeNull();
    const offset = Number(match![1]);
    expect(text.slice(offset, offset + 4)).toBe("xref");
  });

  it("records six cross-reference entries", () => {
    expect(text).toContain("xref\n0 6\n");
    expect(text).toContain("/Size 6 /Root 1 0 R");
  });
});
