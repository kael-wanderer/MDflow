# MDflow — Tasks

> **Resuming? Read this first, then `docs/spec.md`.**
> This file is the handoff between sessions (auto-memory does NOT carry over from the
> Kaelio sessions — it was keyed to the Kaelio folder).

## Where we are (2026-06-19)

- Locked decisions: name **MDflow**; **MIT** license; **clean-room incremental
  rewrite**; modular architecture; refined/cleaner UI; identifier `com.kael.mdflow`.
- M1 lean core is implemented.
- Shell Phase 1 is implemented: activity bar, collapsible/resizable Explorer, lazy
  directory tree, file-type icons, click-to-open, and shell session persistence.
- Shell Phase 2 is implemented: inline create/rename, Trash-backed delete, duplicate,
  Copy Path, Reveal in Finder, context menus, and refresh-on-focus.
- Shell Phase 3 is implemented: multiple tabs, per-document editor state and undo,
  dirty tracking, confirmed close, and session restoration.
- Shell Phase 4a is implemented: per-window toolbar and line numbers toggle.
- Shell Phase 4b is implemented: Sub window, per-window tabs/view modes, and splitter.
- Shell Phase 4c is implemented: icon toolbar, per-window status lines, colored file
  icons, Explorer header actions, and File ▸ Open Folder.
- Shell Phase 5 is implemented: command/file palette, Search/Gear activity controls,
  settings.json, themes, per-zone typography, and restore-session control.
- Phases 6–7 are implemented: configurable AI chat + terminal panel, Mermaid/KaTeX
  and raw-HTML preview, PDF reader, and PDF/DOCX/HTML/PNG/JPG export.
- M2 auto-update follows the shell sub-project.

## Next step (the immediate task)

Run the remaining native GUI checklists in `docs/review.md`, then begin M2 auto-update.

## Code Tasks

Plan: `docs/superpowers/plans/2026-06-19-m1-lean-core.md`

[x] Write M1 implementation plan (writing-plans)
[x] Task 1 — Scaffold Tauri 2 + Vite + TS (MIT, THIRD-PARTY-NOTICES)
[x] Task 1b — App icon from images/logo.png (tauri icon)
[x] Task 2 — Full CLAUDE.md + README
[x] Task 3 — Static UI shell mockup → APPROVED (pivot: native-menu-only, no toolbar; amber kept; logo = app icon)
[x] Task 4 — state.ts (persisted UI state, TDD)
[x] Task 5 — preview.ts (markdown-it render, TDD)
[x] Task 6 — files.rs (Rust file IO + word_count, TDD)
[x] Task 7 — editor.ts (CodeMirror 6, soft-wrap toggleable)
[x] Task 8 — files.ts (IPC open/save + dialogs, + newFile/saveAs)
[x] Task 9 — views.ts (view-mode switching + zoom)
[x] Task 9B — Native application menu (Rust menu.rs → menu events)
[x] Task 10 — main.ts (wiring via menu events, hotkeys, debounce)
[x] Task 11 — style pass on live app
[x] Task 12 — updater plugin (dormant — registration deferred to M2)
[x] Task 14 — Help menu: MDflow Help (opens bundled HELP.md in editor) + version in About
[~] Task 13 — M1 smoke test (automated ✓; GUI checklist in docs/review.md ← user to verify)

Note: Help ▸ "Check for Updates" intentionally deferred to M2 (needs the real updater feed).

## Shell Sub-project

Design: `docs/superpowers/specs/2026-06-19-shell-explorer-tabs-split-design.md`

### Phase 1 - Shell + read-only Explorer

[x] Rust lazy `list_dir` command with dir-first sorting and unit test
[x] Pure tree operations and file-icon mapping with Vitest coverage
[x] Central shell store and filesystem IPC wrappers
[x] Activity bar, Explorer layout, empty state, and lazy tree renderer
[x] Explorer toggle and drag-resizable width
[x] Click Explorer file to open in the existing editor and preview
[x] Persist folder, Explorer visibility, and Explorer width
[x] Automated tests, production build, Rust tests, and compile-check
[x] Native GUI smoke checklist in `docs/review.md` (user quick-verified — works)

### Phase 2 - Explorer file management

[x] Native create/rename/delete-to-Trash/duplicate commands
[x] Opener and clipboard plugins with capabilities
[x] Separator-aware path helpers with tests
[x] Context menus for rows and Explorer root
[x] Inline New File, New Folder, and Rename
[x] Duplicate, Copy Path, Reveal in Finder, and confirmed Trash deletion
[x] Refresh after actions and on window focus
[x] Preserve expanded folder state during refresh
[x] Keep the current editor save path safe across rename/delete
[x] Automated tests, production build, Rust checks, and native launch
[~] Native GUI smoke checklist in `docs/review.md`

### Phase 3 - Tabs

[x] Pure tab-list operations with tests
[x] Tabs and active-tab metadata in the central store
[x] Per-document CodeMirror state, cursor, and undo isolation
[x] Accessible, horizontally scrolling tab strip
[x] Open/focus existing files from Explorer and File menu
[x] Dirty indicators, Save clearing, and Save-As naming
[x] Close button and `⌘W` with dirty confirmation and neighbour activation
[x] Safe tab path handling across Explorer rename/delete
[x] Persist and restore open file tabs and active path
[x] Preserve one-document/one-tab ownership during Save As
[x] Automated tests, production build, Rust checks, browser harness, and native launch
[~] Native GUI smoke checklist in `docs/review.md`

### Phase 4 - Sub window and per-window view modes

[x] Phase 4a - Per-window Toolbar + Line Numbers
[x] Phase 4b - Sub window
[x] Phase 4c - UI polish

### Phase 5 - Top bar and settings

[x] Recursive quick-open file walk
[x] Fuzzy command/file palette (`⌘K` / `⌘P`)
[x] Explorer → Search → Gear activity bar
[x] App-config `settings.json` opened and saved as a normal tab
[x] Six theme choices and themeable editor syntax
[x] Per-zone font/size and restore-session setting
[x] Automated tests, production build, and native launch

### Phases 6–7 - AI, rich render, PDF, and export

[x] Separate app-config `ai.json` with HTTP, command, and terminal providers
[x] Streaming AI chat with document/selection context and edit diff
[x] Embedded xterm terminal backed by a native PTY
[x] Resizable, persisted AI side panel
[x] Raw HTML, KaTeX, and lazy Mermaid preview rendering
[x] PDF.js reader using native byte IPC
[x] Pandoc/Typst PDF, DOCX, and HTML export
[x] PNG/JPG preview capture and native byte save
[x] Lazy heavy-feature chunks; no production chunk-size warning
[x] Automated tests, production build, Rust checks, and native smoke

### Workflow

Claude Code leads design and planning. Codex implements the checked-in plans and
raises material questions, ideas, and concerns during execution.

## Documentation Tasks

[x] docs/spec.md
[x] docs/tasks.md (this file)
[x] CLAUDE.md
[x] README.md

## Testing Tasks

[~] M1 manual smoke test (checklist in `docs/review.md`)
[x] Shell Phase 1 native GUI smoke test (user quick-verified — works)
[~] Shell Phase 2 native GUI smoke test (checklist in `docs/review.md`)
[~] Shell Phase 3 native GUI smoke test (checklist in `docs/review.md`)
