# View Modes & Zoom

Per-window Editor / Preview / Split modes and per-pane zoom.

### VIEW-01 — Split mode
- Steps: Toolbar Split button or ⌘B.
- Expected: Editor and preview shown side by side with a draggable seam.
- Status: [ ]  Notes:

### VIEW-02 — Editor-only mode
- Steps: Toolbar Editor button or ⌘E.
- Expected: Only the editor pane is shown; preview hidden.
- Status: [ ]  Notes:

### VIEW-03 — Read (preview-only) mode
- Steps: Toolbar Read (open-book) button.
- Expected: Only the preview pane is shown; editor hidden.
- Status: [ ]  Notes:

### VIEW-04 — Seam resize
- Steps: In split mode, drag the seam left/right.
- Expected: Pane ratio changes (clamped ~20–80%); editor re-measures; persists while
  the tab is open.
- Status: [ ]  Notes:

### VIEW-05 — Editor zoom
- Steps: Focus the editor pane; press ⌘+, ⌘−, ⌘0.
- Expected: Editor font scales up/down and resets; preview unaffected.
- Status: [ ]  Notes:

### VIEW-06 — Preview zoom
- Steps: Focus the preview pane; press ⌘+, ⌘−, ⌘0 (or the preview zoom buttons).
- Expected: Preview scales; the percentage indicator updates; editor unaffected.
- Status: [ ]  Notes:

### VIEW-07 — Mode persists per window
- Steps: Set Main to Split and the Sub window to Read; switch tabs.
- Expected: Each window keeps its own mode; view mode persists across restart (with
  restore-session on).
- Status: [ ]  Notes:

### VIEW-08 — Board files force single pane
- Steps: Open a `.pdf`, `.excalidraw`, or `.mind` file.
- Expected: The window shows a single full pane (no editor/preview toggle, no split,
  no format toolbar); the mode buttons don't apply.
- Status: [ ]  Notes:
