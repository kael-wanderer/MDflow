import { describe, expect, it } from "vitest";
import {
  htmlWithPreviewZoom,
  isHtmlFile,
} from "../document-kind";

describe("isHtmlFile", () => {
  it("recognizes html and htm paths case-insensitively", () => {
    expect(isHtmlFile("/notes/page.html")).toBe(true);
    expect(isHtmlFile("page.HTM")).toBe(true);
  });

  it("does not treat markdown or missing names as html", () => {
    expect(isHtmlFile("/notes/page.md")).toBe(false);
    expect(isHtmlFile(null)).toBe(false);
  });
});

describe("htmlWithPreviewZoom", () => {
  it("injects preview zoom before the closing head", () => {
    const output = htmlWithPreviewZoom(
      "<html><head><title>X</title></head><body>Y</body></html>",
      0.75,
    );
    expect(output).toContain(
      "<style data-mdflow-preview-zoom>html{zoom:0.75!important}</style></head>",
    );
  });

  it("prepends preview zoom when the document has no head", () => {
    expect(htmlWithPreviewZoom("<main>Y</main>", 1.25)).toMatch(
      /^<style data-mdflow-preview-zoom>/,
    );
  });
});
