import { describe, it, expect } from "vitest";
import {
  toggleSelection,
  rectsIntersect,
  marqueeHits,
  topLevelSelection,
  type Rect,
} from "../mindmap-selection";

const r = (left: number, top: number, right: number, bottom: number): Rect => ({
  left,
  top,
  right,
  bottom,
});

describe("toggleSelection", () => {
  it("additive toggles an id on then off", () => {
    const a = toggleSelection(new Set(["x"]), "y", true);
    expect([...a].sort()).toEqual(["x", "y"]);
    const b = toggleSelection(a, "x", true);
    expect([...b]).toEqual(["y"]);
  });

  it("non-additive replaces the set with a single id", () => {
    expect([...toggleSelection(new Set(["x", "y"]), "z", false)]).toEqual([
      "z",
    ]);
  });
});

describe("rectsIntersect", () => {
  it("true when boxes overlap", () => {
    expect(rectsIntersect(r(0, 0, 10, 10), r(5, 5, 15, 15))).toBe(true);
  });

  it("true when one contains the other", () => {
    expect(rectsIntersect(r(0, 0, 100, 100), r(10, 10, 20, 20))).toBe(true);
  });

  it("false when fully disjoint", () => {
    expect(rectsIntersect(r(0, 0, 10, 10), r(20, 20, 30, 30))).toBe(false);
  });
});

describe("marqueeHits", () => {
  const nodes = [
    { id: "a", rect: r(0, 0, 10, 10) },
    { id: "b", rect: r(50, 50, 60, 60) },
    { id: "c", rect: r(5, 5, 55, 55) },
  ];

  it("returns only intersecting ids", () => {
    expect(marqueeHits(nodes, r(0, 0, 12, 12)).sort()).toEqual(["a", "c"]);
  });

  it("empty when marquee misses everything", () => {
    expect(marqueeHits(nodes, r(200, 200, 210, 210))).toEqual([]);
  });
});

describe("topLevelSelection", () => {
  const parent: Record<string, string | null> = {
    root: null,
    p: "root",
    c: "p",
    q: "root",
  };
  const parentOf = (id: string) => parent[id] ?? null;

  it("excludes the root", () => {
    expect(topLevelSelection(["root", "q"], parentOf, "root")).toEqual(["q"]);
  });

  it("drops a descendant when its ancestor is selected", () => {
    expect(topLevelSelection(["p", "c"], parentOf, "root").sort()).toEqual([
      "p",
    ]);
  });

  it("keeps independent branches", () => {
    expect(topLevelSelection(["p", "q"], parentOf, "root").sort()).toEqual([
      "p",
      "q",
    ]);
  });
});
