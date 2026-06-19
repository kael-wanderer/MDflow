# MDflow Shell — Phase 4c Implementation Plan (UI Polish)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the shell UI per user feedback: icon-based segmented window toolbar, a Sub-window close button, per-window word counts in the status area, colored file-type icons, folder carets, explorer header icon-buttons (new file/folder, expand/collapse all), Open Folder in the File menu, and removal of the inert Settings gear.

**Architecture:** Add a shared inline-SVG icon set in `glyphs.ts` (no icon dependency). The window toolbar (in `windowview.ts`) becomes an icon segmented-control; each window gains a bottom status line with its own word count (computed in JS), replacing the single global footer. The explorer header swaps its text "Open" for icon buttons; "Open Folder" moves to the native File menu. File-type icons get colors via CSS classes; folders render as a caret only.

**Tech Stack:** Tauri 2 + Rust, Vite + TS, CodeMirror 6 (all existing). No new dependencies.

## Global Constraints

- **License: MIT.** Clean-room — no Kaelio/mx/Vibery code or CSS. No "mx"/"Vibery"/"Kaelio" names anywhere.
- **Identifier:** `com.kael.mdflow`. Product name: **MDflow**.
- **Vanilla TS + the existing store. No frontend framework, no icon library** (inline SVG).
- Small, focused files; no premature abstraction.
- Builds on Phases 1–4b (current `main`).

---

## File Structure (Phase 4c)

```
src/
  glyphs.ts        # NEW: inline-SVG icon strings (editor/read/split/lineNumbers/sub/etc.)
  windowview.ts    # MODIFY: icon segmented toolbar; per-window status line; sub-close button
  explorer.ts      # MODIFY: colored file icons; folder = caret only; header icon buttons
  icons.ts         # unchanged (returns type id; colors applied via CSS class)
  activitybar.ts   # MODIFY: drop Settings handling note
  main.ts          # MODIFY: handle file.open_folder; per-window status updates
  styles.css       # MODIFY: toolbar segmented, status line, file-icon colors, header icons
  treeops.ts       # MODIFY: add setAllExpanded
  __tests__/
    treeops.test.ts # MODIFY: test setAllExpanded
index.html         # MODIFY: remove Settings gear, "Open" button; remove global word count
src-tauri/src/
  menu.rs          # MODIFY: add File ▸ Open Folder…
```

---

### Task 1: `glyphs.ts` — inline SVG icon set

**Files:**
- Create: `src/glyphs.ts`

**Interfaces:**
- Produces a record of 16×16 inline-SVG strings (line style, `currentColor`) used by the
  toolbar and explorer header: `editor`, `read`, `split`, `lineNumbers`, `subToggle`,
  `subClose`, `newFile`, `newFolder`, `collapseAll`, `expandAll`.

- [ ] **Step 1: Implement `src/glyphs.ts`**

```ts
const wrap = (inner: string): string =>
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const glyphs: Record<string, string> = {
  editor: wrap(`<path d="M10.5 2.5l3 3-8 8-3.5.5.5-3.5z"/>`),
  read: wrap(`<path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="1.8"/>`),
  split: wrap(`<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M8 3v10"/>`),
  lineNumbers: wrap(`<path d="M2.5 4h1.5M2.5 8h1.5M2.5 12h1.5M6.5 4h7M6.5 8h7M6.5 12h7"/>`),
  subToggle: wrap(`<rect x="1.5" y="3.5" width="6.5" height="9" rx="1.2"/><rect x="9.5" y="3.5" width="5" height="9" rx="1.2" stroke-dasharray="2 1.5"/>`),
  subClose: wrap(`<rect x="1.5" y="3.5" width="13" height="9" rx="1.2"/><path d="M10.5 5.8L8 8l2.5 2.2"/>`),
  newFile: wrap(`<path d="M4 2h5l3 3v9H4z"/><path d="M9 2v3h3"/><path d="M8 8v4M6 10h4"/>`),
  newFolder: wrap(`<path d="M2 4h4l1.5 1.5H14V13H2z"/><path d="M8 8v3M6.5 9.5h3"/>`),
  collapseAll: wrap(`<path d="M5 6l3-2.5L11 6"/><path d="M5 10l3 2.5L11 10"/>`),
  expandAll: wrap(`<path d="M5 4l3 2.5L11 4"/><path d="M5 12l3-2.5L11 12"/>`),
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit src/glyphs.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/glyphs.ts
git commit -m "feat: inline SVG icon set"
```

---

### Task 2: Remove the inert Settings gear

**Files:**
- Modify: `index.html`, `src/activitybar.ts`

- [ ] **Step 1: Delete the `#ab-settings` button** from the `#activitybar` in `index.html`
(remove the entire `<button class="ab-btn ab-settings" id="ab-settings" …>⚙</button>`).

