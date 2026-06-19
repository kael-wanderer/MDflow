# MDflow Shell — Phase 2 Implementation Plan (Explorer File Management)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Phase 1 file explorer full file management: right-click to create, rename (inline), delete (to Trash), duplicate, copy path, and reveal in Finder — with the tree refreshing after each change.

**Architecture:** New Rust commands in `files.rs` do the filesystem work (`trash` crate for safe delete, `tauri-plugin-opener` for reveal). The frontend adds thin IPC wrappers (`filesys.ts`), a right-click **context menu** module, and **inline editing** (a text input inside a tree row) for new/rename. After any change, the action layer **re-lists the affected parent directory** and updates the store via the existing `setChildren` — so no surgical tree mutation is needed. The only pure logic worth unit-testing is duplicate-name generation (Rust) and `parentPath` (TS).

**Tech Stack:** Tauri 2 + Rust, Vite + TS (from Phases 1/M1). New deps: `trash` crate, `tauri-plugin-opener`, `@tauri-apps/plugin-clipboard-manager`.

## Global Constraints

- **License: MIT.** Clean-room — no Kaelio/mx/Vibery code or CSS. No "mx"/"Vibery"/"Kaelio" names anywhere.
- **Identifier:** `com.kael.mdflow`. Product name: **MDflow**.
- **Vanilla TS + the existing `store.ts`. No frontend framework.**
- Small, focused files; validate only at the IPC boundary; no premature abstraction.
- **Delete goes to the OS Trash (recoverable) — never a silent permanent delete**, and always behind a confirm dialog.
- File IO / CRUD errors → non-blocking message, never crash the window.
- Builds on Phase 1 (`store.ts`, `treeops.ts`, `explorer.ts`, `filesys.ts`, `files.rs`).

---

## File Structure (Phase 2)

```
src/
  paths.ts            # NEW: pure path helpers (parentPath, joinPath)
  contextmenu.ts      # NEW: generic right-click menu (build, position, dismiss)
  filesys.ts          # MODIFY: add createFile/createDir/renamePath/deletePath/
                      #         duplicatePath/revealInFinder/copyPath wrappers
  explorer.ts         # MODIFY: right-click menu, inline new/rename input, refresh
  store.ts            # MODIFY: add refreshDir() action helper (re-list + setChildren)
  __tests__/
    paths.test.ts     # NEW
src-tauri/src/
  files.rs            # MODIFY: create_file/create_dir/rename_path/delete_to_trash/
                      #         duplicate_path (+ duplicate_target pure unit test)
  lib.rs              # MODIFY: register the new commands
  Cargo.toml          # MODIFY: add `trash`
  capabilities/default.json  # MODIFY: add opener + clipboard permissions
package.json          # MODIFY: add @tauri-apps/plugin-clipboard-manager, @tauri-apps/plugin-opener
```

---

### Task 1: Add dependencies & permissions

**Files:**
- Modify: `src-tauri/Cargo.toml`, `package.json`, `src-tauri/capabilities/default.json`, `src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `trash` crate available in Rust; `tauri_plugin_opener` registered; opener +
  clipboard JS plugins installed; capability permissions for both.

- [x] **Step 1: Add the Rust + JS deps**

```bash
cd src-tauri && cargo add trash && cd ..
npm run tauri add opener
npm install @tauri-apps/plugin-clipboard-manager
```

- [x] **Step 2: Register the opener plugin in `src-tauri/src/lib.rs`** — add to the builder chain after the dialog plugin:

```rust
        .plugin(tauri_plugin_opener::init())
```

(`npm run tauri add opener` already added the Cargo dependency and the `opener:default`
permission; confirm `opener:default` is present in `capabilities/default.json`.)

- [x] **Step 3: Add the clipboard permission to `src-tauri/capabilities/default.json`** — add to the `permissions` array:

```json
    "clipboard-manager:allow-write-text"
