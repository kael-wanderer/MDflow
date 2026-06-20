# M10 Excalidraw Board Design

## Goal

Open `.excalidraw` files as editable visual boards in MDflow while keeping the main
application plain TypeScript and loading the large React-based engine only when used.

## User experience

- `.excalidraw` appears in the file dialog, Explorer, quick open, tabs, and session
  restore.
- Opening a board shows one full-pane Excalidraw canvas. Editor/read/split, preview
  zoom, line-number, and Markdown formatting controls are hidden.
- Canvas edits mark the tab dirty.
- Cmd+S writes valid Excalidraw JSON back to the same file.
- Save As, dirty-close confirmation, tab movement, Sub-window merging, rename, and
  session restoration behave like text documents.
- Invalid JSON displays a clear error in the canvas area and remains available for
  recovery without overwriting the source.

## Architecture

- `excalidraw-document.ts` validates and serializes the file format without React.
- `excalidrawview.ts` is the shell-side lazy loader. It loads a self-contained,
  pinned Excalidraw 0.18.0 module and stylesheet only when a board is opened.
- `scripts/excalidraw-bridge.tsx` is the isolated React boundary used to produce the
  committed runtime module under `public/vendor/excalidraw`.
- `windowview.ts` lazy-imports that module only for an active `.excalidraw` tab.
- The tab's hidden CodeMirror state stores the serialized JSON. This reuses the
  existing save, dirty, close, and session systems without a parallel document model.

## Persistence

The saved document contains:

- `type: "excalidraw"`
- `version: 2`
- `source: "mdflow"`
- `elements`
- a persistence-safe subset of `appState`
- `files`

Ephemeral UI values such as collaborators are removed before serialization.

## Dependency boundary

React, ReactDOM, and Excalidraw are bundled into the board-only vendor module rather
than added to the main application graph. The startup shell remains plain TypeScript,
the normal Vite bundle stays below its warning threshold, and the pinned module is
downloaded by the webview only when an Excalidraw document is active.