- [ ] **Step 2: Remove the trailing Settings comment** in `src/activitybar.ts` (the
`// Settings is introduced in the top-bar sub-project.` line). No behavior change.

- [ ] **Step 3: Verify** — `npm run tauri dev`: the activity bar shows only the Explorer toggle.

- [ ] **Step 4: Commit**

```bash
git add index.html src/activitybar.ts
git commit -m "chore: remove inert Settings gear (returns with the settings sub-project)"
```

---

### Task 3: Colored file icons + folder caret-only

**Files:**
- Modify: `src/explorer.ts`, `src/styles.css`

**Interfaces:**
- Produces: directories render as a caret only (`▸` collapsed / `▾` expanded, no folder
  glyph); files render their type glyph tinted by a `type-<id>` CSS class.

- [ ] **Step 1: Update `ICON` and `createRow` in `src/explorer.ts`.** Remove the `folder`
entry from `ICON`:

```ts
const ICON: Record<string, string> = {
  md: "M",
  txt: "T",
  json: "{}",
  html: "<>",
  pdf: "P",
  file: "·",
};
```

In `createRow`, render dirs with caret-only and files with a colored type icon:

```ts
  const caret = document.createElement("span");
  caret.className = "tree-caret";
  caret.textContent = node.isDir ? (node.expanded ? "▾" : "▸") : "";

  const icon = document.createElement("span");
  icon.className = "tree-icon";
  if (!node.isDir) {
    const type = fileIcon(node.name, node.isDir); // "md" | "txt" | ...
    icon.classList.add(`type-${type}`);
    icon.textContent = ICON[type];
  }
```

(Keep the empty `icon` span for files; dirs get an empty icon span so names stay aligned.)

- [ ] **Step 2: Add file-icon colors to `src/styles.css`**

```css
.tree-icon { font-weight: 600; }
.tree-icon.type-md { color: #6c9ad1; }
.tree-icon.type-txt { color: #a9b2c0; }
.tree-icon.type-json { color: #d6c64b; }
.tree-icon.type-html { color: #e0823d; }
.tree-icon.type-pdf { color: #e0544e; }
.tree-icon.type-file { color: var(--faint); }
.tree-caret { color: var(--faint); }
```

- [ ] **Step 3: Verify** — `npm run tauri dev`, open a folder: folders show a caret (no
folder glyph); `.md/.json/.html/.pdf` files show colored icons.

- [ ] **Step 4: Commit**

```bash
git add src/explorer.ts src/styles.css
git commit -m "feat: colored file-type icons + caret-only folders"
```

---

### Task 4: Explorer header icon buttons + File ▸ Open Folder

**Files:**
- Modify: `src/treeops.ts`, `src/__tests__/treeops.test.ts`, `index.html`, `src/explorer.ts`, `src/styles.css`, `src-tauri/src/menu.rs`, `src/main.ts`

**Interfaces:**
- Produces:
  - `setAllExpanded(root: TreeNode, expanded: boolean): TreeNode` (pure) — sets `expanded` on
    every loaded directory node.
  - Explorer header buttons: New File, New Folder, Collapse All, Expand All (icons). The text
    "Open" button is removed; **File ▸ Open Folder…** (menu id `file.open_folder`) replaces it.

- [ ] **Step 1: Write the failing test for `setAllExpanded`** — add to `src/__tests__/treeops.test.ts`:

```ts
import { setAllExpanded } from "../treeops";

describe("setAllExpanded", () => {
  it("sets expanded on all loaded dir nodes", () => {
    const tree: TreeNode = {
      name: "root", path: "/r", isDir: true, expanded: true,
      children: [
        { name: "a", path: "/r/a", isDir: true, expanded: false, children: [
          { name: "x.md", path: "/r/a/x.md", isDir: false, expanded: false, children: null },
        ]},
        { name: "b", path: "/r/b", isDir: true, expanded: true, children: null },
      ],
    };
    const collapsed = setAllExpanded(tree, false);
    expect(collapsed.children![0].expanded).toBe(false);
    expect(collapsed.children![1].expanded).toBe(false);
    const expanded = setAllExpanded(tree, true);
    expect(expanded.children![0].expanded).toBe(true);
    expect(expanded.children![1].expanded).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- treeops`
Expected: FAIL — `setAllExpanded` not exported.

- [ ] **Step 3: Implement `setAllExpanded` in `src/treeops.ts`**

```ts
export function setAllExpanded(root: TreeNode, expanded: boolean): TreeNode {
  const children = root.children ? root.children.map((c) => setAllExpanded(c, expanded)) : root.children;
  if (!root.isDir) return { ...root, children };
  return { ...root, expanded, children };
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- treeops`
Expected: PASS.

- [ ] **Step 5: Replace the explorer header in `index.html`** — swap the text "Open" button
for an icon action group:

```html
          <header class="explorer-header">
            <span id="explorer-folder-name">No folder</span>
            <div class="explorer-actions">
              <button id="ex-new-file" class="ex-icon" type="button" title="New File"></button>
              <button id="ex-new-folder" class="ex-icon" type="button" title="New Folder"></button>
              <button id="ex-collapse" class="ex-icon" type="button" title="Collapse All"></button>
              <button id="ex-expand" class="ex-icon" type="button" title="Expand All"></button>
            </div>
          </header>
```

- [ ] **Step 6: Wire the header buttons in `src/explorer.ts`** — import glyphs + `setAllExpanded`,
fill the icons, and wire actions. In `initExplorer`, replace the old `#explorer-open` listener
with:

```ts
  const setIcon = (id: string, key: string) => { document.getElementById(id)!.innerHTML = glyphs[key]; };
  setIcon("ex-new-file", "newFile");
  setIcon("ex-new-folder", "newFolder");
  setIcon("ex-collapse", "collapseAll");
  setIcon("ex-expand", "expandAll");

  const withFolder = (fn: (folder: string) => void) => () => {
    const folder = getState().folder;
    if (folder) fn(folder);
  };
  document.getElementById("ex-new-file")!.addEventListener("click", withFolder((f) => startCreate(f, "file")));
  document.getElementById("ex-new-folder")!.addEventListener("click", withFolder((f) => startCreate(f, "dir")));
  document.getElementById("ex-collapse")!.addEventListener("click", () => {
    const tree = getState().tree;
    if (tree) setState({ tree: setAllExpanded(tree, false) });
  });
  document.getElementById("ex-expand")!.addEventListener("click", () => {
    const tree = getState().tree;
    if (tree) setState({ tree: setAllExpanded(tree, true) });
  });
```

Add the imports at the top of `explorer.ts`:

```ts
import { glyphs } from "./glyphs";
import { findNode, setAllExpanded, setChildren, toggleExpanded, type TreeNode } from "./treeops";
```

