# Top Bar + Settings Implementation Plan (Phase 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a command palette (fuzzy quick-open + commands) and a `settings.json` system (theme, per-zone fonts/sizes, restore-session) to MDflow.

**Architecture:** Two surfaces over the existing shell. The palette is a dumb overlay driven by a command registry + a recursive file list. Settings live in a JSON file on disk, parsed into a typed object that drives CSS variables and a `data-theme` attribute; themes (including editor syntax via `--tok-*`) are pure CSS.

**Tech Stack:** Tauri 2 + Rust, vanilla TypeScript, CodeMirror 6, markdown-it, Vitest. No new JS dependencies.

## Global Constraints

- **Clean-room MIT.** Never copy/paste/port code or CSS from Kaelio. No names "mx", "Vibery", "Kaelio". Theme palettes use their own published (MIT) hex values, written fresh.
- **No new frontend dependencies.** Inline SVG glyphs only (extend `src/glyphs.ts`). `@lezer/highlight` is already present transitively via `@codemirror/language` — importing it is not a new dependency.
- **Activity-bar order is fixed: Explorer → Search → Gear.** Gear is always last.
- **Test env is Node** (`vite.config.ts` → `environment: "node"`, `src/__tests__/setup.ts` shims `localStorage`). There is **no `document`** in tests — only pure logic (no DOM) is unit-tested; DOM code is manual smoke.
- Pure logic is TDD'd; UI is manual smoke. Small focused files, one responsibility each.
- Each test file lives in `src/__tests__/<name>.test.ts` and is picked up by the existing `include: ["src/__tests__/**/*.test.ts"]`.

---

### Task 1: Recursive file walk (Rust)

**Files:**
- Modify: `src-tauri/src/files.rs` (add `should_skip`, `walk_files`, `list_files_recursive` + tests)
- Modify: `src-tauri/src/lib.rs:37-49` (register command)
- Modify: `src/filesys.ts` (add `listFilesRecursive` wrapper)

**Interfaces:**
- Produces (Rust): `#[tauri::command] pub fn list_files_recursive(folder: String) -> Vec<String>` — returns file paths **relative** to `folder`, sorted, skipping `.git`/`node_modules`/dotfiles, capped at 5000.
- Produces (TS): `listFilesRecursive(folder: string): Promise<string[]>`

- [ ] **Step 1: Write the failing Rust test**

Add to `src-tauri/src/files.rs` (new test module at the end of the file):

```rust
#[cfg(test)]
mod walk_tests {
    use super::{should_skip, walk_files};
    use std::fs;
    use std::path::Path;

    #[test]
    fn should_skip_hidden_and_known_dirs() {
        assert!(should_skip(".git"));
        assert!(should_skip("node_modules"));
        assert!(should_skip(".DS_Store"));
        assert!(!should_skip("notes.md"));
        assert!(!should_skip("src"));
    }

    #[test]
    fn walk_returns_relative_files_skipping_noise() {
        let tmp = std::env::temp_dir().join("mdflow_walk_test");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(tmp.join("src")).unwrap();
        fs::create_dir_all(tmp.join(".git")).unwrap();
        fs::create_dir_all(tmp.join("node_modules/pkg")).unwrap();
        fs::write(tmp.join("readme.md"), "x").unwrap();
        fs::write(tmp.join("src/main.ts"), "x").unwrap();
        fs::write(tmp.join(".hidden"), "x").unwrap();
        fs::write(tmp.join(".git/config"), "x").unwrap();
        fs::write(tmp.join("node_modules/pkg/index.js"), "x").unwrap();

        let mut out: Vec<String> = Vec::new();
        walk_files(&tmp, &tmp, &mut out);
        out.sort();

        assert_eq!(out, vec!["readme.md".to_string(), "src/main.ts".to_string()]);
        let _ = fs::remove_dir_all(&tmp);
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd src-tauri && cargo test walk_tests`
Expected: FAIL — `cannot find function should_skip` / `walk_files`.

- [ ] **Step 3: Implement the walk**

Add to `src-tauri/src/files.rs` (after `read_entries`, before the `#[tauri::command]` block — order does not matter, keep it with the other free functions):

```rust
const WALK_CAP: usize = 5000;

pub fn should_skip(name: &str) -> bool {
    name == ".git" || name == "node_modules" || name.starts_with('.')
}

pub fn walk_files(dir: &Path, root: &Path, out: &mut Vec<String>) {
    if out.len() >= WALK_CAP {
        return;
    }
    let read = match fs::read_dir(dir) {
        Ok(read) => read,
        Err(_) => return,
    };
    let mut items: Vec<_> = read.filter_map(Result::ok).collect();
    items.sort_by_key(|entry| entry.file_name());
    for entry in items {
        if out.len() >= WALK_CAP {
            return;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        if should_skip(&name) {
            continue;
        }
        let path = entry.path();
        let is_dir = entry.file_type().map(|kind| kind.is_dir()).unwrap_or(false);
        if is_dir {
            walk_files(&path, root, out);
        } else if let Ok(rel) = path.strip_prefix(root) {
            out.push(rel.to_string_lossy().into_owned());
        }
    }
}
```

