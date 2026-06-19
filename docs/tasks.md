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
[~] Task 1 — Scaffold Tauri 2 + Vite + TS (MIT, THIRD-PARTY-NOTICES)  ← current position
[ ] Task 2 — Full CLAUDE.md + README
[ ] Task 3 — Static UI shell mockup → USER APPROVAL GATE
[ ] Task 4 — state.ts (persisted UI state, TDD)
[ ] Task 5 — preview.ts (markdown-it render, TDD)
[ ] Task 6 — files.rs (Rust file IO + word_count, TDD)
[ ] Task 7 — editor.ts (CodeMirror 6)
[ ] Task 8 — files.ts (IPC open/save + dialogs)
[ ] Task 9 — views.ts (view-mode switching + zoom)
[ ] Task 10 — main.ts (wiring, hotkeys, debounce)
[ ] Task 11 — style pass on live app
[ ] Task 12 — updater plugin (dormant)
[ ] Task 13 — M1 manual smoke test

## Documentation Tasks

[x] docs/spec.md
[~] docs/tasks.md (this file)
[ ] mdflow/CLAUDE.md (full version — currently a starter)
[ ] README.md

## Testing Tasks

[ ] M1 manual smoke test (open/save, preview, view modes, hotkeys)
