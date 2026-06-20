# Command & File Palette

The ⌘K / ⌘P overlay with fuzzy matching.

### PAL-01 — Open palette
- Steps: Press ⌘K (or ⌘P), or click the Search activity-bar icon.
- Expected: A centered overlay opens with an input and a results list.
- Status: [ ]  Notes:

### PAL-02 — Fuzzy file search
- Pre-req: a folder open.
- Steps: Type a partial/subsequence of a file name (e.g. `tmln` for `timeline.md`).
- Expected: Matching files rank to the top; matched characters are highlighted.
- Status: [ ]  Notes:

### PAL-03 — Open a file from palette
- Steps: Select a file result; Enter.
- Expected: The file opens (or focuses if already open); the palette closes.
- Status: [ ]  Notes:

### PAL-04 — Command search
- Steps: Type a command name (e.g. "Toggle Line Numbers", "Export").
- Expected: Commands are listed and runnable from the palette.
- Status: [ ]  Notes:

### PAL-05 — Keyboard navigation
- Steps: Use ↑/↓ to move, Enter to run, Esc to close.
- Expected: Selection moves; Enter runs; Esc dismisses without action.
- Status: [ ]  Notes:

### PAL-06 — Empty / no matches
- Steps: Type gibberish.
- Expected: Graceful "no results" state; no crash.
- Status: [ ]  Notes:
