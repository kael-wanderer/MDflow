# Changelog

All notable changes to MDflow are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

- The gear button now opens the in-app settings panel instead of directly opening
  `settings.json`.
- Agent settings now use two tabs: **CLI Agents** and **Models**, combining local and
  hosted HTTP providers with per-provider key and removal actions.
- API keys are now stored in the macOS Keychain via the `keyring` crate. `ai.json`
  no longer holds secrets, and existing plaintext keys migrate automatically.
- Editor gains selection, range-replace, and set-text APIs to support AI apply / insert.
- The command palette is now **`⌘K` only**; `⌘P` is the View ▸ Show/Hide Preview toggle.
- New app icon (the "roomy" MDflow mark); new activity-bar icons for the AI panel,
  Excalidraw, and Mindmap.

### Fixed

- Agent `command` providers (e.g. `pi`, `opencode`) failed from the packaged app with
  "No such file or directory" — MDflow now resolves the login-shell `PATH` so
  Homebrew/npm-installed CLIs are found.
- The Agent settings "Add local/API model" button could sit below the panel fold; the
  provider list now scrolls so the button stays visible.

### Notes

- Export requires `pandoc` and `typst` on the system (`brew install pandoc typst`);
  they are located at runtime, not bundled.
- API keys are stored in the macOS Keychain, not in `ai.json`.

## [0.1.0] — 2026-06-19

### Added

- Initial lean core (M1): open/save `.md` / `.markdown` / `.txt`, CodeMirror 6 editor
  with markdown highlighting and soft-wrap, live markdown-it preview with syntax
  highlighting, split / editor-only / preview-only view modes, native menu bar, word
  count, and persisted view mode + zoom.
- File explorer with create / rename / duplicate / delete-to-trash, multi-document tabs,
  and session restore.
