import { describe, expect, it } from "vitest";
import { findByPath, nextActiveAfterClose, type TabMeta } from "../tabops";

const tab = (id: string, path: string | null = null): TabMeta => ({
  id,
  path,
  name: id,
  dirty: false,
});

describe("tabops", () => {
  it("finds a tab by path", () => {
    const tabs = [tab("a", "/x/a.md"), tab("b", "/x/b.md")];
    expect(findByPath(tabs, "/x/b.md")?.id).toBe("b");
    expect(findByPath(tabs, "/x/missing.md")).toBeUndefined();
  });

  it("activates the right neighbour when closing the active tab", () => {
    const tabs = [tab("a"), tab("b"), tab("c")];
    expect(nextActiveAfterClose(tabs, "b", "b")).toBe("c");
  });

  it("falls back to the left neighbour when closing the last active tab", () => {
    const tabs = [tab("a"), tab("b"), tab("c")];
    expect(nextActiveAfterClose(tabs, "c", "c")).toBe("b");
  });

  it("returns null when closing the only tab", () => {
    expect(nextActiveAfterClose([tab("a")], "a", "a")).toBeNull();
  });

  it("keeps the active tab when closing a different tab", () => {
    const tabs = [tab("a"), tab("b"), tab("c")];
    expect(nextActiveAfterClose(tabs, "a", "c")).toBe("c");
  });
});
