# Export Overhaul Design (Spec A)

Date: 2026-06-20
Status: Approved (design); spec under review.
Sibling: `2026-06-20-board-ux-design.md` (Spec B — built after this).

## What problem does this solve?

The Export menu is not context-aware: it offers HTML and Markdown groups for every
document, including options that make no sense for the active file. Worse:

- **Excalidraw export is broken** — `captureActive` has no Excalidraw branch, so
  exporting an active `.excalidraw` board falls through to the markdown path and
  produces garbage.
- **Document (PDF/DOCX) export uses the raw markdown**, so math and Mermaid/diagrams
  export as raw code instead of rendered output.
- PNG and JPG overlap (both raster); there is no vector option.

## What does success look like?

- The Export control shows only options valid for the active document type.
- **Document** export (Markdown/txt) renders first, so PDF and Word contain rendered
  math, Mermaid, and diagrams — not raw code.
- **Image** export offers PNG everywhere and **SVG** where a vector form is available
  (Excalidraw, HTML, Markdown render); Mindmap is PNG-only.
- Excalidraw export works (PNG + SVG).
- A PDF document offers no Export (read-only).

## Scope

In: context-aware menu, Document render-then-export (PDF full + DOCX best-effort),
Image PNG/SVG, Excalidraw export wiring, removal of JPG and the old HTML→PDF item.

Out (Spec B): activity-bar board buttons, jsMind theming. Out entirely: print-to-
printer, page-size/margin options, batch export.

## Per-type export mapping

| Active document | Export menu |
|---|---|
| Markdown (`.md`, `.txt`, untitled) | **Document** ▸ PDF, Word (DOCX) · **Image** ▸ PNG, SVG |
| HTML (`.html`, `.htm`) | **Image** ▸ PNG, SVG |
| Excalidraw (`.excalidraw`) | **Image** ▸ PNG, SVG |
| Mindmap (`.mind`) | **Image** ▸ PNG |
| PDF (`.pdf`) | *(none — Export hidden/disabled)* |

When only the Image category applies, the menu flattens to flat items ("PNG Image…",
"SVG Image…") with no redundant submenu. Markdown keeps the two-group structure.

## Architecture

```
src/
  export-options.ts   pure: exportOptionsFor(pathOrName) → menu model (TDD)
  export-render.ts    build rendered HTML for Document export (markdown→HTML,
                      KaTeX inline, Mermaid SVG; DOCX variant rasterizes SVG→PNG)
  capture.ts          (existing) + svgString(node) helper to save the foreignObject SVG
  excalidrawview.ts   (existing) + exportPng()/exportSvg() via the vendored bridge
  main.ts             export routing uses exportOptionsFor + the board/doc paths
src-tauri/src/
  export.rs           + export_pdf_html(html, out), export_docx_html(html, out)
```

### Context-aware menu (`export-options.ts`)

`exportOptionsFor(pathOrName): ExportGroup[]` returns a pure data model the menu
renders (sidebar popover and native File ▸ Export both consume it). Returns `[]` for
PDF (caller hides/disables Export). Unit-tested against each file type.

### Document render-then-export

1. Frontend renders the markdown to a full HTML document via `export-render.ts`:
   - `renderMarkdown(text)` (KaTeX already inline), mounted on a detached node;
   - run the existing `enhancePreview` so Mermaid fences become SVG; await completion;
   - serialize to a standalone HTML string with minimal print CSS.
2. **PDF:** pass that HTML to Rust `export_pdf_html` → `pandoc --from html
   --pdf-engine typst -o out.pdf` (run from a temp dir — the existing read-only-FS
   fix). Typst renders embedded SVG + math.
3. **DOCX (best-effort):** before serializing, rasterize each Mermaid/diagram `<svg>`
   to a PNG data URI (canvas) and swap it in; keep KaTeX math as MathML so Pandoc
   emits native Word equations. Pass to `export_docx_html` → `pandoc --from html -o
   out.docx`.

Open implementation detail for the plan to verify: Pandoc handling of `data:` image
URIs for each engine (may need `--extract-media` to a temp dir).

### Image / board export

- **PNG** — existing canvas path (`captureActive` → `toCanvas`/`htmlToCanvas`/board
  capture) → `save_bytes`.
- **SVG** —
  - HTML/Markdown render: `capture.svgString(node)` returns the foreignObject SVG we
    already build; save it as text.
  - Excalidraw: the vendored bridge exposes `exportSvg(scene)` (Excalidraw
    `exportToSvg`); `excalidrawview` surfaces it; save the SVG.
  - Mindmap: no SVG (jsMind is raster-only) — PNG only.
- **Excalidraw PNG** — bridge exposes `exportPng` (Excalidraw `exportToBlob`/
  `exportToCanvas`); wire the Excalidraw board into `captureActive`/`captureBoard`.
- Remove JPG everywhere and the old HTML→PDF menu item.

### Board capture interface

Generalize the board export so `WindowView` can yield both raster and vector for a
board: e.g. `captureBoard(): { png(): Promise<HTMLCanvasElement>; svg?(): Promise<string> }
| null`. Mindmap implements `png` only; Excalidraw implements both. `main.ts` routes
the chosen format accordingly.

## Error handling

- Pandoc/Typst missing → existing friendly install message.
- Board still loading when export invoked → friendly "still loading" error.
- SVG/PNG generation failure → friendly error dialog; no crash; nothing written.

## Testing

- Vitest: `exportOptionsFor` returns the correct menu per file type (incl. empty for
  PDF); `export-render` produces a standalone HTML string and the DOCX variant
  replaces `<svg>` with `<img>` PNG data URIs.
- Manual (append to `docs/test-cases/11-export.md`): each active type → each offered
  format; verify a Mermaid+math `.md` exports a PDF and DOCX showing rendered diagrams
  and equations; Excalidraw PNG + SVG; Mindmap PNG; PDF file shows no Export.

## Deliverables

- [ ] `export-options.ts` + tests; menu wired in sidebar + File menu
- [ ] `export-render.ts` + tests; render-then-export for PDF and DOCX
- [ ] Rust `export_pdf_html` / `export_docx_html`
- [ ] Image SVG export (HTML/Markdown/Excalidraw) + Excalidraw PNG wiring
- [ ] Remove JPG and HTML→PDF
- [ ] Docs: CLAUDE.md architecture, tasks, test-cases
