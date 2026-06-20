# PDF Reader

PDF.js-based reader using native byte IPC, single-pane.

### PDF-01 — Open a PDF
- Steps: Open a `.pdf` from Explorer / File ▸ Open.
- Expected: Renders in a single full pane (no editor/preview toggle); pages display.
- Status: [ ]  Notes:

### PDF-02 — Scroll / paging
- Steps: Scroll through pages.
- Expected: Pages render on demand; smooth scrolling; page indicator (if present)
  updates.
- Status: [ ]  Notes:

### PDF-03 — Large PDF
- Steps: Open a large multi-page PDF.
- Expected: Loads without freezing; lazy page rendering.
- Status: [ ]  Notes:

### PDF-04 — Corrupt / unreadable PDF
- Steps: Open a damaged `.pdf`.
- Expected: A friendly error in the pane, no crash.
- Status: [ ]  Notes:

### PDF-05 — Switch away & back
- Steps: Open a PDF tab, switch to another tab, return.
- Expected: The PDF view restores correctly.
- Status: [ ]  Notes:
