# MDflow - Review & Smoke Test

Date: 2026-06-19

## Automated checks

- `npm run test` → **26 passed** across preview, state, tree operations, icons, path
  helpers, tab/window operations, and word counting.
- `cd src-tauri && cargo test` → **5 passed** across word count, directory listing,
  create/rename validation, duplicate naming, and real file/directory duplication.
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

## Shell Phase 2 checks

### Verified

- [x] Native create-file, create-folder, rename, Trash, and duplicate commands compile.
- [x] Create and rename reject existing destinations.
- [x] Duplicate naming selects `copy`, `copy 2`, then `copy 3`.
- [x] Real file and recursive directory duplication pass Rust tests, including dotted
  directory names.
- [x] Opener and clipboard plugins are registered with the required capabilities.
- [x] Explorer action errors are caught and shown as non-crashing messages.
- [x] Renaming/deleting an open path updates or clears the editor's save path.
- [x] Refresh-on-focus preserves expanded loaded folders.
- [x] Production build, frontend tests, Rust tests, `cargo check`, and Tauri launch pass.

### Native GUI checklist

- [ ] Right-click a file or folder and confirm all actions appear.
- [ ] New File and New Folder create entries through the inline input.
- [ ] Rename updates the tree; renaming an open file also updates the status path and
  subsequent Save target.
- [ ] Duplicate creates `name copy`, then numbered copies when repeated.
- [ ] Delete asks for confirmation, moves the entry to Trash, and refreshes the tree.
- [ ] Copy Path writes the exact path to the clipboard.
- [ ] Reveal in Finder selects the entry in Finder.
- [ ] Right-click Explorer empty space or its header to create at the folder root.
- [ ] Add or remove a file externally, refocus MDflow, and confirm the tree refreshes
  without collapsing expanded folders.

## Shell Phase 3 checks

### Verified

- [x] Pure tab operations cover focus-existing and right/left neighbour selection.
- [x] Each document owns a separate CodeMirror `EditorState` for cursor and undo
  isolation.
- [x] Real CodeMirror browser harness confirms cursor restoration and independent
  undo histories across two documents.
- [x] Closing the final active tab clears the editor instead of leaving stale content.
- [x] Tab strip renders active, dirty, close, accessibility, and horizontal overflow
  states; browser harness activation and close dispatch pass.
- [x] Explorer highlighting follows the active tab.
- [x] Preview debounce and word-count responses cannot overwrite a newly active tab.
- [x] Save As refuses a path already owned by another open tab before writing.
- [x] Explorer rename/delete rebases or detaches every affected open tab safely.
- [x] File ▸ Close Tab uses `⌘W`; dirty close requires confirmation.
- [x] Session state stores open file paths and the active path; vanished paths are
  skipped during restore.
- [x] Production build, frontend tests, Rust tests, `cargo check`, and native Tauri
  launch pass.

### Native GUI checklist

- [ ] Open several files from Explorer and File ▸ Open; reopening an existing file
  focuses its tab instead of duplicating it.
- [ ] Edit a tab to show its dirty dot; Save clears it; Save As names an Untitled tab.
- [ ] Click × and use `⌘W`; dirty tabs confirm before closing.
- [ ] Closing an active middle tab selects the right neighbour; closing the last tab
  selects the left neighbour; closing the only tab clears the editor and preview.
- [ ] New File and MDflow Help each open in their own tab.
- [ ] Rename or delete an open file/folder from Explorer and confirm affected tab
  paths remain safe.
- [ ] Quit and relaunch to restore open file tabs and the active tab; deleted files
  are skipped.
- [ ] Confirm Split, Editor, Read, Soft Wrap, and Explorer file management still work.

## Shell Phase 4a checks

### Verified

- [x] UIState gains `lineNumbers: boolean` defaulting to `true` and persisting with the rest.
- [x] State unit tests updated and passing.
- [x] `#window-toolbar` markup added inside `#editor-header` wrapping `#tabbar`.
- [x] CSS styling added for `.editor-header`, `.window-toolbar`, and `.wt-*` buttons.
- [x] `src/windowtoolbar.ts` created to handle toolbar actions and updates.
- [x] Toolbar wired in `src/main.ts` with `toggleLineNumbers` and `setMode`.
- [x] Line numbers default, state, and toolbar active states restore and sync on startup.