(Remove the now-unused `#explorer-open` reference. Keep `#explorer-empty-open` as-is.)

- [ ] **Step 7: Add header-icon CSS to `src/styles.css`**

```css
.explorer-actions { display: flex; gap: 2px; }
.ex-icon {
  width: 22px; height: 22px; padding: 3px; display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted); background: transparent; border: 0; border-radius: 5px; cursor: default;
}
.ex-icon:hover { color: var(--text); background: rgba(255,255,255,0.06); }
.ex-icon svg { width: 15px; height: 15px; }
```

- [ ] **Step 8: Add File ▸ Open Folder… to `src-tauri/src/menu.rs`** — in the File submenu,
after the `open` item add:

```rust
    let open_folder = MenuItemBuilder::with_id("file.open_folder", "Open Folder…")
        .accelerator("CmdOrCtrl+Shift+O")
        .build(app)?;
```

and insert `.item(&open_folder)` into the File `SubmenuBuilder` chain right after `.item(&open)`.

- [ ] **Step 9: Handle `file.open_folder` in `src/main.ts`** — import the folder picker and
add a menu case. At the top, add:

```ts
import { pickFolder } from "./filesys";
import { openFolder } from "./explorer";
```

In the `listen("menu", …)` switch, add:

```ts
    case "file.open_folder": return void pickFolder().then((d) => { if (d) void openFolder(d); });
```

- [ ] **Step 10: Type-check, test, run**

Run: `npx tsc --noEmit && npm run test -- treeops && (cd src-tauri && cargo check)`
Expected: all green.
Run: `npm run tauri dev`: header shows four icon buttons; New File/Folder create at the root;
Collapse/Expand All work; File ▸ Open Folder… (or ⌘⇧O) opens a folder.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: explorer header icon buttons + File > Open Folder; setAllExpanded"
```

---

### Task 5: Icon segmented window toolbar

**Files:**
- Modify: `src/windowview.ts`, `src/styles.css`

**Interfaces:**
- Produces: the window toolbar's Editor/Read/Split become an **icon segmented control** (one
  shared bordered group); line-numbers is an icon button; the Split icon reads as a show/hide
  panel.

- [ ] **Step 1: Replace the toolbar markup in `src/windowview.ts`** — import glyphs and rebuild
the `.window-toolbar` template. Change the toolbar portion of the `root.innerHTML` to:

```ts
      <div class="window-toolbar">
        <div class="wt-group">
          <button class="wt-btn" data-mode="editor" type="button" title="Editor (⌘E)">${glyphs.editor}</button>
          <button class="wt-btn" data-mode="preview" type="button" title="Read (⌘P)">${glyphs.read}</button>
          <button class="wt-btn" data-mode="split" type="button" title="Split (⌘B)">${glyphs.split}</button>
        </div>
        <button class="wt-btn wt-icon wt-lines" type="button" title="Line numbers">${glyphs.lineNumbers}</button>
        ${isMain
          ? `<button class="wt-btn wt-icon wt-sub" type="button" title="Toggle Sub window">${glyphs.subToggle}</button>`
          : `<button class="wt-btn wt-icon wt-subclose" type="button" title="Close Sub window">${glyphs.subClose}</button>`}
      </div>
