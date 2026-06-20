# MDflow — Manual Test Cases

Acceptance / smoke test cases, **one file per feature**. Run them against a dev build
(`npm run tauri dev`) or a release build. Append new cases here as features land.

## How to use

- Each case has an **ID**, **steps**, and an **expected result**, plus a status box.
- Mark each run: `[x]` pass, `[!]` fail (then log it in [`../bugs.md`](../bugs.md) and
  put the bug ID in the Notes), `[~]` partial/blocked.
- Cases are numbered per feature (e.g. `EDIT-03`). When you add a case, continue the
  numbering — don't renumber existing ones (bug logs reference them).

## Conventions

- **Pre-req** lines list setup needed before the steps.
- Keyboard shortcuts use ⌘ (Cmd on macOS). Menus are the native macOS menu bar.
- "Board" = a single-pane editable view (Excalidraw, Mindmap) or reader (PDF).

## Feature index

| File | Feature |
|------|---------|
| [01-editor.md](01-editor.md) | Editor: CodeMirror, soft-wrap, line numbers, HTML mode, formatting toolbar |
| [02-preview-render.md](02-preview-render.md) | Markdown render, KaTeX, Mermaid, tables, HTML preview + zoom/auto-fit, reading mode |
| [03-view-modes-zoom.md](03-view-modes-zoom.md) | Editor / Preview / Split modes, per-pane zoom |
| [04-tabs-session.md](04-tabs-session.md) | Tabs, dirty tracking, save/save-as, session restore |
| [05-explorer.md](05-explorer.md) | Folder tree, file management, overflow menu, badges |
| [06-file-operations.md](06-file-operations.md) | New/Open/Save/Save As, dialogs, file types |
| [07-split-sub-window.md](07-split-sub-window.md) | Sub window, per-window modes, splitter |
| [08-palette.md](08-palette.md) | ⌘K / ⌘P command & file palette, fuzzy match |
| [09-settings-gear.md](09-settings-gear.md) | Gear panel (Theme / Format / General / Agent), themes |
| [10-ai-panel.md](10-ai-panel.md) | AI chat + terminal panel, providers |
| [11-export.md](11-export.md) | Context-aware Document (PDF/DOCX) and Image (PNG/SVG) export |
| [12-pdf-reader.md](12-pdf-reader.md) | PDF.js reader |
| [13-excalidraw.md](13-excalidraw.md) | Excalidraw board (M10) |
| [14-mindmap.md](14-mindmap.md) | Mindmap board / jsMind (M11) |
| [15-updater-default.md](15-updater-default.md) | Update checks, auto-update, Set-as-Default menu |
| [16-compare.md](16-compare.md) | Two-file compare / diff |
