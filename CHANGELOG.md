# Changelog

All notable changes to MDflow are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Crash-recovery drafts for dirty saved and untitled documents, with a launch banner
  to restore or discard interrupted work without changing the explicit-save model.
- External file-change detection on focus, tab activation, and save, including clean
  reloads, dirty-buffer comparison, deleted-file recovery, and overwrite protection.
- Per-file local snapshots on changed saves, manual snapshots from the command
  palette, retention pruning, and a version-history panel with Compare and Restore.

## [0.2.3] — 2026-06-21

### Added

- Stage 7: PDF page-text search and page navigation; advanced folder-search toggles,
  highlighted snippets, and per-file counts.
- `⌘F` now searches directly inside Markdown Reading mode and text-based PDFs, with
  highlighted matches and next/previous navigation.
- HTTP-model vision attachments, cancellable streaming replies, and per-window chat
  history persistence.
- Live terminal theme updates and a restart action after terminal process exit.
- Terminal programs can now launch in Embedded mode, Apple Terminal, Ghostty, or
  cmux; Pi is included in the built-in interactive program list.
- Clarified terminal terminology: **Agent command** identifies what runs, while
  **Terminal app** identifies where it runs; the AI tab is now **Agent Console**.
- Increased the Agent Console resize ceiling from 560px to a responsive maximum of
  80% of the MDflow window, while preserving minimum document space.
- Markdown table/task-list toolbar actions, command-palette heading navigation, Open
  Recent files/folders, and export dependency preflight guidance.

### Changed

- GitHub Actions now use Node 24-native majors (`checkout@v6`, `setup-node@v6`,
  `upload-artifact@v7`, and `download-artifact@v8`) so release runs no longer emit
  Node 20 action-runtime deprecation warnings.
- Help now includes a checked **Automatically Check for Updates** item synchronized
  with Gear → General → Updates.
- Markdown tables now size each column to its content and scroll horizontally when
  wider than the pane, instead of wrapping/squeezing columns and headers.

### Fixed

- Opening Gear → Agent → Models no longer prompts for the macOS login Keychain
  password. Saved-key presence is tracked locally, so the Keychain is only read
  when a key is actually used.
- Switching from a resized split to Editor-only now fills the pane instead of
  leaving a blank gap where the preview was.

## [0.2.2] — 2026-06-21

### Changed

- CI: release workflow actions received their preliminary v5 compatibility update.
  The action runtime warning is fully resolved by the Node 24-native majors listed
  under Unreleased.

## [0.2.1] — 2026-06-21

### Changed

- **Signed updater feed is live.** Releases now publish signed update artifacts and a
  valid `latest.json`, and the app ships with the updater endpoint and public key, so
  in-app **Check for Updates** can detect, download, and install new versions.

### Fixed

- Removed an upstream Excalidraw public Firebase key from the vendored board bundle
  (it was never an MDflow credential; only third-party config dead to MDflow).

## [0.2.0] — 2026-06-21

### Added

- **Customizable keyboard shortcuts** — a **Keys** tab (also **View → Keyboard
  Shortcuts**) lists every command by category with record / reset / Restore
  Defaults; rebindings apply to the native menu and app shortcuts and persist in
  `settings.json`.
- **Find in Folder** (`⌘⇧F` or the activity-bar Search button) — content search
  across text files and the text inside `.mind` / `.excalidraw` drawings, with
  results grouped by file; click to open at the line. Plus **in-editor find**
  (`⌘F`).
- **AI file attachments** — reference files in Chat via a 📎 picker, drag-drop onto
  the panel, or `@`-mention (fuzzy over the open folder). CLI agents receive file
  paths and run with the open folder as working directory; HTTP models get
  text-file contents inlined.
- **Terminal improvements** — a live terminal picker in the Terminal tab, a
  **Terminals** editor (add/edit/remove + default) with **Font / Size**, a default
  **Shell** (zsh) entry, and terminal colors drawn from the active theme.
- **Inline edit** for saved CLI agents in settings.
- **Enter sends** in AI Chat (Shift+Enter inserts a newline).
- **New Window** in the **File** menu.

- **Native multi-window support** — create independent MDflow windows from
  **View → New Window** (`⌘⇧N`) or **New Window** in the macOS Dock context menu.
  Each native window has its own tabs, Explorer workspace, AI panel, and optional
  in-window Main/Sub split.
- **Native file drag and drop** — drop files onto a Main/Sub document pane to open
  them there, or onto Explorer to copy them. Folder targets expand after a short
  hover; file targets copy beside the file; an add badge shows the destination.
- **Type-aware document modes** in both Main and Sub panes: Markdown and HTML support
  Editor, Read, and Editor + Preview; PDF is Read-only; code/config formats are
  Editor-only.
- **Syntax highlighting** for TypeScript/JavaScript, JSON, YAML/YML, and expanded
  HTML token coloring.
- **File-language status** — file-type icons in tabs/status bars plus live cursor
  line and column.
- **Quick theme picker** in each window status bar.
- **Mindmap document controls** — Open, Save, Reset, zoom in/out/reset, and
  `⌘+` / `⌘−` / `⌘0` support.
- **AI panel** (right side, ✦ button) with two tabs:
  - **Chat** — provider and permission-mode (Ask / Bypass approvals) selectors,
    document and selection context, streamed replies, and Copy / Insert-at-cursor /
    Apply-as-diff actions.
  - **Terminal** — an embedded terminal (xterm.js + a Rust PTY) running a configured
    agent CLI interactively.
- **Configurable AI providers** via `ai.json`: `http` (OpenAI-compatible servers,
  local such as Ollama / LM Studio or hosted API endpoints) and `command` (headless
  agent CLIs — Claude Code, Codex, OpenCode, Pi — with optional `bypassRun`).
- **Command palette** (`⌘K`) for fuzzy file quick-open and running commands;
  a Search button in the activity bar.
- **Excalidraw boards** — open/edit `.excalidraw` files in a focused full-pane canvas.
- **Mindmap boards** — open/edit `.mind` files (jsMind) with an on-board toolbar to
  add / rename / delete nodes, and per-node formatting: shape (rect / rounded / pill /
  circle), fill & text color (swatches + custom), font size, and bold — all stored in
  the `.mind` file. Dedicated activity-bar buttons create untitled boards.
- **Native View menu** — Show/Hide Explorer (`⌘B`), Show/Hide Preview (`⌘P`),
  Reading View (`⌘E`), Show/Hide Line Numbers, Soft Wrap (Off / Window Width / Page
  Guide), zoom, and Font / Text Size / Explorer Text Size / Theme submenus.
- **Native Window menu** — Enter Full Screen (`⌃⌘F`), Move to Left/Right Half (tiles
  to the active monitor).
- **Set MDflow as Default** (app menu) — register as the Markdown/text editor or PDF
  viewer via macOS LaunchServices; the bundle declares those document types so Finder
  opens route into the app.
- **Update modes** — Manual or Automatic (once-daily) update checks; both always
  confirm before installing.
- **In-app settings panel** from the gear: Theme, Font, Size, Session, and Agent, with
  Open `settings.json` / `ai.json` as advanced actions.
- **Themes**: System, Light, Dark, Catppuccin Mocha, Everforest Dark, Nord — including
  themeable editor syntax; per-zone (Explorer / Main / Sub) fonts and sizes; and a
  restore-last-session toggle.
- **Split windows**: a Main and optional Sub window, each with its own tabs and view mode.
- **Tab context menu**: pin/unpin, reveal, split right, split & move between windows,
  close variants (others / to the right / saved / all), and copy path variants.
- **Explorer context menu**: open preview / to the side, reveal, compare, add file to
  chat, copy path, rename, duplicate, delete-to-trash.
- **Compare**: select two files and view a synchronized side-by-side diff.
- **Rich preview**: mermaid diagrams, KaTeX math (`$…$`, `$$…$$`), and raw HTML.
- **PDF reader**: open `.pdf` files rendered with pdf.js.
- **Export**: PDF and DOCX via pandoc (PDF uses typst as the engine), HTML, and PNG /
  JPG of the rendered preview.
- **Editor zoom** in / out, persisted.
- New explorer activity-bar icon.

### Changed

- New mindmap nodes default to text-only; rectangular, rounded, pill, and circular
  blocks remain optional per-node styles.
- Mindmap drag feedback is now a borderless, light theme-aware gradient.
- Native menu events and Finder-open requests are routed only to the focused native
  window. Secondary windows start fresh and do not overwrite the primary
  restore-session snapshot.
- The gear button now opens the in-app settings panel instead of directly opening
  `settings.json`.
- Agent settings now use two tabs: **CLI Agents** and **Models**, combining local and
  hosted HTTP providers with per-provider key and removal actions.
- API keys are now stored in the macOS Keychain via the `keyring` crate. `agent.json`
  no longer holds secrets, and existing plaintext keys migrate automatically.
- The agent config file was renamed `ai.json` → `agent.json`; an existing `ai.json`
  is migrated automatically on first run.
- Editor gains selection, range-replace, and set-text APIs to support AI apply / insert.
- The command palette is now **`⌘K` only**; `⌘P` is the View ▸ Show/Hide Preview toggle.
- New app icon (the "roomy" MDflow mark); new activity-bar icons for the AI panel,
  Excalidraw, and Mindmap.

### Fixed

- Mindmap parent-child connectors remain visible across themes, and central-node
  connectors now start at the node border instead of crossing the text.
- Mindmap nodes can be dragged to reorder siblings or reparent them.
- Markdown and HTML can once again show editor and preview simultaneously.
- Mindmap Save is available directly from the board toolbar.
- Agent `command` providers (e.g. `pi`, `opencode`) failed from the packaged app with
  "No such file or directory" — MDflow now resolves the login-shell `PATH` so
  Homebrew/npm-installed CLIs are found.
- The Agent settings "Add local/API model" button could sit below the panel fold; the
  provider list now scrolls so the button stays visible.
- File ▸ Open Folder (and other menu actions) and Check for Updates no longer fire in
  every open window — menu events route to the focused window only.
- Check for Updates worked only in the primary window (secondary windows hit an ACL
  error); the updater capability now covers all windows.
- The Terminal tab failed with "command not found" — it now launches through the login
  shell so `PATH` (and aliases) resolve.
- "Close Others" on many tabs no longer freezes; tabs close in a single render.
- The preview no longer keeps a wide right margin; it fills the pane (Page Guide
  soft-wrap centers it into a readable column).

### Notes

- Export requires `pandoc` and `typst` on the system (`brew install pandoc typst`);
  they are located at runtime, not bundled.
- API keys are stored in the macOS Keychain, not in `agent.json`.

## [0.1.0] — 2026-06-19

### Added

- Initial lean core (M1): open/save `.md` / `.markdown` / `.txt`, CodeMirror 6 editor
  with markdown highlighting and soft-wrap, live markdown-it preview with syntax
  highlighting, split / editor-only / preview-only view modes, native menu bar, word
  count, and persisted view mode + zoom.
- File explorer with create / rename / duplicate / delete-to-trash, multi-document tabs,
  and session restore.