```

- [x] **Step 4: Verify it builds**

Run: `cd src-tauri && cargo check`
Expected: builds clean.
Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock package.json package-lock.json src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "chore: add trash crate, opener + clipboard plugins"
```

---

### Task 2: Rust create / rename / delete commands

**Files:**
- Modify: `src-tauri/src/files.rs`, `src-tauri/src/lib.rs`

**Interfaces:**
- Produces (Tauri commands):
  - `create_file(path: String) -> Result<(), String>` — errors if it already exists.
  - `create_dir(path: String) -> Result<(), String>` — errors if it already exists.
  - `rename_path(from: String, to: String) -> Result<(), String>` — errors if `to` exists.
  - `delete_to_trash(path: String) -> Result<(), String>` — moves to OS Trash.

- [x] **Step 1: Write the failing test** — add to `src-tauri/src/files.rs`:

```rust
#[cfg(test)]
mod crud_tests {
    use super::{create_dir_at, create_file_at, rename_at};
    use std::fs;

    #[test]
    fn create_and_rename_reject_existing() {
        let tmp = std::env::temp_dir().join("mdflow_crud_test");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();
        let f = tmp.join("a.md");
        let fs_str = f.to_str().unwrap();

        create_file_at(fs_str).unwrap();
        assert!(f.exists());
        assert!(create_file_at(fs_str).is_err()); // already exists

        let d = tmp.join("sub");
        create_dir_at(d.to_str().unwrap()).unwrap();
        assert!(d.is_dir());

        let renamed = tmp.join("b.md");
        rename_at(fs_str, renamed.to_str().unwrap()).unwrap();
        assert!(renamed.exists() && !f.exists());
        assert!(rename_at(renamed.to_str().unwrap(), d.to_str().unwrap()).is_err()); // dest exists

        let _ = fs::remove_dir_all(&tmp);
    }
}
```

- [x] **Step 2: Run to verify it fails**

Run: `cd src-tauri && cargo test crud`
Expected: FAIL — `create_file_at` etc. not found.

- [x] **Step 3: Implement in `src-tauri/src/files.rs`**

```rust
use std::path::Path;

pub fn create_file_at(path: &str) -> Result<(), String> {
    if Path::new(path).exists() {
        return Err("A file or folder with that name already exists.".into());
    }
    std::fs::write(path, "").map_err(|e| e.to_string())
}

pub fn create_dir_at(path: &str) -> Result<(), String> {
    if Path::new(path).exists() {
        return Err("A file or folder with that name already exists.".into());
    }
    std::fs::create_dir(path).map_err(|e| e.to_string())
}

pub fn rename_at(from: &str, to: &str) -> Result<(), String> {
    if Path::new(to).exists() {
        return Err("A file or folder with that name already exists.".into());
    }
    std::fs::rename(from, to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> { create_file_at(&path) }

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> { create_dir_at(&path) }

#[tauri::command]
pub fn rename_path(from: String, to: String) -> Result<(), String> { rename_at(&from, &to) }

#[tauri::command]
pub fn delete_to_trash(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|e| e.to_string())
}
```

- [x] **Step 4: Register in `src-tauri/src/lib.rs`** — add to `generate_handler!`:

```rust
            files::create_file,
            files::create_dir,
            files::rename_path,
            files::delete_to_trash,
```

- [x] **Step 5: Run tests**

Run: `cd src-tauri && cargo test crud`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src-tauri/src/files.rs src-tauri/src/lib.rs
git commit -m "feat: create/rename/delete-to-trash commands"
```

---

### Task 3: Rust duplicate command (pure name logic, TDD)

**Files:**
- Modify: `src-tauri/src/files.rs`, `src-tauri/src/lib.rs`

**Interfaces:**
- Produces:
  - `duplicate_target(dir, stem, ext, exists) -> String` — pure: returns the full path for
    a copy. `a.md` → `a copy.md`; if that exists, `a copy 2.md`, `a copy 3.md`, …
    (`ext` empty for extensionless / directories).
  - `duplicate_path(path: String) -> Result<String, String>` — copies the file/dir and
    returns the new path.

- [x] **Step 1: Write the failing test** — add to `src-tauri/src/files.rs`:

```rust
#[cfg(test)]
mod duplicate_tests {
    use super::duplicate_target;
    use std::collections::HashSet;

