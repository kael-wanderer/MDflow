# AI + Render + Export Smoke — 2026-06-19

Environment: macOS, Tauri development build, Pandoc and Typst installed through
Homebrew.

## Automated

- PASS — `npm run test`: 15 files, 58 tests.
- PASS — `npm run build`: production build completes without the chunk-size warning.
  Startup JS is about 330 kB; terminal, PDF.js, and Mermaid are lazy chunks.
- PASS — `cargo test`: 7 tests.
- PASS — `cargo check`.
- PASS — `npm run tauri build`: `.app` and Apple Silicon `.dmg` produced.

## Native GUI

- PASS — Gear opens a two-item menu; AI Settings opens the generated `ai.json`.
- PASS — Activity order is Explorer, Search, AI, Settings; Explorer uses the new
  sidebar glyph.
- PASS — AI panel toggles, resizes the editor correctly, and remained visible after
  native relaunch.
- PASS — Command-provider chat streamed `STREAM_OK` from the configured Claude CLI;
  Copy and Insert-at-cursor actions were rendered.
- PARTIAL — HTTP provider request reached the UI but LM Studio returned `Load failed`
  from the WebView fetch path (server CORS/configuration dependent). Command-provider
  streaming is verified.
- PASS — Terminal tab launched the configured interactive CLI in xterm over the
  native PTY.
- PASS — Preview rendered inline/display KaTeX, raw HTML, and a Mermaid flowchart.
- PASS — A generated PDF opened and rendered through PDF.js after switching file
  loading to native byte IPC.
- PASS — Real Pandoc/Typst smoke outputs were generated and identified as PDF 1.7,
  Microsoft Word 2007+, and standalone HTML.
- NOT AUTOMATED — Edit-mode Accept/Reject and native PNG/JPG save dialogs still need
  a quick human click-through; their pure diff logic and build paths pass automated
  checks.

Temporary AI-provider changes made for the smoke run were restored afterward.
