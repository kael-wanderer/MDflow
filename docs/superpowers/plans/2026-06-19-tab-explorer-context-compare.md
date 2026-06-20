# MDflow Tab + Explorer Context Menus and Compare - Implementation Plan

**Goal:** Add desktop-editor right-click menus to tabs and Explorer file rows, plus
a two-stage Select for Compare workflow with a real side-by-side diff.

**Architecture:** Extend the existing framework-free `contextmenu.ts` with disabled
items and one-level submenus. Keep tab actions in `main.ts`, pure tab selection
helpers in `tabops.ts`, Explorer comparison selection in `explorer.ts`, and the
two-stage action model in `compareactions.ts`. The read-only diff surface lives in
the focused `compareview.ts` module and reuses the existing LCS line-diff engine.

## Task 1 - Context-menu primitives

- [x] Add disabled menu items.
- [x] Add one-level submenu support for Split & Move.
- [x] Add submenu and disabled-state styling.

## Task 2 - Tab context menu

- [x] Emit tab context-menu events from `windowview.ts`.
- [x] Add Reveal in Finder and Reveal in Explorer View.
- [x] Add Pin / Unpin with a visible pinned marker.
- [x] Add Split Right and Split & Move to Main/Sub.
- [x] Preserve dirty editor text when moving between windows.
- [x] Add Close, Close Others, Close to the Right, Close Saved, and Close All.
- [x] Add Copy Path, Copy Relative Path, and Copy Breadcrumbs Path.
- [x] Add pure tab-group helpers and unit coverage.

## Task 3 - Explorer file context menu

- [x] Give file rows a focused menu: Open Preview, Open to the Side, Reveal in
  Finder, compare actions, Add File to Chat, Copy Path, Rename, Duplicate, Delete.
- [x] Keep directory management actions separate.
- [x] Add first-stage **Select for Compare**.
- [x] Add second-stage **Compare with Selected** plus **Select for Compare**.
- [x] Add pure first-stage/second-stage action coverage.
- [x] Mark the selected comparison source in the tree.
- [x] Keep selection valid across rename and clear it on delete.

## Task 4 - Comparison surface

- [x] Reuse `lineDiff` and align replacement runs into left/right rows.
- [x] Render a read-only overlay with file names and paths.
- [x] Tint removals and additions.
- [x] Synchronize horizontal and vertical scrolling.
- [x] Add an explicit close action.
- [x] Add pure comparison-row unit coverage.

## Task 5 - Documentation and verification

- [x] Update the shell design specification.
- [x] Update `docs/tasks.md`.
- [x] Run the complete Vitest suite.
- [x] Run the TypeScript and Vite production build.
- [ ] Native GUI smoke:
  1. Right-click a tab and exercise pin, reveal, copy, and close variants.
  2. Move a dirty tab Main -> Sub -> Main and confirm its text remains.
  3. Right-click an Explorer file before selecting a source.
  4. Select a source, right-click another file, and compare.
  5. Confirm both diff columns scroll together and the close button restores the
     editor surface.
