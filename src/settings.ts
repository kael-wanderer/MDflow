export type ThemeName =
  | "system"
  | "light"
  | "dark"
  | "catppuccin-mocha"
  | "everforest-dark"
  | "nord";

export type ZoneSettings = {
  font: string;
  size: number;
};

export type Settings = {
  theme: ThemeName;
  restoreSession: boolean;
  updateMode: "manual" | "auto";
  explorer: ZoneSettings;
  main: ZoneSettings;
  sub: ZoneSettings;
};

export const THEME_OPTIONS: ReadonlyArray<{
  id: ThemeName;
  label: string;
}> = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "catppuccin-mocha", label: "Catppuccin Mocha" },
  { id: "everforest-dark", label: "Everforest Dark" },
  { id: "nord", label: "Nord" },
];

const THEMES: ThemeName[] = [
  "system",
  "light",
  "dark",
  "catppuccin-mocha",
  "everforest-dark",
  "nord",
];

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  restoreSession: true,
  updateMode: "manual",
  explorer: { font: "", size: 13 },
  main: { font: "", size: 15 },
  sub: { font: "", size: 15 },
};

export const DEFAULT_SETTINGS_JSON = JSON.stringify(DEFAULT_SETTINGS, null, 2);

export function normalizeThemeName(value: unknown): ThemeName | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
  return THEMES.includes(normalized as ThemeName)
    ? (normalized as ThemeName)
    : null;
}

function clampSize(value: unknown, fallback: number): number {
  const size = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(size)) return fallback;
  return Math.min(28, Math.max(10, Math.round(size)));
}

function parseZone(raw: unknown, fallback: ZoneSettings): ZoneSettings {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    font: typeof value.font === "string" ? value.font : fallback.font,
    size: clampSize(value.size, fallback.size),
  };
}

function defaults(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    explorer: { ...DEFAULT_SETTINGS.explorer },
    main: { ...DEFAULT_SETTINGS.main },
    sub: { ...DEFAULT_SETTINGS.sub },
  };
}

export function parseSettings(raw: string): Settings {
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaults();
    data = parsed as Record<string, unknown>;
  } catch {
    return defaults();
  }

  const theme = normalizeThemeName(data.theme) ?? DEFAULT_SETTINGS.theme;
  const updateMode =
    data.updateMode === "manual" || data.updateMode === "auto"
      ? data.updateMode
      : data.autoUpdate === true
        ? "auto"
        : "manual";
  return {
    theme,
    restoreSession:
      typeof data.restoreSession === "boolean"
        ? data.restoreSession
        : DEFAULT_SETTINGS.restoreSession,
    updateMode,
    explorer: parseZone(data.explorer, DEFAULT_SETTINGS.explorer),
    main: parseZone(data.main, DEFAULT_SETTINGS.main),
    sub: parseZone(data.sub, DEFAULT_SETTINGS.sub),
  };
}

export function applySettings(settings: Settings): void {
  const root = document.documentElement;
  const theme =
    settings.theme === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : settings.theme;
  root.dataset.theme = theme;
  root.style.setProperty(
    "--explorer-font",
    settings.explorer.font || "var(--font-ui)",
  );
  root.style.setProperty("--explorer-size", `${settings.explorer.size}px`);

  for (const id of ["main", "sub"] as const) {
    const element = document.querySelector<HTMLElement>(
      `.window[data-window-id="${id}"]`,
    );
    if (!element) continue;
    element.style.setProperty("--win-font", settings[id].font || "var(--font-mono)");
    element.style.setProperty("--win-size", `${settings[id].size}px`);
  }
}
