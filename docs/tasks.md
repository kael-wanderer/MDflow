# MDflow — Tasks

> **Resuming? Read this first, then `docs/spec.md`.**
> This file is the handoff between sessions (auto-memory does NOT carry over from the
> Kaelio sessions — it was keyed to the Kaelio folder).

## Where we are (2026-06-20)

- Locked decisions: name **MDflow**; **MIT** license; **clean-room incremental
  rewrite**; modular architecture; refined/cleaner UI; identifier `com.kael.mdflow`.
- M1 lean core is implemented.
- Shell Phase 1 is implemented: activity bar, collapsible/resizable Explorer, lazy
  directory tree, file-type icons, click-to-open, and shell session persistence.
- Shell Phase 2 is implemented: inline create/rename, Trash-backed delete, duplicate,
  Copy Path, Reveal in Finder, context menus, and refresh-on-focus.
- Shell Phase 3 is implemented: multiple tabs, per-document editor state and undo,
  dirty tracking, confirmed close, and session restoration.
- Shell Phase 4a is implemented: per-window toolbar and line numbers toggle.
- Shell Phase 4b is implemented: Sub window, per-window tabs/view modes, and splitter.
- Shell Phase 4c is implemented: icon toolbar, per-window status lines, colored file
  icons, Explorer header actions, and File ▸ Open Folder.
- Shell Phase 5 is implemented: command/file palette, Search/Gear activity controls,
  settings.json, layered in-app settings UI, themes, per-zone typography,
  restore-session control, and agent configuration.
- Phases 6–7 are implemented: configurable AI chat + terminal panel, Mermaid/KaTeX
  and raw-HTML preview, PDF reader, and PDF/DOCX/HTML/PNG/JPG export.
- M2 update client, M9 editing affordances, and M10 Excalidraw boards are implemented.

## Next step (the immediate task)

Run the remaining native GUI checklists in `docs/review.md`. Then build M11
(jsMind visual mindmap). See `docs/spec.md` roadmap.

## UI pass (2026-06-20) — done

[x] Sidebar Export button (after AI icon) → popover of PDF/DOCX/HTML/PNG/JPG;
    focus-aware (exports the active pane's file in split view)
[x] Explorer redesign: "EXPLORER" title with ⋯ overflow menu (Hide Explorer, Toggle
    Line Numbers); root folder row with caret + New File / New Folder / Refresh /
    Collapse All; collapsible tree
[x] Gear panel: fixed size (no per-tab jump), narrower columns
[x] MDflow ▸ Set MDflow as Default ▸ Markdown / PDF menu
[x] Reading/preview toolbar icon swapped to an open-book glyph
[x] Removed stray .DS_Store files; de-duplicated .gitignore
[x] Export bug fixes (2026-06-20):
    - PDF/DOCX failed from the .app ("Read-only file system" temp file): run
      pandoc/typst with current_dir = temp dir
    - PNG/JPG did nothing in editor-only mode / for HTML files: render the active
      doc to a detached node so capture works in any view mode
    - Export menu regrouped to HTML (PNG/JPG/PDF) and Markdown (PDF/DOCX); dropped
      the standalone HTML-file export; sidebar icon → external-export glyph
    - HTML▸PDF = rendered preview wrapped into a PDF (src/pdfcapture.ts, dep-free)
[x] Export follow-up fixes (2026-06-20):
    - Removed the post-export success popups
    - HTML image/PDF export only captured the top: render full HTML docs in an
      off-screen iframe sized to content (capture.htmlToCanvas)
    - Markdown tables looked "missing" (bottom-border only): full grid + header
      shade + zebra rows
    - Reading (preview-only) mode bumped up ~3px and wider side padding
    - HTML preview zoom no longer reloads the iframe (killed the white-blank
      flash): zoom updates the live document in place
[x] Export/preview fixes round 2 (2026-06-20, behavior referenced from Kaelio):
    - HTML image/PDF capture lost ~30% on the right: detect the artboard (#frame
      or largest SVG viewBox) and capture at that size with fixed-layout CSS
      neutralized (capture.detectArtboard)
    - HTML preview zoom flash truly fixed: preview iframe is now allow-same-origin
      with NO scripts; parent reads contentDocument to apply zoom + auto-fit in
      place (no reload). Auto-fit re-runs via a ResizeObserver on the pane
    - Reading mode now matches Kaelio metrics: full width, 32/48px padding,
      ≥17px size, 1.7 line-height
[x] HTML zoom performance follow-up (2026-06-20):
    - Large HTML/SVG previews no longer use document-level CSS `zoom`, which forced
      WebKit to clear, relayout, and repaint the iframe
    - Zoom now scales the already-painted iframe surface while inversely sizing its
    viewport, preserving the full-picture behavior without the white flash
[x] Export overhaul (2026-06-20):
    - Context-aware options per document type; PDF disables Export
    - Markdown Document export renders KaTeX/Mermaid before PDF/DOCX conversion
    - PNG/SVG image export for Markdown, HTML, and Excalidraw; mindmap PNG
    - Excalidraw PNG/SVG bridge fixed; JPG and rendered HTML-to-PDF removed
[x] Board UX (2026-06-20):
    - Activity bar order: Explorer, Search, AI, Excalidraw, Mindmap, Export, Gear
    - One-click untitled Excalidraw and Mindmap creation using the normal save flow
    - jsMind nodes, canvas, expanders, selection, and connector lines follow app themes
[x] Update mode UX (2026-06-20):
    - Replaced `autoUpdate` with Manual / Automatic `updateMode`
    - Migrates legacy boolean settings without changing existing user intent
    - Manual never checks in the background; Automatic obeys the 24-hour guard
    - Both modes keep explicit Check for Updates and always prompt before install
[x] Set-as-default app (2026-06-20):
    - macOS bundle declares Markdown, text, and PDF document associations
    - Finder-opened files reach the existing open workflow at launch and while running
    - Menu registers Markdown/text editor and PDF viewer roles through LaunchServices
    - Failed registration opens Default Apps settings and shows Finder instructions
[x] Menu bar rebuild (2026-06-20):
    - View menu: Show/Hide Explorer ⌘B, Show/Hide Preview ⌘P, Reading View ⌘E,
      Show/Hide Line Numbers, Soft Wrap ▸ Off/Window Width/Page Guide, zoom,
      Font / Text Size / Explorer Text Size / Theme submenus (active value checked)
    - Soft-wrap modes (off/window/guide + wrapColumn) and submenus persist to
      settings.json; sync_view_menu reflects settings into the menu checks
    - Window menu: Enter Full Screen ⌃⌘F, Move to Left/Right Half (window_tile)
    - Palette is ⌘K only (⌘P freed for Show/Hide Preview)
    - Test cases: docs/test-cases/17-menu-bar.md (MENU-01..17)
[x] AI settings + keychain (2026-06-20):
    - API keys live in the macOS Keychain and never in `ai.json`
    - Legacy plaintext keys migrate automatically without deleting failed migrations
    - Agent settings use CLI Agents and Models tabs with key/removal actions
    - OpenAI, Anthropic, and OpenRouter templates ship by default

## Backlog (specced 2026-06-20)

[x] M9 — Editor formatting toolbar (bold/italic/heading/link/code/quote/bullet/hr)
[x] M9 — Proper HTML editing mode for .html files
[x] M10 — Excalidraw single-pane view bound to .excalidraw (lazy React mount)
[x] M11 — jsMind visual mindmap single-pane view
[x] Set-as-default: declare doc types in Info.plist + native default-handler command

## Code Tasks

Plan: `docs/superpowers/plans/2026-06-19-m1-lean-core.md`

[x] Write M1 implementation plan (writing-plans)
[x] Task 1 — Scaffold Tauri 2 + Vite + TS (MIT, THIRD-PARTY-NOTICES)
[x] Task 1b — App icon from images/logo.png (tauri icon)
[x] Task 2 — Full CLAUDE.md + README
[x] Task 3 — Static UI shell mockup → APPROVED (pivot: native-menu-only, no toolbar; amber kept; logo = app icon)
[x] Task 4 — state.ts (persisted UI state, TDD)
[x] Task 5 — preview.ts (markdown-it render, TDD)
[x] Task 6 — files.rs (Rust file IO + word_count, TDD)
[x] Task 7 — editor.ts (CodeMirror 6, soft-wrap toggleable)
[x] Task 8 — files.ts (IPC open/save + dialogs, + newFile/saveAs)
[x] Task 9 — views.ts (view-mode switching + zoom)
[x] Task 9B — Native application menu (Rust menu.rs → menu events)
[x] Task 10 — main.ts (wiring via menu events, hotkeys, debounce)
[x] Task 11 — style pass on live app
[x] Task 12 — updater plugin registered with manual and daily-check UI
[x] Task 14 — Help menu: MDflow Help (opens bundled HELP.md in editor) + version in About
[~] Task 13 — M1 smoke test (automated ✓; GUI checklist in docs/review.md ← user to verify)

M2 update client is implemented. Release setup still needs the production feed URL,
signing public key, private CI signing secret, and published `latest.json`.

## M2 — Auto-update

[x] Regenerate native app icons from `images/logo.png`
[x] Add Help ▸ Check for Updates
[x] Prompt before download/install and restart after installation
[x] Add Gear ▸ Manual / Automatic update mode
[x] Persist daily check time and avoid checking more than once per 24 hours
[ ] Configure production updater endpoint and public key
[ ] Add signed release workflow and publish `latest.json`

## Shell Sub-project

Design: `docs/superpowers/specs/2026-06-19-shell-explorer-tabs-split-design.md`

### Phase 1 - Shell + read-only Explorer

[x] Rust lazy `list_dir` command with dir-first sorting and unit test
[x] Pure tree operations and file-icon mapping with Vitest coverage
[x] Central shell store and filesystem IPC wrappers
[x] Activity bar, Explorer layout, empty state, and lazy tree renderer
[x] Explorer toggle and drag-resizable width
[x] Click Explorer file to open in the existing editor and preview
[x] Persist folder, Explorer visibility, and Explorer width
[x] Automated tests, production build, Rust tests, and compile-check
[x] Native GUI smoke checklist in `docs/review.md` (user quick-verified — works)

### Phase 2 - Explorer file management

[x] Native create/rename/delete-to-Trash/duplicate commands
[x] Opener and clipboard plugins with capabilities
[x] Separator-aware path helpers with tests
[x] Context menus for rows and Explorer root
[x] Inline New File, New Folder, and Rename
[x] Duplicate, Copy Path, Reveal in Finder, and confirmed Trash deletion
[x] Refresh after actions and on window focus
[x] Preserve expanded folder state during refresh
[x] Keep the current editor save path safe across rename/delete
[x] Automated tests, production build, Rust checks, and native launch
[~] Native GUI smoke checklist in `docs/review.md`

### Phase 3 - Tabs

[x] Pure tab-list operations with tests
[x] Tabs and active-tab metadata in the central store
[x] Per-document CodeMirror state, cursor, and undo isolation
[x] Accessible, horizontally scrolling tab strip
[x] Open/focus existing files from Explorer and File menu
[x] Dirty indicators, Save clearing, and Save-As naming
[x] Close button and `⌘W` with dirty confirmation and neighbour activation
[x] Safe tab path handling across Explorer rename/delete
[x] Persist and restore open file tabs and active path
[x] Preserve one-document/one-tab ownership during Save As
[x] Tab right-click menu: reveal, pin, split/move, close groups, and path copy
[x] Explorer two-stage Select for Compare workflow
[x] Synchronized side-by-side file diff surface
[x] Automated tests, production build, Rust checks, browser harness, and native launch
[~] Native GUI smoke checklist in `docs/review.md`

### Phase 4 - Sub window and per-window view modes

[x] Phase 4a - Per-window Toolbar + Line Numbers
[x] Phase 4b - Sub window
[x] Phase 4c - UI polish

### Phase 5 - Top bar and settings

[x] Recursive quick-open file walk
[x] Fuzzy command/file palette (`⌘K` / `⌘P`)
[x] Explorer → Search → Gear activity bar
[x] App-config `settings.json` opened and saved as a normal tab
[x] Six theme choices and themeable editor syntax
[x] Per-zone font/size and restore-session setting
[x] Gear settings panel with Theme/Font/Size/Session/Agent sections
[x] Friendly theme-name parsing, including "Everforest Dark"
[x] Focus-aware editor/preview zoom shortcuts
[x] Chat provider and ask/bypass permission selectors
[x] Automated tests, production build, and native launch

### Phases 6–7 - AI, rich render, PDF, and export

[x] Separate app-config `ai.json` with HTTP, command, and terminal providers
[x] Streaming AI chat with document/selection context and edit diff
[x] Embedded xterm terminal backed by a native PTY
[x] Resizable, persisted AI side panel
[x] Raw HTML, KaTeX, and lazy Mermaid preview rendering
[x] PDF.js reader using native byte IPC
[x] Pandoc/Typst PDF, DOCX, and HTML export
[x] PNG/JPG preview capture and native byte save
[x] Lazy heavy-feature chunks; no production chunk-size warning
[x] Automated tests, production build, Rust checks, and native smoke

### M9 - Editing affordances

Design: `docs/superpowers/specs/2026-06-20-m9-editing-affordances-design.md`

[x] Pure Markdown formatting commands with selection/cursor results
[x] Markdown-only toolbar above the editor
[x] Bold, italic, heading, link, inline code, quote, bullet, and rule controls
[x] Formatting edits participate in CodeMirror undo/redo
[x] Per-tab HTML syntax parsing and highlighting for `.html` / `.htm`
[x] Language mode updates on open, Save As, rename, and window moves
[x] Automated frontend tests and production build

### M10 - Excalidraw board

Design: `docs/superpowers/specs/2026-06-20-m10-excalidraw-design.md`

[x] `.excalidraw` file detection, open-dialog filter, Explorer badge, and tab icon
[x] Pure Excalidraw JSON validation and persistence-safe serialization
[x] Full-pane editable board with incompatible text controls hidden
[x] Lazy isolated React/Excalidraw 0.18.0 runtime outside the startup bundle
[x] Canvas changes flow through normal dirty, Save, Save As, and close handling
[x] Session restore, rename, and Main/Sub window moves reuse normal tab ownership
[x] Friendly invalid-document error that preserves the original file text
[x] Automated frontend tests, production build, and interactive browser smoke

### M11 - Mindmap board

[x] `.mind` file detection, open-dialog filter, Explorer badge, and tab icon
[x] Pure jsMind node_tree JSON validation and persistence-safe serialization
[x] Full-pane editable board with add/rename/drag/delete node operations
[x] Lazy jsMind 0.9.1 board runtime outside the startup bundle
[x] Board changes flow through normal dirty, Save, Save As, and close handling
[x] Session restore, rename, and Main/Sub window moves reuse normal tab ownership
[x] Friendly invalid-document error that preserves the original file text
[x] Export mindmap to PNG, JPG, and PDF via canvas capture
[x] Automated frontend tests, production build, and interactive browser smoke
[x] Theme-aware jsMind board styling and live connector recoloring
[x] Rich node editor: per-node shape (rect/rounded/pill/circle), fill/text color,
    font size, bold; stored in node data; persists in .mind (no format change)
[ ] Native GUI smoke test (native launch and user verification)

### Workflow

Claude Code leads design and planning. Codex implements the checked-in plans and
raises material questions, ideas, and concerns during execution.

## Documentation Tasks

[x] docs/spec.md
[x] docs/tasks.md (this file)
[x] CLAUDE.md
[x] README.md

## Testing Tasks

[~] M1 manual smoke test (checklist in `docs/review.md`)
[x] Shell Phase 1 native GUI smoke test (user quick-verified — works)
[~] Shell Phase 2 native GUI smoke test (checklist in `docs/review.md`)
[~] Shell Phase 3 native GUI smoke test (checklist in `docs/review.md`)