### Native GUI checklist

- [ ] Toolbar Editor/Read/Split match the menu + keyboard; active button reflects mode.
- [ ] Line-numbers `#` toggles and persists across relaunch.
- [ ] Disabled `⊞` (Sub window) and `✦` (AI) show as placeholders.
- [ ] Tabs, explorer, file management, save/soft-wrap all still work.

## Shell Phase 4b checks

### Verified

- [x] Pure window ownership helper `findTabByPath` locates which window holds a file.
- [x] Store state modified from flat `tabs` to `windows[]` array supporting Sub window.
- [x] DOM and CSS rewritten to support per-window layout and active status.
- [x] Reusable `WindowView` component created to own each window's tab strip, toolbar, editor and preview panes.
- [x] Main and Sub window support independent Editor/Read/Split modes and active states.
- [x] Resizable splitter allows dragging to distribute space between Main and Sub windows.
- [x] "Open in Sub Window" context menu item moves files between windows enforcing document ownership.
- [x] Keyboard shortcuts (`⌘E/P/B`, `⌘W`) target the active window.
- [x] Persisted state restores windows, active window, modes, and open/active tab paths on launch.
- [x] Production build, Vitest unit tests, Cargo tests, and `cargo check` compile and pass.

### Native GUI checklist

- [ ] Click the `⊞` button on the main window to open the Sub window. Drag the splitter to resize.
- [ ] Open files in Main and Sub windows. Verify each window has independent tabs, active tab, and view mode (Editor/Read/Split).
- [ ] Right-click a file in the explorer and choose "Open in Sub Window". Verify it opens in Sub (enabling Sub if off), and if it was already open in Main, it moves.
- [ ] Click on each window to make it active. Confirm keyboard shortcuts like `⌘W` or `⌘B` act only on the active window.
- [ ] Toggle line numbers `#` or soft wrap and verify it affects both windows.
- [ ] Click the `⊞` button to close the Sub window. If any tab in Sub is dirty, verify it warns you. If accepted, verify all tabs from Sub move back to Main.
- [ ] Relaunch the app and verify both windows, their active tabs, view modes, and active window are restored exactly.

## Shell Phase 4c checks

### Verified

- [x] Activity bar renders only the Explorer toggle; the inert Settings gear is gone.
- [x] Editor/Read/Split render as one icon segmented control with active-state styling.
- [x] Browser interaction confirms Read hides the editor and Split restores both panes.
- [x] Line-numbers icon toggles CodeMirror gutters off and back on.
- [x] Main opens Sub and the Sub close icon collapses back to one window.
- [x] Main and Sub each render an independent bottom status line aligned at the splitter.
- [x] Explorer header renders New File, New Folder, Collapse All, and Expand All icons;
  the old text Open action is gone.
- [x] `setAllExpanded` covers loaded directory nodes with unit tests.
- [x] JS word counting covers empty, singular, and mixed-whitespace input with unit tests.
- [x] File-type classes and colors compile for Markdown, text, JSON, HTML, PDF, and
  generic files; directories render only their caret.
- [x] File ▸ Open Folder… and `⌘⇧O` compile into the native menu.
- [x] Production build, 26 Vitest tests, 5 Cargo tests, `cargo check`, and native
  Tauri launch pass.

### Native GUI checklist

- [ ] Open a folder and confirm file icons are colored by type while folders show only
  `▸`/`▾`.
- [ ] Use the Explorer header icons to create a file/folder and collapse/expand loaded
  directories.
- [ ] Use File ▸ Open Folder… and `⌘⇧O` to open a folder.
- [ ] Edit documents in Main and Sub and confirm each status line tracks its own path
  and live word count.
- [ ] Close a dirty Sub window and confirm the existing warning/tab-migration flow.

## Notes

- Updater plugin is **installed but dormant** (dependency + capability present, not
  registered at runtime). M2 registers it and adds `plugins.updater` config.
- App icon is the temporary logo from `images/logo.png`.
- Unsigned dev/build app is blocked by macOS Gatekeeper — `xattr -dr
  com.apple.quarantine "/Applications/MDflow.app"` or right-click ▸ Open. Signing is M2.
