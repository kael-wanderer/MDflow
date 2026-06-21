export type ViewMode = "split" | "editor" | "preview";
export type UIState = {
  viewMode: ViewMode;
  zoom: number;
  softWrap: boolean;
  folder: string | null;
  explorerVisible: boolean;
  explorerWidth: number;
  aiVisible: boolean;
  aiWidth: number;
  windows: { openPaths: string[]; activePath: string | null; mode: ViewMode }[];
  activeWindowIndex: number;
  lineNumbers: boolean;
};

const KEY = "mdflow.ui";
const DEFAULTS: UIState = {
  viewMode: "editor",
  zoom: 1,
  softWrap: true,
  folder: null,
  explorerVisible: true,
  explorerWidth: 240,
  aiVisible: false,
  aiWidth: 320,
  windows: [{ openPaths: [], activePath: null, mode: "editor" }],
  activeWindowIndex: 0,
  lineNumbers: true,
};

export function freshState(): UIState {
  return {
    ...DEFAULTS,
    windows: DEFAULTS.windows.map((window) => ({
      ...window,
      openPaths: [...window.openPaths],
    })),
  };
}

export function loadState(): UIState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshState();
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return freshState();
  }
}

export function saveState(s: UIState): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
