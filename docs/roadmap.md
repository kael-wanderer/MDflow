# MDflow — Roadmap

The full picture: where MDflow has been and where it's going. Shipped work is
marked **done**; planned/deferred work is at the bottom. For the live task tracker
see `docs/tasks.md`; for release notes see `CHANGELOG.md`.

Legend: ✅ done · 🔜 planned/deferred

---

## Stage 0 — Foundation (M1 lean core) ✅

- ✅ Open/save `.md` / `.markdown` / `.txt`
- ✅ CodeMirror 6 editor with markdown highlighting and soft-wrap
- ✅ Live markdown-it preview with syntax highlighting
- ✅ Split / Editor-only / Preview-only view modes
- ✅ Native menu bar, word count, persisted view mode + zoom

## Stage 1 — Workspace shell ✅

- ✅ **Phase 1** — activity bar, collapsible/resizable Explorer, lazy directory
  tree, file-type icons, click-to-open, session persistence
- ✅ **Phase 2** — inline create/rename, Trash-backed delete, duplicate, Copy Path,
  Reveal in Finder, context menus, refresh-on-focus
- ✅ **Phase 3** — multiple tabs, per-document editor state + undo, dirty tracking,
  confirmed close, session restoration
- ✅ **Phase 4** — per-window toolbar + line numbers; the Sub document pane with
  independent tabs/view modes and a splitter; icon toolbar, per-window status
  lines, colored file icons, Explorer header actions, File ▸ Open Folder
- ✅ **Phase 5** — ⌘K command/file palette, Search/Gear activity controls,
  `settings.json`, layered settings UI, themes, per-zone typography,
  restore-session control

## Stage 2 — Rich documents & export ✅

- ✅ **Phases 6–7** — Mermaid + KaTeX + raw-HTML preview pipeline
- ✅ PDF reader (pdf.js)
- ✅ Document-aware export: PDF/DOCX (Pandoc + Typst), HTML, PNG/JPG
- ✅ **M10** — Excalidraw boards (`.excalidraw`, isolated React runtime)
- ✅ **M11** — jsMind mindmaps (`.mind`) with on-board toolbar, per-node shape /
  color / size / bold, drag-to-reparent, theme-aware connectors

## Stage 3 — AI & agents ✅

- ✅ AI panel with **Chat** (provider + permission mode, doc/selection context,
  streamed replies, Copy / Insert / Apply-as-diff) and **Terminal** (embedded
  xterm.js + Rust PTY) tabs
- ✅ Configurable providers: `http` (OpenAI-compatible) and `command` (CLI agents:
  Claude Code, Codex, OpenCode, Pi) with optional `bypassRun`
- ✅ Settings split into **CLI Agents** and **Models** tabs; inline editing of CLI
  agents; login-shell PATH resolution so packaged agents run
- ✅ API keys in the macOS Keychain (never on disk); legacy plaintext keys migrate

## Stage 4 — Updates & multi-window ✅

- ✅ **M2** updater client: manual checks + once-daily auto, always-confirm install
- ✅ **M9** editing affordances (selection / range-replace / set-text APIs)
- ✅ Native multi-window (View/Dock ▸ New Window); focused-window menu routing;
  Finder-open queue; window tiling and full screen

## Stage 5 — Power-user polish (2026-06-21) ✅

- ✅ Menu-bar rebuild; soft-wrap modes (off / window / page-guide); New Window in
  the File menu; window-scoped menu + open-path events
- ✅ **Customizable keyboard shortcuts** — registry + Keys settings tab (record /
  reset / Restore Defaults), applied to native menu and app shortcuts
- ✅ **Search** — in-editor find (⌘F) and **Find in Folder** (⌘⇧F) across text files
  and `.mind` / `.excalidraw` text; results grouped, click-to-line
- ✅ **AI file attachments** — 📎 picker, drag-drop, and `@`-mention; CLI agents get
  paths + run in the open folder; HTTP models get text-file contents inlined
- ✅ **Terminal upgrades** — live picker, Terminals editor (add/edit/remove +
  default), font/size, theme-derived colors, default Shell (zsh) entry, login-shell
  launch so `PATH`/aliases resolve
- ✅ Enter-to-send (Shift+Enter newline); inline CLI-agent edit
- ✅ Config rename `ai.json` → `agent.json` (auto-migrated)
- ✅ Fixes: updater ACL in secondary windows, Close-Others freeze, preview right
  margin, mindmap zoom

---

## Stage 6 — Release & distribution 🔜

- 🔜 **GitHub Actions release pipeline** (`.github/workflows/release.yml` drafted).
  On a `v*` tag: matrix build (macOS universal / Windows / Linux), signed Tauri
  bundles, collect installers + updater `.sig`, generate `latest.json`, and
  `gh release create` with notes from `CHANGELOG.md`. Prereqs: create the repo +
  remote and push; `npx tauri signer generate`; add `TAURI_SIGNING_PRIVATE_KEY*`
  secrets; set `bundle.createUpdaterArtifacts`, `plugins.updater.pubkey`, and the
  `latest.json` endpoint in `tauri.conf.json`.
- 🔜 Native GUI smoke test of the whole branch, then merge `menu-bar-rebuild` → main.

## Stage 7 — Planned features 🔜

### Search PDF text content 🔜
Find in Folder skips PDFs. Needs per-page text extraction (pdf.js), mapping hits to
a page number, and opening the PDF at that page.

### Vision / image input for HTTP models 🔜
CLI agents already read attached images/PDFs (via file paths). HTTP models only get
text inlined. To add vision: send images as multimodal content blocks and widen
`ChatMessage.content` to a string-or-parts union (`buildHttpBody` / `conversation.ts`
/ `client.ts`). Only useful with a vision-capable model.

### Terminal theme live-update 🔜
The terminal reads theme colors at launch; switching theme with a terminal open
doesn't recolor it until reopened. Expose `terminal.setTheme()` and re-apply.

### Smaller feature ideas (from 2026-06-21 review) 🔜
Roughly priority-ordered, not yet committed:

- Keymap **conflict warning** (two commands can bind the same keys silently)
- AI: **cancel** an in-flight streaming reply
- AI: **conversation persistence** (history is in-memory, per native window)
- Terminal: handle **process exit** (restart / auto-relaunch instead of dead pane)
- Search: **case-sensitive / whole-word / regex** toggles, snippet match highlight,
  per-file match counts
- Editor: **table insert** + **task-list (checkbox)** toolbar buttons
- **In-file outline / heading jump** (palette-style symbol navigation)
- **Open Recent** files/folders
- Export: **preflight check** for `pandoc` / `typst` with a friendly install prompt
- Cleanup: remove the `ai.json → agent.json` migration shim a few releases on
