import { describe, it, expect } from "vitest";
import { diffFolderState, type FolderState } from "../ai/run-summary";

function state(entries: Record<string, [number, number]>): FolderState {
  return new Map(
    Object.entries(entries).map(([path, [mtimeMs, size]]) => [
      path,
      { mtimeMs, size },
    ]),
  );
}

describe("diffFolderState", () => {
  it("detects added, modified, and deleted files", () => {
    const before = state({ "a.md": [1, 10], "b.md": [1, 20], "c.md": [1, 30] });
    const after = state({ "a.md": [1, 10], "b.md": [2, 20], "d.md": [1, 5] });
    expect(diffFolderState(before, after)).toEqual({
      added: ["d.md"],
      modified: ["b.md"],
      deleted: ["c.md"],
    });
  });
  it("treats a size-only change as modified", () => {
    const before = state({ "a.md": [1, 10] });
    const after = state({ "a.md": [1, 11] });
    expect(diffFolderState(before, after).modified).toEqual(["a.md"]);
  });
  it("returns empty arrays when nothing changed", () => {
    const s = state({ "a.md": [1, 10] });
    expect(diffFolderState(s, new Map(s))).toEqual({
      added: [],
      modified: [],
      deleted: [],
    });
  });
});
