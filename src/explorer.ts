import { fileIcon } from "./icons";
import { listDir, pickFolder } from "./filesys";
import { getState, setState, subscribe } from "./store";
import { setChildren, toggleExpanded, type TreeNode } from "./treeops";

const ICON: Record<string, string> = {
  folder: "▱",
  md: "M",
  txt: "T",
  json: "{}",
  html: "<>",
  pdf: "P",
  file: "·",
};

let activePath: string | null = null;
let openFileCallback: (path: string) => void = () => {};

function pathName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

async function entriesToNodes(path: string): Promise<TreeNode[]> {
  const entries = await listDir(path);
  return entries.map((entry) => ({
    name: entry.name,
    path: entry.path,
    isDir: entry.isDir,
    expanded: false,
    children: null,
  }));
}

export async function openFolder(path: string): Promise<void> {
  const children = await entriesToNodes(path);
  const root: TreeNode = {
    name: pathName(path),
    path,
    isDir: true,
    expanded: true,
    children,
  };
  setState({ folder: path, tree: root });
  document.body.classList.remove("no-folder");
}

async function handleRowClick(node: TreeNode): Promise<void> {
  if (node.isDir) {
    const tree = getState().tree;
    if (!tree) return;

    if (node.children === null) {
      const children = await entriesToNodes(node.path);
      setState({ tree: setChildren(tree, node.path, children) });
    } else {
      setState({ tree: toggleExpanded(tree, node.path) });
    }
    return;
  }

  activePath = node.path;
  openFileCallback(node.path);
  render();
}

function createRow(node: TreeNode, depth: number): HTMLElement {
  const row = document.createElement("div");
  row.className = `tree-row${node.path === activePath ? " active" : ""}`;
  row.style.setProperty("--depth", String(depth));
  row.setAttribute("role", "treeitem");
  row.setAttribute("aria-expanded", node.isDir ? String(node.expanded) : "");

  const caret = document.createElement("span");
  caret.className = "tree-caret";
  caret.textContent = node.isDir ? (node.expanded ? "▾" : "▸") : "";

  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = ICON[fileIcon(node.name, node.isDir)];

  const name = document.createElement("span");
  name.className = "tree-name";
  name.textContent = node.name;

  row.append(caret, icon, name);
  row.addEventListener("click", () => void handleRowClick(node));
  return row;
}

function renderNode(node: TreeNode, depth: number, container: HTMLElement): void {
  container.appendChild(createRow(node, depth));
  if (node.isDir && node.expanded && node.children) {
    for (const child of node.children) renderNode(child, depth + 1, container);
  }
}

function render(): void {
  const { folder, tree } = getState();
  document.body.classList.toggle("no-folder", !folder);
  document.getElementById("explorer-folder-name")!.textContent = folder
    ? pathName(folder)
    : "No folder";

  const treeElement = document.getElementById("explorer-tree")!;
  treeElement.replaceChildren();
  if (tree?.children) {
    for (const child of tree.children) renderNode(child, 0, treeElement);
  }
}

export function initExplorer(onOpenFile: (path: string) => void): void {
  openFileCallback = onOpenFile;

  const chooseFolder = async (): Promise<void> => {
    const directory = await pickFolder();
    if (directory) await openFolder(directory);
  };

  document.getElementById("explorer-open")!.addEventListener("click", () => {
    void chooseFolder();
  });
  document.getElementById("explorer-empty-open")!.addEventListener("click", () => {
    void chooseFolder();
  });

  subscribe(render);
  render();
}
