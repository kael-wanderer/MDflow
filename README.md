# MDflow

A fast, lightweight markdown editor for the desktop. Built with Tauri 2 + Rust,
CodeMirror 6, and markdown-it. MIT-licensed.

## Features (M1 — Lean Core)

- Open and save `.md`, `.markdown`, and `.txt` files
- CodeMirror 6 editor with markdown highlighting and soft-wrap
- Live preview (GitHub-style markdown + syntax-highlighted code)
- View modes: split, editor-only, preview-only
- Hotkeys: `Cmd+O` open · `Cmd+S` save · `Cmd+B` split · `Cmd+E` editor · `Cmd+P` preview
- Refined dark theme
- Window view-mode and zoom persistence

Auto-update arrives in M2.

## Development

```bash
npm install
npm approve-scripts esbuild fsevents   # one-time: allow native postinstalls
npm run tauri dev                       # run the app with hot reload
npm run test                            # unit tests (pure functions)
npm run tauri build                     # release bundle
```

## License

MIT — see [LICENSE](LICENSE). Bundled third-party libraries are listed in
[THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES).