    #[test]
    fn picks_first_free_copy_name() {
        let mut taken: HashSet<String> = HashSet::new();
        let exists = |p: &str| taken.contains(p);

        assert_eq!(duplicate_target("/d", "a", "md", &exists), "/d/a copy.md");

        taken.insert("/d/a copy.md".into());
        assert_eq!(duplicate_target("/d", "a", "md", &exists), "/d/a copy 2.md");

        taken.insert("/d/a copy 2.md".into());
        assert_eq!(duplicate_target("/d", "a", "md", &exists), "/d/a copy 3.md");

        // extensionless (e.g. a folder)
        assert_eq!(duplicate_target("/d", "notes", "", &exists), "/d/notes copy");
    }
}
```

- [x] **Step 2: Run to verify it fails**

Run: `cd src-tauri && cargo test duplicate`
Expected: FAIL — `duplicate_target` not found.

- [x] **Step 3: Implement in `src-tauri/src/files.rs`**

```rust
pub fn duplicate_target(dir: &str, stem: &str, ext: &str, exists: &dyn Fn(&str) -> bool) -> String {
    let dot = if ext.is_empty() { "".to_string() } else { format!(".{ext}") };
    let first = format!("{dir}/{stem} copy{dot}");
    if !exists(&first) {
        return first;
    }
    let mut n = 2;
    loop {
        let candidate = format!("{dir}/{stem} copy {n}{dot}");
        if !exists(&candidate) {
            return candidate;
        }
        n += 1;
    }
}

#[tauri::command]
pub fn duplicate_path(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    let dir = p.parent().and_then(|d| d.to_str()).ok_or("Invalid path")?;
    let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("copy");
    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("");
    let target = duplicate_target(dir, stem, ext, &|c| Path::new(c).exists());
    if p.is_dir() {
        copy_dir_recursive(&path, &target).map_err(|e| e.to_string())?;
    } else {
        std::fs::copy(&path, &target).map_err(|e| e.to_string())?;
    }
    Ok(target)
}

fn copy_dir_recursive(from: &str, to: &str) -> std::io::Result<()> {
    std::fs::create_dir_all(to)?;
    for entry in std::fs::read_dir(from)? {
        let entry = entry?;
        let dest = format!("{to}/{}", entry.file_name().to_string_lossy());
        if entry.file_type()?.is_dir() {
            copy_dir_recursive(&entry.path().to_string_lossy(), &dest)?;
        } else {
            std::fs::copy(entry.path(), dest)?;
        }
    }
    Ok(())
}
```

- [x] **Step 4: Register in `src-tauri/src/lib.rs`** — add `files::duplicate_path,` to `generate_handler!`.

- [x] **Step 5: Run tests**

Run: `cd src-tauri && cargo test duplicate`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src-tauri/src/files.rs src-tauri/src/lib.rs
git commit -m "feat: duplicate_path with pure copy-name logic"
```

---

### Task 4: `paths.ts` — pure path helpers

**Files:**
- Create: `src/paths.ts`, `src/__tests__/paths.test.ts`

**Interfaces:**
- Produces:
  - `parentPath(path: string): string` — the containing directory (`/a/b/c.md` → `/a/b`).
  - `joinPath(dir: string, name: string): string` — `/a/b` + `c.md` → `/a/b/c.md`.

- [x] **Step 1: Write the failing test** — `src/__tests__/paths.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parentPath, joinPath } from "../paths";

describe("paths", () => {
  it("parentPath returns the containing dir", () => {
    expect(parentPath("/a/b/c.md")).toBe("/a/b");
    expect(parentPath("/a")).toBe("/");
  });
  it("joinPath joins dir + name", () => {
    expect(joinPath("/a/b", "c.md")).toBe("/a/b/c.md");
    expect(joinPath("/", "c.md")).toBe("/c.md");
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npm run test -- paths`
Expected: FAIL — cannot find `../paths`.

