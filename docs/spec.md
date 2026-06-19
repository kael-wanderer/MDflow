# MDflow — Spec

> A fast, lightweight markdown editor. Clean-room rewrite, MIT-licensed, built on
> Tauri 2 + Rust. Uses Kaelio only as a feature reference — never copies its code.

## What problem does this solve?

I want a markdown reader/editor that is **fully my own** — written from scratch,
MIT-licensed, with no GPL obligations and no attribution to any prior author. It
should match the capabilities I already rely on in Kaelio (live preview, diagrams,
math, PDF view/export, git sync, auto-update) but with a cleaner, more modular
codebase and a refined UI, built incrementally so there is always something usable.

## What does success look like?

- A standalone desktop app named **MDflow** that I own outright under **MIT**.
- No code, CSS, names, or attribution inherited from Kaelio / mx / Vibery Studio.
- A genuinely usable editor shipped early (Milestone 1), then grown feature by feature.
- Built-in **auto-update** working early (Milestone 2) — "detect new version, update
  from the app."
- A modular codebase I can reason about, not a single 5,000-line file.

## What's out of scope?

- Reusing or porting Kaelio's source code or stylesheets (legal independence depends
  on this).
- Bundling Pandoc (resolved from the system, same as Kaelio).
- A mobile/web version. Desktop only (macOS first, Windows/Linux via the same CI later).
- Multi-user / sync-server features. This is a local single-user tool.

## Tech stack

- **Shell / native:** Tauri 2 + Rust
- **Editor:** CodeMirror 6 (MIT)
- **Markdown:** markdown-it (MIT)
- **Math:** KaTeX (MIT) — later milestone
- **Diagrams:** Mermaid (MIT) — later milestone
- **PDF view:** pdf.js (Apache-2.0) — later milestone
- **Git:** git2 crate (MIT/Apache) — later milestone
- **Export:** Pandoc (external, system-resolved) + html-to-image/jsPDF — later milestone
- **Auto-update:** Tauri updater plugin (MIT/Apache)
- **Build:** Vite + TypeScript

All libraries are permissively licensed and reused directly. Their license notices
are collected in a `THIRD-PARTY-NOTICES` file (MIT/Apache requirement — normal).

## Constraints

### Legal / clean-room rules (the core purpose of this project)

- **New repo, fresh git history.** Not a clone or fork of Kaelio.
- **MIT LICENSE.** No GPL anywhere.
- **No name of mx / Vibery Studio / Kaelio** in source, UI, or docs.
- **Do not copy Kaelio's code or CSS.** Kaelio may be read to learn *what* a feature
  does and *how it behaves*, then a fresh implementation is written. This is what
  preserves legal independence.
- New Tauri identifier `com.kael.mdflow`, new product name, new icon.

### Engineering constraints (from my working style)

- Keep it simple. No premature abstraction. No over-engineering.
- Small, focused files — one responsibility each (explicit reaction to Kaelio's
  monolithic `main.ts`).
- Validate only at boundaries (file IO, user input).
- Solo developer — favor low-risk, incremental, always-shippable steps.

## Architecture

Modular from day one.

```
src/
  main.ts      # thin bootstrap + wiring only
  editor.ts    # CodeMirror 6 setup (state, keymaps, soft-wrap)
  preview.ts   # markdown-it render pipeline
  views.ts     # split / editor / preview layout + view-mode switching
  files.ts     # open/save via Tauri IPC
  state.ts     # current file, view mode, zoom — persisted to localStorage
  styles.css   # fresh refined dark theme (CSS variables)
src-tauri/src/
  lib.rs       # register Tauri commands, app setup, updater plugin
  files.rs     # read_file, save_file, get_initial_file, word_count
```

### Data flow

1. Editor content changes → 300 ms debounce → `preview.ts` renders via markdown-it →
   preview pane updates.
2. `Cmd+S` → `files.ts` → IPC `save_file`.
3. `Cmd+O` → native dialog → IPC `read_file` → load into editor.
4. View mode + zoom persisted in `localStorage`.

### Error handling

- File IO errors surfaced as a non-blocking toast; never crash the window.
- Missing/locked file on open → friendly message, keep current document.
- Validate only at the IPC boundary (path exists, readable/writable).

## UI direction

"Refined / cleaner" relative to Kaelio: same 3-pane mental model (editor | preview,
with split/editor/preview modes), but a fresh palette, more minimal chrome, and
deliberate spacing/typography. CSS is written fresh (also required for legal
independence). The actual visual design is done at the M1 `styles.css` step using
the `ui-ux-pro-max` / `frontend-design` skills against the running app — not designed
in a vacuum beforehand.

## Roadmap (each milestone = its own spec → plan → build cycle)

- **M1 — Lean core:** open/save `.md`/`.markdown`/`.txt`, CodeMirror 6 editor (md
  highlighting, soft-wrap), live markdown-it preview (GFM + code highlighting), view
  modes (split/editor/preview), hotkeys (`Cmd+O/S/P/E/B`), refined dark theme,
  window/zoom persistence. **Tauri updater plugin wired in but dormant.**
- **M2 — Auto-update (must-have early):** activate Tauri updater + signed release feed
  (GitHub Releases + `latest.json`), code signing, update-available prompt in-app.
- **M3 — File explorer + session:** sidebar folder tree, tabs, reopen-last-files.
- **M4 — Signature render:** Mermaid diagrams, KaTeX math, Obsidian-style callouts,
  interactive checklists, YAML frontmatter.
- **M5 — Git sync:** repo status, auto-commit/push on save, conflict resolution.
- **M6 — PDF viewing:** pdf.js viewer (view/select/search/extract) + highlight
  annotations to a JSON sidecar.
- **M7 — Export:** Pandoc Markdown→PDF/DOCX (system-resolved) + HTML→PNG/JPG/PDF
  capture.
- **M8 — Snapshots / version history.**

Milestone order after M2 may be resequenced as priorities shift; M1 and M2 are fixed.

## Testing

- Manual smoke test per milestone, recorded in that milestone's notes.
- Optionally add Vitest later for pure functions (render pipeline, path/util helpers).
- No heavyweight test framework for the MVP — matches solo workflow.

## Deliverables

- [ ] Code (modular Tauri 2 app)
- [ ] GitHub README (MDflow, MIT)
- [ ] `THIRD-PARTY-NOTICES` for bundled libraries
- [ ] Test plan (per-milestone smoke tests)
- [ ] Release / auto-update notes (M2)
