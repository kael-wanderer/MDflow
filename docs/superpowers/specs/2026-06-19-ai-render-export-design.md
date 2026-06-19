# AI Panel + Render + Export — Design Spec (Phases 6–7)

> Clean-room MIT. No Kaelio/mx/Vibery code, CSS, or names. Kaelio was read **only**
> as a behavior/tech reference (which libraries, what command shapes work); every
> line here is written fresh from that understanding, never copied.

## What problem does this solve?

MDflow is a capable editor/IDE shell but has (1) no AI assistance, (2) a stale
explorer icon, (3) no rich rendering (mermaid, math, raw HTML), (4) no PDF viewing,
and (5) no export. This spec covers all of it as one phased build so it can be
implemented in a single pass.

## What does success look like?

- Gear opens a small menu: **Editor Settings** (`settings.json`) and **AI Settings** (`ai.json`).
- A right-side **AI panel** (✦ button) with a **Chat** tab and a **Terminal** tab.
- Chat: doc/selection context, streamed replies, copy / insert-at-cursor / apply-as-diff.
- Terminal: an embedded terminal running a configured agent CLI interactively.
- Preview renders **mermaid** diagrams, **KaTeX** math, and **raw HTML**.
- `.pdf` files open in a read tab (pdf.js).
- Export the active document to **PDF** (pandoc + typst), **DOCX** (pandoc), **HTML**,
  and the rendered preview to **PNG / JPG**.
- The explorer activity-bar icon uses the new sidebar SVG.

## What's out of scope?

- Per-hunk diff acceptance (apply-as-diff is all-or-nothing in v1; diff is shown).
- Bundling pandoc/typst (user installs via `brew install pandoc typst`).
- Cloud sync of settings or chat history (chat history is in-memory per session).
- Provider auth UIs (keys/commands are edited as JSON in `ai.json`).

## Tech stack

Existing: Tauri 2 + Rust, vanilla TS, CodeMirror 6, markdown-it.

New JS deps: `mermaid`, `katex`, `pdfjs-dist`, `@xterm/xterm` + `@xterm/addon-fit`.
New Rust deps: `portable-pty` (embedded terminal).
External, user-installed (located, not bundled): `pandoc`, `typst`.

## Constraints

- Clean-room: Kaelio (`/Users/cong.bui/Kael/20-Projects/kaelio`) may be read as a
  behavior reference only. Reimplement fresh. Never copy code/CSS; no Kaelio/mx/Vibery names.
- Activity-bar order: **Explorer → Search → ✦ AI → Gear** (gear always last).
- Pure logic is TDD'd (diff, provider request/parse, settings, mermaid/html detection);
  UI, streaming, PTY, and export-via-binary are manual smoke.
- Small focused files, one responsibility each. New AI code lives under `src/ai/`.
- Test env is Node (no `document`); only non-DOM pure logic is unit-tested.

---

## Architecture overview

Six phases, ordered so each builds on the last and is independently shippable:

| Phase | Adds |
|---|---|
| A | Settings rework: gear menu, split `settings.json` + `ai.json`, Rust `get_ai_settings` |
| B | Explorer sidebar icon (SVG glyph) |
| C | AI panel: Chat (http/command providers) + Terminal (PTY) |
| D | Render: mermaid, KaTeX, raw HTML in preview |
| E | PDF reader (pdf.js) |
| F | Export: pandoc/typst (PDF/DOCX/HTML) + image (PNG/JPG) |

### Phase A — Settings rework

- Gear button opens a small popup menu (reuse the existing `contextmenu.ts`) with
  **Editor Settings** and **AI Settings**; each opens its file as an editor tab.
- New Rust `get_ai_settings(default: String) -> SettingsFile` (same shape as
  `get_settings`) creating `<app config dir>/ai.json` from a default template.
- `ai.json` shape:
  ```json
  {
    "providers": [
      { "id": "ollama", "label": "Ollama (local)", "type": "http",
        "baseUrl": "http://localhost:11434/v1", "model": "llama3", "key": "" },
      { "id": "lmstudio", "label": "LM Studio", "type": "http",
        "baseUrl": "http://localhost:1234/v1", "model": "local-model", "key": "" },
      { "id": "claude", "label": "Claude Code", "type": "command",
        "run": "claude -p {prompt}" },
      { "id": "codex", "label": "Codex", "type": "command", "run": "codex exec {prompt}" },
      { "id": "pi", "label": "Pi", "type": "command", "run": "pi {prompt}" }
    ],
    "terminals": [
      { "id": "claude-term", "label": "Claude Code", "run": "claude" },
      { "id": "codex-term", "label": "Codex", "run": "codex" }
    ],
    "defaultProvider": "ollama",
    "defaultTerminal": "claude-term"
  }
  ```
- `{prompt}` is substituted with the user's message + injected doc context. `key`
  (http) is sent as a bearer token when non-empty. **Keys are plaintext in `ai.json`**
  (app config dir, never in the repo) — documented as a known trade-off.

### Phase B — Explorer icon

- Extract the two `<path>` shapes from `images/sidebar-collapse-layout-toggle-nav-navbar.svg`
  into a new fill-based glyph (`viewBox 0 0 64 64`, `fill="currentColor"`), replacing
  the current stroke-based `glyphs.explorer`. The glyph wrapper supports both stroke
  and fill variants.

### Phase C — AI panel

Panel is a right-side column mirroring the explorer; ✦ activity-bar button toggles it;
visibility + width persist like the explorer. Two tabs:

| Unit | Responsibility | Tested |
|---|---|---|
| `ai/aisettings.ts` | `AISettings` type, `parseAISettings(raw)` (pure merge/validate), defaults JSON. | ✓ |
| `ai/providers.ts` | Pure per-type request builders + SSE/JSON parsers for `http`; `{prompt}` substitution for `command`. | ✓ |
| `ai/client.ts` | Runs http chat via `fetch` streaming; runs `command` providers via Rust `ai_run`. | manual |
| `ai/conversation.ts` | In-memory messages; builds context (active doc + selection priority). Pure helpers. | ✓ |
| `ai/diff.ts` | LCS line diff → hunks for apply-as-diff. Pure. | ✓ |
| `ai/terminal.ts` | xterm.js view bound to a Rust PTY session via events. | manual |
| `ai/panel.ts` | Panel shell: Chat/Terminal tabs, provider picker, input, render. | manual |
| Rust `ai.rs` | `ai_run(run, prompt) -> stream` (spawn `command` provider, emit chunks); PTY commands `pty_open/pty_write/pty_resize/pty_kill` emitting `pty-data`. | manual |
| `editor.ts` (extend) | `getSelection()`, `replaceRange(from,to,text)`, `setText(text)` for apply/insert. | — |

Chat flow: pick provider → type → `conversation` builds messages with doc/selection
context → http (`fetch` stream) or command (`ai_run` subprocess) → render live →
actions **Copy / Insert at cursor / Apply** (Apply shows `diff.ts` result, accept
replaces doc/selection, reject discards).

Terminal flow: pick terminal entry → `pty_open(run)` → xterm I/O over `pty-data` /
`pty_write`; resize on layout change; killed on panel close. The agent edits files
directly; the existing focus-refresh reloads the tree/preview.

### Phase D — Render

Extend `preview.ts` (or add `preview-plugins.ts`):
- Raw HTML: construct markdown-it with `html: true`.
- mermaid: detect ```mermaid fenced blocks, render to SVG with `mermaid.render` after
  the preview HTML is injected (async, per code block). Pure helper `extractMermaidBlocks`.
- KaTeX: render `$...$` (inline) and `$$...$$` (display) via a markdown-it rule +
  `katex.renderToString`. Pure helper for delimiter scanning.

### Phase E — PDF reader

- `.pdf` opened from the explorer routes to a PDF view instead of the text editor:
  `pdfview.ts` renders pages to canvases via `pdfjs-dist`. The window treats it as a
  read-only tab (no editor state). `openInWindow` learns a `kind: "pdf"` tab.

### Phase F — Export

- Rust `export.rs`: `find_pandoc()` / `find_typst()` (Homebrew paths then PATH);
  `export_pdf(markdown, out)` (pandoc `--pdf-engine=typst`, markdown input format
  `markdown+task_lists+pipe_tables+grid_tables+...`), `export_docx(markdown, out)`,
  `export_html(markdown, out)`. Clear "install with brew" errors when missing.
- Frontend: File ▸ Export ▸ PDF / DOCX / HTML / PNG / JPG (native menu + palette
  commands). PNG/JPG capture the rendered preview to a canvas and save via the dialog.

## Data flow

1. Gear → menu → open `settings.json` or `ai.json`.
2. ✦ → AI panel. Chat: provider → stream → actions. Terminal: PTY session in xterm.
3. Preview render pipeline now post-processes mermaid + KaTeX and allows raw HTML.
4. Open `.pdf` → pdf.js view. Export → pandoc/typst (PDF/DOCX/HTML) or canvas (PNG/JPG).

## Error handling

- Missing provider key/command → inline chat notice. http/subprocess error → error bubble.
- Missing pandoc/typst → modal with the exact brew install command.
- Malformed `ai.json` → defaults (never throws); file is visibly open to fix.
- mermaid/KaTeX render error → show the error text in place of the diagram/formula, not a crash.

## Testing

- **TDD (pure):** `aisettings.parseAISettings`; `providers` (http request shape, SSE/JSON
  parse, `{prompt}` substitution); `conversation` (context + selection priority);
  `diff` (line LCS add/remove/replace); mermaid block extraction; KaTeX delimiter scan.
- **Manual smoke:** chat stream (http + command), apply-as-diff, terminal session,
  mermaid + math + HTML render, open a PDF, export each format.

## Deliverables

- [ ] Code (settings rework, icon, AI panel, render, pdf reader, export)
- [ ] Unit tests (settings, providers, conversation, diff, render helpers)
- [ ] Manual smoke recorded
- [ ] `CLAUDE.md` updated (new files, ai.json, pandoc/typst prerequisite)