- [x] **Step 3: Implement `src/paths.ts`**

```ts
export function parentPath(path: string): string {
  const i = path.lastIndexOf("/");
  if (i <= 0) return "/";
  return path.slice(0, i);
}

export function joinPath(dir: string, name: string): string {
  return dir === "/" ? `/${name}` : `${dir}/${name}`;
}
```

- [x] **Step 4: Run tests**

Run: `npm run test -- paths`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/paths.ts src/__tests__/paths.test.ts
git commit -m "feat: pure path helpers + tests"
```

---

### Task 5: `filesys.ts` — IPC wrappers for the new commands

**Files:**
- Modify: `src/filesys.ts`

**Interfaces:**
- Consumes: the Rust commands from Tasks 2–3; `@tauri-apps/plugin-opener`,
  `@tauri-apps/plugin-clipboard-manager`.
- Produces (append to `filesys.ts`):
  - `createFile(path)`, `createDir(path)`, `renamePath(from, to)`, `deletePath(path)`,
    `duplicatePath(path): Promise<string>`, `revealInFinder(path)`, `copyPath(path)` —
    all `Promise<void>` except `duplicatePath`.

- [x] **Step 1: Append to `src/filesys.ts`**

```ts
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

export function createFile(path: string): Promise<void> {
  return invoke("create_file", { path });
}
export function createDir(path: string): Promise<void> {
  return invoke("create_dir", { path });
}
export function renamePath(from: string, to: string): Promise<void> {
  return invoke("rename_path", { from, to });
}
export function deletePath(path: string): Promise<void> {
  return invoke("delete_to_trash", { path });
}
export function duplicatePath(path: string): Promise<string> {
  return invoke<string>("duplicate_path", { path });
}
export function revealInFinder(path: string): Promise<void> {
  return revealItemInDir(path);
}
export function copyPath(path: string): Promise<void> {
  return writeText(path);
}
```

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/filesys.ts
git commit -m "feat: IPC wrappers for file management + reveal + copy path"
```

---

### Task 6: `store.ts` — `refreshDir` action

**Files:**
- Modify: `src/store.ts`

**Interfaces:**
- Consumes: `listDir` (Phase 1 `filesys`), `setChildren`/`findNode` (Phase 1 `treeops`),
  `parentPath` (Task 4).
- Produces: `refreshDir(dirPath: string): Promise<void>` — re-lists `dirPath` and updates
  that node's children in the tree (no-op if the dir isn't loaded/visible in the tree).

- [x] **Step 1: Append to `src/store.ts`**

```ts
import { setChildren, findNode, type TreeNode } from "./treeops";
import { listDir } from "./filesys";

export async function refreshDir(dirPath: string): Promise<void> {
  const tree = state.tree;
  if (!tree) return;
  // Refresh only if this dir is the root or an already-loaded node.
  const isRoot = tree.path === dirPath;
  if (!isRoot && findNode(tree, dirPath) === null) return;
  const entries = await listDir(dirPath);
  const children: TreeNode[] = entries.map((e) => ({
    name: e.name, path: e.path, isDir: e.isDir, expanded: false, children: null,
  }));
  setState({ tree: setChildren(tree, dirPath, children) });
}
```

(Note: `setChildren` on the root path updates the root's children; `findNode` returns the
root when `path === root.path`, so the `isRoot` guard covers the top level.)

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/store.ts
git commit -m "feat: refreshDir store action (re-list a directory)"
```

---

### Task 7: `contextmenu.ts` — generic right-click menu

**Files:**
- Create: `src/contextmenu.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Produces:
  - `type MenuItem = { label: string; action: () => void } | "separator"`
  - `showContextMenu(x: number, y: number, items: MenuItem[]): void` — renders a floating
    menu at (x,y); dismisses on outside click, Escape, or after an item runs.

