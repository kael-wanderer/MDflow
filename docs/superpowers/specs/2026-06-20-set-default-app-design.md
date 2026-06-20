# Set MDflow as Default App (macOS) Design

Date: 2026-06-20
Status: Draft — under review.

## What problem does this solve?

The "MDflow ▸ Set MDflow as Default ▸ As Markdown Editor / As PDF Reader" menu only
shows an informational dialog. Making it real requires declaring the document types
MDflow handles and calling the macOS API to register it as the default handler.

## What does success look like?

- MDflow declares it can open Markdown (`.md`, `.markdown`, `.txt`) and PDF (`.pdf`).
- The menu items actually set MDflow as the default app for those types (or open
  System Settings if the OS requires user confirmation), instead of a static message.
- Double-clicking a `.md`/`.pdf` in Finder opens it in MDflow once it is the default.

## Out of scope

- Windows/Linux default-handler registration (macOS only for now).
- Per-extension granularity beyond the two groups above.

## Design

### 1. Declare document types

In `src-tauri/tauri.conf.json` (and/or `Info.plist`), declare
`CFBundleDocumentTypes` (and exported/imported UTIs as needed) for:
- Markdown/plain text: `public.plain-text` + a Markdown UTI (`net.daringfireball.markdown`).
- PDF: `com.adobe.pdf` (viewer role).

This makes macOS list MDflow under "Open With" and allows it to become a default.

### 2. Open-file events

Handle files passed by the OS on launch / while running: in `lib.rs`, listen for
Tauri's file-open event (`RunEvent::Opened { urls }`) and route each path to the
frontend to open in a tab (reusing the existing open flow).

### 3. Set-default command

Add a Rust command `set_default_handler(role: "markdown" | "pdf")` that calls
`LSSetDefaultRoleHandlerForContentType` (via the `core-services` / `objc2` bindings)
with MDflow's bundle id (`com.kael.mdflow`) for each UTI in the group. On platforms or
OS versions where this is restricted, fall back to opening the relevant System Settings
pane and showing a short instruction.

### 4. Wire the menu

Replace the informational dialog handlers (`default.markdown`, `default.pdf` in
`main.ts`) with calls that invoke `set_default_handler`, then confirm success (or show
the fallback instruction).

## Error handling

- API failure / sandbox restriction → friendly message + System Settings fallback;
  never crash.
- Unknown/unbuilt bundle id (dev build) → explain it works in a packaged build.

## Testing

- Manual (append to `docs/test-cases/15-updater-default.md`): set MDflow as default for
  Markdown, then double-click a `.md` in Finder → opens in MDflow; same for PDF; the
  fallback path shows System Settings when the API declines.
- Rust: `cargo check`/`cargo test` for the command's argument handling (the OS call
  itself is verified manually in a packaged build).

## Open questions for the plan

- Exact crate for `LSSetDefaultRoleHandlerForContentType` (e.g. `core-foundation` +
  `core-services` or `objc2-*`); confirm during implementation.
- Whether a Markdown UTI must be *exported* by MDflow or can reference an existing
  system UTI.

## Deliverables

- [ ] Document-type declarations (md/txt/pdf)
- [ ] OS open-file event handling → open in a tab
- [ ] `set_default_handler` command + menu wiring + fallback
- [ ] Docs/test-cases updated
