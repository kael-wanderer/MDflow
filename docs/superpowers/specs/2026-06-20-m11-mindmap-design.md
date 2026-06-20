# M11 — Visual Mindmap (jsMind) Design

Date: 2026-06-20
Status: Approved (core design); spec under review.

## What problem does this solve?

MDflow can render code-based mindmaps today (Mermaid `mindmap` fenced blocks), but
there is no way to **visually** build one — drag nodes, add/rename/delete, fold —
without writing code. M11 adds a dedicated `.mind` document type that opens in a
single full-pane, drag-and-drop mindmap editor, the same shape as the PDF reader and
the M10 Excalidraw board.

## What does success look like?

- Opening a `.mind` file shows an editable jsMind board filling the document pane
  (no editor/preview/split).
- The user can add, rename, delete, fold, and drag-reparent nodes on the canvas.
- Edits flow through the normal tab pipeline: dirty indicator, `Cmd+S`, Save As,
  close confirmation, and session restore all work unchanged.
- A new `.mind` file opens with a single editable root node.
- Invalid `.mind` JSON shows a friendly error and never destroys the original text.
- The mindmap can be exported to PNG, JPG, and PDF.
- jsMind loads lazily — it is absent from the startup bundle.

## What's out of scope (M11)

- Context-aware reorganization of the whole Export menu — **follow-up** ("Export &
  board UX" pass).
- Excalidraw image export and New-Excalidraw/New-Mindmap quick-create sidebar
  buttons — **follow-up** (same pass).
- Mermaid `mindmap` changes — unrelated, stays as-is.
- Collaboration, node styling panels, or import from FreeMind/other formats.

## Tech stack

- **jsMind** (vanilla JS, permissively licensed) added as an npm dependency and
  lazy-loaded with its CSS. No React bridge is needed (unlike Excalidraw), so M11 is
  simpler than M10.
- Reuses the existing board pane in `windowview.ts`, the tab/dirty/save pipeline, and
  `pdfcapture.ts` (dependency-free image→PDF) for PDF export.

## Clean-room note

jsMind is a third-party MIT/BSD library, unrelated to Kaelio. No Kaelio code or CSS
is read or ported. Add jsMind's license to `THIRD-PARTY-NOTICES`.

## Architecture

Two new focused files, mirroring the M10 split:

```
src/
  mindmap-document.ts   pure parse/serialize of jsMind node_tree JSON (TDD)
  mindmapview.ts        lazy jsMind loader: mount board, theme, report edits
```

Integration touch-points (small, parallel to M10):

- `document-kind.ts` — `isMindmapFile(pathOrName)` (`.mind`).
- `windowview.ts` — the existing board branch (currently Excalidraw-only) generalizes
  to also mount the mindmap board; board mode already hides editor/preview/split and
  the format toolbar.
- `files.ts` — add `mind` to the open/save dialog filter.
- `icons.ts` / `explorer.ts` — a "MIND" badge and tab icon.
- `editor.ts` — register `.mind` as a board document kind (no CodeMirror language).
- New-file template — a New File named `*.mind` opens an empty map with a root node.

### `mindmap-document.ts` (pure)

jsMind's `node_tree` shape:

```json
{
  "meta": { "name": "mdflow", "version": "1.0" },
  "format": "node_tree",
  "data": { "id": "root", "topic": "Central Idea", "children": [] }
}
```

- `parseMindmap(raw)`:
  - empty/whitespace → default map: one root node, topic `"Central Idea"`.
  - not valid JSON, or missing a `data` root object with an `id` → throw a friendly
    `Error` ("This file does not contain a valid mindmap."). The caller keeps the
    original file text (same pattern as `parseExcalidrawDocument`).
  - valid → normalized `node_tree` object.
- `serializeMindmap(data)`: stable, pretty (2-space) JSON with `format: "node_tree"`,
  stripping transient UI state (selected/edited node markers) so saves stay
  diff-clean and re-opening a saved file produces no spurious dirty event.

### `mindmapview.ts` (lazy)

`mountMindmap(host, raw, onChange): Promise<() => void>`

- `parseMindmap(raw)` for the initial scene.
- Lazy-load jsMind (`await import("jsmind")`) and its stylesheet, plus the screenshot
  plugin (for export). Cache the module/style promises like `excalidrawview.ts`.
- Instantiate jsMind into `host` with editing enabled and theme matching
  `document.documentElement.dataset.theme` (light/dark).
- Subscribe to jsMind edit events; on change, `serializeMindmap(jm.get_data("node_tree"))`
  and call `onChange(serialized)` — but ignore events for the first ~250ms after mount
  so opening a file does not mark it dirty (the M10 guard).
- Return a cleanup function that detaches listeners and destroys the jsMind instance.

## Data flow

```
open .mind → windowview board branch → mountMindmap(host, text, onChange)
   edit on canvas → jsMind event → serializeMindmap → hidden tab text updated
   → normal dirty / Cmd+S / Save As / close / session restore (unchanged)
```

## Mindmap export (PNG / JPG / PDF)

- Triggered the same way image export is today (sidebar Export popover / File ▸ Export
  while a `.mind` board is active).
- Use jsMind's screenshot plugin to render the board to a canvas.
  - PNG → `canvas.toDataURL("image/png")` → `save_bytes`.
  - JPG → `canvas.toDataURL("image/jpeg", 0.95)` → `save_bytes`.
  - PDF → JPEG bytes → `imageToPdf` (existing `pdfcapture.ts`) → `save_bytes`.
- `main.ts` routes export to the board capture when the active document is a mindmap,
  instead of the markdown/HTML capture path. (The fuller context-aware Export menu is
  the follow-up; M11 only needs mindmap board export wired in.)

## Error handling

- Invalid `.mind` JSON → friendly error dialog; the tab keeps the raw text so the user
  can fix it (never overwrite a malformed file silently).
- jsMind module/CSS fails to load → board pane shows a friendly error message (same
  `board-error` treatment as Excalidraw).

## Testing

- Vitest on `mindmap-document.ts`: empty → default root; invalid → throws; valid →
  round-trips; serialize strips transient state and is stable across parse→serialize.
- Production build: confirm jsMind is a separate lazy chunk, not in the startup
  bundle, and no chunk-size warning.
- Rust `cargo check` (no backend changes expected; export reuses `save_bytes`).
- Native GUI smoke (manual, recorded in `docs/review.md`): open/create a `.mind`,
  add/drag/delete nodes, Save, reopen; export PNG/JPG/PDF; malformed file shows the
  friendly error.

## Deliverables

- [ ] `mindmap-document.ts` + tests
- [ ] `mindmapview.ts`
- [ ] Integration: document-kind, windowview board branch, files dialog, icons,
      editor kind, new-file template
- [ ] Mindmap PNG/JPG/PDF export
- [ ] jsMind added to `THIRD-PARTY-NOTICES`
- [ ] Docs updated (spec roadmap, tasks, CLAUDE.md architecture)
- [ ] `docs/review.md` M11 smoke checklist
