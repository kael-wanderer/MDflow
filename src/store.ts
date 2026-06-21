import { listDir } from "./filesys";
import { findNode, setChildren, type TreeNode } from "./treeops";
import type { WindowState } from "./windowops";

export type ShellState = {
  folder: string | null;
  tree: TreeNode | null;
  explorerVisible: boolean;
  explorerWidth: number;
  windows: WindowState[];
  activeWindowId: string;
};

let state: ShellState = {
  folder: null,
  tree: null,
  explorerVisible: true,
  explorerWidth: 240,
  windows: [{ id: "main", tabs: [], activeTabId: null, mode: "editor" }],
  activeWindowId: "main",
};

const listeners = new Set<() => void>();

export function getState(): ShellState {
  return state;
}

export function setState(patch: Partial<ShellState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshDir(dirPath: string): Promise<void> {
  const tree = state.tree;
  if (!tree) return;

  const isRoot = tree.path === dirPath;
  if (!isRoot && findNode(tree, dirPath) === null) return;

  const entries = await listDir(dirPath);
  const children: TreeNode[] = entries.map((entry) => {
    const existing = findNode(tree, entry.path);
    if (existing && existing.isDir === entry.isDir) {
      return { ...existing, name: entry.name, path: entry.path };
    }
    return {
      name: entry.name,
      path: entry.path,
      isDir: entry.isDir,
      expanded: false,
      children: null,
    };
  });
  setState({ tree: setChildren(tree, dirPath, children) });
}

export function getWindow(id: string): WindowState | undefined {
  return state.windows.find((w) => w.id === id);
}

export function mainWindow(): WindowState {
  return state.windows[0];
}

export function activeWindow(): WindowState {
  return getWindow(state.activeWindowId) ?? state.windows[0];
}

export function patchWindow(id: string, patch: Partial<WindowState>): void {
  setState({ windows: state.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)) });
}
