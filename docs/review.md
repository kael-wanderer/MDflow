# MDflow M1 — Review & Smoke Test

Date: 2026-06-19 · Branch: `m1-lean-core`

## Automated (verified)

- `npm run test` → **9 passed** (state persistence ×4, render pipeline ×5).
- `cd src-tauri && cargo test` → **1 passed** (`count_words`).
- `npm run build` (tsc + vite) → clean.
- `cargo check` → clean.
- `npm run tauri dev` → app compiles and launches with **no panic** (caught and
  fixed a dormant-updater startup panic during this pass).

## Manual GUI checklist (verify in the running window)

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

## Notes

- Updater plugin is **installed but dormant** (dependency + capability present, not
  registered at runtime). M2 registers it and adds `plugins.updater` config.
- App icon is the temporary logo from `images/logo.png`.
- Unsigned dev/build app is blocked by macOS Gatekeeper — `xattr -dr
  com.apple.quarantine "/Applications/MDflow.app"` or right-click ▸ Open. Signing is M2.
