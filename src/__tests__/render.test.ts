import { describe, expect, it } from "vitest";
import { findMathSpans } from "../preview";

describe("findMathSpans", () => {
  it("finds inline math", () => {
    expect(findMathSpans("a $x^2$ b")).toContainEqual({
      display: false,
      tex: "x^2",
    });
  });

  it("finds display math", () => {
    expect(findMathSpans("$$\\int x$$")).toContainEqual({
      display: true,
      tex: "\\int x",
    });
  });

  it("ignores text without math", () => {
    expect(findMathSpans("no math here")).toEqual([]);
  });
});
