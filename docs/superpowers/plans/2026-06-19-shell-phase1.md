# MDflow Shell — Phase 1 Implementation Plan (Shell + Read-only Explorer)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap M1's editor+preview in a VS Code-style shell — an always-on activity bar plus a collapsible, resizable file explorer that opens a folder, browses a lazy-loaded tree with file-type icons, and opens files into the existing main editor.

**Architecture:** Add a tiny central `store.ts` (subscribe/notify) holding folder + tree + explorer state. Pure `treeops.ts` does all tree manipulation (unit-tested). Render modules (`activitybar.ts`, `explorer.ts`) read the store and re-render on change. Rust gains a lazy `list_dir` command. M1's editor/preview/view-modes are kept as the "main window" content; tabs, the formal `windows[]` model, and explorer CRUD arrive in later phases.

**Tech Stack:** Tauri 2 + Rust, Vite + TypeScript, CodeMirror 6, markdown-it (all from M1). No new dependencies in Phase 1.

## Global Constraints

- **License: MIT.** Clean-room — no Kaelio/mx/Vibery code or CSS. No "mx"/"Vibery"/"Kaelio" names anywhere.
- **Identifier:** `com.kael.mdflow`. Product name: **MDflow**.
- **Vanilla TS + small central store. No frontend framework, zero new UI deps.**
- Small, focused files; validate only at IO boundaries; no premature abstraction.
- **Phase 1 keeps one document at a time** (no tab bar yet); opening a file replaces the current doc. The `windows[]/tabs[]` model is Phases 3–4.
- File IO errors → non-blocking toast, never crash the window.

---

## File Structure (Phase 1)

```
src/
  store.ts        # NEW: state container { folder, tree, explorer } + subscribe/dispatch
  treeops.ts      # NEW: pure tree helpers (find, setChildren, toggleExpanded)
  icons.ts        # NEW: extension -> file-type icon id (pure)
  activitybar.ts  # NEW: renders activity bar; Explorer toggle
  explorer.ts     # NEW: renders tree; open folder; expand; open file
  resize.ts       # NEW: drag-resize the explorer width
  filesys.ts      # NEW: IPC wrappers (listDir, openFolderDialog) — thin
  main.ts         # MODIFY: mount shell modules, route explorer "open file" into editor
  editor.ts       # unchanged (M1)
  preview.ts      # unchanged (M1)
  views.ts        # unchanged (M1)
  state.ts        # MODIFY: add folder + explorer to persisted session
  files.ts        # unchanged (M1) — still used to read a chosen file
  styles.css      # MODIFY: shell layout (activity bar + explorer + editor area)
  __tests__/
    treeops.test.ts   # NEW
    icons.test.ts     # NEW
index.html        # MODIFY: shell DOM (activity bar, explorer, editor area, status)
src-tauri/src/
  files.rs        # MODIFY: add list_dir command (+ unit test)
  lib.rs          # MODIFY: register list_dir
```

---

### Task 1: Rust `list_dir` command

**Files:**
- Modify: `src-tauri/src/files.rs`, `src-tauri/src/lib.rs`

**Interfaces:**
- Produces (Tauri command): `list_dir(path: String) -> Result<Vec<Entry>, String>` where
  `Entry { name: String, path: String, is_dir: bool }`, sorted directories-first then
  case-insensitive by name. One directory level only (lazy).

- [x] **Step 1: Write the failing Rust test** — add to `src-tauri/src/files.rs`:

```rust
#[cfg(test)]
mod list_dir_tests {
    use super::{read_entries, Entry};
    use std::fs;

    #[test]
    fn lists_dirs_first_then_files_sorted() {
        let tmp = std::env::temp_dir().join("mdflow_listdir_test");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(tmp.join("zeta")).unwrap();
        fs::create_dir_all(tmp.join("alpha")).unwrap();
        fs::write(tmp.join("b.md"), "x").unwrap();
        fs::write(tmp.join("A.txt"), "x").unwrap();

        let got: Vec<(String, bool)> = read_entries(tmp.to_str().unwrap())
            .unwrap()
            .into_iter()
            .map(|e: Entry| (e.name, e.is_dir))
            .collect();

        assert_eq!(
            got,
            vec![
                ("alpha".into(), true),
                ("zeta".into(), true),
                ("A.txt".into(), false),
                ("b.md".into(), false),
            ]
        );
        let _ = fs::remove_dir_all(&tmp);
    }
}
```

- [x] **Step 2: Run to verify it fails**

Run: `cd src-tauri && cargo test list_dir`
Expected: FAIL — `read_entries` / `Entry` not found.

- [x] **Step 3: Implement in `src-tauri/src/files.rs`** (add near the top, after the `use` lines):

```rust
use serde::Serialize;

#[derive(Serialize)]
pub struct Entry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

pub fn read_entries(path: &str) -> Result<Vec<Entry>, String> {
    let mut entries: Vec<Entry> = std::fs::read_dir(path)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .map(|d| {
            let is_dir = d.file_type().map(|t| t.is_dir()).unwrap_or(false);
            Entry {
                name: d.file_name().to_string_lossy().into_owned(),
                path: d.path().to_string_lossy().into_owned(),
                is_dir,
            }
        })
        .collect();
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<Entry>, String> {
    read_entries(&path)
}
```

- [x] **Step 4: Register in `src-tauri/src/lib.rs`** — add `files::list_dir,` to the `generate_handler!` list:

```rust
        .invoke_handler(tauri::generate_handler![
            files::read_file,
            files::save_file,
            files::get_initial_file,
            files::word_count,
            files::list_dir,
            set_soft_wrap,
        ])
```

- [x] **Step 5: Run tests**

Run: `cd src-tauri && cargo test list_dir`
Expected: PASS (1 test).

- [x] **Step 6: Commit**

```bash
git add src-tauri/src/files.rs src-tauri/src/lib.rs
git commit -m "feat: list_dir command (lazy directory listing)"
```

---

### Task 2: `treeops.ts` — pure tree helpers

**Files:**
- Create: `src/treeops.ts`, `src/__tests__/treeops.test.ts`

**Interfaces:**
- Produces:
  - `type TreeNode = { name: string; path: string; isDir: boolean; expanded: boolean; children: TreeNode[] | null }`
  - `findNode(root: TreeNode, path: string): TreeNode | null`
  - `setChildren(root: TreeNode, path: string, children: TreeNode[]): TreeNode` — returns a new tree with that node's `children` set and `expanded = true` (immutable update).
  - `toggleExpanded(root: TreeNode, path: string): TreeNode` — returns a new tree with that node's `expanded` flipped.

- [x] **Step 1: Write the failing test** — `src/__tests__/treeops.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { findNode, setChildren, toggleExpanded, type TreeNode } from "../treeops";

const leaf = (name: string, isDir = false): TreeNode => ({
  name, path: `/root/${name}`, isDir, expanded: false, children: isDir ? null : null,
});

const root: TreeNode = {
  name: "root", path: "/root", isDir: true, expanded: true,
  children: [leaf("docs", true), leaf("a.md")],
};

describe("treeops", () => {
  it("finds a node by path", () => {
    expect(findNode(root, "/root/docs")?.name).toBe("docs");
    expect(findNode(root, "/root/missing")).toBeNull();
  });

  it("sets children immutably and marks expanded", () => {
    const next = setChildren(root, "/root/docs", [leaf("spec.md")]);
    const docs = findNode(next, "/root/docs")!;
    expect(docs.children?.map((c) => c.name)).toEqual(["spec.md"]);
    expect(docs.expanded).toBe(true);
    expect(findNode(root, "/root/docs")?.children).toBeNull(); // original untouched
  });

  it("toggles expanded", () => {
    const next = toggleExpanded(root, "/root/docs");
    expect(findNode(next, "/root/docs")?.expanded).toBe(true);
    expect(findNode(toggleExpanded(next, "/root/docs"), "/root/docs")?.expanded).toBe(false);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npm run test -- treeops`
Expected: FAIL — cannot find `../treeops`.

- [x] **Step 3: Implement `src/treeops.ts`**

```ts
export type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  expanded: boolean;
  children: TreeNode[] | null;
};

export function findNode(root: TreeNode, path: string): TreeNode | null {
  if (root.path === path) return root;
  if (!root.children) return null;
  for (const child of root.children) {
    const found = findNode(child, path);
    if (found) return found;
  }
  return null;
}

function mapNode(root: TreeNode, path: string, fn: (n: TreeNode) => TreeNode): TreeNode {
  if (root.path === path) return fn(root);
  if (!root.children) return root;
  return { ...root, children: root.children.map((c) => mapNode(c, path, fn)) };
}

export function setChildren(root: TreeNode, path: string, children: TreeNode[]): TreeNode {
  return mapNode(root, path, (n) => ({ ...n, children, expanded: true }));
}

export function toggleExpanded(root: TreeNode, path: string): TreeNode {
  return mapNode(root, path, (n) => ({ ...n, expanded: !n.expanded }));
}
```