- [x] **Step 1: Implement `src/contextmenu.ts`**

```ts
export type MenuItem = { label: string; action: () => void } | "separator";

let current: HTMLElement | null = null;

function dismiss(): void {
  current?.remove();
  current = null;
  document.removeEventListener("mousedown", onOutside, true);
  document.removeEventListener("keydown", onKey, true);
}
function onOutside(e: MouseEvent): void {
  if (current && !current.contains(e.target as Node)) dismiss();
}
function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") dismiss();
}

export function showContextMenu(x: number, y: number, items: MenuItem[]): void {
  dismiss();
  const menu = document.createElement("div");
  menu.className = "ctx-menu";
  for (const item of items) {
    if (item === "separator") {
      const sep = document.createElement("div");
      sep.className = "ctx-sep";
      menu.appendChild(sep);
      continue;
    }
    const row = document.createElement("button");
    row.className = "ctx-item";
    row.type = "button";
    row.textContent = item.label;
    row.addEventListener("click", () => { dismiss(); item.action(); });
    menu.appendChild(row);
  }
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  document.body.appendChild(menu);
  current = menu;
  // keep on-screen
  const r = menu.getBoundingClientRect();
  if (r.right > window.innerWidth) menu.style.left = `${x - r.width}px`;
  if (r.bottom > window.innerHeight) menu.style.top = `${y - r.height}px`;
  document.addEventListener("mousedown", onOutside, true);
  document.addEventListener("keydown", onKey, true);
}
```

- [x] **Step 2: Add menu CSS to `src/styles.css`**

```css
/* ---------- Context menu ---------- */
.ctx-menu {
  position: fixed; z-index: 1000; min-width: 180px; padding: 4px;
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: 9px; box-shadow: 0 8px 28px rgba(0,0,0,0.45);
}
.ctx-item {
  display: block; width: 100%; text-align: left;
  padding: 6px 10px; font: inherit; font-size: 13px; color: var(--text);
  background: none; border: 0; border-radius: 6px; cursor: default;
}
.ctx-item:hover { background: var(--selection); color: var(--text-strong); }
.ctx-sep { height: 1px; margin: 4px 6px; background: var(--border-soft); }
```

- [x] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add src/contextmenu.ts src/styles.css
git commit -m "feat: generic right-click context menu"
```

---

### Task 8: Inline editing (new file/folder + rename)

**Files:**
- Modify: `src/explorer.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `paths` (Task 4), `filesys` (Task 5), `refreshDir` (Task 6), `store`.
- Produces (exported from `explorer.ts`):
  - `startCreate(parentDir: string, kind: "file" | "dir"): void` — shows an inline input
    under `parentDir`; on Enter, calls `createFile`/`createDir` then `refreshDir`.
  - `startRename(path: string, currentName: string): void` — shows an inline input on the
    row; on Enter, calls `renamePath(path, joinPath(parentPath(path), newName))` then
    `refreshDir(parentPath(path))`.
  - Errors surface via `alert`-style message (`message()` from the dialog plugin).

- [x] **Step 1: Add the inline-input helper to `src/explorer.ts`** (imports at top):

```ts
import { message } from "@tauri-apps/plugin-dialog";
import { parentPath, joinPath } from "./paths";
import { refreshDir } from "./store";
import { createFile, createDir, renamePath, deletePath, duplicatePath, revealInFinder, copyPath } from "./filesys";

function promptInline(
  anchor: HTMLElement, initial: string, onCommit: (value: string) => Promise<void>
): void {
  const input = document.createElement("input");
  input.className = "tree-input";
  input.value = initial;
  anchor.replaceChildren(input);
  input.focus();
  input.select();
  let done = false;
  const finish = async (commit: boolean) => {
    if (done) return;
    done = true;
    const value = input.value.trim();
    if (commit && value) {
      try { await onCommit(value); } catch (e) { await message(String(e), { kind: "error" }); }
    }
    render();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    else if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
}

export function startCreate(parentDir: string, kind: "file" | "dir"): void {
  const treeEl = document.getElementById("explorer-tree")!;
  const holder = document.createElement("div");
  holder.className = "tree-row";
  treeEl.appendChild(holder);
  promptInline(holder, "", async (name) => {
    const target = joinPath(parentDir, name);
    if (kind === "file") await createFile(target); else await createDir(target);
    await refreshDir(parentDir);
  });
}

export function startRename(path: string, currentName: string): void {
  // Re-render first so the row exists; then swap the active row's name cell.
  render();
  const rows = document.querySelectorAll<HTMLElement>(".tree-row");
  const row = Array.from(rows).find((r) => r.dataset.path === path);
  const nameCell = row?.querySelector<HTMLElement>(".tree-name");
  if (!nameCell) return;
  promptInline(nameCell, currentName, async (name) => {
    await renamePath(path, joinPath(parentPath(path), name));
    await refreshDir(parentPath(path));
  });
}
```

- [x] **Step 2: Tag rows with their path** — in `rowEl(...)` (from Phase 1), add `row.dataset.path = node.path;` right after the row element is created, so `startRename` can find the row.

- [x] **Step 3: Add input CSS to `src/styles.css`**

```css
.tree-input {
  flex: 1; min-width: 0; font: inherit; font-size: 13px;
  color: var(--text-strong); background: var(--bg);
  border: 1px solid var(--accent); border-radius: 4px; padding: 1px 4px;
}
```

- [x] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 5: Commit**

```bash
git add src/explorer.ts src/styles.css
git commit -m "feat: inline new-file/folder and rename inputs"
```

---

### Task 9: Right-click menu wiring + delete/duplicate/copy/reveal

**Files:**
- Modify: `src/explorer.ts`

**Interfaces:**
- Consumes: `showContextMenu` (Task 7), inline editors (Task 8), `filesys` + `refreshDir`,
  the dialog plugin's `confirm`.
- Produces: right-clicking a tree row opens the context menu with the full action set;
  the empty area / folder header offers New File / New Folder at the root.

- [x] **Step 1: Add the row context menu in `src/explorer.ts`** — import `confirm` and `showContextMenu`:

```ts
import { confirm } from "@tauri-apps/plugin-dialog";
import { showContextMenu, type MenuItem } from "./contextmenu";
```

In `rowEl(node, depth)`, after the click handler, add a contextmenu handler:

```ts
  row.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const dir = node.isDir ? node.path : parentPath(node.path);
    const items: MenuItem[] = [
      { label: "New File", action: () => startCreate(dir, "file") },
      { label: "New Folder", action: () => startCreate(dir, "dir") },
      "separator",
      { label: "Rename", action: () => startRename(node.path, node.name) },
      { label: "Duplicate", action: async () => { await duplicatePath(node.path); await refreshDir(parentPath(node.path)); } },
      { label: "Delete", action: () => deleteNode(node.path, node.name) },
      "separator",
      { label: "Copy Path", action: () => void copyPath(node.path) },
      { label: "Reveal in Finder", action: () => void revealInFinder(node.path) },
    ];
    showContextMenu(e.clientX, e.clientY, items);
  });
```

- [x] **Step 2: Add the delete-with-confirm helper to `src/explorer.ts`**

```ts
async function deleteNode(path: string, name: string): Promise<void> {
  const ok = await confirm(`Move "${name}" to the Trash?`, { title: "Delete", kind: "warning" });
  if (!ok) return;
  try {
    await deletePath(path);
    await refreshDir(parentPath(path));
  } catch (e) {
    await message(String(e), { kind: "error" });
  }
}
```

- [x] **Step 3: Add a root context menu** — in `initExplorer`, attach to the tree container and folder header so right-clicking empty space offers New File/New Folder at the folder root:

```ts
  const rootMenu = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest(".tree-row")) return; // rows handle their own
    const folder = getState().folder;
    if (!folder) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      { label: "New File", action: () => startCreate(folder, "file") },
      { label: "New Folder", action: () => startCreate(folder, "dir") },
    ]);
  };
  document.getElementById("explorer-tree")!.addEventListener("contextmenu", rootMenu);
```

- [x] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 5: Commit**

```bash
git add src/explorer.ts
git commit -m "feat: explorer context menu (new/rename/duplicate/delete/copy/reveal)"
```

---

### Task 10: Refresh-on-focus + smoke test + docs

**Files:**
- Modify: `src/main.ts`, `docs/review.md`, `docs/tasks.md`

**Interfaces:**
- Consumes: `refreshDir` and the current folder; refreshes the root when the window
  regains focus (catches external changes).

- [x] **Step 1: Refresh the tree on window focus** — add to `src/main.ts`:

```ts
import { refreshDir } from "./store";
window.addEventListener("focus", () => {
  const folder = getState().folder;
  if (folder) refreshDir(folder).catch(() => {});
});
```

- [x] **Step 2: Run all automated tests**

Run: `npm run test && (cd src-tauri && cargo test)`
Expected: all green (paths ×2 added; Rust crud + duplicate added).

- [ ] **Step 3: Manual smoke (`npm run tauri dev`), record in `docs/review.md`:**
  - Right-click a file/folder → menu shows all actions.
  - New File / New Folder (inline input) creates and appears in the tree.
  - Rename (inline) renames; duplicate creates `… copy`.
  - Delete → confirm dialog → file moves to Trash and leaves the tree.
  - Copy Path puts the path on the clipboard; Reveal in Finder opens Finder selecting it.
  - Right-click empty explorer area → New File/Folder at the folder root.
  - Edit a file externally, refocus the window → tree reflects new/removed files.

  Automated and launch checks are recorded. Native menu/dialog interactions remain
  as an explicit checklist in `docs/review.md`.

- [x] **Step 4: Update `docs/tasks.md`** — mark Phase 2 done; set Phase 3 as next.

- [x] **Step 5: Commit**

```bash
git add src/main.ts docs/review.md docs/tasks.md
git commit -m "feat: refresh-on-focus + Phase 2 smoke test recorded"
```

---

## Self-Review

**Spec coverage (Phase 2 scope, from the design's Phase 2 + explorer details):**
- New File / New Folder → Tasks 2, 8, 9 ✓
- Rename (inline) → Tasks 2, 8, 9 ✓
- Delete → Trash (confirm) → Tasks 1, 2, 9 ✓
- Duplicate → Tasks 3, 9 ✓
- Copy Path → Tasks 1, 5, 9 ✓
- Reveal in Finder → Tasks 1, 5, 9 ✓
- Refresh after ops + on focus → Tasks 6, 9, 10 ✓
- Deps (trash, opener, clipboard) + permissions → Task 1 ✓
- Pure logic unit-tested: duplicate name (Rust, Task 3), path helpers (TS, Task 4) ✓

**Placeholder scan:** none — every code step is complete. Errors use the dialog plugin's
`message`/`confirm` (no "handle errors" hand-waving).

**Type consistency:** `MenuItem` shape identical in `contextmenu.ts` and its use in
`explorer.ts`; `filesys` wrapper names (`createFile`, `createDir`, `renamePath`,
`deletePath`, `duplicatePath`, `revealInFinder`, `copyPath`) match call sites in Task 9;
`refreshDir`/`parentPath`/`joinPath` signatures match across tasks; Rust command names
(`create_file`/`create_dir`/`rename_path`/`delete_to_trash`/`duplicate_path`) match the
`invoke(...)` strings in `filesys.ts`.

**Note:** Tree updates after CRUD use `refreshDir` (re-list the parent) rather than
surgical tree mutation — simpler and always correct, at the cost of one extra `list_dir`
per operation (negligible). Tab/sub-window concerns are Phases 3–4 and untouched here.
