import { describe, expect, it } from "vitest";
import { compareActions } from "../compareactions";

describe("compareActions", () => {
  it("shows only select before a source file is chosen", () => {
    expect(compareActions(null)).toEqual([
      { kind: "select", label: "Select for Compare" },
    ]);
  });

  it("shows compare and select after a source file is chosen", () => {
    expect(compareActions("/docs/a.md")).toEqual([
      { kind: "compare", label: "Compare with Selected" },
      { kind: "select", label: "Select for Compare" },
    ]);
  });
});
