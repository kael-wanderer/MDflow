# Explorer

Folder tree, lazy loading, file management, the redesigned header (title + overflow
menu, root-row actions), badges, and context menus.

### EXPL-01 — Open folder
- Steps: File ▸ Open Folder (⌘⇧O) or the empty-state "Open Folder" button.
- Expected: The tree shows the folder's contents, directories first; file-type badges
  appear (MD, T, {}, <>, PDF, EX, MIND).
- Status: [ ]  Notes:

### EXPL-02 — Lazy expand
- Steps: Click a directory row.
- Expected: It expands and loads children on demand; the caret rotates.
- Status: [ ]  Notes:

### EXPL-03 — Open file
- Steps: Click a file row.
- Expected: Opens in a tab; the row shows as active.
- Status: [ ]  Notes:

### EXPL-04 — Header: New File / New Folder
- Steps: Use the root-row New File and New Folder buttons; type a name; Enter.
- Expected: Inline input appears; the item is created on disk and shown; Esc cancels.
- Status: [ ]  Notes:

### EXPL-05 — Header: Refresh
- Steps: Change a file outside the app, then click Refresh.
- Expected: The tree reloads; expanded folders stay expanded.
- Status: [ ]  Notes:

### EXPL-06 — Header: Collapse All
- Steps: Expand several folders, click Collapse All.
- Expected: All folders collapse.
- Status: [ ]  Notes:

### EXPL-07 — Root caret collapse
- Steps: Click the root folder row (the `⌄ NAME` caret).
- Expected: The whole tree collapses/expands; the caret rotates.
- Status: [ ]  Notes:

### EXPL-08 — Overflow ⋯ menu
- Steps: Click the ⋯ on the EXPLORER title.
- Expected: Menu shows Hide Explorer and Toggle Line Numbers; Hide Explorer collapses
  the sidebar (toggle the activity-bar Explorer icon to reopen).
- Status: [ ]  Notes:

### EXPL-09 — Row context menu
- Steps: Right-click a file/folder row.
- Expected: Rename, Duplicate, Copy Path, Reveal in Finder, Delete (to Trash), etc.;
  each performs correctly.
- Status: [ ]  Notes:

### EXPL-10 — Rename
- Steps: Right-click ▸ Rename (or the inline rename); change the name; Enter.
- Expected: File renamed on disk; an open tab for it updates its path safely.
- Status: [ ]  Notes:

### EXPL-11 — Delete to Trash
- Steps: Right-click ▸ Delete; confirm.
- Expected: File goes to the system Trash; an open tab for it is handled safely (path
  cleared / marked).
- Status: [ ]  Notes:

### EXPL-12 — Resize & persist
- Steps: Drag the Explorer's right edge to resize; toggle it closed/open; restart.
- Expected: Width and visibility persist across sessions.
- Status: [ ]  Notes:
