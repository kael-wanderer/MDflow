# MDflow Shell — Explorer · Tabs · Split (Design Spec)

> Sub-project 1 of the IDE-shell vision. Evolves MDflow from a single editor+preview
> window into a VS Code-style shell: an always-on activity bar, a collapsible file
> explorer with file management, multiple open files as tabs, and a Main + Sub window
> split where each window independently does Editor / Read / Split.
>
> Visual reference: VS Code (layout ideas only). All CSS is written fresh. The
> clean-room rule (no Kaelio/mx/Vibery code or CSS) is unaffected — VS Code is not a
> clean-room concern, but we still implement everything from scratch.

## Sequencing

This sub-project is built **next, ahead of M2 (auto-update)** — a deliberate
resequencing the user chose. M1 (lean core) is merged to `main`. After this shell,
the remaining sub-projects are: **Tabs/split polish**, **Top bar (search + command
palette + settings)**, **AI panel**, then back to **M2 auto-update** and the rest of
the original roadmap.

## What problem does this solve?

M1 edits one file at a time in a fixed editor|preview split. Real work means jumping
between many files in a project folder, keeping several open, and reading one document
while editing another. This sub-project gives MDflow a project-oriented shell so it
works like the editor the user already lives in, while keeping MDflow's markdown
identity (the live preview).

## What does success look like?

- An **activity bar** that's always visible, with an Explorer toggle.
- A **file explorer**: open a folder, browse a lazy-loaded tree with file-type icons,
  and manage files (new, rename, delete-to-trash, duplicate, copy path, reveal in
  Finder) via right-click.
- **Tabs**: several files open at once in the Main window, with dirty indicators.
- **Main + Sub windows** (max 2). Each window has its **own tabs** and its **own view
  mode** (Editor / Read / Split). Sub is toggled on/off from the top-right.
- The previous session (folder, open tabs, layout) **restores on launch**.
- Everything stays framework-free (vanilla TS + a small central store) and MIT-clean.

## Core model (the two-level layout)

This is the heart of the design. There are two independent levels:

1. **Outer level — Windows.** `Main` (always on) + `Sub` (toggle). Max 2. Each window
   is a full editor surface with its **own tab bar** and **own content area**. The
   vertical splitter between Main and Sub is also where their separate tab bars meet.
2. **Inner level — per-window View Mode.** Each window is independently in one of:
   - **Editor** — CodeMirror only.
   - **Read** — rendered preview only.
   - **Split** — editor + preview side by side *within that one window* (this is M1's
     split, now scoped to a window).

So `Main(Split)` shows editor+preview of Main's active doc; turn `Sub` on and it's a
second, independent window that can itself be Editor/Read/Split on a *different* doc.

### Document ownership rule (avoids dual-editable-view sync)

