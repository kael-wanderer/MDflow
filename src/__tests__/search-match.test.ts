import { describe, expect, it } from "vitest";
import { firstSearchMatch, searchExpression } from "../search-match";

describe("search matching", () => {
  it("supports case, whole-word, and regex options", () => {
    expect(
      firstSearchMatch("Hello hello", "hello", {
        caseSensitive: true,
        wholeWord: false,
        regex: false,
      }),
    ).toEqual({ start: 6, end: 11 });
    expect(
      firstSearchMatch("cat catalog", "cat", {
        caseSensitive: false,
        wholeWord: true,
        regex: false,
      }),
    ).toEqual({ start: 0, end: 3 });
    expect(
      firstSearchMatch("v123", "v\\d+", {
        caseSensitive: false,
        wholeWord: false,
        regex: true,
      }),
    ).toEqual({ start: 0, end: 4 });
  });

  it("returns null for an invalid regex", () => {
    expect(
      searchExpression("(", {
        caseSensitive: false,
        wholeWord: false,
        regex: true,
      }),
    ).toBeNull();
  });
});