Then add the command alongside the other `#[tauri::command]` functions:

```rust
#[tauri::command]
pub fn list_files_recursive(folder: String) -> Vec<String> {
    let root = Path::new(&folder);
    let mut out: Vec<String> = Vec::new();
    walk_files(root, root, &mut out);
    out
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd src-tauri && cargo test walk_tests`
Expected: PASS (2 tests).

- [ ] **Step 5: Register the command**

In `src-tauri/src/lib.rs`, add to the `generate_handler!` list (after `files::duplicate_path,`):

```rust
            files::list_files_recursive,
```

- [ ] **Step 6: Add the TS wrapper**

Append to `src/filesys.ts`:

```ts
export function listFilesRecursive(folder: string): Promise<string[]> {
  return invoke<string[]>("list_files_recursive", { folder });
}
```

- [ ] **Step 7: Verify it compiles**

Run: `cd src-tauri && cargo check` → Expected: Finished, no errors.
Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/files.rs src-tauri/src/lib.rs src/filesys.ts
git commit -m "feat: recursive file walk command for quick-open"
```

---

### Task 2: Fuzzy matcher (pure)

**Files:**
- Create: `src/fuzzy.ts`
- Test: `src/__tests__/fuzzy.test.ts`

**Interfaces:**
- Produces: `fuzzyMatch(query: string, text: string): number | null` — `null` when `query` is not a subsequence of `text`; higher score = better. Empty query returns `0`.
- Produces: `rankItems<T>(query: string, items: T[], key: (item: T) => string): T[]` — filters to matches, sorted best-first; empty query returns items unchanged.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/fuzzy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fuzzyMatch, rankItems } from "../fuzzy";

describe("fuzzyMatch", () => {
  it("matches a subsequence", () => {
    expect(fuzzyMatch("mn", "main.ts")).not.toBeNull();
  });

  it("returns null when not a subsequence", () => {
    expect(fuzzyMatch("xyz", "main.ts")).toBeNull();
  });

  it("empty query scores 0", () => {
    expect(fuzzyMatch("", "anything")).toBe(0);
  });

  it("scores consecutive matches higher than scattered", () => {
    const consecutive = fuzzyMatch("main", "main.ts")!;
    const scattered = fuzzyMatch("main", "m-a-i-n.ts")!;
    expect(consecutive).toBeGreaterThan(scattered);
  });

  it("is case-insensitive", () => {
    expect(fuzzyMatch("MAIN", "main.ts")).not.toBeNull();
  });
});

describe("rankItems", () => {
  it("filters non-matches and orders best-first", () => {
    const files = ["src/main.ts", "readme.md", "src/menu.rs"];
    const ranked = rankItems("main", files, (f) => f);
    expect(ranked).toContain("src/main.ts");
    expect(ranked).not.toContain("readme.md");
    expect(ranked[0]).toBe("src/main.ts");
  });

  it("empty query returns items unchanged", () => {
    const files = ["a", "b"];
    expect(rankItems("", files, (f) => f)).toEqual(files);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test -- fuzzy`
Expected: FAIL — cannot find module `../fuzzy`.

- [ ] **Step 3: Implement `src/fuzzy.ts`**

```ts
export function fuzzyMatch(query: string, text: string): number | null {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  let score = 0;
  let lastHit = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;
    score += lastHit === ti - 1 ? 3 : 1;
    if (ti === 0 || /[/\\ _.\-]/.test(t[ti - 1])) score += 2;
    lastHit = ti;
    qi++;
  }
  if (qi < q.length) return null;
  return score - t.length * 0.01;
}

export function rankItems<T>(query: string, items: T[], key: (item: T) => string): T[] {
  if (!query) return items;
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const score = fuzzyMatch(query, key(item));
    if (score !== null) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.item);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- fuzzy`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/fuzzy.ts src/__tests__/fuzzy.test.ts
git commit -m "feat: fuzzy matcher for command palette"
```

---

### Task 3: Settings model (pure parse)

**Files:**
- Create: `src/settings.ts`
- Test: `src/__tests__/settings.test.ts`

**Interfaces:**
- Produces types: `ThemeName = "system" | "light" | "dark" | "catppuccin-mocha" | "everforest-dark" | "nord"`; `ZoneSettings = { font: string; size: number }`; `Settings = { theme: ThemeName; restoreSession: boolean; explorer: ZoneSettings; main: ZoneSettings; sub: ZoneSettings }`.
- Produces: `DEFAULT_SETTINGS: Settings`, `DEFAULT_SETTINGS_JSON: string` (pretty-printed defaults for the file template).
- Produces: `parseSettings(raw: string): Settings` — never throws; bad/missing fields fall back to defaults; `size` clamped 10–28; unknown `theme` → `"dark"`.
- Produces: `applySettings(s: Settings): void` — sets `data-theme` + CSS vars (DOM; **not** unit-tested — no `document` in the Node test env).

- [ ] **Step 1: Write the failing test** (parse only — `applySettings` is DOM and untested here)

Create `src/__tests__/settings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "../settings";

