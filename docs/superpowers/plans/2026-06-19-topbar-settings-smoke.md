# Top Bar + Settings — Smoke Run

Date: 2026-06-19

## Automated and rendered checks

- [x] `⌘K` opens the command palette.
- [x] `⌘P` opens the command palette and no longer triggers Read mode.
- [x] Search activity-bar button opens the same palette.
- [x] Palette input fuzzy-filters commands; Enter runs the selected command.
- [x] Escape closes the palette.
- [x] Results remain grouped into Files and Commands.
- [x] Activity-bar order is Explorer → Search → Gear, with Gear pinned last.
- [x] Native launch registers `list_files_recursive` and `get_settings`.
- [x] Default settings file is created at
  `~/Library/Application Support/com.kael.mdflow/settings.json`.
- [x] Settings parser covers defaults, partial merges, invalid JSON/theme, size
  clamping, and boolean validation.
- [x] Theme CSS and per-window/explorer typography variables compile.
- [x] Frontend tests: 39 passed.
- [x] Rust tests: 7 passed.
- [x] Production build succeeds without large-chunk warnings.

## Hands-on native GUI follow-up

These require direct desktop typing/relaunch interaction:

- [ ] Gear opens `settings.json` as a tab.
- [ ] Saving each theme value recolors UI and editor syntax live.
- [ ] Saving different Main/Sub sizes visibly changes each window independently.
- [ ] Saving `restoreSession: false`, quitting, and relaunching starts without the
  previous folder or tabs.
