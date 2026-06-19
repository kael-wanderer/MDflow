export type ViewMode = "split" | "editor" | "preview";
export type UIState = { viewMode: ViewMode; zoom: number; softWrap: boolean };

const KEY = "mdflow.ui";
const DEFAULTS: UIState = { viewMode: "split", zoom: 1, softWrap: true };

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