describe("parseSettings", () => {
  it("returns defaults for invalid JSON", () => {
    expect(parseSettings("{ not json")).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults for empty object", () => {
    expect(parseSettings("{}")).toEqual(DEFAULT_SETTINGS);
  });

  it("merges partial settings over defaults", () => {
    const s = parseSettings('{ "theme": "nord", "main": { "size": 20 } }');
    expect(s.theme).toBe("nord");
    expect(s.main.size).toBe(20);
    expect(s.main.font).toBe(DEFAULT_SETTINGS.main.font);
    expect(s.explorer).toEqual(DEFAULT_SETTINGS.explorer);
  });

  it("falls back to dark for unknown theme", () => {
    expect(parseSettings('{ "theme": "neon" }').theme).toBe("dark");
  });

  it("clamps size into 10..28", () => {
    expect(parseSettings('{ "main": { "size": 200 } }').main.size).toBe(28);
    expect(parseSettings('{ "main": { "size": 2 } }').main.size).toBe(10);
  });

  it("ignores non-boolean restoreSession", () => {
    expect(parseSettings('{ "restoreSession": "yes" }').restoreSession).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test -- settings`
Expected: FAIL — cannot find module `../settings`.

- [ ] **Step 3: Implement `src/settings.ts`**

```ts
export type ThemeName =
  | "system"
  | "light"
  | "dark"
  | "catppuccin-mocha"
  | "everforest-dark"
  | "nord";

export type ZoneSettings = { font: string; size: number };

export type Settings = {
  theme: ThemeName;
  restoreSession: boolean;
  explorer: ZoneSettings;
  main: ZoneSettings;
  sub: ZoneSettings;
};

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
  explorer: { font: "", size: 13 },
  main: { font: "", size: 15 },
  sub: { font: "", size: 15 },
};

export const DEFAULT_SETTINGS_JSON = JSON.stringify(DEFAULT_SETTINGS, null, 2);

function clampSize(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(28, Math.max(10, Math.round(n)));
}

function zone(raw: unknown, fallback: ZoneSettings): ZoneSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    font: typeof r.font === "string" ? r.font : fallback.font,
    size: clampSize(r.size, fallback.size),
  };
}

export function parseSettings(raw: string): Settings {
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
    data = parsed as Record<string, unknown>;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  const theme = THEMES.includes(data.theme as ThemeName)
    ? (data.theme as ThemeName)
    : DEFAULT_SETTINGS.theme;
  return {
    theme,
    restoreSession:
      typeof data.restoreSession === "boolean" ? data.restoreSession : true,
    explorer: zone(data.explorer, DEFAULT_SETTINGS.explorer),
    main: zone(data.main, DEFAULT_SETTINGS.main),
    sub: zone(data.sub, DEFAULT_SETTINGS.sub),
  };
}

export function applySettings(s: Settings): void {
  const root = document.documentElement;
  const resolved =
    s.theme === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : s.theme;
  root.dataset.theme = resolved;
  root.style.setProperty("--explorer-font", s.explorer.font || "var(--font-ui)");
  root.style.setProperty("--explorer-size", `${s.explorer.size}px`);
  for (const id of ["main", "sub"] as const) {
    const el = document.querySelector<HTMLElement>(`.window[data-window-id="${id}"]`);
    if (!el) continue;
    el.style.setProperty("--win-font", s[id].font || "var(--font-mono)");
    el.style.setProperty("--win-size", `${s[id].size}px`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- settings`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/settings.ts src/__tests__/settings.test.ts
git commit -m "feat: settings model + parser"
```

---

### Task 4: Settings file command (Rust)

**Files:**
- Modify: `src-tauri/src/files.rs` (add `get_settings`)
- Modify: `src-tauri/src/lib.rs` (register + `use tauri::Manager`)
- Modify: `src/filesys.ts` (add `getSettingsFile` wrapper)

**Interfaces:**
- Produces (Rust): `#[tauri::command] pub fn get_settings(app: tauri::AppHandle) -> Result<SettingsFile, String>` where `SettingsFile { path: String, contents: String }`. Creates `<app_config_dir>/settings.json` from `default` if missing.
- Produces (TS): `getSettingsFile(defaultJson: string): Promise<{ path: string; contents: string }>`

- [ ] **Step 1: Add the struct + command in `src-tauri/src/files.rs`**

At the top, extend the import:

```rust
use std::path::{Path, PathBuf};
```

Add the struct near `Entry`:

```rust
#[derive(Serialize)]
pub struct SettingsFile {
    pub path: String,
    pub contents: String,
}
```

Add the command (it takes the default JSON from the frontend so Rust holds no copy of the schema):

```rust
#[tauri::command]
pub fn get_settings(
    app: tauri::AppHandle,
    default: String,
) -> Result<SettingsFile, String> {
    use tauri::Manager;
    let dir: PathBuf = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = dir.join("settings.json");
    if !file.exists() {
        fs::write(&file, &default).map_err(|e| e.to_string())?;
    }
    let contents = fs::read_to_string(&file).map_err(|e| e.to_string())?;
    Ok(SettingsFile {
        path: file.to_string_lossy().into_owned(),
        contents,
    })
}
```

(Note: this is the one place `PathBuf` is needed; if `cargo check` warns `Path` is now unused, leave the import as `Path, PathBuf` — `Path` is still used elsewhere in the file.)

- [ ] **Step 2: Register the command**

In `src-tauri/src/lib.rs`, add to `generate_handler!` after `files::list_files_recursive,`:

```rust
            files::get_settings,
```

- [ ] **Step 3: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: Finished, no errors. (`app.path()` resolves via the `tauri::Manager` trait imported inside the function.)

- [ ] **Step 4: Add the TS wrapper**

Append to `src/filesys.ts`:

```ts
type RawSettingsFile = { path: string; contents: string };

export function getSettingsFile(
  defaultJson: string,
): Promise<{ path: string; contents: string }> {
  return invoke<RawSettingsFile>("get_settings", { default: defaultJson });
}
```

- [ ] **Step 5: Verify TS compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/files.rs src-tauri/src/lib.rs src/filesys.ts
git commit -m "feat: settings.json file command (read/create in app config dir)"
```

---

### Task 5: Themes + themeable editor syntax

**Files:**
- Create: `src/themes.css`
- Modify: `src/styles.css` (import themes, explorer font/size vars)
- Modify: `src/editor.ts:25-50` (custom HighlightStyle from `--tok-*`; per-zone font/size vars)

**Interfaces:**
- Produces: `[data-theme="…"]` palettes for `light`, `dark`, `catppuccin-mocha`, `everforest-dark`, `nord` (the bare `:root` is the dark default; `system` resolves to `light`/`dark` in `applySettings`).
- Consumes: `--win-font`, `--win-size`, `--explorer-font`, `--explorer-size` (set by `applySettings` from Task 3).

- [ ] **Step 1: Create `src/themes.css`**

Each theme overrides the variable set defined in `styles.css:3-33`. Hex values are each project's own published palette, written fresh here.

```css
/* MDflow theme palettes. Each is a fresh CSS-variable set. */

[data-theme="dark"] {
  /* same as :root default — explicit so the selector exists */
}

[data-theme="light"] {
  --bg: #ffffff;
  --bg-elev: #f4f4f6;
  --bg-editor: #ffffff;
  --bg-preview: #fafafa;
  --code-bg: #f0f0f3;
  --border: #e2e2e8;
  --border-soft: #ededf1;
  --text: #2a2d34;
  --text-strong: #1a1c22;
  --muted: #6a7080;
  --faint: #aab0bd;
  --accent: #b9762a;
  --accent-press: #cf8638;
  --selection: rgba(185, 118, 42, 0.16);
  --tok-keyword: #a3308f;
  --tok-string: #2f7d32;
  --tok-func: #1f5fb0;
  --tok-comment: #9aa0ab;
}

[data-theme="catppuccin-mocha"] {
  --bg: #1e1e2e;
  --bg-elev: #181825;
  --bg-editor: #1e1e2e;
  --bg-preview: #181825;
  --code-bg: #313244;
  --border: #313244;
  --border-soft: #292a3a;
  --text: #cdd6f4;
  --text-strong: #f5f5ff;
  --muted: #a6adc8;
  --faint: #6c7086;
  --accent: #cba6f7;
  --accent-press: #ddb6ff;
  --selection: rgba(203, 166, 247, 0.20);
  --tok-keyword: #cba6f7;
  --tok-string: #a6e3a1;
  --tok-func: #89b4fa;
  --tok-comment: #6c7086;
}

[data-theme="everforest-dark"] {
  --bg: #2d353b;
  --bg-elev: #343f44;
  --bg-editor: #2d353b;
  --bg-preview: #343f44;
  --code-bg: #3d484d;
  --border: #3d484d;
  --border-soft: #374247;
  --text: #d3c6aa;
  --text-strong: #f0e9d2;
  --muted: #9da9a0;
  --faint: #859289;
  --accent: #e69875;
  --accent-press: #f0a585;
  --selection: rgba(230, 152, 117, 0.18);
  --tok-keyword: #d699b6;
  --tok-string: #a7c080;
  --tok-func: #7fbbb3;
  --tok-comment: #859289;
}

[data-theme="nord"] {
  --bg: #2e3440;
  --bg-elev: #3b4252;
  --bg-editor: #2e3440;
  --bg-preview: #3b4252;
  --code-bg: #434c5e;
  --border: #434c5e;
  --border-soft: #3b4252;
  --text: #d8dee9;
  --text-strong: #eceff4;
  --muted: #aeb8c8;
  --faint: #616e88;
  --accent: #88c0d0;
  --accent-press: #8fbcbb;
  --selection: rgba(136, 192, 208, 0.20);
  --tok-keyword: #81a1c1;
  --tok-string: #a3be8c;
  --tok-func: #88c0d0;
  --tok-comment: #616e88;
}
```

- [ ] **Step 2: Import themes + add explorer font/size vars in `src/styles.css`**

At the very top of `src/styles.css` (line 1), add the import (CSS imports must precede other rules):

```css
@import "./themes.css";
```

Then find the `#explorer` rule in `styles.css` and add font vars (if `#explorer` has no font rule, add this block near the explorer styles):

```css
#explorer {
  font-family: var(--explorer-font, var(--font-ui));
  font-size: var(--explorer-size, 13px);
}
```

- [ ] **Step 3: Make editor syntax + font themeable in `src/editor.ts`**

Add imports at the top of `src/editor.ts`:

```ts
import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
```

Replace the `syntaxHighlighting(defaultHighlightStyle, ...)` usage. First define the style after the `theme` constant (around line 50):

```ts
const mdHighlight = HighlightStyle.define([
  { tag: tags.heading, color: "var(--tok-func)", fontWeight: "bold" },
  { tag: [tags.keyword, tags.modifier], color: "var(--tok-keyword)" },
  { tag: [tags.string, tags.link, tags.url], color: "var(--tok-string)" },
  { tag: [tags.comment, tags.quote], color: "var(--tok-comment)", fontStyle: "italic" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.monospace, color: "var(--tok-string)" },
]);
```

Change line 71 from:

```ts
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
```

to:

```ts
    syntaxHighlighting(mdHighlight, { fallback: true }),
```

Remove the now-unused `defaultHighlightStyle` from the import on line 2:

```ts
import { syntaxHighlighting } from "@codemirror/language";
```

Update the `.cm-scroller` rule in the `theme` object (lines 28-33) so font/size come from the per-window vars:

```ts
    ".cm-scroller": {
      fontFamily: "var(--win-font, var(--font-mono))",
      fontSize: "calc(var(--win-size, 15px) * var(--zoom, 1))",
      lineHeight: "1.65",
      padding: "var(--pane-pad) 0",
    },
```

- [ ] **Step 4: Verify it compiles and existing tests still pass**

Run: `npx tsc --noEmit` → Expected: no errors.
Run: `npm run test` → Expected: all existing tests still pass (no behavior change to pure modules).
Run: `npm run build` → Expected: built successfully.

- [ ] **Step 5: Commit**

```bash
git add src/themes.css src/styles.css src/editor.ts
git commit -m "feat: theme palettes + themeable editor syntax and per-zone fonts"
```

---

### Task 6: Command palette overlay

**Files:**
- Create: `src/palette.ts`
- Modify: `src/glyphs.ts` (add `search`, `gear`)

**Interfaces:**
- Consumes: `rankItems` from `./fuzzy`.
- Produces: `type PaletteItem = { id: string; label: string; kind: "command" | "file"; run: () => void }`
- Produces: `type PaletteProvider = () => PaletteItem[]` (called on each open to get the current command + file set)
- Produces: `createPalette(provider: PaletteProvider): { open: () => void }` — builds a hidden overlay once; `open()` shows it, focuses the input, and live-filters. Esc/blur/select closes it.

- [ ] **Step 1: Add glyphs**

Append two entries inside the `glyphs` object in `src/glyphs.ts` (before the closing `};`):

```ts
  search: wrap(`<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3.5 3.5"/>`),
  gear: wrap(
    `<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"/>`,
  ),
```

- [ ] **Step 2: Implement `src/palette.ts`**

```ts
import { rankItems } from "./fuzzy";

export type PaletteItem = {
  id: string;
  label: string;
  kind: "command" | "file";
  run: () => void;
};

export type PaletteProvider = () => PaletteItem[];

export function createPalette(provider: PaletteProvider): { open: () => void } {
  const overlay = document.createElement("div");
  overlay.id = "palette";
  overlay.className = "palette hidden";
  overlay.innerHTML = `
    <div class="palette-box">
      <input class="palette-input" type="text" placeholder="Search files or run a command…" />
      <div class="palette-list"></div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector<HTMLInputElement>(".palette-input")!;
  const list = overlay.querySelector<HTMLElement>(".palette-list")!;

  let items: PaletteItem[] = [];
  let filtered: PaletteItem[] = [];
  let active = 0;

  const close = (): void => {
    overlay.classList.add("hidden");
  };

  const run = (item: PaletteItem | undefined): void => {
    if (!item) return;
    close();
    item.run();
  };

  const renderList = (): void => {
    list.innerHTML = "";
    filtered.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "palette-row" + (index === active ? " active" : "");
      row.innerHTML = `<span class="palette-kind ${item.kind}">${
        item.kind === "command" ? "›" : ""
      }</span><span class="palette-label"></span>`;
      row.querySelector(".palette-label")!.textContent = item.label;
      row.addEventListener("mousedown", (event) => {
        event.preventDefault();
        run(item);
      });
      list.appendChild(row);
    });
  };

  const refilter = (): void => {
    const query = input.value.trim();
    filtered = rankItems(query, items, (item) => item.label);
    active = 0;
    renderList();
  };

  input.addEventListener("input", refilter);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      active = Math.min(active + 1, filtered.length - 1);
      renderList();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      active = Math.max(active - 1, 0);
      renderList();
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(filtered[active]);
    }
  });
  overlay.addEventListener("mousedown", (event) => {
    if (event.target === overlay) close();
  });

  return {
    open: () => {
      items = provider();
      input.value = "";
      overlay.classList.remove("hidden");
      refilter();
      input.focus();
    },
  };
}
```

- [ ] **Step 3: Add palette styles to `src/styles.css`** (append at the end)

```css
/* ---------- Command palette ---------- */
.palette {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
  background: rgba(0, 0, 0, 0.35);
  z-index: 50;
}
.palette.hidden { display: none; }
.palette-box {
  width: min(620px, 90vw);
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}
.palette-input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text-strong);
  font-family: var(--font-ui);
  font-size: 15px;
  outline: none;
}
.palette-list { max-height: 46vh; overflow-y: auto; }
.palette-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  color: var(--text);
}
.palette-row.active { background: var(--selection); color: var(--text-strong); }
.palette-kind { width: 12px; color: var(--accent); text-align: center; }
.palette-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

- [ ] **Step 4: Verify compile + build**

Run: `npx tsc --noEmit` → Expected: no errors.
Run: `npm run build` → Expected: built successfully.

- [ ] **Step 5: Commit**

```bash
git add src/palette.ts src/glyphs.ts src/styles.css
git commit -m "feat: command palette overlay + search/gear glyphs"
```

---

### Task 7: Activity-bar Search + Gear buttons

**Files:**
- Modify: `index.html:13-23` (add Search + Gear buttons after Explorer)
- Modify: `src/activitybar.ts` (render glyphs, wire callbacks)

**Interfaces:**
- Consumes: `glyphs.search`, `glyphs.gear`.
- Produces: `initActivityBar(onLayoutChange: () => void, onSearch: () => void, onSettings: () => void): void` (extended signature — Task 8 passes the two new callbacks).

- [ ] **Step 1: Add buttons to `index.html`**

Replace the `<nav id="activitybar">` block (lines 13-23) with:

```html
        <nav id="activitybar" aria-label="Primary">
          <button
            class="ab-btn ab-explorer active"
            id="ab-explorer"
            title="Explorer"
            type="button"
            aria-label="Toggle Explorer"
            aria-pressed="true"
          ></button>
          <button
            class="ab-btn ab-search"
            id="ab-search"
            title="Search (⌘K)"
            type="button"
            aria-label="Search files and commands"
          ></button>
          <button
            class="ab-btn ab-settings"
            id="ab-settings"
            title="Settings"
            type="button"
            aria-label="Open settings"
          ></button>
        </nav>
```

(Gear is last. The CSS rule `#activitybar .ab-settings { margin-top: auto; }` — add it to `styles.css` if you want the gear pinned to the bottom; otherwise it sits right after Search. Pinning to the bottom matches the "always last" intent — add the margin rule.)

Add to `src/styles.css` (near the activity-bar rules):

```css
#activitybar .ab-settings { margin-top: auto; }
```

- [ ] **Step 2: Wire the buttons in `src/activitybar.ts`**

Replace the file with:

```ts
import { getState, setState } from "./store";
import { glyphs } from "./glyphs";

export function initActivityBar(
  onLayoutChange: () => void = () => {},
  onSearch: () => void = () => {},
  onSettings: () => void = () => {},
): void {
  const explorerButton = document.getElementById("ab-explorer")!;
  explorerButton.innerHTML = glyphs.explorer;

  const searchButton = document.getElementById("ab-search")!;
  searchButton.innerHTML = glyphs.search;
  searchButton.addEventListener("click", () => onSearch());

  const settingsButton = document.getElementById("ab-settings")!;
  settingsButton.innerHTML = glyphs.gear;
  settingsButton.addEventListener("click", () => onSettings());

  const applyVisibility = (visible: boolean): void => {
    document.body.classList.toggle("explorer-hidden", !visible);
    explorerButton.classList.toggle("active", visible);
    explorerButton.setAttribute("aria-pressed", String(visible));
  };

  applyVisibility(getState().explorerVisible);

  explorerButton.addEventListener("click", () => {
    const explorerVisible = !getState().explorerVisible;
    setState({ explorerVisible });
    applyVisibility(explorerVisible);
    onLayoutChange();
  });
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors (the new callbacks default to no-ops until Task 8 passes them).

- [ ] **Step 4: Commit**

```bash
git add index.html src/activitybar.ts src/styles.css
git commit -m "feat: Search + Gear activity-bar buttons"
```

---

### Task 8: Wire palette + settings into the app

**Files:**
- Modify: `src/main.ts` (build registry, open palette, open settings, apply settings on launch + on save, gate restore, fetch file list)

**Interfaces:**
- Consumes: `createPalette`, `PaletteItem` from `./palette`; `getSettingsFile`, `listFilesRecursive` from `./filesys`; `parseSettings`, `applySettings`, `DEFAULT_SETTINGS_JSON` from `./settings`.

- [ ] **Step 1: Add imports to `src/main.ts`** (with the other imports near the top)

```ts
import { createPalette, type PaletteItem } from "./palette";
import { parseSettings, applySettings, DEFAULT_SETTINGS_JSON } from "./settings";
import { getSettingsFile, listFilesRecursive } from "./filesys";
```

Also add `listFilesRecursive` is from `./filesys`; ensure `pickFolder` import line stays. (If `filesys` is already imported, merge the names into the existing import.)

- [ ] **Step 2: Add settings + file-list state and helpers** (near the top, after `let ui = loadState();`)

```ts
let settingsPath = "";
let fileList: string[] = [];

async function loadSettings(): Promise<void> {
  try {
    const file = await getSettingsFile(DEFAULT_SETTINGS_JSON);
    settingsPath = file.path;
    applySettings(parseSettings(file.contents));
  } catch {
    applySettings(parseSettings("{}"));
  }
}

async function refreshFileList(): Promise<void> {
  const folder = getState().folder;
  fileList = folder ? await listFilesRecursive(folder).catch(() => []) : [];
}

function openSettings(): void {
  if (!settingsPath) return;
  void doOpenPath(settingsPath);
}
```

- [ ] **Step 3: Build the palette provider + command registry** (add after the helpers above)

```ts
function commandItems(): PaletteItem[] {
  const cmd = (id: string, label: string, run: () => void): PaletteItem => ({
    id,
    label,
    kind: "command",
    run,
  });
  const wid = () => getState().activeWindowId;
  return [
    cmd("new", "New File", () => newDoc()),
    cmd("open", "Open File…", () => void doOpen()),
    cmd("openFolder", "Open Folder…", () =>
      void pickFolder().then((d) => { if (d) void openFolder(d); }),
    ),
    cmd("save", "Save", () => void doSave(false)),
    cmd("saveAs", "Save As…", () => void doSave(true)),
    cmd("close", "Close Tab", () => {
      const w = activeWindow();
      if (w.activeTabId) void closeTab(w.id, w.activeTabId);
    }),
    cmd("split", "View: Split", () => setMode(wid(), "split")),
    cmd("editor", "View: Editor", () => setMode(wid(), "editor")),
    cmd("read", "View: Read", () => setMode(wid(), "preview")),
    cmd("softwrap", "Toggle Soft Wrap", () => toggleSoftWrap()),
    cmd("lines", "Toggle Line Numbers", () => toggleLineNumbers()),
    cmd("sub", "Toggle Sub Window", () => void toggleSub()),
    cmd("explorer", "Toggle Explorer", () => {
      const explorerVisible = !getState().explorerVisible;
      setState({ explorerVisible });
      document.body.classList.toggle("explorer-hidden", !explorerVisible);
      requestWindowMeasure();
    }),
    cmd("settings", "Open Settings", () => openSettings()),
    cmd("help", "MDflow Help", () => openHelp()),
  ];
}

function fileItems(): PaletteItem[] {
  const folder = getState().folder;
  if (!folder) return [];
  return fileList.map((rel) => ({
    id: `file:${rel}`,
    label: rel,
    kind: "file" as const,
    run: () => void doOpenPath(`${folder}/${rel}`),
  }));
}

const palette = createPalette(() => [...fileItems(), ...commandItems()]);
```

- [ ] **Step 4: Pass the new callbacks to `initActivityBar`**

Change the existing call (currently `initActivityBar(requestWindowMeasure);`) to:

```ts
initActivityBar(requestWindowMeasure, () => palette.open(), () => openSettings());
```

- [ ] **Step 5: Bind ⌘K / ⌘P to the palette**

In the existing `window.addEventListener("keydown", ...)` handler, add at the top of the callback (before the ⌘W check):

```ts
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    palette.open();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p" && !e.shiftKey) {
    e.preventDefault();
    palette.open();
    return;
  }
```

- [ ] **Step 6: Re-apply settings when settings.json is saved**

In `doSave`, after the successful `await writeFile(target, text);` line, add:

```ts
    if (target === settingsPath) {
      applySettings(parseSettings(text));
    }
```

- [ ] **Step 7: Apply settings at launch + gate session restore + refresh file list**

Find the bottom-of-file boot sequence. Replace the trailing `void restoreWindows();` call with an async boot that applies settings first and honors `restoreSession`:

```ts
async function boot(): Promise<void> {
  await loadSettings();
  await refreshFileList();
  if (parseSettings("{}") && getRestoreSession()) {
    await restoreWindows();
  } else {
    const result = await getInitialFile();
    if (result) {
      openInWindow(getState().activeWindowId, {
        path: result.path,
        name: basename(result.path),
        text: result.contents,
      });
    }
    renderAll();
  }
}
void boot();
```

`getRestoreSession` reads the live setting — add this helper next to `loadSettings` and have `loadSettings` store the parsed object:

Change `loadSettings` to keep the parsed settings:

```ts
let currentSettings = parseSettings("{}");

async function loadSettings(): Promise<void> {
  try {
    const file = await getSettingsFile(DEFAULT_SETTINGS_JSON);
    settingsPath = file.path;
    currentSettings = parseSettings(file.contents);
  } catch {
    currentSettings = parseSettings("{}");
  }
  applySettings(currentSettings);
}

function getRestoreSession(): boolean {
  return currentSettings.restoreSession;
}
```

And in Step 6's save hook, also refresh `currentSettings`:

```ts
    if (target === settingsPath) {
      currentSettings = parseSettings(text);
      applySettings(currentSettings);
    }
```

(Delete the now-duplicated `if (parseSettings("{}") && ...)` guard — the `boot()` should simply call `if (getRestoreSession())`. Final boot body:)

```ts
async function boot(): Promise<void> {
  await loadSettings();
  await refreshFileList();
  if (getRestoreSession()) {
    await restoreWindows();
  } else {
    const result = await getInitialFile();
    if (result) {
      openInWindow(getState().activeWindowId, {
        path: result.path,
        name: basename(result.path),
        text: result.contents,
      });
    }
    renderAll();
  }
}
void boot();
```

- [ ] **Step 8: Re-apply settings after the sub window is created**

Per-window CSS vars only land if the `.window` element exists. In `toggleSub`, after `makeView("sub", false);` (the branch that creates the sub window) and after the sub window is created in `restoreWindows`, add:

```ts
    applySettings(currentSettings);
```

(Two call sites: the `else` branch of `toggleSub` that adds the sub window, and the `if (saved[1])` branch of `restoreWindows`.)

- [ ] **Step 9: Refresh the file list when a folder is opened**

In `openFolder`'s callers is awkward; simpler — refresh on folder open. In the menu listener `file.open_folder` case and in the explorer open path, the folder is set via `openFolder` (in `explorer.ts`). Add a refresh on window focus where the tree already refreshes. In the existing `window.addEventListener("focus", ...)` handler, after `void refreshDir(folder)...`, add:

```ts
    void refreshFileList();
```

Also call `void refreshFileList();` once right after `await openFolder(...)` is not directly reachable here; the focus refresh + boot refresh cover the common cases. (Quick-open reflects new files within one window-focus cycle — acceptable for v1.)

- [ ] **Step 10: Verify everything compiles, tests pass, builds**

Run: `npx tsc --noEmit` → Expected: no errors.
Run: `npm run test` → Expected: all pass (26 + 7 fuzzy + 6 settings = 39).
Run: `cd src-tauri && cargo test` → Expected: all pass (5 + 3 walk = 8).
Run: `npm run build` → Expected: built successfully.

- [ ] **Step 11: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire command palette + live settings into app"
```

---

### Task 9: Smoke test + docs

**Files:**
- Modify: `CLAUDE.md` (Architecture section: new files + settings.json location)
- Create: `docs/superpowers/plans/2026-06-19-topbar-settings-smoke.md` (recorded smoke run)

- [ ] **Step 1: Manual smoke (run `npm run tauri dev`)**

Verify and record each:
1. `⌘K` opens the palette; typing filters files; ↑/↓ move; Enter opens a file.
2. Typing a command name (e.g. "split") shows it; Enter runs it.
3. Search activity-bar button opens the same palette.
4. Gear opens `settings.json` as a tab.
5. Change `"theme"` to each of `light`, `catppuccin-mocha`, `everforest-dark`, `nord`, `system`, save → UI + editor syntax recolor live.
6. Change `main.size` to 20 and `sub.size` to 12, save → the two windows show different sizes.
7. Set `"restoreSession": false`, save, quit, relaunch → starts with no restored tabs/folder.

- [ ] **Step 2: Update `CLAUDE.md` Architecture**

Add to the `src/` file list:

```
  fuzzy.ts     subsequence fuzzy match + ranking (pure) — fuzzyMatch(), rankItems()
  palette.ts   ⌘K command/file overlay — createPalette()
  settings.ts  settings.json model — parseSettings(), applySettings()
  themes.css   [data-theme] palettes (light/dark/catppuccin-mocha/everforest-dark/nord)
```

Add to `src-tauri/src/files.rs` description: `list_files_recursive` (quick-open) and `get_settings` (settings.json in app config dir).

Add a line: settings live at `<app config dir>/settings.json`; editing + saving applies live.

- [ ] **Step 3: Record the smoke run** in `docs/superpowers/plans/2026-06-19-topbar-settings-smoke.md` (pass/fail per item above).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/superpowers/plans/2026-06-19-topbar-settings-smoke.md
git commit -m "docs: Phase 5 architecture + smoke run"
```

---

## Self-Review

**Spec coverage:**
- Command palette (files + commands) → Tasks 2, 6, 8. ✓
- Recursive file list → Task 1. ✓
- `⌘K`/`⌘P`/Search button open palette → Tasks 7, 8. ✓
- settings.json on disk, opened in editor → Tasks 4, 8 (gear → `openSettings`). ✓
- Live apply on save → Task 8 Step 6. ✓
- Theme (6, incl. System) recoloring UI + syntax → Tasks 3, 5. ✓
- Per-zone font/size → Tasks 3 (vars), 5 (editor/explorer consume), 8 (re-apply on sub create). ✓
- Restore-session toggle → Task 8 Step 7. ✓
- Activity-bar order Explorer→Search→Gear → Task 7. ✓
- Tests: fuzzy, settings parse, Rust walk → Tasks 1, 2, 3. ✓

**Placeholder scan:** No TBD/TODO; every code step has full code. ✓

**Type consistency:** `PaletteItem`/`PaletteProvider` defined in Task 6 and consumed in Task 8; `Settings`/`parseSettings`/`applySettings`/`DEFAULT_SETTINGS_JSON` defined in Task 3 and consumed in Task 8; `getSettingsFile`/`listFilesRecursive` defined in Tasks 4/1 and consumed in Task 8; `initActivityBar` 3-arg signature defined in Task 7 and called in Task 8. CSS vars `--win-font/--win-size/--explorer-font/--explorer-size` set in Task 3, consumed in Task 5. ✓
```