```

Add the import at the top:

```ts
import { glyphs } from "./glyphs";
```

(The `data-mode` / `.wt-lines` / `.wt-sub` selectors and their listeners are unchanged. The AI
placeholder button is removed for now — it returns with the AI sub-project.)

- [ ] **Step 2: Replace the toolbar CSS in `src/styles.css`** (update the Phase 4a `.wt-*`
rules) so the modes form a segmented group with shared border and icons size correctly:

```css
.window-toolbar { display: flex; align-items: center; gap: 6px; padding: 0 8px; flex-shrink: 0; }
.wt-group { display: flex; border: 1px solid var(--border); border-radius: 7px; overflow: hidden; }
.wt-group .wt-btn { border-radius: 0; }
.wt-group .wt-btn + .wt-btn { border-left: 1px solid var(--border); }
.wt-btn {
  width: 28px; height: 24px; display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted); background: transparent; border: 0; cursor: default;
}
.wt-btn svg { width: 15px; height: 15px; }
.wt-btn:hover:not(:disabled) { color: var(--text); background: rgba(255,255,255,0.05); }
.wt-btn.active { color: var(--text-strong); background: rgba(255,255,255,0.10); }
.wt-icon { border: 1px solid var(--border); border-radius: 7px; }
```

(Remove the old `.wt-sep` rule if present; the group replaces the separators.)

- [ ] **Step 3: Verify** — `npm run tauri dev`: the three mode buttons are one bordered segmented
group of icons; the active mode is highlighted; line-numbers is a separate icon button.

- [ ] **Step 4: Commit**

```bash
git add src/windowview.ts src/styles.css
git commit -m "feat: icon segmented window toolbar"
```

---

### Task 6: Sub-window close button

**Files:**
- Modify: `src/windowview.ts`

**Interfaces:**
- Produces: the Sub window's toolbar shows a close button (`subClose` glyph) that calls
  `onToggleSub` (which closes Sub and moves its tabs back to Main — Phase 4b behavior).

- [ ] **Step 1: Wire the sub-close button in `src/windowview.ts`** — where the toolbar buttons
are wired (next to `.wt-sub`), add:

```ts
  root.querySelector(".wt-subclose")?.addEventListener("click", () => h.onToggleSub());
```

(The `.wt-sub` button on the Main window already calls `onToggleSub` to open/close; the
`.wt-subclose` on the Sub window calls the same handler to collapse back to a single window.)

- [ ] **Step 2: Verify** — `npm run tauri dev`: open Sub (Main's `⊞`), then click the Sub
window's close icon → it collapses back to one window (with the dirty-confirm + tab migration
from Phase 4b).

- [ ] **Step 3: Commit**

```bash
git add src/windowview.ts
git commit -m "feat: Sub window close button"
```

---

### Task 7: Per-window word counts (status line)

**Files:**
- Modify: `index.html`, `src/windowview.ts`, `src/main.ts`, `src/styles.css`

**Interfaces:**
- Produces: each window has a bottom status line showing its active doc's name + word count
  (computed in JS). The single global footer word count is removed; the per-window lines align
  with the windows so the divider is the window splitter.

- [ ] **Step 1: Remove the global footer from `index.html`** — delete the `<footer
class="statusbar">…</footer>` block (both `#status-path` and `#status-words`).

- [ ] **Step 2: Add a status line to each window in `src/windowview.ts`** — append to the
`root.innerHTML` template after `.window-panes`:

```ts
    <div class="window-status">
      <span class="ws-name"></span>
      <span class="ws-words">0 words</span>
    </div>
```

Grab the elements and update them. After the existing element lookups, add:

```ts
  const wsName = root.querySelector<HTMLElement>(".ws-name")!;
  const wsWords = root.querySelector<HTMLElement>(".ws-words")!;
  const countWords = (text: string): number => (text.trim() ? text.trim().split(/\s+/).length : 0);
```

In `render()`, set the active doc name:

```ts
    const active = w.tabs.find((t) => t.id === w.activeTabId);
    wsName.textContent = active?.path ?? active?.name ?? "";
```

In `renderPreview(text)`, also update the word count:

```ts
  function renderPreview(text: string): void {
    previewPane.innerHTML = `<article class="doc">${renderMarkdown(text)}</article>`;
    const n = countWords(text);
    wsWords.textContent = `${n} ${n === 1 ? "word" : "words"}`;
  }
```

- [ ] **Step 3: Remove the global status updates from `src/main.ts`** — delete the
`statusPath`/`statusWords` element lookups and the `updateStatus()` function and its calls
(word count + path now live per window via `windowview`). The `word_count` Rust IPC call is no
longer needed in `main.ts`; remove those usages. (Leave the Rust `word_count` command in place;
it is simply unused now.)

> **Implementer note:** after this change, search `main.ts` for `statusPath`, `statusWords`,
> `updateStatus`, and `word_count` and remove each reference. Where `updateStatus()` was called
> (after activate/close/save), call the active window view's `render()` + `renderPreview(text)`
> instead so its status line refreshes — most call sites already do this via `activateTab`.

- [ ] **Step 4: Add status-line CSS to `src/styles.css`** and drop the old `.statusbar` rules:

```css
.window-status {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  height: 24px; padding: 0 12px; flex-shrink: 0;
  font-size: 12px; color: var(--muted);
  background: var(--bg-elev); border-top: 1px solid var(--border);
}
.ws-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ws-words { color: var(--faint); font-variant-numeric: tabular-nums; flex-shrink: 0; }
```

- [ ] **Step 5: Type-check + run**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run tauri dev`: each window shows its own name + word count at its bottom; with the
Sub window open there are two counts, divided exactly at the window splitter.

- [ ] **Step 6: Commit**

```bash
git add index.html src/windowview.ts src/main.ts src/styles.css
git commit -m "feat: per-window status line with word count (replaces global footer)"
```

---

### Task 8: Smoke test + docs

**Files:**
- Modify: `docs/review.md`, `docs/tasks.md`

- [ ] **Step 1: Run all automated tests**

Run: `npm run test && (cd src-tauri && cargo test)`
Expected: all green (treeops gains the `setAllExpanded` test).

- [ ] **Step 2: Manual smoke (`npm run tauri dev`), record in `docs/review.md`:**
  - Activity bar shows only the Explorer toggle (gear gone).
  - Window toolbar: Editor/Read/Split are one icon segmented group; active mode highlighted;
    line-numbers icon toggles.
  - Sub window has a close icon that collapses to a single window.
  - Each window shows its own word count at the bottom; two windows → two counts at the splitter.
  - File icons are colored by type; folders show only a caret (`▸`/`▾`).
  - Explorer header: New File / New Folder / Collapse All / Expand All icons work; "Open" gone.
  - File ▸ Open Folder… (⌘⇧O) opens a folder.

- [ ] **Step 3: Update `docs/tasks.md`** — record Phase 4c (UI polish) complete.

- [ ] **Step 4: Commit**

```bash
git add docs/review.md docs/tasks.md
git commit -m "test: Shell Phase 4c smoke test recorded"
```

---

## Self-Review

**Feedback coverage:**
- (1) Inert Settings gear → removed (Task 2) ✓
- (2) Editor/Read/Split grouped + icons + Split-as-panel icon → Tasks 1, 5 ✓
- (3) Sub window close icon → Task 6; per-window word counts split at the splitter → Task 7 ✓
- (4) Colored VS Code-style file icons → Task 3 ✓
- (5) Explorer header icon buttons (new file/folder, expand/collapse all); "Open" removed → Open
  Folder in File menu → Task 4 ✓
- (6) Folder = caret only (`▸`/`▾`), no folder glyph → Task 3 ✓

**Placeholder scan:** none — every code step is complete. The Task 7 "implementer note" is
explicit cleanup guidance, not a deferred placeholder.

**Type consistency:** `glyphs` keys referenced in `windowview.ts` and `explorer.ts` all exist in
`glyphs.ts`; `setAllExpanded(root, boolean)` matches its call sites; the new menu id
`file.open_folder` matches the `main.ts` case; `fileIcon` type ids match the `type-*` CSS classes
and the `ICON` map keys.

**Note:** "Expand All" expands already-loaded directories (it does not eagerly fetch every
unloaded subfolder); "Collapse All" collapses everything. Word counts are computed in JS now;
the Rust `word_count` command remains but is unused.
