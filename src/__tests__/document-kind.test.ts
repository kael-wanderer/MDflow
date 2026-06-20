import { describe, expect, it } from "vitest";
import {
  htmlPreviewFrameScale,
  htmlWithPreviewZoom,
  isExcalidrawFile,
  isHtmlFile,
  isMindmapFile,
  isMarkdownFile,
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

describe("htmlPreviewFrameScale", () => {
  it("expands the iframe viewport inversely while scaling its painted surface", () => {
    expect(htmlPreviewFrameScale(0.5)).toEqual({
      transform: "scale(0.5)",
      width: "200%",
      height: "200%",
    });
    expect(htmlPreviewFrameScale(2)).toEqual({
      transform: "scale(2)",
      width: "50%",
      height: "50%",
    });
  });

  it("guards against a zero scale", () => {
    expect(htmlPreviewFrameScale(0)).toEqual({
      transform: "scale(0.1)",
      width: "1000%",
      height: "1000%",
    });
  });
});

describe("isExcalidrawFile", () => {
  it("recognizes Excalidraw paths case-insensitively", () => {
    expect(isExcalidrawFile("/boards/system.excalidraw")).toBe(true);
    expect(isExcalidrawFile("SYSTEM.EXCALIDRAW")).toBe(true);
    expect(isExcalidrawFile("system.json")).toBe(false);
  });
});

describe("isMindmapFile", () => {
  it("matches .mind only", () => {
    expect(isMindmapFile("a/b/notes.mind")).toBe(true);
    expect(isMindmapFile("notes.md")).toBe(false);
    expect(isMindmapFile(null)).toBe(false);
  });
});

describe("isMarkdownFile", () => {
  it("recognizes markdown paths and unsaved documents", () => {
    expect(isMarkdownFile("/notes/page.md")).toBe(true);
    expect(isMarkdownFile("README.MARKDOWN")).toBe(true);
    expect(isMarkdownFile("Untitled")).toBe(true);
    expect(isMarkdownFile(null)).toBe(true);
  });

  it("rejects HTML and other saved file types", () => {
    expect(isMarkdownFile("page.html")).toBe(false);
    expect(isMarkdownFile("notes.txt")).toBe(false);
    expect(isMarkdownFile("settings.json")).toBe(false);
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

  it("does not inject any script into the preview", () => {
    const output = htmlWithPreviewZoom(
      "<html><body><div id=\"frame\">Y</div></body></html>",
      1,
    );
    expect(output).not.toContain("<script");
  });
});
