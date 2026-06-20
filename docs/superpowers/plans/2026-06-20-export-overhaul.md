# Export Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Export context-aware by document type, render Documents before exporting (so math/Mermaid/diagrams appear), offer PNG + SVG images (mindmap PNG-only), and fix the broken Excalidraw export.

**Architecture:** A pure `export-options.ts` decides the menu per file type. A new `export-render.ts` builds rendered HTML for Document export (PDF full-fidelity via Typst; DOCX best-effort with SVG→PNG rasterization). `capture.ts` gains an SVG string output; the Excalidraw vendor bridge gains PNG/SVG export. Rust gains `export_pdf_html`/`export_docx_html`.

**Tech Stack:** TypeScript (no framework), Pandoc + Typst, Tauri 2, Vitest. Design spec: `docs/superpowers/specs/2026-06-20-export-overhaul-design.md`.

## Global Constraints

- Clean-room: never copy Kaelio code/CSS.
- Per-type mapping (exact): Markdown(.md/.txt/untitled) → Document(PDF, Word) + Image(PNG, SVG); HTML → Image(PNG, SVG); Excalidraw → Image(PNG, SVG); Mindmap → Image(PNG); PDF → no export.
- Document export renders first (KaTeX inline, Mermaid as SVG). PDF = full fidelity; DOCX = best-effort (math → Word equations, diagram SVG → PNG).
- Remove JPG and the old HTML→PDF item.
- Pandoc/Typst run from a writable temp dir (existing read-only-FS fix in `export.rs`).
- Small focused files, TDD for pure logic, frequent commits.

---

### Task 1: Context-aware export options (pure)

**Files:**
- Create: `src/export-options.ts`
- Test: `src/__tests__/export-options.test.ts`

**Interfaces:**
- Produces: `exportOptionsFor(pathOrName: string | null): ExportItem[]`; types `ExportItem = { label: string; format: ExportFormat }` or `{ label: string; children: ExportItem[] }`; `ExportFormat = "doc-pdf" | "doc-docx" | "img-png" | "img-svg"`.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/export-options.test.ts
import { describe, expect, it } from "vitest";
import { exportOptionsFor } from "../export-options";

const formats = (items: ReturnType<typeof exportOptionsFor>): string[] =>
  items.flatMap((i) => ("children" in i ? i.children : [i])).map((i) => (i as { format: string }).format);

