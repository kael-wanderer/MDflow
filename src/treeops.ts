export type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  expanded: boolean;
  children: TreeNode[] | null;
};

export function findNode(root: TreeNode, path: string): TreeNode | null {
  if (root.path === path) return root;
  if (!root.children) return null;

  for (const child of root.children) {
    const found = findNode(child, path);
    if (found) return found;
  }
  return null;
}

function mapNode(
  root: TreeNode,
  path: string,
  update: (node: TreeNode) => TreeNode,
): TreeNode {
  if (root.path === path) return update(root);
  if (!root.children) return root;

  return {
    ...root,
    children: root.children.map((child) => mapNode(child, path, update)),
  };
}

export function setChildren(root: TreeNode, path: string, children: TreeNode[]): TreeNode {
  return mapNode(root, path, (node) => ({ ...node, children, expanded: true }));
}

export function toggleExpanded(root: TreeNode, path: string): TreeNode {
  return mapNode(root, path, (node) => ({ ...node, expanded: !node.expanded }));
}
