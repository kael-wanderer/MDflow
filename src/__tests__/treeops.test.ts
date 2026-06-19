import { describe, expect, it } from "vitest";
import { findNode, setChildren, toggleExpanded, type TreeNode } from "../treeops";

const leaf = (name: string, isDir = false): TreeNode => ({
  name,
  path: `/root/${name}`,
  isDir,
  expanded: false,
  children: null,
});

const root: TreeNode = {
  name: "root",
  path: "/root",
  isDir: true,
  expanded: true,
  children: [leaf("docs", true), leaf("a.md")],
};

describe("treeops", () => {
  it("finds a node by path", () => {
    expect(findNode(root, "/root/docs")?.name).toBe("docs");
    expect(findNode(root, "/root/missing")).toBeNull();
  });

  it("sets children immutably and marks expanded", () => {
    const next = setChildren(root, "/root/docs", [leaf("spec.md")]);
    const docs = findNode(next, "/root/docs")!;
    expect(docs.children?.map((child) => child.name)).toEqual(["spec.md"]);
    expect(docs.expanded).toBe(true);
    expect(findNode(root, "/root/docs")?.children).toBeNull();
  });

  it("toggles expanded", () => {
    const next = toggleExpanded(root, "/root/docs");
    expect(findNode(next, "/root/docs")?.expanded).toBe(true);
    expect(findNode(toggleExpanded(next, "/root/docs"), "/root/docs")?.expanded).toBe(false);
  });
});
