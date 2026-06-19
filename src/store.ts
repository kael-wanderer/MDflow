import type { TreeNode } from "./treeops";

export type ShellState = {
  folder: string | null;
  tree: TreeNode | null;
  explorerVisible: boolean;
  explorerWidth: number;
};

let state: ShellState = {
  folder: null,
  tree: null,
  explorerVisible: true,
  explorerWidth: 240,
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
