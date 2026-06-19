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
- Shell Phases 2-4 remain: Explorer CRUD, tabs, then the Sub window and per-window
  view modes.
- M2 auto-update follows the shell sub-project.

## Next step (the immediate task)

Run the Shell Phase 1 native GUI checklist in `docs/review.md`, then write and execute
the Phase 2 Explorer file-management plan.

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
[~] Native GUI smoke checklist in `docs/review.md`

### Remaining phases

[ ] Phase 2 - Explorer file management
[ ] Phase 3 - Tabs
[ ] Phase 4 - Sub window and per-window view modes

## Documentation Tasks

[x] docs/spec.md
[x] docs/tasks.md (this file)
[x] CLAUDE.md
[x] README.md

## Testing Tasks

[~] M1 manual smoke test (checklist in `docs/review.md`)
[~] Shell Phase 1 native GUI smoke test (checklist in `docs/review.md`)
