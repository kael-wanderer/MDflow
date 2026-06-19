import { describe, expect, it } from "vitest";
import { joinPath, parentPath } from "../paths";

describe("paths", () => {
  it("parentPath returns the containing dir", () => {
    expect(parentPath("/a/b/c.md")).toBe("/a/b");
    expect(parentPath("/a")).toBe("/");
    expect(parentPath("C:\\a\\b.md")).toBe("C:\\a");
    expect(parentPath("C:\\a")).toBe("C:\\");
  });

  it("joinPath joins dir + name", () => {
    expect(joinPath("/a/b", "c.md")).toBe("/a/b/c.md");
    expect(joinPath("/", "c.md")).toBe("/c.md");
    expect(joinPath("C:\\a", "c.md")).toBe("C:\\a\\c.md");
    expect(joinPath("C:\\", "c.md")).toBe("C:\\c.md");
  });
});
