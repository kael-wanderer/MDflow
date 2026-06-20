import { describe, expect, it } from "vitest";
import { lineDiff } from "../ai/diff";

describe("lineDiff", () => {
  it("marks unchanged lines as same", () => {
    expect(lineDiff("a\nb", "a\nb")).toEqual([
      { type: "same", text: "a" },
      { type: "same", text: "b" },
    ]);
  });

  it("detects an added line", () => {
    expect(lineDiff("a", "a\nb")).toContainEqual({
      type: "add",
      text: "b",
    });
  });

  it("detects a removed line", () => {
    expect(lineDiff("a\nb", "a")).toContainEqual({
      type: "del",
      text: "b",
    });
  });

  it("detects a replacement as del + add", () => {
    const diff = lineDiff("a\nb\nc", "a\nx\nc");
    expect(diff).toContainEqual({ type: "del", text: "b" });
    expect(diff).toContainEqual({ type: "add", text: "x" });
  });
});
