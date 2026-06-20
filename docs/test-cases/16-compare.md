# Compare / Diff

Two-file synchronized side-by-side comparison.

### CMP-01 — Two-stage select
- Steps: In Explorer, choose "Select for Compare" on file A, then "Compare with
  Selected" on file B.
- Expected: A side-by-side diff surface opens for A vs B.
- Status: [ ]  Notes:

### CMP-02 — Diff highlighting
- Steps: Compare two files with differences.
- Expected: Added/removed/changed lines are highlighted; matching content aligns.
- Status: [ ]  Notes:

### CMP-03 — Synchronized scroll
- Steps: Scroll one side.
- Expected: Both panes scroll together.
- Status: [ ]  Notes:

### CMP-04 — Identical files
- Steps: Compare a file with itself / an identical copy.
- Expected: No differences shown; no crash.
- Status: [ ]  Notes:

### CMP-05 — Error handling
- Steps: Compare when one file is missing/unreadable.
- Expected: Friendly error, no crash.
- Status: [ ]  Notes:
