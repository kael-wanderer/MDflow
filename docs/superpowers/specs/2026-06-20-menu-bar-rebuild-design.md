# Menu Bar Rebuild Design

Date: 2026-06-20
Status: Draft — under review. **Contains keybinding changes to confirm (see Decisions).**

## What problem does this solve?

The native menu bar is minimal. The user wants a fuller, organized menu — a redesigned
**View** menu (per the provided mockup) and a **Window** menu with full-screen and
left/right half tiling.

## What does success look like?

- The View menu matches the mockup: pane toggles, line numbers, Soft Wrap submenu,
  zoom, and Font / Text Size / Explorer Text Size / Theme submenus.
- The Window menu adds Enter Full Screen, Move to Left Half, Move to Right Half.
- All items drive existing app behavior (or clearly-scoped new behavior for Soft Wrap
  modes and window tiling).

## View menu (from the mockup)

```
Show/Hide Explorer            ⌘B
Show/Hide Preview             ⌘P
Reading View                  ⌘E
Show/Hide Line Numbers
Soft Wrap                     ▸  Off | Window Width | Page Guide
────────────────────────────
Zoom In                       ⌘=
Zoom Out                      ⌘−
Reset Zoom                    ⌘0
────────────────────────────
Font                          ▸  (system + bundled families)
Text Size                     ▸  (12–24 px + custom)
Explorer Text Size            ▸
Theme                         ▸  (Light, Dark, Catppuccin Mocha, Everforest Dark, Nord, …)
```

Mapping to existing behavior:
- **Show/Hide Explorer** — toggles the sidebar (existing activity-bar Explorer toggle).
- **Show/Hide Preview** — toggles the preview pane for the active window (editor-only ↔
  split).
- **Reading View** — preview-only mode for the active window (toggles back to the prior
  mode).
- **Show/Hide Line Numbers** — existing per-window toggle.
- **Zoom In/Out/Reset** — existing focused-pane zoom.
- **Font / Text Size / Explorer Text Size / Theme** — native submenus that mirror the
  Gear panel settings (apply to the relevant zone), each with a checkmark on the active
  value. These reuse the existing `settings.ts` apply path.

### Soft Wrap submenu (new sub-modes)

- **Off** — no wrapping (horizontal scroll).
- **Window Width** — wrap at the editor pane width (today's "soft wrap on").
- **Page Guide** — wrap at a fixed column with a visual guide ruler (default 80). Adds a
  `wrapColumn` setting and a CodeMirror gutter/guide; wraps at that column.

## Window menu

```
Enter Full Screen             (native; ⌃⌘F)
Move to Left Half
Move to Right Half
Minimize                      (existing)
```

- **Enter Full Screen** — toggle the OS full-screen state (Tauri window `set_fullscreen`).
- **Move to Left/Right Half** — resize+position the window to the left/right half of the
  current monitor's work area (Tauri `current_monitor` size → `set_position`/`set_size`).

## Decisions to confirm (keybinding changes)

The mockup reassigns shortcuts that currently do other things:

| Shortcut | Current | Mockup |
|---|---|---|
| **⌘B** | Split view mode | Show/Hide Explorer |
| **⌘P** | Command/File Palette | Show/Hide Preview |
| **⌘E** | Editor-only mode | Reading View |

Implications if we adopt the mockup as-is:
1. **Palette** drops to **⌘K only** (it already supports ⌘K) — ⌘P is reassigned.
2. **Split** and **Editor-only** lose their direct shortcuts; they remain reachable via
   the window toolbar buttons (and Show/Hide Preview covers editor↔split). Optionally
   add a "Split View" View-menu item (e.g. ⌃⌘B) if you want a shortcut back.

Please confirm these reassignments, or tell me which to keep.

## Architecture

```
src-tauri/src/menu.rs   rebuilt View + Window submenus; new menu ids
src-tauri/src/lib.rs    full-screen + tile commands (or menu-event → frontend)
src/main.ts             handle new menu events (toggles, soft-wrap mode, font/size/theme,
                        window tiling), reusing settings + view-mode functions
src/settings.ts         + softWrapMode ("off"|"window"|"guide") and wrapColumn
src/editor.ts           apply wrap mode + page guide
```

CodeMirror is the source of truth for wrap/guide; the menu sets the mode via the
existing per-window editor handle.

## Error handling

- Tiling when no monitor info is available → no-op, no crash.
- Theme/font submenu choosing an unavailable value → falls back per existing settings
  parsing.

## Testing

- Vitest: `parseSettings` accepts `softWrapMode`/`wrapColumn` with sane defaults; the
  view-toggle helpers map menu events to the right mode transitions.
- Manual (append to `docs/test-cases/`): each View item toggles the right thing; Soft
  Wrap Off/Window Width/Page Guide behave; Font/Text Size/Theme submenus apply with the
  active value checked; Window full-screen and left/right half work on multi-monitor.

## Deliverables

- [ ] Rebuilt View menu (toggles, Soft Wrap submenu, zoom, Font/Size/Theme submenus)
- [ ] Window menu: Enter Full Screen, Left/Right Half
- [ ] Soft Wrap modes + Page Guide (settings + editor)
- [ ] Confirmed keybinding changes (palette → ⌘K, etc.)
- [ ] Docs/test-cases updated
