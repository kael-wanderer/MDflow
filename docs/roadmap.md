# MDflow — Roadmap / Deferred

Running list of intentionally-deferred work so it isn't forgotten. Newest first.
For the live task tracker see `docs/tasks.md`.

## Deferred

### Search PDF text content
Folder content search (Find in Folder, ⌘⇧F) currently covers text files and the
text inside `.mind` / `.excalidraw` drawings. **PDF text is not searched.**
- Needs per-page text extraction (PDF.js is already a dependency for the viewer).
- Likely a separate code path: extract text per page, search, and map hits back to
  a page number rather than a line number.
- Result rows would open the PDF at the matching page (viewer page jump needed).

### Vision / image input for HTTP models
File attachments (#4) send images/PDFs to **CLI agents** as file paths (they read
them via their own tools). **HTTP models** (Models tab, e.g. a local gemma) only
get text-file contents inlined; images/PDFs are skipped with a note.
- To support vision: send images as multimodal content blocks (OpenAI-style
  `content: [{type:"image_url", image_url:{url:"data:...base64"}}]`).
- Requires widening `ChatMessage.content` to a string-or-parts union and updating
  `buildHttpBody` / `conversation.ts` / `client.ts`.
- Only useful if the selected HTTP model actually supports vision.

### Terminal theme live-update
The embedded terminal reads the MDflow theme (foreground/cursor/selection) at
launch. Changing the app theme while a terminal is open does not recolor it until
the terminal is reopened. Could expose `terminal.setTheme()` and re-apply on theme
change.

## Release / CI

### GitHub Actions release pipeline
On a version tag push, build installers for each platform and publish a GitHub
Release with a Tauri updater feed. (Reference behavior only from the Kaelio
release workflow — write fresh, do not copy.)

Plan:
- Trigger on tags matching `v*` (e.g. `v0.2.0`); `permissions: contents: write`.
- Matrix build: macOS (`universal-apple-darwin`), Windows (`x86_64-pc-windows-msvc`),
  Linux (`x86_64-unknown-linux-gnu`). Steps: checkout, setup Node, Rust toolchain
  (add both Apple arch targets for the universal build), Linux deps
  (`libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`),
  `npm ci`, `npx tauri build --target <target>`, upload the `bundle/` artifacts.
- Sign with `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` from
  repo secrets (keep the private key only in CI; the public key lives in
  `tauri.conf.json`).
- Release job: download artifacts, collect installers (.dmg / .msi / -setup.exe /
  .deb / .rpm / .AppImage) and the updater bundles + `.sig` files, generate
  `latest.json` (version, pub_date, per-platform `{ signature, url }`), and
  `gh release create <tag>` with notes pulled from `CHANGELOG.md`.
- Point the updater endpoint in `tauri.conf.json` at the published `latest.json` so
  Check for Updates works in shipped builds. (Closes the "production updater feed"
  item in `docs/tasks.md`.)
- Prereqs: create the GitHub repo + remote and push; generate the Tauri signing
  keypair (`npx tauri signer generate`); add the secrets.

## Feature ideas (from 2026-06-21 review)

Not committed — candidates, roughly priority-ordered.

- **Keymap conflict warning** — the Keys editor lets two commands bind the same
  accelerator silently; warn on collision.
- **AI: cancel in-flight request** — no way to stop a streaming reply mid-flight.
- **AI: conversation persistence** — chat history is in-memory and lost on restart
  (and is per native window).
- **Terminal: handle process exit** — after `[process exited]` the pane is dead;
  offer restart / auto-relaunch.
- **Search: case-sensitive / whole-word / regex toggles** + highlight the matched
  substring in result snippets + per-file match counts (currently plain
  case-insensitive substring).
- **Editor: table insert + task-list (checkbox) toolbar buttons.**
- **In-file outline / heading jump** (palette-style symbol navigation).
- **Open Recent** files/folders menu.
- **Export: preflight check** for `pandoc` / `typst` with a friendly install prompt
  instead of a runtime error.
- **Cleanup (later):** remove the `ai.json → agent.json` migration shim a few
  releases after it ships.
