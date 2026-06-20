# MDflow

A fast, lightweight markdown editor built with Tauri 2 + Rust and a plain-TypeScript
frontend. MDflow is an IDE-style workspace for markdown: a file explorer, split
windows, a command palette, rich preview (mermaid, math, raw HTML), a built-in AI
panel, a PDF reader, and document export.

**License:** MIT · **Identifier:** `com.kael.mdflow`

> Clean-room, independent project. Written from scratch; not derived from any
> GPL-licensed editor.

## Features

- **Editor** — CodeMirror 6 with markdown highlighting, soft-wrap, line numbers, and
  per-document undo. Live preview with a 300 ms debounce and word count.
- **Workspace shell** — activity bar, toggleable file explorer with full CRUD
  (create, rename, duplicate, delete-to-trash, reveal in Finder), and resizable panels.
- **Split windows** — a Main and an optional Sub window, each with its own tabs and
  view mode (Editor / Read / Split).
- **Tabs** — multi-document tabs with dirty markers, pinning, and right-click actions
  (split, move between windows, close variants, copy paths).
- **Command palette** — `⌘K` / `⌘P` to fuzzy-find files or run commands.
- **Compare** — select two files and view a side-by-side diff.
- **Rich preview** — [mermaid](https://mermaid.js.org) diagrams, [KaTeX](https://katex.org)
  math (`$…$`, `$$…$$`), and raw HTML.
- **PDF reader** — open `.pdf` files rendered with pdf.js.
- **AI panel** — a right-side assistant with a **Chat** tab (provider + permission-mode
  selectors, document/selection context, streamed replies, copy / insert-at-cursor /
  apply-as-diff) and a **Terminal** tab (an embedded terminal running an agent CLI).
- **Settings** — an in-app panel (Theme, Font, Size, Session, Agent) plus raw
  `settings.json` / `ai.json` for advanced edits.
- **Themes** — System, Light, Dark, Catppuccin Mocha, Everforest Dark, Nord — recoloring
  the whole UI including editor syntax.
- **Export** — PDF and DOCX via pandoc (+ typst for PDF), HTML, and PNG / JPG of the
  rendered preview.
- **Zoom** — editor zoom in / out, persisted.

## Requirements

- **Node.js** and **Rust** (stable) with the Tauri 2 prerequisites for your platform.
- **Export only:** [pandoc](https://pandoc.org) and [typst](https://typst.app) —
  install with `brew install pandoc typst`. They are located at runtime, not bundled.
- **AI:** a local OpenAI-compatible server (e.g. [Ollama](https://ollama.com) or
  LM Studio) and/or an agent CLI (Claude Code, Codex, Pi) on your `PATH`.

## Getting started

```bash
npm install
npm approve-scripts esbuild fsevents   # one-time: allow native postinstalls
npm run tauri dev                      # run the desktop app (hot reload)
```

### Build a release bundle

```bash
npm run tauri build
```

### Tests & checks

```bash
npm run test                 # Vitest unit tests (pure functions)
npm run build                # type-check + Vite production build
cd src-tauri && cargo test   # Rust unit tests
cd src-tauri && cargo check  # fast backend compile-check
```

## Configuring the AI panel

AI providers are configured in `ai.json` (in the app config directory; open it from the
gear menu → **Open ai.json**). Each provider is one of:

- `http` — an OpenAI-compatible endpoint: `{ "type": "http", "baseUrl": "http://localhost:11434/v1", "model": "llama3", "key": "" }`
- `command` — a headless agent CLI: `{ "type": "command", "run": "claude -p {prompt}" }`
  (`{prompt}` is replaced with your message plus document context). An optional
  `bypassRun` is used when **Bypass approvals** mode is selected.

`terminals` entries define interactive commands for the Terminal tab.

> **Security note:** API keys in `ai.json` are stored in **plaintext** in the app config
> directory (never in this repository). OS-keychain storage is a planned improvement.

## Architecture

Tauri 2 + Rust native shell; plain-TypeScript frontend (no framework) wired by a thin
`main.ts`, with one responsibility per file. Pure logic (fuzzy match, settings parsing,
diff, provider request/parse) is unit-tested; UI, streaming, PTY, and binary-export
paths are manually smoke-tested.

```
src/
  main.ts          bootstrap + wiring + hotkeys + preview debounce
  editor.ts        CodeMirror 6 (multi-document, selection/replace API)
  preview.ts       markdown-it pipeline (+ KaTeX rule, raw HTML)
  render-extras.ts mermaid + KaTeX post-processing
  windowview.ts    per-window component (tabs, toolbar, panes, status)
  explorer.ts      file tree + context menus + CRUD
  palette.ts       ⌘K command/file overlay
  settingspanel.ts in-app settings panel
  settings.ts      settings.json model (themes, fonts, sizes, session)
  compareview.ts   side-by-side diff surface
  pdfview.ts       pdf.js viewer
  ai/              AI panel: aisettings, providers, client, conversation, diff,
                   terminal, panel
src-tauri/src/
  lib.rs           Tauri builder: command registry + plugins
  files.rs         file IPC, settings/ai-settings files, recursive walk
  ai.rs            command-provider streaming
  pty.rs           embedded-terminal PTY
  export.rs        pandoc/typst export
  menu.rs          native menu bar
```

See `docs/` for the full spec, plans, and design notes.

## License

MIT — see [LICENSE](LICENSE). Bundled third-party libraries are listed in
[THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES).
