# M9 Editing Affordances Implementation Plan

1. Add a pure Markdown formatting module and unit tests for inline, line-prefix,
   heading-cycle, link, and horizontal-rule behavior.
2. Extend the editor handle with formatting application and per-tab language kind.
3. Add HTML language support with a language compartment in each CodeMirror state.
4. Add a Markdown-only formatting row to each editor pane and connect its buttons to
   the active editor.
5. Style the row using existing theme variables and compact toolbar conventions.
6. Update roadmap/task/architecture documentation.
7. Run Vitest, TypeScript/Vite build, Rust checks, and a Tauri app bundle build.
