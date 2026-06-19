import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../preview";

describe("renderMarkdown", () => {
  it("renders headings", () => {
    expect(renderMarkdown("# Hi")).toContain("<h1>Hi</h1>");
  });

  it("renders GFM tables", () => {
    const html = renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(html).toContain("<table>");
  });

  it("autolinks bare urls", () => {
    expect(renderMarkdown("see https://example.com")).toContain('href="https://example.com"');
  });

  it("highlights fenced code", () => {
    const html = renderMarkdown("```js\nconst x = 1;\n```");
    expect(html).toContain("hljs");
  });

  it("does not pass through raw html", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).not.toContain("<script>");
  });
});
