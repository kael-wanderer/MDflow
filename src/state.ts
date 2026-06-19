export type ViewMode = "split" | "editor" | "preview";
export type UIState = {
  viewMode: ViewMode;
  zoom: number;
  softWrap: boolean;
  folder: string | null;
  explorerVisible: boolean;
  explorerWidth: number;
  windows: { openPaths: string[]; activePath: string | null; mode: ViewMode }[];
  activeWindowIndex: number;
  lineNumbers: boolean;
};

const KEY = "mdflow.ui";
const DEFAULTS: UIState = {
  viewMode: "split",
  zoom: 1,
  softWrap: true,
  folder: null,
  explorerVisible: true,
  explorerWidth: 240,
  windows: [{ openPaths: [], activePath: null, mode: "split" }],
  activeWindowIndex: 0,
  lineNumbers: true,
};

export function loadState(): UIState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveState(s: UIState): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
