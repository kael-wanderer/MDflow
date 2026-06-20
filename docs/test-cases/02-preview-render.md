# Preview & Rendering

markdown-it pipeline, KaTeX math, Mermaid diagrams, tables, raw HTML preview (iframe)
with zoom/auto-fit, and reading mode.

### REND-01 — Core markdown
- Steps: In a `.md` file, write headings, bold/italic, lists, links, blockquote,
  inline + fenced code.
- Expected: All render correctly in the preview pane; fenced code is syntax-highlighted.
- Status: [ ]  Notes:

### REND-02 — GFM table
- Steps: Add a pipe table with a header separator row (`|---|---|`).
- Expected: Renders as a table with a visible full grid, shaded header, and zebra rows.
- Status: [ ]  Notes:

### REND-03 — KaTeX inline + display math
- Steps: Add inline `$E=mc^2$` and a display block `$$\int_0^1 x\,dx$$`.
- Expected: Both render as typeset math; a malformed expression falls back to code,
  not a crash.
- Status: [ ]  Notes:

### REND-04 — Mermaid diagram
- Steps: Add a ` ```mermaid ` fenced block with a `graph TD` flowchart.
- Expected: Renders as an SVG diagram (lazy-loaded, slight delay on first use).
- Status: [ ]  Notes:

### REND-05 — Mermaid mindmap (code-based)
- Steps: Add a ` ```mermaid ` block with `mindmap` syntax.
- Expected: Renders as a mindmap diagram (distinct from the `.mind` editable board).
- Status: [ ]  Notes:

### REND-06 — Live update debounce
- Steps: Type continuously in the editor (split mode).
- Expected: Preview updates after a short pause (~300ms), not on every keystroke; word
  count updates.
- Status: [ ]  Notes:

### REND-07 — Raw HTML preview (iframe)
- Pre-req: an `.html` file (e.g. a self-contained page with `<style>`).
- Steps: Open it; view the preview pane.
- Expected: Renders in a sandboxed iframe; the page's own CSS applies; scripts do NOT
  execute (sandbox is allow-same-origin only).
- Status: [ ]  Notes:

### REND-08 — HTML preview zoom (no flash)
- Pre-req: an `.html` preview open.
- Steps: Click preview zoom +/− several times quickly.
- Expected: Zoom changes instantly with NO white/blank flash and no full reload.
- Status: [ ]  Notes:

### REND-09 — HTML preview auto-fit (split)
- Pre-req: an `.html` file with a large fixed frame (e.g. 1920×1080).
- Steps: Open in split mode; resize the pane / window.
- Expected: The page scales to fit the pane ("Fit" shown on the reset button);
  re-fits on resize.
- Status: [ ]  Notes:

### REND-10 — Reading mode scale
- Steps: Switch a markdown doc to Read (preview-only) mode.
- Expected: Content uses the full width with comfortable padding and a readable size
  (≥17px), not tiny.
- Status: [ ]  Notes:
