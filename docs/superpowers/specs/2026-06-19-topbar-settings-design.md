# Top Bar + Settings — Design Spec (Phase 5)

> Clean-room MIT. No Kaelio/mx/Vibery code, CSS, or names. Theme palettes use
> their own published (MIT) color values, implemented fresh as CSS variables.

## What problem does this solve?

MDflow has the IDE shell (activity bar, explorer, tabs, split windows) but no fast
way to jump between files or run actions, and no user-facing settings. This phase
adds a **command palette** (quick-open files + run commands) and a **settings
system** (`settings.json`) covering theme and per-zone fonts/sizes.

## What does success look like?

- `⌘K` (and `⌘P`, and the Search activity-bar button) open a palette that fuzzy-finds
  every file in the open folder and lists runnable app commands.
- A gear button (last in the activity bar) opens `settings.json` in the editor; editing
  and saving it applies changes live.
- Settings control: theme, restore-last-session, and per-zone font + size for the
  explorer, the main window, and the sub window.
- Themes: System, Light, Dark, Catppuccin Mocha, Everforest Dark, Nord — recoloring
  the whole UI **including editor syntax**.

## What's out of scope?

- Find-in-files / content grep (Search button only opens the palette).
- A settings form UI (settings are edited as JSON in the editor).
- Per-keybinding customization, snippets, extensions.
- Adding/removing themes at runtime beyond the six listed (more are a later, trivial add).

## Tech stack

Existing: Tauri 2 + Rust, vanilla TS, CodeMirror 6, markdown-it. **No new JS deps.**
New Rust: one recursive file-walk command + one settings-file command.

## Constraints

- Activity-bar order is fixed: **Explorer → Search → Gear**. Gear is always last as
  more buttons are added.
- No new frontend dependencies. Inline SVG glyphs (extend `glyphs.ts`).
- Pure logic (fuzzy match, settings parse, file-walk filtering) is TDD'd; UI is manual smoke.
- Small focused files, one responsibility each.

---

## Architecture

Two independent surfaces over the existing shell, plus a settings layer that drives
CSS variables and the `data-theme` attribute.

### Activity bar (final order)

`Explorer → Search → Gear`

- **Explorer** (existing) — toggles the explorer panel.
- **Search** — opens the command palette overlay.
- **Gear** — opens `settings.json` in the active window as an editor tab.

### Command palette

| Unit | Responsibility |
|---|---|
| `fuzzy.ts` (new, pure) | `fuzzyMatch(query, text): number \| null` (subsequence match + score); `rankItems(query, items, key)` returns matches sorted best-first. |
| `palette.ts` (new) | Overlay component. Renders an input + result list grouped into FILES and COMMANDS sections. Keyboard: ↑/↓ move, Enter select, Esc close, click select. Dumb: receives a provider, emits a selection. |
| `main.ts` (modify) | Owns the **command registry** (`{ id, label, run }[]`) mapped to existing functions, supplies the **file list** (from the recursive walk), opens/closes the palette, binds `⌘K`/`⌘P`. |
| Rust `list_files_recursive(folder)` (new) | Walks the folder once, returns relative file paths. Skips `.git`, `node_modules`, and dotfiles; caps at 5000 entries. |

Command registry (initial): New File, Open File…, Open Folder…, Save, Save As…, Close
Tab, View: Split, View: Editor, View: Read, Toggle Soft Wrap, Toggle Line Numbers,
Toggle Sub Window, Toggle Explorer, Open Settings, MDflow Help. Each `run` calls an
existing `main.ts` function — no behavior is reimplemented.

The file list is fetched via the Rust walk when a folder opens (and refreshed on
folder change), cached in `main.ts`. Selecting a file calls the existing open path.

### Settings

| Unit | Responsibility |
|---|---|
| `settings.ts` (new) | `Settings` type, `DEFAULT_SETTINGS`, `parseSettings(raw): Settings` (pure: JSON parse + deep-merge over defaults + clamp/validate), `applySettings(s)` (DOM side-effects: set `data-theme` and CSS variables). |
| `themes.css` (new) | `[data-theme="…"]` blocks defining the variable palette for each theme. `system` resolves to light/dark via `prefers-color-scheme`. |
| Rust `get_settings()` (new) | Resolves `appConfigDir/settings.json`, creates it from a default template if missing, returns `{ path, contents }`. |
| `editor.ts` (modify) | Replace `defaultHighlightStyle` with a custom `HighlightStyle` whose colors are `var(--tok-*)`, so themes recolor syntax. Editor font/size read `var(--*-font)` / `var(--*-size)`. |

`get_settings` is called at launch. Writing is the existing `save_file` (the file is a
normal editor tab). When the active save target equals the settings path, `main.ts`
re-runs `parseSettings` + `applySettings` so changes apply live.

### Settings shape

```json
{
  "theme": "dark",
  "restoreSession": true,
  "explorer": { "font": "", "size": 13 },
  "main":     { "font": "", "size": 15 },
  "sub":      { "font": "", "size": 15 }
}
```

- `theme`: one of `system | light | dark | catppuccin-mocha | everforest-dark | nord`.
  Unknown value → falls back to `dark`.
- `restoreSession`: `false` → launch does not reopen the previous folder/tabs.
- `font: ""` → inherit the default stack (`--font-mono` for editors, `--font-ui` for explorer).
- `size`: clamped to 10–28.

`applySettings` sets, on `:root`: `--explorer-font`, `--explorer-size`. Per window, on
each `.window[data-window-id]` element: `--win-font`, `--win-size` (consumed by the
editor theme and preview pane CSS). Theme via `document.documentElement.dataset.theme`.

## Data flow

1. **Launch** → `get_settings` → `parseSettings` → `applySettings` → then gate the
   existing session restore on `restoreSession`.
2. **⌘K / ⌘P / Search** → open palette → provider returns ranked files + commands →
   Enter runs a command or opens a file.
3. **Edit settings.json → Save** → if path is the settings file, `parseSettings` +
   `applySettings` (theme/fonts update instantly). Otherwise normal save.

## Error handling

- Malformed `settings.json` → `parseSettings` returns defaults (never throws); a console
  warning is enough (no modal — the file is visibly open for the user to fix).
- `list_files_recursive` on a vanished/permission-denied folder → returns what it could
  read; palette shows commands only.
- Settings save failure surfaces through the existing save error path.

## Testing

- **TDD (pure):** `fuzzy.ts` (subsequence match, ranking, no-match); `settings.ts`
  `parseSettings` (full defaults, partial JSON, bad theme, out-of-range size, invalid JSON);
  Rust `list_files_recursive` filtering (skips `.git`/`node_modules`/dotfiles, respects cap).
- **Manual smoke:** palette open/nav/select for a file and a command; gear opens
  settings; switch each theme; per-zone font + size visibly differ; `restoreSession: false`
  starts clean.

## Deliverables

- [ ] Code (palette, settings, themes, Rust commands, activity-bar buttons)
- [ ] Unit tests (fuzzy, settings parse, Rust walk)
- [ ] Manual smoke recorded
- [ ] `CLAUDE.md` architecture section updated (new files + settings.json location)
