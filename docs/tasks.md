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

[ ] Write M1 implementation plan (writing-plans)  ← current position
[ ] Scaffold Tauri 2 + Vite + TS project (MIT LICENSE, THIRD-PARTY-NOTICES)
[ ] Static UI shell mockup → user approval
[ ] (rest of M1 tasks come from the plan)

## Documentation Tasks

[x] docs/spec.md
[~] docs/tasks.md (this file)
[ ] mdflow/CLAUDE.md (full version — currently a starter)
[ ] README.md

## Testing Tasks

[ ] M1 manual smoke test (open/save, preview, view modes, hotkeys)
