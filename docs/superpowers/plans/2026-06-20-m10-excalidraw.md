# M10 Excalidraw Implementation Plan

1. Build a pinned Excalidraw 0.18.0 vendor module with an isolated React bridge.
2. Add pure Excalidraw JSON parsing/serialization with Vitest coverage.
3. Build one lazy `excalidrawview.ts` shell loader for the vendor module and CSS.
4. Extend file-kind detection, dialogs, Explorer badges, and editor document kinds.
5. Add a full-pane board state to `windowview.ts` and hide incompatible controls.
6. Route board changes into the hidden tab text while avoiding initial dirty events.
7. Verify Save, Save As, close, move, rename, and session paths through the existing
   tab workflow.
8. Update docs and run frontend, Rust, production, chunk, and native app checks.
