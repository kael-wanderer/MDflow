import { describe, expect, it } from "vitest";
import { fuzzyMatch, rankItems } from "../fuzzy";

describe("fuzzyMatch", () => {
  it("matches a subsequence", () => {
    expect(fuzzyMatch("mn", "main.ts")).not.toBeNull();
  });

  it("returns null when not a subsequence", () => {
    expect(fuzzyMatch("xyz", "main.ts")).toBeNull();
  });

  it("empty query scores 0", () => {
    expect(fuzzyMatch("", "anything")).toBe(0);
  });

  it("scores consecutive matches higher than scattered", () => {
    const consecutive = fuzzyMatch("main", "main.ts")!;
    const scattered = fuzzyMatch("main", "m-a-i-n.ts")!;
    expect(consecutive).toBeGreaterThan(scattered);
  });

  it("is case-insensitive", () => {
    expect(fuzzyMatch("MAIN", "main.ts")).not.toBeNull();
  });
});

describe("rankItems", () => {
  it("filters non-matches and orders best-first", () => {
    const files = ["src/main.ts", "readme.md", "src/menu.rs"];
    const ranked = rankItems("main", files, (file) => file);
    expect(ranked).toContain("src/main.ts");
    expect(ranked).not.toContain("readme.md");
    expect(ranked[0]).toBe("src/main.ts");
  });

  it("empty query returns items unchanged", () => {
    const files = ["a", "b"];
    expect(rankItems("", files, (file) => file)).toEqual(files);
  });
});
