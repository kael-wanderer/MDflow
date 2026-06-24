import { describe, expect, it } from "vitest";
import { chunkDocument, tokenize } from "../ai/retrieval";

describe("tokenize", () => {
  it("lowercases and splits on non-alphanumeric, dropping empties", () => {
    expect(tokenize("Hello, World! foo_bar 42")).toEqual([
      "hello",
      "world",
      "foo",
      "bar",
      "42",
    ]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("chunkDocument", () => {
  it("splits by markdown headings and carries the heading", () => {
    const md = "# Title\nintro\n\n## Setup\ninstall steps\n\n## Usage\nrun it";
    const chunks = chunkDocument("/notes/a.md", md);
    expect(chunks.map((chunk) => chunk.heading)).toEqual([
      "Title",
      "Setup",
      "Usage",
    ]);
    expect(chunks[1].text).toContain("install steps");
    expect(chunks.every((chunk) => chunk.path === "/notes/a.md")).toBe(true);
  });

  it("uses an empty heading for content before the first heading", () => {
    const chunks = chunkDocument("/n/b.md", "loose intro text\n\n# H\nbody");
    expect(chunks[0].heading).toBe("");
    expect(chunks[0].text).toContain("loose intro");
  });

  it("splits oversized sections to respect maxChars", () => {
    const big = "para\n\n".repeat(50);
    const chunks = chunkDocument("/n/c.md", `# H\n${big}`, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.text.length <= 100)).toBe(true);
    expect(chunks.every((chunk) => chunk.heading === "H")).toBe(true);
  });

  it("returns nothing for blank input", () => {
    expect(chunkDocument("/n/d.md", "   \n\n")).toEqual([]);
  });
});
