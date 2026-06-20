# Tabs & Session

Multiple tabs, dirty tracking, save flows, and session restoration.

### TAB-01 — Open multiple tabs
- Steps: Open several files from the Explorer / File ▸ Open.
- Expected: Each opens in its own tab; the tab strip scrolls horizontally when full.
- Status: [ ]  Notes:

### TAB-02 — Activate tab
- Steps: Click different tabs.
- Expected: The editor/preview switches to that document with its own cursor/scroll.
- Status: [ ]  Notes:

### TAB-03 — Dirty indicator
- Steps: Edit a saved file without saving.
- Expected: The tab shows a dirty marker (dot); ⌘S clears it.
- Status: [ ]  Notes:

### TAB-04 — Close with unsaved changes
- Steps: With a dirty tab, click its close button or press ⌘W.
- Expected: A confirm prompt appears; cancel keeps the tab, confirm closes it and
  activates a neighbor.
- Status: [ ]  Notes:

### TAB-05 — Save (⌘S)
- Steps: Edit a file with a path, press ⌘S.
- Expected: Saved to disk; dirty cleared; no dialog.
- Status: [ ]  Notes:

### TAB-06 — Save As (⌘⇧S)
- Steps: On an Untitled or existing doc, press ⌘⇧S, choose a path.
- Expected: Writes to the new path; the tab name/path update; one tab keeps ownership
  (no duplicate tab).
- Status: [ ]  Notes:

### TAB-07 — Tab right-click menu
- Steps: Right-click a tab.
- Expected: Menu offers reveal, pin, split/move, close group, copy path; each works.
- Status: [ ]  Notes:

### TAB-08 — Session restore
- Pre-req: General ▸ Restore last session enabled.
- Steps: Open a folder + several tabs, quit, relaunch.
- Expected: Folder, open tabs, active tab, and view modes are restored.
- Status: [ ]  Notes:

### TAB-09 — Restore disabled
- Steps: Disable Restore last session; quit; relaunch.
- Expected: App starts clean (no prior tabs/folder).
- Status: [ ]  Notes:
