# MDflow - Review & Smoke Test

Date: 2026-06-19

## M1 automated checks

- `npm run test` → **15 passed** across preview, state, tree operations, and icons.
- `cd src-tauri && cargo test` → **2 passed** (`count_words`, `list_dir`).
- `npm run build` (tsc + vite) → clean.
- `cargo check` → clean.
- `npm run tauri dev` → app compiles and launches with no panic.

## M1 manual GUI checklist

The app is launched via `npm run tauri dev`. Run through:

- [ ] Open a `.md` file (menu File ▸ Open File / `⌘O`) — content loads in editor + preview.
- [ ] Open a `.markdown` and a `.txt` file the same way.
- [ ] Type in the editor — preview updates after ~300 ms; word count updates in status bar.
- [ ] `New File` (`⌘N`) clears to an empty Untitled document.
- [ ] `Save` (`⌘S`) on a new doc opens Save-As; on an existing doc writes in place.
- [ ] `Save As…` (`⌘⇧S`) writes a copy to a chosen path; status bar path updates.
- [ ] GFM renders: table, **bold**, ~~strikethrough~~, bare-URL autolink, fenced code highlighting.
- [ ] View modes: `Split` (`⌘B`), `Editor` (`⌘E`), `Read` (`⌘P`) via View menu + accelerators.
- [ ] `Soft Wrap` toggle (View menu) wraps/unwraps long lines; checkmark reflects state.
- [ ] Quit and relaunch — last view mode + soft-wrap state persist.
- [ ] "Open With MDflow" / launching with a file path argument loads that file on start.
- [ ] Preview does not execute raw HTML (e.g. a `<script>` in the markdown does nothing).
- [ ] Help ▸ MDflow Help opens the bundled HELP.md in the editor + preview.
- [ ] MDflow ▸ About shows the app name **and version** (0.1.0).

## Shell Phase 1 checks

### Verified

- [x] Activity bar and explorer render beside the existing editor and preview.
- [x] Explorer empty state renders when no folder is selected.
- [x] Explorer button toggles the panel and its pressed state.
- [x] Explorer width drags from 240px to 312px and restores after reload.
- [x] Production build, frontend tests, Rust tests, and `cargo check` pass.
- [x] Native Tauri development build compiles and launches.

### Native GUI checklist

The remaining checks require interaction with the native folder dialog and desktop
window:

- [ ] Open Folder loads a tree with directories first and case-insensitive sorting.
- [ ] Expanding a folder lazy-loads one level; collapsing and re-expanding uses the
  cached children.
- [ ] Markdown, text, JSON, HTML, PDF, folder, and generic file icons render.
- [ ] Clicking a text file replaces the current document and updates preview, path,
  and word count.
- [ ] Existing M1 commands still work after opening from Explorer: save, Split,
  Editor, Read, and Soft Wrap.
- [ ] Quit and relaunch restores folder, Explorer visibility, and Explorer width.

## Notes

- Updater plugin is **installed but dormant** (dependency + capability present, not
  registered at runtime). M2 registers it and adds `plugins.updater` config.
- App icon is the temporary logo from `images/logo.png`.
- Unsigned dev/build app is blocked by macOS Gatekeeper — `xattr -dr
  com.apple.quarantine "/Applications/MDflow.app"` or right-click ▸ Open. Signing is M2.
