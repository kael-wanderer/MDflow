# MDflow — Tasks

> **Resuming? Read this first, then `docs/spec.md`.**
> This file is the handoff between sessions (auto-memory does NOT carry over from the
> Kaelio sessions — it was keyed to the Kaelio folder).

## Where we are (2026-06-19)

- Brainstorming complete. Spec written and committed → `docs/spec.md`.
- Locked decisions: name **MDflow**; **MIT** license; **clean-room incremental
  rewrite** of Kaelio (reference only, never copy code/CSS); modular architecture;
  refined/cleaner UI; identifier `com.kael.mdflow`.
- M1 = lean core. M2 = activate auto-update (must-have-early). See spec roadmap.
- No app code written yet. This repo currently holds only docs.

## Next step (the immediate task)

**Write the Milestone 1 implementation plan** using the `writing-plans` skill.
Requirements for the plan:

- First build step must be a **static UI shell mockup** (HTML/CSS only, no logic) for
  user approval before any wiring. Use the UI skills: taste-skills, impeccable,
  ui-ux-pro-max, frontend-design.
- Include an early step to create the full `mdflow/CLAUDE.md` (commands, architecture)
  once the project is scaffolded.
- Keep tasks discrete and bounded so **Codex** can pick them up (add Codex once the
  plan is task-broken, at "start building M1").

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

## Documentation Tasks

[x] docs/spec.md
[~] docs/tasks.md (this file)
[ ] mdflow/CLAUDE.md (full version — currently a starter)
[ ] README.md

## Testing Tasks

[ ] M1 manual smoke test (open/save, preview, view modes, hotkeys)
