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
