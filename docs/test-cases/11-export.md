# Export

Export is context-aware. Document PDF/DOCX needs Pandoc + Typst installed:
`brew install pandoc typst`.

### EXP-01 — Markdown options

- Steps: Open `.md`, `.txt`, or an untitled document; click the activity-bar Export icon.
- Expected: Document ▸ PDF / Word (DOCX), and Image ▸ PNG / SVG.
- Status: [ ]  Notes:

### EXP-02 — Rendered Markdown PDF

- Pre-req: Markdown containing a heading, table, `$x^2$`, and a Mermaid fence.
- Steps: Export ▸ Document ▸ PDF; choose a path.
- Expected: Valid PDF; math and Mermaid are rendered, not raw source; tables are visible.
- Status: [ ]  Notes:

### EXP-03 — Rendered Markdown DOCX

- Steps: Export the same document via Document ▸ Word (DOCX).
- Expected: Valid DOCX; equation is editable/readable and the Mermaid diagram appears as an image.
- Status: [ ]  Notes:

### EXP-04 — Markdown PNG and SVG

- Steps: Export the same document through Image ▸ PNG, then Image ▸ SVG.
- Expected: Both files contain the full rendered document, including math and Mermaid.
- Status: [ ]  Notes:

### EXP-05 — HTML PNG and SVG

- Pre-req: `.html` with a fixed-size `#frame` or large SVG artboard.
- Steps: Export PNG, then SVG.
- Expected: Flat PNG/SVG choices only; full artboard is captured without right-side clipping.
- Status: [ ]  Notes:

### EXP-06 — Excalidraw PNG and SVG

- Steps: Open a populated `.excalidraw`; export PNG, then SVG.
- Expected: Both files contain the current board scene; no markdown/source fallback.
- Status: [ ]  Notes:

### EXP-07 — Mindmap PNG only

- Steps: Open `.mind`; click Export.
- Expected: Only PNG Image is offered; exported PNG contains the whole mindmap.
- Status: [ ]  Notes:

### EXP-08 — PDF has no sidebar export

- Steps: Open `.pdf`.
- Expected: Activity-bar Export button is disabled and opens no popover.
- Status: [ ]  Notes:

### EXP-09 — Focus-aware split export

- Pre-req: Main and Sub show different files.
- Steps: Focus each window and inspect/export in turn.
- Expected: Sidebar options and exported content follow the last-focused window.
- Status: [ ]  Notes:

### EXP-10 — Native File ▸ Export

- Steps: Select each Document/Image command against compatible and incompatible files.
- Expected: Compatible choices export normally; incompatible choices show a short unavailable message.
- Status: [ ]  Notes:

### EXP-11 — Missing tools and quiet success

- Steps: Test Document PDF without Pandoc/Typst, then complete any valid export with tools restored.
- Expected: Missing tools produce a friendly install error; successful exports show no success popup.
- Status: [ ]  Notes:
