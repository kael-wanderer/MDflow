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
- **Configurable AI providers** via `ai.json`: `http` (OpenAI-compatible local servers
  such as Ollama and LM Studio) and `command` (headless agent CLIs — Claude Code,
  Codex, Pi — with optional `bypassRun`).
- **Command palette** (`⌘K` / `⌘P`) for fuzzy file quick-open and running commands;
  a Search button in the activity bar.
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
- Editor gains selection, range-replace, and set-text APIs to support AI apply / insert.

### Notes

- Export requires `pandoc` and `typst` on the system (`brew install pandoc typst`);
  they are located at runtime, not bundled.
- API keys in `ai.json` are stored in plaintext in the app config directory; OS-keychain
  storage is planned.

## [0.1.0] — 2026-06-19

### Added

- Initial lean core (M1): open/save `.md` / `.markdown` / `.txt`, CodeMirror 6 editor
  with markdown highlighting and soft-wrap, live markdown-it preview with syntax
  highlighting, split / editor-only / preview-only view modes, native menu bar, word
  count, and persisted view mode + zoom.
- File explorer with create / rename / duplicate / delete-to-trash, multi-document tabs,
  and session restore.
