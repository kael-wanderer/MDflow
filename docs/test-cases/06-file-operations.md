# File Operations

New / Open / Save / Save As, native dialogs, and supported file types.

### FILE-01 — New file (⌘N)
- Steps: File ▸ New File (⌘N).
- Expected: An empty "Untitled" tab opens.
- Status: [ ]  Notes:

### FILE-02 — Open file (⌘O)
- Steps: File ▸ Open File (⌘O); the dialog filter should list md, markdown, txt, html,
  htm, pdf, excalidraw, mind.
- Expected: Selected file opens in a tab (PDF/board types open in their single-pane
  view).
- Status: [ ]  Notes:

### FILE-03 — Open Folder (⌘⇧O)
- Steps: File ▸ Open Folder.
- Expected: Explorer populates with the chosen folder.
- Status: [ ]  Notes:

### FILE-04 — Save new file
- Steps: In an Untitled tab, ⌘S → choose a path.
- Expected: Writes the file; tab gets the name/path.
- Status: [ ]  Notes:

### FILE-05 — Save As to new location
- Steps: ⌘⇧S on an existing file; choose a different name/folder.
- Expected: New file written; original untouched; tab now points to the new path.
- Status: [ ]  Notes:

### FILE-06 — Open via Explorer vs already-open
- Steps: Open a file from Explorer that's already open in a tab.
- Expected: Focuses the existing tab instead of opening a duplicate.
- Status: [ ]  Notes:

### FILE-07 — Unsupported / large file
- Steps: Try opening a non-text file not in the filter (if reachable).
- Expected: Friendly error, no crash.
- Status: [ ]  Notes:
