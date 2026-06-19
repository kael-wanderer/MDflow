import type { TabMeta } from "./tabops";
import type { ViewMode } from "./state";

export type WindowState = {
  id: string;
  tabs: TabMeta[];
  activeTabId: string | null;
  mode: ViewMode;
};

export function findTabByPath(
  windows: WindowState[],
  path: string
): { windowId: string; tab: TabMeta } | null {
  for (const w of windows) {
    const tab = w.tabs.find((t) => t.path === path);
    if (tab) return { windowId: w.id, tab };
  }
  return null;
}
