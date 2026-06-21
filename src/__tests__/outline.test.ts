import { describe, expect, it } from "vitest";
import { markdownOutline } from "../outline";

describe("markdownOutline", () => {
  it("extracts heading levels and line numbers", () => {
    expect(markdownOutline("# One\ntext\n### Three")).toEqual([
      { level: 1, text: "One", line: 1 },
      { level: 3, text: "Three", line: 3 },
    ]);
  });
});
