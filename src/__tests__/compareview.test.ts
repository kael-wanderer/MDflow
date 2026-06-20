import { describe, expect, it } from "vitest";
import { comparisonRows } from "../compareview";

describe("comparisonRows", () => {
  it("places removed and added lines in opposite columns", () => {
    const rows = comparisonRows("same\nold", "same\nnew");
    expect(rows).toContainEqual({
      left: { type: "del", text: "old" },
      right: { type: "add", text: "new" },
    });
  });
});