**A document has at most one editor tab across all windows.** Opening a file that is
already open anywhere focuses its existing tab. "Open in Sub Window" **moves** the tab
from Main to Sub (it doesn't duplicate). A window's preview (in Read/Split) always
renders *that window's own active doc* from *that window's* CodeMirror — there is no
cross-window preview, so two editable copies of one buffer never need syncing.

### How M1's keys carry over

`⌘E` Editor · `⌘P` Read · `⌘B` Split — now act on the **active window**. `⌘W` closes
the active tab. `⌘+` / `⌘−` zoom the active window.

## Layout

```
┌──┬───────────────┬──────────────────────────────────────────────────┐
│  │ EXPLORER  ⟳ + │ ┌ tabs (main) ───────┐⋮┌ tabs (sub) ───────┐      │
│A │ ▾ docs/       │ │ spec.md ◦  tasks.md │⋮│ README.md         │      │
│c │   spec.md     │ │  [E][R][⊟][#]  [⊞][✦]⋮│  [E][R][⊟][#]      │      │
│t │   tasks.md    │ ├────────────────────┤⋮├───────────────────┤      │
│  │ ▸ src/        │ │                     ⋮│                    │      │
│b │ README.md     │ │   Main window       ⋮│   Sub window       │      │
│a │               │ │   (Editor/Read/     ⋮│   (independent     │      │
│r │  ⚙ (bottom)   │ │    Split)           ⋮│    mode)           │      │
├──┴───────────────┴─┴─────────────────────┴⋮┴────────────────────┴─────┤
│ status:  ~/notes/spec.md                                    184 words │
└──────────────────────────────────────────────────────────────────────┘
   A = activity bar   ⋮ = drag-resizable splitter
   Per-window toolbar: [E]ditor [R]ead [⊟]Split [#]line-numbers
   Main-only globals (right of its tabs): [⊞] Sub-window toggle  [✦] AI (disabled)
```

- **Activity bar** (~48px, always on): **Explorer** icon (top, toggles explorer),
  **Settings** gear (bottom, opens `settings.json`). Built to accept Search / Source
  Control icons in later sub-projects.
- **Explorer** (collapsible, drag-resizable width): header (folder name + refresh +
  new-file + new-folder), tree, empty-state "Open Folder" button.
- **Editor area**: Main window, optional Sub window, drag-resizable splitter, 50/50
  default. Each window: tab bar (with per-window toolbar) + content.
- **Status bar**: active doc path + word count (carried from M1).
- **Global toggles** (Sub-window, AI-disabled) sit at the right of the Main window's
  tab bar for now; the dedicated **top bar** (later sub-project) will relocate them and
  add the center search/command bar and zoom buttons.

## Components & responsibilities

Frontend (vanilla TS, one responsibility per file):

| File | Responsibility |
|------|----------------|
| `store.ts` | Single state container: `getState()`, `subscribe(fn)`, `dispatch`. No DOM. |
| `treeops.ts` | **Pure** tree helpers: find/insert/remove/rename node by path. Unit-tested. |
| `windowops.ts` | **Pure** window/tab logic: open/focus/close/move tab, toggle sub, set mode. Unit-tested. |
| `actions.ts` | Action functions that call IPC then update the store (open file, save, CRUD, etc.). |
| `activitybar.ts` | Renders the activity bar; Explorer + Settings actions. |
| `explorer.ts` | Renders the tree + context menu + inline rename/new; lazy expand. |
| `windowview.ts` | Renders one window: tab bar + per-window toolbar + content (Editor/Read/Split). |
| `editor.ts` | CodeMirror factory (from M1), extended: per-doc `EditorState` swap, toggleable line numbers + soft-wrap. |
| `preview.ts` | markdown-it render (from M1, unchanged). |
| `resize.ts` | Drag-resize splitters (explorer width, Main/Sub split). |
| `session.ts` | Serialize/restore session to `localStorage`. Unit-tested (pure ser/de). |
| `icons.ts` | Extension → file-type icon glyph mapping. |
| `main.ts` | Bootstrap, wire menu/keyboard events to actions, mount render modules. |

Rust (`src-tauri/src/fs.rs`, replacing `files.rs` scope):

| Command | Purpose |
|---------|---------|
| `list_dir(path) -> Vec<Entry>` | One level of `{ name, path, is_dir }`, sorted (dirs first). Lazy per expand. |
| `read_file` / `save_file` / `word_count` | Carried from M1. |
| `create_file(path)` / `create_dir(path)` | New file / folder. |
| `rename_path(from, to)` | Rename/move. |
| `delete_to_trash(path)` | Delete via the `trash` crate (recoverable). |
| `duplicate_path(path) -> String` | Copy file/dir to `name copy.ext`; returns new path. |
| `get_initial_file` | Carried from M1. |

Plugins to (re)add: **`tauri-plugin-opener`** (for *Reveal in Finder* via
`reveal_item_in_dir`) and **`@tauri-apps/plugin-clipboard-manager`** (for *Copy Path*).
`trash` crate added to `Cargo.toml`. The dialog plugin's directory picker provides
**Open Folder**.

## Data flow

1. **Open Folder** → dialog (directory) → `list_dir(root)` → `store.folder` + root
   `tree` → explorer renders.
2. **Expand folder** → `list_dir(node.path)` → `treeops` inserts children → re-render.
3. **Click file** → `actions.openFile(path, 'main')` → `read_file` → `store.docs` +
   a tab in Main → `windowview` renders.
4. **Edit** → CodeMirror change → 300 ms debounce → that window's preview re-renders
   (if Read/Split) + word count; doc marked `dirty`.
5. **Save** (`⌘S`) → `save_file` → `dirty = false`.
6. **CRUD** (context menu) → IPC command → `treeops` updates the cached tree (no full
   reload) → re-render. A manual **refresh** and **on-window-focus** refresh re-read
   the affected directory (FS-watching is out of scope — see Backlog).
7. **Toggle Sub** → `windowops` adds/removes `windows[1]`; removing moves its tabs back
   to Main (confirming any unsaved).
8. State changes persist to `localStorage` (debounced) via `session.ts`.

## File explorer details

- **Tree**: lazy (children load on expand), dirs before files, alphabetical. Caret to
  expand/collapse. File-type icon + name per row. Active file highlighted.
- **File-type icons** (curated set, themed): folder (open/closed), `.md`/`.markdown`,
  `.txt`, `.json`, `.html`/`.htm`, `.pdf`, and a generic fallback.
- **Right-click context menu**:
  - New File · New Folder (inline text input in the tree)
  - Rename (inline) · Delete (→ Trash, with a confirm dialog)
  - Duplicate · Copy Path · Reveal in Finder
  - **Open in Sub Window** — if Sub is off, turn it on; open the file as a tab in Sub
    in Editor mode; if it was open in Main, move it.
- **Empty state**: a centered "Open Folder" button when no folder is set.
- **Opening non-text files**: text-readable files (md, markdown, txt, json, html, css,
  js, ts, and anything valid UTF-8) open in the editor. `.pdf` / non-UTF-8 files open a
  placeholder tab: *"No viewer for this file type yet."* (PDF rendering = M6.)

## Tabs

- Per window. Each tab shows name + a dirty dot (`◦`) when unsaved. Click to activate,
  `×` or `⌘W` to close. Closing an unsaved tab prompts a confirm dialog.
- Horizontal scroll on overflow. (Tab drag-reorder is Backlog.)

## Windows & split

- **Sub window toggle** (top-right of Main tab bar, and a menu item): on → empty Sub
  window with a "open a file from the explorer's *Open in Sub Window*" hint; off →
  moves Sub's tabs back to Main (confirm unsaved), removes the window.
- **Per-window toolbar** (right of each window's tabs): Editor, Read, Split, and a
  **line-numbers** toggle. The active window also responds to `⌘E/P/B`.
- **Line numbers** and **soft wrap** are global `ui` flags applied to all windows
  (CodeMirror compartments), toggled from the window toolbar / View menu, and persisted.
- **Resizable splitter** between Main and Sub (default 50/50). Max 2 windows.

## State shape (`store.ts`)

```ts
type ViewMode = "editor" | "read" | "split";

interface Doc { id: string; path: string | null; name: string; content: string; dirty: boolean; }
interface Tab { id: string; docId: string; }
interface Window { id: string; tabs: Tab[]; activeTabId: string | null; viewMode: ViewMode; }
interface TreeNode { name: string; path: string; isDir: boolean; expanded: boolean; children: TreeNode[] | null; }

interface AppState {
  folder: string | null;
  tree: TreeNode | null;
  docs: Record<string, Doc>;
  windows: Window[];            // length 1 or 2; [0] = Main, [1] = Sub
  activeWindowId: string;
  explorer: { visible: boolean; width: number };
  ui: { lineNumbers: boolean; softWrap: boolean; zoom: number };
}
```

`treeops.ts` and `windowops.ts` are pure functions over `TreeNode` / `Window[]` so the
non-trivial logic is unit-testable without a DOM.

## Session persistence (`session.ts`)

Persisted to `localStorage["mdflow.session"]`:
`{ folder, explorer{visible,width}, windows:[{ docPaths[], activeIndex, viewMode }],
activeWindowIndex, ui{lineNumbers,softWrap,zoom} }`.

On launch: restore `folder` (load root tree), reopen each window's docs by reading
their paths (skip any that no longer exist), restore active tab/window, view modes,
explorer state, and `ui`. Unsaved untitled docs (no path) are not restored.

## Settings bridge

The activity-bar **Settings gear** opens the app's `settings.json` (in the OS app-config
dir, created with documented default keys for font / theme / textSize if missing) as a
normal editor tab. **Values are not applied yet** — the Top-bar/Settings sub-project
reads and applies them. This is just an honest entry point so the gear isn't dead.

## Error handling

- File IO / CRUD errors → non-blocking toast; never crash the window (M1 policy).
- Delete → confirm dialog, then Trash (recoverable) — never silent permanent delete.
- Rename/new with an invalid or duplicate name → inline error, keep editing.
- Opening a vanished file (e.g. from session restore) → skip silently.
- Validate only at the IPC boundary (path exists / writable).

## Testing

- **Vitest** (node env + existing localStorage shim): `treeops` (find/insert/remove/
  rename), `windowops` (open/focus/close/move tab, toggle sub, set mode, ownership
  rule), `session` (serialize ↔ deserialize round-trip), `preview` (carried from M1).
- **Rust** (`cargo test`): `duplicate_path` target-name logic, path-safety helpers,
  `list_dir` against a temp directory, `word_count` (carried).
- **Manual GUI smoke** per phase, recorded in `docs/review.md`.

## Build phases (each independently shippable)

1. **Shell + read-only explorer.** Activity bar; explorer (Open Folder, lazy tree,
   file-type icons, click → open in Main); refactor M1's editor+preview into the Main
   window with its view modes; status bar. Session: folder + explorer state. Store +
   `treeops`/`windowops` foundations with their unit tests.
2. **Explorer file management.** Context menu: New File/Folder (inline), Rename
   (inline), Delete→Trash (confirm), Duplicate, Copy Path, Reveal in Finder; refresh
   (manual + on focus). Re-add opener + clipboard plugins; add `trash` crate.
3. **Tabs.** Multiple docs open in the Main window; dirty tracking; close (`⌘W` +
   confirm); activate; overflow scroll. Session: open tabs.
4. **Sub window + split.** Sub-window toggle (top-right + menu) and AI toggle (disabled
   placeholder); per-window toolbar (Editor/Read/Split + line numbers); "Open in Sub
   Window"; resizable Main/Sub splitter; per-window `⌘E/P/B`, `⌘+/−` zoom. Session: both
   windows + view modes.

## Backlog (deferred — captured so it's not forgotten)

| Item | Home |
|------|------|
| Copy / Paste (move files between folders) | Explorer-polish follow-up (file clipboard + move). |
| Drag a file from Finder into the explorer (drop-on-file → copy to its folder; drop-on-folder → expand + copy in) | Explorer-polish follow-up (OS drag-drop). |
| Compare two files ("Select for compare" → reselect → diff) | **Compare/Diff sub-project** (diff engine + diff UI). |
| Render PDF / HTML content (icons shown now) | PDF = **M6 viewer**; HTML preview = later. |
| Tab drag-reorder | Tabs polish. |
| Live FS-watching (auto-refresh on external changes) | Explorer-polish (notify crate). |
| AI window function | **AI sub-project** (the disabled toggle becomes live). |
| Zoom +/− buttons · center search/command bar · settings UI + applying setting values | **Top-bar sub-project.** |

## Out of scope (this sub-project)

AI panel, the dedicated top bar / search / command palette, applying settings values,
FS-watching, compare/diff, copy-paste file moves, OS drag-drop import, rendered PDF/HTML,
and more than two windows.

## Tech stack

Carried from M1 (Tauri 2 + Rust, Vite + TS, CodeMirror 6, markdown-it, highlight.js).
Added: `trash` crate, `tauri-plugin-opener` (reveal), `@tauri-apps/plugin-clipboard-manager`.
No frontend framework — vanilla TS + a small central store, zero new UI dependencies.

## Constraints (carried)

- MIT; clean-room (no Kaelio/mx/Vibery code or CSS); identifier `com.kael.mdflow`.
- Small, focused files; validate only at boundaries; no premature abstraction.
- Solo dev — phases are individually shippable.
