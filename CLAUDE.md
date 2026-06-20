# CLAUDE.md

> Starter file. Expand with build commands + architecture once the app is scaffolded
> (tracked in `docs/tasks.md`).

## What is MDflow

A fast, lightweight markdown editor built with Tauri 2 + Rust. **Clean-room rewrite**
— independent, MIT-licensed. Same eventual feature set as the Kaelio editor, but
written from scratch with a modular architecture and refined UI. License: MIT.
Identifier: `com.kael.mdflow`. Current status: M1 + shell Phase 5 + AI/render/export
Phases 6–7 implemented.

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
  ai/
    aisettings.ts AI provider/terminal settings model and parser
    client.ts     HTTP SSE + native command streaming client
    conversation.ts document/selection context builder
    diff.ts       LCS line diff for edit review
    panel.ts      Chat/Terminal panel and apply/insert actions
    providers.ts  provider request/SSE/command helpers
    terminal.ts   xterm view bound to the native PTY
  capture.ts   rendered HTML/node capture to PNG canvas or SVG string
  export-options.ts context-aware export menu model by document type
  export-render.ts rendered standalone HTML builder for PDF/DOCX export
  editor.ts    CodeMirror 6 (md highlight, soft-wrap) — createEditor()
  markdown-format.ts pure bold/italic/heading/link/code/quote/list/rule edits
  preview.ts   markdown-it + KaTeX render pipeline — renderMarkdown()
  render-extras.ts lazy Mermaid enhancement
  pdfview.ts   lazy PDF.js page renderer
  excalidraw-document.ts Excalidraw JSON validation and safe serialization
  excalidrawview.ts lazy loader for the isolated board runtime
  mindmap-document.ts jsMind node_tree JSON parse/serialize
  mindmapview.ts   lazy jsMind board loader (editable, screenshot-capable)
  windowview.ts per-window tabs, toolbar, editor, preview, and status
  explorer.ts  lazy folder tree + file management
  fuzzy.ts     subsequence fuzzy match + ranking — fuzzyMatch(), rankItems()
  palette.ts   ⌘K/⌘P command/file overlay — createPalette()
  settings.ts  settings.json model — parseSettings(), applySettings()
  updater.ts   signed update checks, prompts, restart, and daily schedule
  themes.css   light/dark/catppuccin-mocha/everforest-dark/nord palettes
  files.ts     IPC open/save + native file dialogs
  filesys.ts   Explorer/settings/recursive-walk IPC wrappers
  state.ts     persisted UI state (localStorage) — loadState(), saveState()
  styles.css   shell layout and component styling (CSS variables)
src-tauri/src/
  lib.rs       Tauri builder: command registry + plugins (dialog, updater)
  ai.rs        command-provider process streaming
  defaults.rs  macOS LaunchServices default-handler registration
  export.rs    Pandoc/Typst rendered-HTML to PDF/DOCX export
  files.rs     file IO/management, recursive walk, settings, byte IO
  pty.rs       portable PTY lifecycle and terminal streaming
```

Data flow: edit → 300ms debounce → `renderMarkdown` → preview pane + word count.
`Cmd+S` → `saveFile` → IPC `save_file`. `Cmd+O` → dialog → IPC `read_file` → editor.
View mode + zoom persist to `localStorage` (`mdflow.ui`).

The macOS bundle declares Markdown, plain-text, and PDF document types. Finder opens
arrive through Tauri's opened event, are queued until the frontend listener is ready,
then use the same document-opening workflow as File ▸ Open. The application menu can
register MDflow as the Markdown/text editor or PDF viewer through LaunchServices.

Special-pane document types: `.excalidraw` files open as an editable Excalidraw board
(single pane, React-isolated); `.mind` files open as an editable jsMind mindmap board
(single pane, drag-drop node editing, similar layout shape). Dedicated activity-bar
buttons create untitled boards of either type. jsMind nodes and connector lines derive
their colors from the active MDflow theme and update when the theme changes.

Editor settings live at `<app config dir>/settings.json`; AI providers and terminals
live at `<app config dir>/ai.json`. The Gear button opens either file as a normal
tab, and saving applies the relevant configuration.

Document PDF/DOCX export requires Pandoc and Typst:

```bash
brew install pandoc typst
```

Export is document-aware: Markdown/plain documents offer rendered PDF/DOCX plus
PNG/SVG; HTML and Excalidraw offer PNG/SVG; mindmaps offer PNG; PDF is read-only.
Document export renders KaTeX and Mermaid before conversion. DOCX rasterizes SVG
diagrams as a best-effort compatibility step while retaining MathML for equations.

Rich preview and terminal dependencies include Mermaid, KaTeX, PDF.js, xterm, and
the Rust `portable-pty` crate. Heavy engines are loaded on demand so the startup
bundle remains below the release chunk-warning threshold.

Excalidraw 0.18.0 is pinned in a self-contained board-only module under
`public/vendor/excalidraw`. Rebuild it with `npm run vendor:excalidraw` after setting
`EXCALIDRAW_BUILD_ROOT` to an exact-tag Excalidraw tree whose package dist has
already been built. React remains isolated from the plain-TypeScript shell.

Updater runtime and UI are active. Gear ▸ General offers Manual (no background
checks) and Automatic (at most once per 24 hours); both modes always prompt before
installing, and manual checks remain available. Production release checks still
require the signed release feed (`latest.json`) and public key in `tauri.conf.json`;
keep the matching private signing key only in CI secrets.