describe("exportOptionsFor", () => {
  it("offers Document + Image for markdown", () => {
    expect(formats(exportOptionsFor("notes.md"))).toEqual([
      "doc-pdf", "doc-docx", "img-png", "img-svg",
    ]);
  });
  it("offers Image (png, svg) for html and excalidraw", () => {
    expect(formats(exportOptionsFor("a.html"))).toEqual(["img-png", "img-svg"]);
    expect(formats(exportOptionsFor("a.excalidraw"))).toEqual(["img-png", "img-svg"]);
  });
  it("offers png only for mindmap", () => {
    expect(formats(exportOptionsFor("a.mind"))).toEqual(["img-png"]);
  });
  it("offers nothing for pdf", () => {
    expect(exportOptionsFor("a.pdf")).toEqual([]);
  });
  it("treats an untitled/extensionless doc as markdown", () => {
    expect(formats(exportOptionsFor("Untitled"))).toContain("doc-pdf");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/export-options.test.ts`
Expected: FAIL ("Cannot find module '../export-options'").

- [ ] **Step 3: Implement**

```ts
// src/export-options.ts
import { isExcalidrawFile, isHtmlFile, isMindmapFile } from "./document-kind";

export type ExportFormat = "doc-pdf" | "doc-docx" | "img-png" | "img-svg";
export type ExportItem =
  | { label: string; format: ExportFormat }
  | { label: string; children: ExportItem[] };

const isPdf = (p: string | null | undefined): boolean => /\.pdf$/i.test(p ?? "");

export function exportOptionsFor(pathOrName: string | null): ExportItem[] {
  if (isPdf(pathOrName)) return [];

  if (isMindmapFile(pathOrName)) {
    return [{ label: "PNG Image…", format: "img-png" }];
  }
  if (isHtmlFile(pathOrName) || isExcalidrawFile(pathOrName)) {
    return [
      { label: "PNG Image…", format: "img-png" },
      { label: "SVG Image…", format: "img-svg" },
    ];
  }
  // Markdown / plain / untitled
  return [
    {
      label: "Document",
      children: [
        { label: "PDF…", format: "doc-pdf" },
        { label: "Word (DOCX)…", format: "doc-docx" },
      ],
    },
    {
      label: "Image",
      children: [
        { label: "PNG Image…", format: "img-png" },
        { label: "SVG Image…", format: "img-svg" },
      ],
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/export-options.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/export-options.ts src/__tests__/export-options.test.ts
git commit -m "feat(export): context-aware export options by file type"
```

---

### Task 2: SVG output from the capture pipeline

**Files:**
- Modify: `src/capture.ts`
- Test: `src/__tests__/capture-svg.test.ts`

**Interfaces:**
- Consumes: existing `htmlToCanvas`, `toCanvas`.
- Produces: `nodeToSvg(node: HTMLElement): string` and `htmlToSvg(html: string): Promise<string>` — return the foreignObject SVG markup as a string (the same SVG these functions already build before rasterizing).

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/capture-svg.test.ts
import { describe, expect, it } from "vitest";
import { nodeToSvg } from "../capture";

describe("nodeToSvg", () => {
  it("wraps the node's HTML in an <svg><foreignObject>", () => {
    const el = document.createElement("div");
    el.innerHTML = "<p>hi</p>";
    Object.defineProperty(el, "scrollHeight", { value: 40, configurable: true });
    const svg = nodeToSvg(el);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("foreignObject");
    expect(svg).toContain("hi");
  });
});
```

This test runs under the existing jsdom/node test env. If `nodeToSvg` reads layout
sizes, default missing values to 1 so it works headlessly.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/capture-svg.test.ts`
Expected: FAIL ("nodeToSvg is not a function").

- [ ] **Step 3: Implement**

Refactor `capture.ts` so the SVG-string construction in `toCanvas`/`htmlToCanvas` is
extracted into exported helpers, then those functions rasterize the returned string:

```ts
// src/capture.ts — add near the top, and have toCanvas/htmlToCanvas reuse these
export function nodeToSvg(node: HTMLElement): string {
  const width = Math.max(node.getBoundingClientRect().width || 0, node.clientWidth || 0, 1);
  const height = Math.max(node.scrollHeight || 0, 1);
  const clone = node.cloneNode(true) as HTMLElement;
  const html = new XMLSerializer().serializeToString(clone);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    '<foreignObject width="100%" height="100%">' +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;background:#fff;color:#111;padding:16px;width:${width}px">${html}</div>` +
    "</foreignObject></svg>"
  );
}
```

For HTML documents, add `htmlToSvg(html)`: reuse the off-screen-iframe measuring/artboard
logic already in `htmlToCanvas`, but return the assembled SVG string instead of
rasterizing it. Keep `toCanvas`/`htmlToCanvas` behavior unchanged (have them call
`rasterize(nodeToSvg(node), …)` / the html SVG builder).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/capture-svg.test.ts && npx vitest run`
Expected: new test PASS; full suite still green.

- [ ] **Step 5: Commit**

```bash
git add src/capture.ts src/__tests__/capture-svg.test.ts
git commit -m "feat(export): expose SVG string output from capture pipeline"
```

---

### Task 3: Rendered-HTML builder for Document export (pure-ish)

**Files:**
- Create: `src/export-render.ts`
- Test: `src/__tests__/export-render.test.ts`

**Interfaces:**
- Consumes: `renderMarkdown` (`./preview`), `enhancePreview` (`./render-extras`).
- Produces: `buildExportHtml(markdown: string, opts: { rasterizeSvg: boolean }): Promise<string>` — returns a standalone HTML document string. When `rasterizeSvg` is true (DOCX), every `<svg>` in the rendered body is replaced by an `<img>` with a PNG data URI.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/export-render.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("../render-extras", () => ({ enhancePreview: vi.fn(async () => {}) }));

import { buildExportHtml } from "../export-render";

describe("buildExportHtml", () => {
  it("produces a standalone HTML doc containing the rendered markdown", async () => {
    const html = await buildExportHtml("# Title\n\ntext", { rasterizeSvg: false });
    expect(html).toContain("<html");
    expect(html).toContain("Title");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/export-render.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/export-render.ts
import { renderMarkdown } from "./preview";
import { enhancePreview } from "./render-extras";

async function svgToPngDataUri(svg: SVGElement): Promise<string> {
  const xml = new XMLSerializer().serializeToString(svg);
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  const image = new Image();
  await new Promise<void>((res, rej) => {
    image.onload = () => res();
    image.onerror = () => rej(new Error("Could not rasterize diagram"));
    image.src = src;
  });
  const w = Math.max(image.naturalWidth || svg.clientWidth || 1, 1);
  const h = Math.max(image.naturalHeight || svg.clientHeight || 1, 1);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

export async function buildExportHtml(
  markdown: string,
  opts: { rasterizeSvg: boolean },
): Promise<string> {
  const host = document.createElement("article");
  host.className = "doc";
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "800px";
  host.innerHTML = renderMarkdown(markdown);
  document.body.appendChild(host);
  try {
    await enhancePreview(host); // Mermaid fences → SVG
    if (opts.rasterizeSvg) {
      for (const svg of Array.from(host.querySelectorAll("svg"))) {
        try {
          const uri = await svgToPngDataUri(svg as unknown as SVGElement);
          const img = document.createElement("img");
          img.src = uri;
          svg.replaceWith(img);
        } catch {
          /* leave the svg; DOCX may drop it */
        }
      }
    }
    const body = host.innerHTML;
    return `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
  } finally {
    host.remove();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/export-render.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/export-render.ts src/__tests__/export-render.test.ts
git commit -m "feat(export): build rendered HTML for document export"
```

---

### Task 4: Rust HTML→PDF/DOCX commands

**Files:**
- Modify: `src-tauri/src/export.rs`, `src-tauri/src/lib.rs` (register commands)

**Interfaces:**
- Produces (Tauri commands): `export_pdf_html(html: String, out: String) -> Result<(), String>` and `export_docx_html(html: String, out: String) -> Result<(), String>`.

- [ ] **Step 1: Add the commands**

In `export.rs`, mirror the existing `export_pdf`/`export_docx` but read HTML and pass
through `--extract-media` to a temp dir (so embedded data-URI images resolve):

```rust
#[tauri::command]
pub fn export_pdf_html(html: String, out: String) -> Result<(), String> {
    let pandoc = find_pandoc().ok_or(PANDOC_MISSING)?;
    let typst = find_typst().ok_or(TYPST_MISSING)?;
    let media = std::env::temp_dir().join("mdflow-export-media");
    let args = vec![
        "--from".into(), "html".into(),
        "--extract-media".into(), media.to_string_lossy().into_owned(),
        "--pdf-engine".into(), typst.to_string_lossy().into_owned(),
        "-o".into(), out,
    ];
    run_pandoc(&pandoc, &html, &args)
}

#[tauri::command]
pub fn export_docx_html(html: String, out: String) -> Result<(), String> {
    let pandoc = find_pandoc().ok_or(PANDOC_MISSING)?;
    let media = std::env::temp_dir().join("mdflow-export-media");
    let args = vec![
        "--from".into(), "html".into(),
        "--extract-media".into(), media.to_string_lossy().into_owned(),
        "-o".into(), out,
    ];
    run_pandoc(&pandoc, &html, &args)
}
```

Register both in `lib.rs`'s `invoke_handler` list next to `export_pdf`/`export_docx`.

- [ ] **Step 2: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: clean.

- [ ] **Step 3: Verify the data-URI path during implementation**

Build a tiny HTML string with an inline `<img src="data:image/png;base64,…">`, run
`export_docx_html` and `export_pdf_html` against a temp output path, and confirm a valid
file is produced. If Typst rejects data-URI images, the implementer should switch the
PNG embedding so `--extract-media` writes them to disk (it already does for `--from
html`); record the outcome in the task report.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/export.rs src-tauri/src/lib.rs
git commit -m "feat(export): pandoc HTML->PDF/DOCX commands"
```

---

### Task 5: Excalidraw board PNG + SVG export

**Files:**
- Modify: `scripts/excalidraw-bridge.tsx` (or the bridge source), `public/vendor/excalidraw/bridge.js` (rebuilt), `src/excalidrawview.ts`, `src/windowview.ts`

**Interfaces:**
- Produces: the Excalidraw bridge exposes `exportPng(): Promise<HTMLCanvasElement>` and `exportSvg(): Promise<string>`; `excalidrawview` returns these on its handle; `windowview` `captureBoard()` returns `{ png(): Promise<HTMLCanvasElement>; svg?: () => Promise<string> }`.

- [ ] **Step 1: Extend the bridge**

In the Excalidraw bridge (`scripts/excalidraw-bridge.tsx`), use Excalidraw's
`exportToCanvas` and `exportToSvg` to add two methods to the mounted instance API:
`exportPng` (return the canvas) and `exportSvg` (return `new XMLSerializer().serializeToString(svg)`),
operating on the current scene (elements/appState/files). Rebuild the vendor bundle via
the existing `scripts/build-excalidraw-vendor.mjs`.

- [ ] **Step 2: Surface on the view handle**

In `src/excalidrawview.ts`, return `exportPng`/`exportSvg` from `mountExcalidrawBoard`'s
handle (alongside the existing destroy), forwarding to the bridge instance.

- [ ] **Step 3: Generalize `captureBoard`**

In `src/windowview.ts`, change the board state so both board types provide a capture
object. Mindmap: `{ png: () => handle.capture() }`. Excalidraw: `{ png: () =>
handle.exportPng(), svg: () => handle.exportSvg() }`. Update the `WindowView.captureBoard`
return type to `{ png(): Promise<HTMLCanvasElement>; svg?: () => Promise<string> } | null`.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/ public/vendor/excalidraw src/excalidrawview.ts src/windowview.ts
git commit -m "feat(export): excalidraw board png + svg export"
```

---

### Task 6: Wire the export menu + routing in main.ts

**Files:**
- Modify: `src/main.ts`
- Modify: `src-tauri/src/menu.rs` (rebuild File ▸ Export to be built dynamically is not possible natively — keep a static superset; see step 3)

**Interfaces:**
- Consumes: `exportOptionsFor` (Task 1), `buildExportHtml` (Task 3), `nodeToSvg`/`htmlToSvg` (Task 2), `export_pdf_html`/`export_docx_html` (Task 4), `captureBoard` (Task 5).

- [ ] **Step 1: Replace `openExportMenu` to use `exportOptionsFor`**

Build the popover items from `exportOptionsFor(activeMeta()?.path ?? activeMeta()?.name)`.
If it returns `[]` (PDF), do not open the popover (and disable the sidebar Export button
for PDF tabs). Map each `format` to a handler:
- `doc-pdf` → `exportDocument("pdf")`, `doc-docx` → `exportDocument("docx")`
- `img-png` → `exportImage("png")`, `img-svg` → `exportImage("svg")`

- [ ] **Step 2: Implement the format handlers**

```ts
// Document export: render then pandoc
async function exportDocument(kind: "pdf" | "docx"): Promise<void> {
  const tab = activeMeta(); if (!tab) return;
  const out = await pickExportPath(kind); if (!out) return;
  try {
    const { buildExportHtml } = await import("./export-render");
    const html = await buildExportHtml(activeView().editor.getText(tab.id), {
      rasterizeSvg: kind === "docx",
    });
    await invoke(kind === "pdf" ? "export_pdf_html" : "export_docx_html", { html, out });
  } catch (e) {
    await message(e instanceof Error ? e.message : String(e), { title: "Export", kind: "error" });
  }
}

// Image export: png (canvas) or svg (string)
async function exportImage(kind: "png" | "svg"): Promise<void> {
  const tab = activeMeta(); if (!tab) return;
  const ext = kind;
  const out = await pickExportPath(ext); if (!out) return;
  try {
    if (kind === "svg") {
      const svg = await activeSvg();           // see step below
      await invoke("save_file", { path: out, contents: svg });
    } else {
      const canvas = await captureActive();     // existing PNG path (incl. board.png())
      const bytes = dataUrlToBytes(canvas.toDataURL("image/png"));
      await invoke("save_bytes", { path: out, bytes: Array.from(bytes) });
    }
  } catch (e) {
    await message(e instanceof Error ? e.message : String(e), { title: "Export", kind: "error" });
  }
}
```

Add `activeSvg()`: for a mindmap → not offered (menu excludes svg); for excalidraw →
`activeView().captureBoard()?.svg?.()`; for html → `htmlToSvg(text)`; for markdown →
`nodeToSvg(renderMarkdownForCapture(text))` (reuse the existing detached-render helper).
Update `captureActive()` to call `board.png()` for boards.

Remove the old `exportDoc`/`exportRender` paths and the JPG handlers; update the menu
event cases accordingly.

- [ ] **Step 3: Native File ▸ Export menu**

The native menu is static, so keep a superset that always lists the same items, but make
each handler check `exportOptionsFor(active)` and show a short "not available for this
document" message if the chosen format isn't valid for the active type. (Document items
→ `exportDocument`; image items → `exportImage`.) This keeps the native menu consistent
without per-tab rebuilds.

- [ ] **Step 4: Build + test**

Run: `npm run build && npx vitest run`
Expected: clean build; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src-tauri/src/menu.rs
git commit -m "feat(export): context-aware menu + document/image/board routing"
```

---

### Task 7: Docs + test cases

**Files:**
- Modify: `CLAUDE.md`, `docs/tasks.md`, `docs/test-cases/11-export.md`

- [ ] **Step 1: Update docs**

- `CLAUDE.md` architecture: add `export-options.ts`, `export-render.ts`; note Document
  export renders first; Image export is PNG/SVG.
- `docs/tasks.md`: record the Export Overhaul as done with a short summary.
- `docs/test-cases/11-export.md`: replace JPG/HTML-PDF cases with the new per-type
  cases (Document PDF/DOCX with a Mermaid+math doc; Image PNG/SVG per type; PDF shows
  no Export).

- [ ] **Step 2: Verify**

Run: `npm run build && npx vitest run && (cd src-tauri && cargo check)`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/tasks.md docs/test-cases/11-export.md
git commit -m "docs(export): record overhaul + refreshed test cases"
```

---

## Self-Review

- **Spec coverage:** context-aware menu (T1, T6), Document render-then-export PDF+DOCX (T3, T4, T6), Image PNG/SVG (T2, T5, T6), Excalidraw export (T5, T6), remove JPG/HTML-PDF (T6), docs (T7). Covered.
- **Placeholders:** none; the only runtime-verified item is Pandoc data-URI handling (T4 step 3 verifies it explicitly).
- **Type consistency:** `ExportFormat` (T1) consumed in T6; `captureBoard()` returns `{ png; svg? }` (T5) consumed in T6; `buildExportHtml(md,{rasterizeSvg})` (T3) consumed in T6; `nodeToSvg`/`htmlToSvg` (T2) consumed in T6.