- [x] **Step 4: Run tests**

Run: `npm run test -- treeops`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add src/treeops.ts src/__tests__/treeops.test.ts
git commit -m "feat: pure tree helpers + tests"
```

---

### Task 3: `icons.ts` — file-type icon mapping

**Files:**
- Create: `src/icons.ts`, `src/__tests__/icons.test.ts`

**Interfaces:**
- Produces: `fileIcon(name: string, isDir: boolean): string` — returns an icon id from
  `"folder" | "md" | "txt" | "json" | "html" | "pdf" | "file"`.

- [x] **Step 1: Write the failing test** — `src/__tests__/icons.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { fileIcon } from "../icons";

describe("fileIcon", () => {
  it("maps directories", () => expect(fileIcon("docs", true)).toBe("folder"));
  it("maps known extensions", () => {
    expect(fileIcon("README.md", false)).toBe("md");
    expect(fileIcon("notes.markdown", false)).toBe("md");
    expect(fileIcon("a.txt", false)).toBe("txt");
    expect(fileIcon("pkg.json", false)).toBe("json");
    expect(fileIcon("page.HTML", false)).toBe("html");
    expect(fileIcon("doc.pdf", false)).toBe("pdf");
  });
  it("falls back to file", () => expect(fileIcon("Makefile", false)).toBe("file"));
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npm run test -- icons`
Expected: FAIL — cannot find `../icons`.

- [x] **Step 3: Implement `src/icons.ts`**

```ts
const BY_EXT: Record<string, string> = {
  md: "md", markdown: "md", txt: "txt", json: "json",
  html: "html", htm: "html", pdf: "pdf",
};

export function fileIcon(name: string, isDir: boolean): string {
  if (isDir) return "folder";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXT[ext] ?? "file";
}
```

- [x] **Step 4: Run tests**

Run: `npm run test -- icons`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add src/icons.ts src/__tests__/icons.test.ts
git commit -m "feat: file-type icon mapping + tests"
```

---

### Task 4: `store.ts` — central state container

**Files:**
- Create: `src/store.ts`

**Interfaces:**
- Consumes: `TreeNode` from Task 2.
- Produces:
  - `type ShellState = { folder: string | null; tree: TreeNode | null; explorerVisible: boolean; explorerWidth: number }`
  - `getState(): ShellState`
  - `setState(patch: Partial<ShellState>): void` — merges + notifies subscribers.
  - `subscribe(fn: () => void): () => void` — returns an unsubscribe function.

- [x] **Step 1: Implement `src/store.ts`** (glue over the tested `treeops`; no separate unit test — its behavior is exercised by Task 8 session tests and manual runs):

```ts
import type { TreeNode } from "./treeops";

export type ShellState = {
  folder: string | null;
  tree: TreeNode | null;
  explorerVisible: boolean;
  explorerWidth: number;
};

let state: ShellState = {
  folder: null,
  tree: null,
  explorerVisible: true,
  explorerWidth: 240,
};

const listeners = new Set<() => void>();

export function getState(): ShellState {
  return state;
}

export function setState(patch: Partial<ShellState>): void {
  state = { ...state, ...patch };
  for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
```

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/store.ts
git commit -m "feat: central shell state store"
```

---

### Task 5: `filesys.ts` — IPC wrappers

**Files:**
- Create: `src/filesys.ts`

**Interfaces:**
- Consumes: `list_dir` (Task 1); `@tauri-apps/plugin-dialog`.
- Produces:
  - `type Entry = { name: string; path: string; isDir: boolean }`
  - `listDir(path: string): Promise<Entry[]>` — calls `list_dir`, maps `is_dir` → `isDir`.
  - `pickFolder(): Promise<string | null>` — directory open dialog.

- [x] **Step 1: Implement `src/filesys.ts`**

```ts
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type Entry = { name: string; path: string; isDir: boolean };
type RawEntry = { name: string; path: string; is_dir: boolean };

export async function listDir(path: string): Promise<Entry[]> {
  const raw = await invoke<RawEntry[]>("list_dir", { path });
  return raw.map((e) => ({ name: e.name, path: e.path, isDir: e.is_dir }));
}

export async function pickFolder(): Promise<string | null> {
  const dir = await open({ directory: true, multiple: false });
  return typeof dir === "string" ? dir : null;
}
```

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/filesys.ts
git commit -m "feat: filesystem IPC wrappers (listDir, pickFolder)"
```

---

### Task 6: Shell layout (DOM + CSS)

**Files:**
- Modify: `index.html`, `src/styles.css`

**Interfaces:**
- Produces the DOM the render modules target: `#activitybar`, `#activitybar .ab-explorer`,
  `#explorer`, `#explorer-tree`, `#explorer-empty`, `#explorer-folder-name`, the resize
  handle `#explorer-resize`, and the existing `.panes` (`#editor`/`#preview`) now inside
  `#editorarea`. Body keeps the `view-split/editor/preview` classes from M1.

- [x] **Step 1: Restructure `index.html` body**

```html
  <body class="view-split">
    <div id="app">
      <div class="workbench">
        <nav id="activitybar">
          <button class="ab-btn ab-explorer active" id="ab-explorer" title="Explorer" type="button">▤</button>
          <button class="ab-btn ab-settings" id="ab-settings" title="Settings" type="button">⚙</button>
        </nav>

        <aside id="explorer">
          <header class="explorer-header">
            <span id="explorer-folder-name">No folder</span>
            <button id="explorer-open" class="explorer-action" title="Open Folder" type="button">Open</button>
          </header>
          <div id="explorer-tree" class="explorer-tree"></div>
          <div id="explorer-empty" class="explorer-empty">
            <button id="explorer-empty-open" type="button">Open Folder</button>
          </div>
        </aside>
        <div id="explorer-resize" class="resize-handle" aria-hidden="true"></div>

        <section id="editorarea">
          <main class="panes">
            <section class="pane pane-editor" id="editor"></section>
            <div class="seam" aria-hidden="true"></div>
            <section class="pane pane-preview" id="preview"></section>
          </main>
        </section>
      </div>

      <footer class="statusbar">
        <span id="status-path" class="status-path">Untitled</span>
        <span id="status-words" class="status-words">0 words</span>
      </footer>
    </div>
  </body>
```

- [x] **Step 2: Add shell CSS to `src/styles.css`** (append; reuse the M1 theme variables):

```css
/* ---------- Shell ---------- */
#app { grid-template-rows: 1fr var(--status-h); }
.workbench {
  display: grid;
  grid-template-columns: 48px var(--explorer-w, 240px) 1fr;
  min-height: 0;
}
body.explorer-hidden .workbench { grid-template-columns: 48px 0 1fr; }
body.explorer-hidden #explorer, body.explorer-hidden #explorer-resize { display: none; }

#activitybar {
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; padding: 8px 0;
  background: var(--bg-elev); border-right: 1px solid var(--border);
}
#activitybar .ab-settings { margin-top: auto; }
.ab-btn {
  width: 40px; height: 40px; font-size: 18px;
  color: var(--muted); background: transparent; border: 0; border-radius: 8px; cursor: default;
}
.ab-btn:hover { color: var(--text); background: rgba(255,255,255,0.05); }
.ab-btn.active { color: var(--text-strong); box-shadow: inset 2px 0 0 var(--accent); }

#explorer {
  display: flex; flex-direction: column; min-width: 0;
  background: var(--bg-elev); border-right: 1px solid var(--border); overflow: hidden;
}
.explorer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--muted);
}
.explorer-action { font: inherit; font-size: 11px; color: var(--accent); background: none; border: 0; cursor: default; }
.explorer-tree { flex: 1; overflow: auto; padding-bottom: 8px; }
.explorer-empty { display: none; padding: 24px 12px; }
body.no-folder .explorer-tree { display: none; }
body.no-folder .explorer-empty { display: block; }
.explorer-empty button { font: inherit; color: var(--text); background: rgba(255,255,255,0.05);
  border: 1px solid var(--border); border-radius: 7px; padding: 7px 12px; cursor: default; }

.tree-row {
  display: flex; align-items: center; gap: 6px;
  padding: 2px 10px 2px calc(10px + var(--depth, 0) * 14px);
  font-size: 13px; color: var(--text); cursor: default; white-space: nowrap;
}
.tree-row:hover { background: rgba(255,255,255,0.04); }
.tree-row.active { background: var(--selection); }
.tree-caret { width: 12px; color: var(--faint); }
.tree-icon { width: 16px; text-align: center; color: var(--muted); }

.resize-handle { width: 4px; margin-left: -2px; cursor: col-resize; background: transparent; }
.resize-handle:hover { background: var(--accent); }

#editorarea { min-width: 0; min-height: 0; display: flex; }
#editorarea .panes { flex: 1; }
```

- [x] **Step 3: Verify the layout renders** — start dev (`npm run tauri dev`) and confirm: activity bar on the left, an empty explorer panel with an "Open Folder" empty state, and the editor/preview filling the rest. (Wiring comes next.)

- [x] **Step 4: Commit**

```bash
git add index.html src/styles.css
git commit -m "feat: shell layout (activity bar + explorer + editor area)"
```

---

### Task 7: `explorer.ts` + `activitybar.ts` — render + interactions

**Files:**
- Create: `src/explorer.ts`, `src/activitybar.ts`

**Interfaces:**
- Consumes: `store` (Task 4), `treeops` (Task 2), `icons` (Task 3), `filesys` (Task 5).
- Produces:
  - `initActivityBar(): void`
  - `initExplorer(onOpenFile: (path: string) => void): void` — renders the tree on store
    changes; clicking a folder lazy-loads/expands; clicking a file calls `onOpenFile(path)`.
  - `openFolder(path: string): Promise<void>` — sets folder, loads root tree.

- [x] **Step 1: Implement `src/activitybar.ts`**

```ts
import { getState, setState } from "./store";

export function initActivityBar(): void {
  const explorerBtn = document.getElementById("ab-explorer")!;
  explorerBtn.addEventListener("click", () => {
    const visible = !getState().explorerVisible;
    setState({ explorerVisible: visible });
    document.body.classList.toggle("explorer-hidden", !visible);
    explorerBtn.classList.toggle("active", visible);
  });
  // Settings gear opens settings.json — wired in the Top-bar sub-project; no-op for now.
}
```

- [x] **Step 2: Implement `src/explorer.ts`**

```ts
import { getState, setState, subscribe } from "./store";
import { findNode, setChildren, toggleExpanded, type TreeNode } from "./treeops";
import { fileIcon } from "./icons";
import { listDir, pickFolder } from "./filesys";

const ICON: Record<string, string> = {
  folder: "▸", md: "≡", txt: "≡", json: "{}", html: "<>", pdf: "▤", file: "·",
};

let activePath: string | null = null;
let openFileCb: (path: string) => void = () => {};

async function toEntries(path: string): Promise<TreeNode[]> {
  const entries = await listDir(path);
  return entries.map((e) => ({
    name: e.name, path: e.path, isDir: e.isDir, expanded: false, children: null,
  }));
}

export async function openFolder(path: string): Promise<void> {
  const children = await toEntries(path);
  const name = path.split("/").pop() || path;
  const root: TreeNode = { name, path, isDir: true, expanded: true, children };
  setState({ folder: path, tree: root });
  document.body.classList.remove("no-folder");
}

async function onRowClick(node: TreeNode): Promise<void> {
  if (node.isDir) {
    const tree = getState().tree!;
    if (node.children === null) {
      setState({ tree: setChildren(tree, node.path, await toEntries(node.path)) });
    } else {
      setState({ tree: toggleExpanded(tree, node.path) });
    }
  } else {
    activePath = node.path;
    openFileCb(node.path);
    render();
  }
}

function rowEl(node: TreeNode, depth: number): HTMLElement {
  const row = document.createElement("div");
  row.className = "tree-row" + (node.path === activePath ? " active" : "");
  row.style.setProperty("--depth", String(depth));
  const caret = node.isDir ? (node.expanded ? "▾" : "▸") : "";
  row.innerHTML =
    `<span class="tree-caret">${caret}</span>` +
    `<span class="tree-icon">${ICON[fileIcon(node.name, node.isDir)]}</span>` +
    `<span class="tree-name"></span>`;
  row.querySelector(".tree-name")!.textContent = node.name;
  row.addEventListener("click", () => onRowClick(node));
  return row;
}

function renderNode(node: TreeNode, depth: number, into: HTMLElement): void {
  if (depth >= 0) into.appendChild(rowEl(node, depth));
  if (node.isDir && node.expanded && node.children) {
    for (const c of node.children) renderNode(c, depth + 1, into);
  }
}

function render(): void {
  const { tree, folder } = getState();
  document.getElementById("explorer-folder-name")!.textContent = folder
    ? folder.split("/").pop() || folder
    : "No folder";
  const treeEl = document.getElementById("explorer-tree")!;
  treeEl.innerHTML = "";
  if (tree?.children) for (const c of tree.children) renderNode(c, 0, treeEl);
}

export function initExplorer(onOpenFile: (path: string) => void): void {
  openFileCb = onOpenFile;
  if (!getState().folder) document.body.classList.add("no-folder");
  const pick = async () => {
    const dir = await pickFolder();
    if (dir) await openFolder(dir);
  };
  document.getElementById("explorer-open")!.addEventListener("click", pick);
  document.getElementById("explorer-empty-open")!.addEventListener("click", pick);
  subscribe(render);
  render();
}
```

- [x] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add src/explorer.ts src/activitybar.ts
git commit -m "feat: explorer + activity bar render and interactions"
```

---

### Task 8: Wire shell into `main.ts` + session persistence

**Files:**
- Modify: `src/main.ts`, `src/state.ts`

**Interfaces:**
- Consumes: everything above. `state.ts` gains folder + explorer fields in persisted state.

- [x] **Step 1: Extend session state in `src/state.ts`** — replace the `UIState` type and defaults:

```ts
export type ViewMode = "split" | "editor" | "preview";
export type UIState = {
  viewMode: ViewMode;
  zoom: number;
  softWrap: boolean;
  folder: string | null;
  explorerVisible: boolean;
  explorerWidth: number;
};

const KEY = "mdflow.ui";
const DEFAULTS: UIState = {
  viewMode: "split", zoom: 1, softWrap: true,
  folder: null, explorerVisible: true, explorerWidth: 240,
};
```

(The `loadState`/`saveState` bodies are unchanged — they already spread `DEFAULTS`.)

- [x] **Step 2: Update `src/__tests__/state.test.ts` defaults** so the three default-shape assertions match the new fields, e.g.:

```ts
expect(loadState()).toEqual({
  viewMode: "split", zoom: 1, softWrap: true,
  folder: null, explorerVisible: true, explorerWidth: 240,
});
```

(Apply to the "returns defaults", "falls back", and "merges partial" tests.)

- [x] **Step 3: Run state tests**

Run: `npm run test -- state`
Expected: PASS.

- [x] **Step 4: Wire the shell in `src/main.ts`** — add imports and init after the editor is created:

```ts
import { initActivityBar } from "./activitybar";
import { initExplorer, openFolder } from "./explorer";
import { initResize } from "./resize";
import { setState } from "./store";
```

Then, after `editor` is created and `ui` is loaded, add:

```ts
// Shell: restore persisted explorer state into the store, then mount.
setState({
  folder: ui.folder,
  explorerVisible: ui.explorerVisible,
  explorerWidth: ui.explorerWidth,
});
document.documentElement.style.setProperty("--explorer-w", `${ui.explorerWidth}px`);
document.body.classList.toggle("explorer-hidden", !ui.explorerVisible);

initActivityBar();
initResize((w) => { ui = { ...ui, explorerWidth: w }; saveState(ui); });
initExplorer((path) => doOpenPath(path));
if (ui.folder) openFolder(ui.folder).catch(() => {});
```

Add a `doOpenPath` helper next to `doOpen` (reuses M1's read path):

```ts
import { invoke } from "@tauri-apps/api/core"; // already imported in M1
async function doOpenPath(path: string): Promise<void> {
  const contents = await invoke<string>("read_file", { path });
  editor.setDoc(contents);
  setPath(path);
  updatePreview(contents);
}
```

Persist folder/explorer changes: subscribe once to mirror store → session:

```ts
import { subscribe, getState } from "./store";
subscribe(() => {
  const s = getState();
  ui = { ...ui, folder: s.folder, explorerVisible: s.explorerVisible, explorerWidth: s.explorerWidth };
  saveState(ui);
});
```

- [ ] **Step 5: Verify the full flow** — `npm run tauri dev`:
  - Activity-bar Explorer button toggles the explorer.
  - "Open Folder" loads a folder; folders expand/collapse; file-type icons show.
  - Click a file → it opens in the editor + preview; status path updates.
  - Quit + relaunch → the folder reopens and explorer width/visibility persist.

  Browser-level toggle and resize persistence are verified. Native folder-dialog and
  file-opening checks remain in `docs/review.md`.

- [x] **Step 6: Commit**

```bash
git add src/main.ts src/state.ts src/__tests__/state.test.ts
git commit -m "feat: wire shell into app + persist folder/explorer session"
```

---

### Task 9: `resize.ts` — draggable explorer width

**Files:**
- Create: `src/resize.ts`

**Interfaces:**
- Produces: `initResize(onCommit: (width: number) => void): void` — drag `#explorer-resize`
  to set `--explorer-w` (clamped 160–480px); calls `onCommit(finalWidth)` on mouseup.

- [x] **Step 1: Implement `src/resize.ts`**

```ts
export function initResize(onCommit: (width: number) => void): void {
  const handle = document.getElementById("explorer-resize")!;
  const root = document.documentElement;
  let dragging = false;

  const clamp = (w: number) => Math.max(160, Math.min(480, w));

  const onMove = (e: MouseEvent) => {
    if (!dragging) return;
    const w = clamp(e.clientX - 48); // 48px activity bar
    root.style.setProperty("--explorer-w", `${w}px`);
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    const w = parseInt(getComputedStyle(root).getPropertyValue("--explorer-w"), 10);
    onCommit(clamp(w || 240));
  };
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}
```

- [x] **Step 2: Verify** — `npm run tauri dev`, drag the border between explorer and editor; width changes and persists across relaunch.

- [x] **Step 3: Commit**

```bash
git add src/resize.ts
git commit -m "feat: draggable explorer width"
```

---

### Task 10: Phase 1 smoke test + docs

**Files:**
- Modify: `docs/review.md`, `docs/tasks.md`

- [x] **Step 1: Run all automated tests**

Run: `npm run test && (cd src-tauri && cargo test)`
Expected: all green (treeops ×3, icons ×3, state ×4, preview ×5; Rust list_dir + word_count).

- [ ] **Step 2: Manual smoke (`npm run tauri dev`), record in `docs/review.md`:**
  - Activity bar toggles explorer; state persists.
  - Open Folder → tree with correct dir-first ordering + file-type icons.
  - Expand/collapse folders (lazy load).
  - Click file → opens in editor/preview; M1 view modes (⌘B/E/P), save, soft wrap still work.
  - Explorer width drag persists; folder reopens on relaunch.

  Automated and browser-level checks are recorded. Native folder-dialog interactions
  remain as an explicit checklist because macOS accessibility capture was unavailable.

- [x] **Step 3: Update `docs/tasks.md`** — mark Phase 1 tasks done; note Phases 2–4 pending their own plans.

- [x] **Step 4: Commit**

```bash
git add docs/review.md docs/tasks.md
git commit -m "test: Shell Phase 1 smoke test recorded"
```

---

## Self-Review

**Spec coverage (Phase 1 scope):**
- Activity bar + Explorer toggle → Tasks 6, 7 ✓
- Open Folder + lazy tree + dir-first sort → Tasks 1, 5, 7 ✓
- File-type icons → Tasks 3, 7 ✓
- Click file → opens in main editor → Task 8 ✓
- Keep M1 editor/preview/view-modes as main window → Tasks 6, 8 (unchanged modules) ✓
- Resizable explorer → Task 9 ✓
- Session: folder + explorer persist/restore → Task 8 ✓
- Pure tree logic unit-tested → Task 2 ✓; Rust list_dir tested → Task 1 ✓
- Deferred correctly (not in Phase 1): CRUD (Phase 2), tabs (Phase 3), sub window/split/per-window modes (Phase 4) — matches spec phasing ✓

**Placeholder scan:** none — every code step has complete code; the Settings gear no-op is an explicit, documented scope boundary (Top-bar sub-project).

**Type consistency:** `TreeNode` shape identical across treeops/store/explorer; `Entry`/`is_dir`→`isDir` mapping consistent (Rust `Entry`, TS `Entry`); `fileIcon` ids match the `ICON` map keys in explorer; `UIState` fields used in main.ts match Task 8's definition.

**Note:** Phase 1 keeps one document at a time (no tab bar) and the global M1 view-mode model. The formal `windows[]`/`tabs[]` store shape from the spec is introduced in Phases 3–4; Phase 1's `store.ts` deliberately holds only shell (folder/explorer) state to avoid premature abstraction.
