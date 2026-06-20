# Export

Sidebar Export button + native File ▸ Export menu, grouped **HTML** (PNG/JPG/PDF) and
**Markdown** (PDF/DOCX).

> Markdown exports need Pandoc + Typst installed (`brew install pandoc typst`).

### EXP-01 — Sidebar export popover
- Steps: Click the Export icon in the activity bar (after the AI icon).
- Expected: A popover with two groups — HTML ▸ (PNG / JPG / PDF) and Markdown ▸ (PDF /
  Word DOCX). The icon is the external-export (box-arrow) glyph.
- Status: [ ]  Notes:

### EXP-02 — Markdown ▸ PDF
- Pre-req: a `.md` file with headings, a table, code.
- Steps: Export ▸ Markdown ▸ PDF; choose a path.
- Expected: A valid PDF is written (no "read-only file system" error); content matches.
- Status: [ ]  Notes:

### EXP-03 — Markdown ▸ Word (DOCX)
- Steps: Export ▸ Markdown ▸ Word (DOCX); choose a path.
- Expected: A valid .docx opens in Word/Pages with the content.
- Status: [ ]  Notes:

### EXP-04 — HTML ▸ PNG (markdown preview)
- Steps: On a `.md`, Export ▸ HTML ▸ PNG Image; choose a path.
- Expected: A PNG of the rendered preview, full width (not clipped), is written.
- Status: [ ]  Notes:

### EXP-05 — HTML ▸ JPG
- Steps: Export ▸ HTML ▸ JPG Image.
- Expected: A JPG with a white background (no black where transparent).
- Status: [ ]  Notes:

### EXP-06 — HTML ▸ PDF (rendered)
- Steps: Export ▸ HTML ▸ PDF.
- Expected: A PDF wrapping the rendered preview image is written.
- Status: [ ]  Notes:

### EXP-07 — Export an .html file (full page)
- Pre-req: an `.html` file with a fixed-size frame (e.g. 1920×1080).
- Steps: Export ▸ HTML ▸ PNG.
- Expected: The whole artboard is captured (full width, right side NOT cut off ~30%).
- Status: [ ]  Notes:

### EXP-08 — Export in split (focus-aware)
- Pre-req: Main and Sub showing different files.
- Steps: Work in one window, then Export.
- Expected: Exports the last-focused window's document.
- Status: [ ]  Notes:

### EXP-09 — No success popup
- Steps: Complete any export.
- Expected: No "Saved" confirmation dialog (errors still show).
- Status: [ ]  Notes:

### EXP-10 — Native File ▸ Export menu
- Steps: Use the macOS menu File ▸ Export ▸ HTML/Markdown submenus.
- Expected: Same options/behavior as the sidebar popover.
- Status: [ ]  Notes:

### EXP-11 — Pandoc/Typst missing
- Pre-req: temporarily without Pandoc/Typst.
- Steps: Export ▸ Markdown ▸ PDF.
- Expected: A friendly "install pandoc/typst" error, no crash.
- Status: [ ]  Notes:
