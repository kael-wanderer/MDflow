# CLAUDE.md

> Starter file. Expand with build commands + architecture once the app is scaffolded
> (tracked in `docs/tasks.md`).

## What is MDflow

A fast, lightweight markdown editor built with Tauri 2 + Rust. **Clean-room rewrite**
— independent, MIT-licensed. Same eventual feature set as the Kaelio editor, but
written from scratch with a modular architecture and refined UI. License: MIT.
Identifier: `com.kael.mdflow`. Current status: M1 + shell Phase 5 implemented.

**Always read `docs/spec.md` and `docs/tasks.md` before starting work.**

## Clean-room rule (do not violate — this is the legal basis of the project)

MDflow must stay legally independent of Kaelio / mx / Vibery Studio (those are
GPL-3.0). Therefore:

- **Never copy, paste, or port code or CSS from Kaelio.** Not a single line.
- Kaelio (`/Users/cong.bui/Kael/20-Projects/kaelio`) may be **read only as a behavior
  reference** — to learn *what* a feature does and *how it behaves* — then a fresh
  implementation is written from understanding, not from the source text.
- No names "mx", "Vibery", "Kaelio", or attribution to them anywhere in source, UI,
  or docs.
- This rule applies to every contributor, human or AI (including Codex).

### How to reference Kaelio correctly

When you want a feature to behave like Kaelio's: open the relevant Kaelio file by
absolute path, study the behavior, describe it in your own words / as a spec, then
implement fresh in MDflow. Do not keep Kaelio source open while typing MDflow code,
and never paste from it. Do not add Kaelio as a submodule or copy its files in.

## Working style (from global rules)

- Keep it simple. No premature abstraction. Small, focused files (one responsibility).
- Spec-driven: spec → plan → build → test → document, in order.
- Solo dev — favor low-risk, incremental, always-shippable steps.

## Commands

- `npm install` — install JS deps (run `npm approve-scripts esbuild fsevents`
  once after install; their native postinstalls are gated by the script allowlist)
- `npm run tauri dev` — run the desktop app in dev (hot reload)
- `npm run tauri build` — build a release bundle
- `npm run test` — run Vitest unit tests (pure functions only)
- `npm run build` — type-check + Vite production build (no native shell)
- `cd src-tauri && cargo test` — run Rust unit tests
- `cd src-tauri && cargo check` — fast compile-check the backend

## Architecture

Tauri 2 + Rust native shell; plain-TypeScript frontend (no framework) wired by a
thin `main.ts`. One responsibility per file.

```
src/
  main.ts      bootstrap + document workflow + palette command registry
  editor.ts    CodeMirror 6 (md highlight, soft-wrap) — createEditor()
  preview.ts   markdown-it render pipeline (pure) — renderMarkdown()
  windowview.ts per-window tabs, toolbar, editor, preview, and status
  explorer.ts  lazy folder tree + file management
  fuzzy.ts     subsequence fuzzy match + ranking — fuzzyMatch(), rankItems()
  palette.ts   ⌘K/⌘P command/file overlay — createPalette()
  settings.ts  settings.json model — parseSettings(), applySettings()
  themes.css   light/dark/catppuccin-mocha/everforest-dark/nord palettes
  files.ts     IPC open/save + native file dialogs
  filesys.ts   Explorer/settings/recursive-walk IPC wrappers
  state.ts     persisted UI state (localStorage) — loadState(), saveState()
  styles.css   shell layout and component styling (CSS variables)
src-tauri/src/
  lib.rs       Tauri builder: command registry + plugins (dialog, updater)
  files.rs     file IO/management, recursive quick-open walk, settings file
```

Data flow: edit → 300ms debounce → `renderMarkdown` → preview pane + word count.
`Cmd+S` → `saveFile` → IPC `save_file`. `Cmd+O` → dialog → IPC `read_file` → editor.
View mode + zoom persist to `localStorage` (`mdflow.ui`).

Settings live at `<app config dir>/settings.json`. The Gear button opens the file as
a normal tab; saving it applies theme and per-zone typography immediately.

Updater plugin is installed but **dormant** in M1 — M2 adds the signed release feed
(`latest.json` + pubkey) and the in-app update prompt.
