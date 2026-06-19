import { describe, it, expect } from "vitest";
import { findTabByPath, type WindowState } from "../windowops";

const w = (id: string, paths: (string | null)[]): WindowState => ({
  id,
  tabs: paths.map((p, i) => ({ id: `${id}${i}`, path: p, name: p ?? "Untitled", dirty: false })),
  activeTabId: null,
  mode: "split",
});

describe("findTabByPath", () => {
  it("finds the window holding a path", () => {
    const windows = [w("main", ["/a.md", null]), w("sub", ["/b.md"])];
    expect(findTabByPath(windows, "/b.md")?.windowId).toBe("sub");
    expect(findTabByPath(windows, "/a.md")?.tab.id).toBe("main0");
  });
  it("returns null when not open", () => {
    expect(findTabByPath([w("main", ["/a.md"])], "/missing.md")).toBeNull();
  });
});
