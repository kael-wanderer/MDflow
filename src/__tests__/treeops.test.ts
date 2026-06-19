import { describe, expect, it } from "vitest";
import {
  findNode,
  setAllExpanded,
  setChildren,
  toggleExpanded,
  type TreeNode,
} from "../treeops";

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

describe("setAllExpanded", () => {
  it("sets expanded on all loaded dir nodes", () => {
    const tree: TreeNode = {
      name: "root",
      path: "/r",
      isDir: true,
      expanded: true,
      children: [
        {
          name: "a",
          path: "/r/a",
          isDir: true,
          expanded: false,
          children: [
            {
              name: "x.md",
              path: "/r/a/x.md",
              isDir: false,
              expanded: false,
              children: null,
            },
          ],
        },
        {
          name: "b",
          path: "/r/b",
          isDir: true,
          expanded: true,
          children: null,
        },
      ],
    };

    const collapsed = setAllExpanded(tree, false);
    expect(collapsed.children![0].expanded).toBe(false);
    expect(collapsed.children![1].expanded).toBe(false);

    const expanded = setAllExpanded(tree, true);
    expect(expanded.children![0].expanded).toBe(true);
    expect(expanded.children![1].expanded).toBe(true);
  });
});
