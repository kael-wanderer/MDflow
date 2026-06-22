# Mindmap Multi-select and Bulk Delete Plan

## Goal

Implement transient multi-selection, marquee selection, theme-aware highlighting,
and safe bulk deletion for `.mind` boards.

## Phase 1 — Pure selection policy

- [ ] Add `src/mindmap-selection.ts`.
- [ ] Test replace, toggle, clear, marquee intersection, and deletion-root reduction.
- [ ] Run focused Vitest coverage.

## Phase 2 — Board integration

- [ ] Maintain a selected-id set in `mindmapview.ts`.
- [ ] Wire plain click, Shift-click, empty click, Escape, and marquee drag.
- [ ] Render all selected ids with an MDflow-owned selection class.
- [ ] Preserve jsMind's current node as the primary formatting/edit target.
- [ ] Route toolbar and keyboard deletion through safe bulk-delete roots.
- [ ] Clean up global listeners and marquee elements on destroy.

## Phase 3 — Styling and documentation

- [ ] Add theme-aware selected-node and marquee styles.
- [ ] Update `docs/tasks.md`, `docs/roadmap.md`, `CHANGELOG.md`, and `CLAUDE.md`.
- [ ] Add a manual multi-select checklist without marking it user-verified.
- [ ] Confirm the `ai.json` to `agent.json` migration shim remains covered and unchanged.

## Phase 4 — Verification

- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `cargo test --manifest-path src-tauri/Cargo.toml`.
- [ ] Run `cargo check --manifest-path src-tauri/Cargo.toml`.
- [ ] Launch `npm run tauri dev` and confirm the native board runtime starts.
- [ ] Run `git diff --check`.

## Commit sequence

1. Design and implementation plan.
2. Pure selection policy and tests.
3. Mindmap board wiring and styles.
4. Documentation and verification notes.
