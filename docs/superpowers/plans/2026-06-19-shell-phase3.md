# MDflow Shell — Phase 3 Implementation Plan (Tabs)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let several files be open at once in the main editor as tabs — open/focus from the explorer or File menu, switch between them (each keeping its own cursor and undo history), see a dirty dot on unsaved tabs, and close with `⌘W` (confirming unsaved changes). Open tabs are restored on next launch.

**Architecture:** Each open document gets its own CodeMirror `EditorState`, held in a map inside `editor.ts`; switching tabs snapshots the live state and loads the target's — so undo history and cursor survive. The store gains a `tabs` list (metadata only: id, path, name, dirty) + `activeTabId`. A pure `tabops.ts` computes which tab to focus after a close and finds an already-open file. A new `tabbar.ts` renders the tab strip. `main.ts` is refactored from "one current document" to "active tab of many."

**Tech Stack:** Tauri 2 + Rust, Vite + TS, CodeMirror 6 (all existing). No new dependencies.

## Global Constraints

- **License: MIT.** Clean-room — no Kaelio/mx/Vibery code or CSS. No "mx"/"Vibery"/"Kaelio" names anywhere.
- **Identifier:** `com.kael.mdflow`. Product name: **MDflow**.
- **Vanilla TS + the existing `store.ts`. No frontend framework.**
- Small, focused files; validate only at the IPC boundary; no premature abstraction.
- **Per-document undo history must not bleed across tabs** — each doc owns its own `EditorState`.
- Closing a dirty tab prompts a confirm dialog; never lose edits silently.
- Single main window only — the Sub window and per-window view modes are **Phase 4**. View modes (Editor/Read/Split) stay global as in M1.
- Builds on Phases 1–2 (`store.ts`, `editor.ts`, `explorer.ts`, `files.ts`, `state.ts`, `main.ts`).

---

## File Structure (Phase 3)

```
src/
  tabops.ts        # NEW: pure tab-list helpers (nextActiveAfterClose, findByPath)
  tabbar.ts        # NEW: render the tab strip; click to activate, × to close
  editor.ts        # MODIFY: multi-document EditorState map (open/switchTo/close/getText)
  store.ts         # MODIFY: add tabs[] + activeTabId + helpers
  main.ts          # MODIFY: refactor from single doc to active-tab-of-many
  state.ts         # MODIFY: persist open tab paths + active index
  styles.css       # MODIFY: tab strip styling
  __tests__/
    tabops.test.ts # NEW
index.html         # MODIFY: add the tab strip element above the panes
```

---

## Shared types (used across tasks)

```ts
// in src/tabops.ts (exported)
export type TabMeta = { id: string; path: string | null; name: string; dirty: boolean };
```

`id` is a unique string (e.g. `"t" + counter`). `path` is null for unsaved/untitled docs
(New File, Help). `name` is the basename (or "Untitled" / "MDflow Help").

---

### Task 1: `tabops.ts` — pure tab-list helpers

**Files:**
- Create: `src/tabops.ts`, `src/__tests__/tabops.test.ts`

**Interfaces:**
- Produces:
  - `type TabMeta = { id: string; path: string | null; name: string; dirty: boolean }`
  - `findByPath(tabs: TabMeta[], path: string): TabMeta | undefined`
  - `nextActiveAfterClose(tabs: TabMeta[], closingId: string, activeId: string | null): string | null`
    — the id to activate after removing `closingId`: if closing the active tab, prefer the
    tab to its right, else the one to its left, else `null` (no tabs left). If closing a
    non-active tab, the active stays.

- [x] **Step 1: Write the failing test** — `src/__tests__/tabops.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { findByPath, nextActiveAfterClose, type TabMeta } from "../tabops";

const tab = (id: string, path: string | null = null): TabMeta => ({ id, path, name: id, dirty: false });

describe("tabops", () => {
  it("finds a tab by path", () => {
    const tabs = [tab("a", "/x/a.md"), tab("b", "/x/b.md")];
    expect(findByPath(tabs, "/x/b.md")?.id).toBe("b");
    expect(findByPath(tabs, "/x/missing.md")).toBeUndefined();
  });

  it("activates the right neighbour when closing the active tab", () => {
    const tabs = [tab("a"), tab("b"), tab("c")];
    expect(nextActiveAfterClose(tabs, "b", "b")).toBe("c");
  });

  it("falls back to the left neighbour when closing the last/active tab", () => {
    const tabs = [tab("a"), tab("b"), tab("c")];
    expect(nextActiveAfterClose(tabs, "c", "c")).toBe("b");
  });

  it("returns null when closing the only tab", () => {
    expect(nextActiveAfterClose([tab("a")], "a", "a")).toBeNull();
  });

  it("keeps the active tab when closing a different tab", () => {
    const tabs = [tab("a"), tab("b"), tab("c")];
    expect(nextActiveAfterClose(tabs, "a", "c")).toBe("c");
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npm run test -- tabops`
Expected: FAIL — cannot find `../tabops`.

- [x] **Step 3: Implement `src/tabops.ts`**

```ts
export type TabMeta = { id: string; path: string | null; name: string; dirty: boolean };

export function findByPath(tabs: TabMeta[], path: string): TabMeta | undefined {
  return tabs.find((t) => t.path === path);
}

export function nextActiveAfterClose(
  tabs: TabMeta[],
  closingId: string,
  activeId: string | null
): string | null {
  if (closingId !== activeId) return activeId;
  const i = tabs.findIndex((t) => t.id === closingId);
  if (i === -1) return activeId;
  const right = tabs[i + 1];
  const left = tabs[i - 1];
  return (right ?? left)?.id ?? null;
}
```

- [x] **Step 4: Run tests**

Run: `npm run test -- tabops`
Expected: PASS (5 tests).

- [x] **Step 5: Commit**

```bash
git add src/tabops.ts src/__tests__/tabops.test.ts
git commit -m "feat: pure tab-list helpers + tests"
```

---

### Task 2: `store.ts` — tabs state

**Files:**
- Modify: `src/store.ts`

**Interfaces:**
- Consumes: `TabMeta` (Task 1).
- Produces: store now also holds `tabs: TabMeta[]` and `activeTabId: string | null`,
  reachable via the existing `getState()`/`setState()`/`subscribe()`.

- [x] **Step 1: Extend `ShellState` and initial state in `src/store.ts`** — add the import and two fields:

```ts
import type { TabMeta } from "./tabops";
```

In `ShellState` add:

```ts
  tabs: TabMeta[];
  activeTabId: string | null;
```

In the initial `state` object add:

```ts
  tabs: [],
  activeTabId: null,
```

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only where `main.ts` hasn't been updated yet are acceptable at this step; the store file itself must compile. Run `npx tsc --noEmit src/store.ts` if needed to confirm the store is valid.

- [x] **Step 3: Commit**

```bash
git add src/store.ts
git commit -m "feat: tabs + activeTabId in the store"
```

---

### Task 3: `editor.ts` — multiple documents

**Files:**
- Modify: `src/editor.ts`

**Interfaces:**
- Produces a multi-document `EditorHandle`:
  - `openState(id: string, text: string): void` — create an `EditorState` for a new doc and make it active.
  - `switchTo(id: string): void` — snapshot the live state back to the current doc, then load `id`'s state.
  - `closeState(id: string): void` — drop a doc's stored state.
  - `getText(id: string): string` — text of a doc (live view if active, else stored state).
  - `setSoftWrap(on: boolean): void`, `setLineNumbers(on: boolean): void`, `focus(): void`.
- `createEditor(parent, onChange)` — `onChange(id, text)` now fires with the active doc id.

- [x] **Step 1: Replace `src/editor.ts` with the multi-document version**

```ts
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from "@codemirror/view";
import { EditorState, Compartment, type Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

export type EditorHandle = {
  openState(id: string, text: string): void;
  switchTo(id: string): void;
  closeState(id: string): void;
  getText(id: string): string;
  setSoftWrap(on: boolean): void;
  setLineNumbers(on: boolean): void;
  focus(): void;
};

const theme = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "transparent", color: "var(--text)" },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      fontSize: "calc(13.5px * var(--zoom, 1))",
      lineHeight: "1.65",
      padding: "var(--pane-pad) 0",
    },
    ".cm-content": { caretColor: "var(--accent)", paddingRight: "var(--pane-pad)" },
    ".cm-lineNumbers .cm-gutterElement": { paddingLeft: "8px", paddingRight: "12px" },
    "&.cm-focused .cm-cursor": { borderLeftColor: "var(--accent)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "var(--selection)",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--faint)",
      border: "none",
      paddingLeft: "12px",
    },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.025)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--muted)" },
  },
  { dark: true }
);

// Module-level compartments — shared instances so reconfigure targets the live view.
const wrap = new Compartment();
const gutter = new Compartment();

export function createEditor(parent: HTMLElement, onChange: (id: string, text: string) => void): EditorHandle {
  const states = new Map<string, EditorState>();
  let activeId: string | null = null;
  let softWrap = true;
  let lineNums = true;

  const baseExtensions = (id: string): Extension[] => [
    gutter.of(lineNums ? lineNumbers() : []),
    history(),
    drawSelection(),
    highlightActiveLine(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    markdown({ codeLanguages: languages }),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    wrap.of(softWrap ? EditorView.lineWrapping : []),
    theme,
    EditorView.updateListener.of((u) => {
      if (u.docChanged) onChange(id, u.state.doc.toString());
    }),
  ];

  const view = new EditorView({ parent, state: EditorState.create({ doc: "", extensions: baseExtensions("") }) });

  const reapplyToggles = () => {
    view.dispatch({
      effects: [
        wrap.reconfigure(softWrap ? EditorView.lineWrapping : []),
        gutter.reconfigure(lineNums ? lineNumbers() : []),
      ],
    });
  };

  return {
    openState(id, text) {
      states.set(id, EditorState.create({ doc: text, extensions: baseExtensions(id) }));
      this.switchTo(id);
    },
    switchTo(id) {
      if (activeId && states.has(activeId)) states.set(activeId, view.state);
      const target = states.get(id);
      if (!target) return;
      activeId = id;
      view.setState(target);
      reapplyToggles();
    },
    closeState(id) {
      states.delete(id);
      if (activeId === id) activeId = null;
    },
    getText(id) {
      if (id === activeId) return view.state.doc.toString();
      return states.get(id)?.doc.toString() ?? "";
    },
    setSoftWrap(on) {
      softWrap = on;
      reapplyToggles();
    },
    setLineNumbers(on) {
      lineNums = on;
      reapplyToggles();
    },
    focus() {
      view.focus();
    },
  };
}
```

- [x] **Step 2: Type-check the editor**

Run: `npx tsc --noEmit src/editor.ts`
Expected: no errors. (Other files may not compile until Task 5 — that's fine here.)

- [x] **Step 3: Commit**

```bash
git add src/editor.ts
git commit -m "feat: multi-document editor (per-doc EditorState, undo isolation)"
```

---

### Task 4: Tab strip (DOM + `tabbar.ts` + CSS)

**Files:**
- Modify: `index.html`, `src/styles.css`
- Create: `src/tabbar.ts`

**Interfaces:**
- Consumes: `store` (tabs/activeTabId), `TabMeta`.
- Produces: `initTabbar(handlers: { onActivate: (id: string) => void; onClose: (id: string) => void }): void`
  — renders `#tabbar` from the store on every change.

- [x] **Step 1: Add the tab strip to `index.html`** — inside `#editorarea`, above `.panes`:

```html
        <section id="editorarea">
          <div id="tabbar" class="tabbar"></div>
          <main class="panes">
            <section class="pane pane-editor" id="editor"></section>
            <div class="seam" aria-hidden="true"></div>
            <section class="pane pane-preview" id="preview"></section>
          </main>
        </section>
```

(Adjust `#editorarea` to stack vertically — see CSS below.)

- [x] **Step 2: Implement `src/tabbar.ts`**

```ts
import { getState, subscribe } from "./store";

export function initTabbar(handlers: {
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}): void {
  const el = document.getElementById("tabbar")!;

  function render(): void {
    const { tabs, activeTabId } = getState();
    el.innerHTML = "";
    el.classList.toggle("empty", tabs.length === 0);
    for (const t of tabs) {
      const tab = document.createElement("div");
      tab.className = "tab" + (t.id === activeTabId ? " active" : "");
      tab.addEventListener("click", () => handlers.onActivate(t.id));

      const dot = document.createElement("span");
      dot.className = "tab-dot" + (t.dirty ? " dirty" : "");

      const name = document.createElement("span");
      name.className = "tab-name";
      name.textContent = t.name;

      const close = document.createElement("button");
      close.className = "tab-close";
      close.type = "button";
      close.textContent = "×";
      close.title = "Close";
      close.addEventListener("click", (e) => { e.stopPropagation(); handlers.onClose(t.id); });

      tab.append(dot, name, close);
      el.appendChild(tab);
    }
  }

  subscribe(render);
  render();
}
```

- [x] **Step 3: Add tab CSS to `src/styles.css`**

```css
/* ---------- Tabs ---------- */
#editorarea { flex-direction: column; }
.tabbar {
  display: flex; align-items: stretch; height: 36px; flex-shrink: 0;
  background: var(--bg-elev); border-bottom: 1px solid var(--border);
  overflow-x: auto; overflow-y: hidden;
}
.tabbar.empty { display: none; }
.tab {
  display: flex; align-items: center; gap: 7px;
  padding: 0 10px; max-width: 220px; flex-shrink: 0;
  font-size: 13px; color: var(--muted);
  border-right: 1px solid var(--border); cursor: default; white-space: nowrap;
}
.tab:hover { color: var(--text); }
.tab.active { color: var(--text-strong); background: var(--bg-editor); box-shadow: inset 0 2px 0 var(--accent); }
.tab-name { overflow: hidden; text-overflow: ellipsis; }
.tab-dot { width: 7px; height: 7px; border-radius: 50%; background: transparent; flex-shrink: 0; }
.tab-dot.dirty { background: var(--accent); }
.tab-close {
  width: 16px; height: 16px; line-height: 14px; text-align: center;
  font: inherit; font-size: 14px; color: var(--faint);
  background: none; border: 0; border-radius: 4px; cursor: default; flex-shrink: 0;
}
.tab-close:hover { color: var(--text-strong); background: rgba(255,255,255,0.08); }
```

(`#editorarea` was `display: flex` from Phase 1; this changes its direction to column so the tab strip sits above the panes.)

- [x] **Step 4: Commit**

```bash
git add index.html src/tabbar.ts src/styles.css
git commit -m "feat: tab strip rendering + styling"
```

---

### Task 5: `main.ts` — refactor to multi-document tabs

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: every module above. Replaces the single-`currentPath` model with the store's
  `tabs`/`activeTabId` plus the editor's per-doc states.

- [x] **Step 1: Rewrite the document handling in `src/main.ts`**

Replace the old `currentPath` / `doOpenPath` / `doOpen` / `doSave` / `newDoc` / `openHelp`
logic with the tab-aware versions below. Keep the existing imports and add:

```ts
import { initTabbar } from "./tabbar";
import { findByPath, nextActiveAfterClose, type TabMeta } from "./tabops";
import { confirm } from "@tauri-apps/plugin-dialog";
```

Core state + helpers:

```ts
let tabSeq = 0;
const nextId = () => `t${++tabSeq}`;

function basename(path: string): string {
  return path.split("/").pop() || path;
}

function activeTab(): TabMeta | undefined {
  const { tabs, activeTabId } = getState();
  return tabs.find((t) => t.id === activeTabId);
}

function setTabs(tabs: TabMeta[], activeTabId: string | null): void {
  setState({ tabs, activeTabId });
}

function patchTab(id: string, patch: Partial<TabMeta>): void {
  setState({ tabs: getState().tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
}

function activate(id: string): void {
  editor.switchTo(id);
  setState({ activeTabId: id });
  const t = getState().tabs.find((x) => x.id === id);
  statusPath.textContent = t?.path ?? t?.name ?? "Untitled";
  updatePreview(editor.getText(id));
  editor.focus();
}

function openDoc(opts: { path: string | null; name: string; text: string }): void {
  if (opts.path) {
    const existing = findByPath(getState().tabs, opts.path);
    if (existing) { activate(existing.id); return; }
  }
  const id = nextId();
  const tab: TabMeta = { id, path: opts.path, name: opts.name, dirty: false };
  setTabs([...getState().tabs, tab], id);
  editor.openState(id, opts.text);
  activate(id);
}

async function closeTab(id: string): Promise<void> {
  const t = getState().tabs.find((x) => x.id === id);
  if (t?.dirty) {
    const ok = await confirm(`Discard unsaved changes to "${t.name}"?`, { title: "Close tab", kind: "warning" });
    if (!ok) return;
  }
  const next = nextActiveAfterClose(getState().tabs, id, getState().activeTabId);
  editor.closeState(id);
  setTabs(getState().tabs.filter((x) => x.id !== id), next);
  if (next) activate(next);
  else { previewEl.innerHTML = ""; statusPath.textContent = "Untitled"; statusWords.textContent = "0 words"; }
}
```

The change handler (per-doc dirty + debounced preview of the active doc):

```ts
function onDocChange(id: string, text: string): void {
  const t = getState().tabs.find((x) => x.id === id);
  if (t && !t.dirty) patchTab(id, { dirty: true });
  if (id === getState().activeTabId) schedulePreview(text);
}
```

Open / new / save / help, now tab-aware:

```ts
async function doOpenPath(path: string): Promise<void> {
  const contents = await invoke<string>("read_file", { path });
  openDoc({ path, name: basename(path), text: contents });
}

async function doOpen(): Promise<void> {
  const r = await openFile();
  if (r) openDoc({ path: r.path, name: basename(r.path), text: r.contents });
}

function newDoc(): void {
  openDoc({ path: null, name: "Untitled", text: "" });
}

async function doSave(saveAs = false): Promise<void> {
  const t = activeTab();
  if (!t) return;
  const written = await saveFile(saveAs ? null : t.path, editor.getText(t.id));
  if (written) { patchTab(t.id, { path: written, name: basename(written), dirty: false }); statusPath.textContent = written; }
}

function openHelp(): void {
  openDoc({ path: null, name: "MDflow Help", text: helpDoc });
}
```

- [x] **Step 2: Update editor creation + initial wiring** — change `createEditor` to the new signature and mount the tab bar. Replace the old `const editor = createEditor(editorEl, schedulePreview);` with:

```ts
const editor = createEditor(editorEl, onDocChange);
initTabbar({ onActivate: activate, onClose: (id) => void closeTab(id) });
```

`updatePreview`, `schedulePreview`, `setMode`, `toggleSoftWrap` stay, except
`toggleSoftWrap` already calls `editor.setSoftWrap`. Ensure `updatePreview` uses the passed
text (unchanged). Remove the old `setPath`/`currentPath` definitions (replaced by tabs).

- [x] **Step 3: Update the menu listener** — the `listen("menu", …)` switch keeps the same
cases; they now call the tab-aware `newDoc` / `doOpen` / `doSave` / `openHelp`. The
`file.save`/`file.save_as` cases call `doSave(false)` / `doSave(true)` as before.

- [x] **Step 4: Update the initial-file + explorer wiring** — `initExplorer((path) => void doOpenPath(path))` is unchanged. Replace the old `getInitialFile().then(...)` body with:

```ts
getInitialFile().then((r) => {
  if (r) openDoc({ path: r.path, name: basename(r.path), text: r.contents });
});
```

- [ ] **Step 5: Type-check + run the app**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run tauri dev` and verify:
  - Click several files in the explorer → each opens as a tab; clicking an already-open file focuses its tab.
  - Switching tabs preserves each doc's text, cursor, and **undo history** (edit A, switch to B, switch back, `⌘Z` only undoes A's edits).
  - Editing shows a dirty dot; Save clears it; Save-As on an Untitled sets its name.
  - `⌘W` closes; closing a dirty tab prompts confirm; the neighbour tab activates.
  - Help opens as its own tab; word count + preview track the active tab.

  Type-check, native launch, and a focused tab-strip browser harness are verified.
  CodeMirror cursor/undo and native dialog interactions remain in `docs/review.md`.

- [x] **Step 6: Commit**

```bash
git add src/main.ts
git commit -m "feat: multi-document tabs (open/switch/close, per-tab dirty)"
```

---

### Task 6: Session — persist open tabs

**Files:**
- Modify: `src/state.ts`, `src/main.ts`

**Interfaces:**
- Persist the open tab paths + which one is active; restore on launch (skip files that no
  longer exist). Untitled/Help tabs (no path) are not restored.

- [x] **Step 1: Add tab-session fields to `UIState` in `src/state.ts`** — extend the type + defaults:

```ts
  openPaths: string[];
  activePath: string | null;
```

Add to `DEFAULTS`:

```ts
  openPaths: [],
  activePath: null,
```

- [x] **Step 2: Update the three default-shape assertions in `src/__tests__/state.test.ts`** to include `openPaths: []` and `activePath: null`.

- [x] **Step 3: Run state tests**

Run: `npm run test -- state`
Expected: PASS.

- [x] **Step 4: Persist tabs from `main.ts`** — in the existing store `subscribe(...)` that mirrors shell state into `ui`, also mirror tab paths:

```ts
subscribe(() => {
  const s = getState();
  const openPaths = s.tabs.map((t) => t.path).filter((p): p is string => !!p);
  const activeTab = s.tabs.find((t) => t.id === s.activeTabId);
  ui = {
    ...ui,
    folder: s.folder,
    explorerVisible: s.explorerVisible,
    explorerWidth: s.explorerWidth,
    openPaths,
    activePath: activeTab?.path ?? null,
  };
  saveState(ui);
});
```

- [x] **Step 5: Restore tabs on launch** — after the shell is mounted and before
`getInitialFile()`, add:

```ts
async function restoreTabs(): Promise<void> {
  for (const path of ui.openPaths) {
    try {
      const contents = await invoke<string>("read_file", { path });
      openDoc({ path, name: basename(path), text: contents });
    } catch { /* file vanished — skip */ }
  }
  if (ui.activePath) {
    const t = findByPath(getState().tabs, ui.activePath);
    if (t) activate(t.id);
  }
}
restoreTabs();
```

- [ ] **Step 6: Verify** — `npm run tauri dev`: open a few files, quit, relaunch → the same
tabs reopen with the same active tab; a deleted file is silently skipped.

  Persistence shape and restore sequencing are automated; relaunch behavior remains
  in the native GUI checklist.

- [x] **Step 7: Commit**

```bash
git add src/state.ts src/__tests__/state.test.ts src/main.ts
git commit -m "feat: persist and restore open tabs across launches"
```

---

### Task 7: Smoke test + docs

**Files:**
- Modify: `docs/review.md`, `docs/tasks.md`

- [x] **Step 1: Run all automated tests**

Run: `npm run test && (cd src-tauri && cargo test)`
Expected: all green (tabops ×5 + paths ×2 + icons ×3 + treeops ×3 + state ×4 + preview ×5 frontend; Rust unchanged from Phase 2).

- [ ] **Step 2: Manual smoke (`npm run tauri dev`), record in `docs/review.md`:**
  - Open multiple files → multiple tabs; re-opening a file focuses its existing tab.
  - Tab switch preserves text, cursor, and undo history independently.
  - Dirty dot appears on edit, clears on save; Save-As names an Untitled tab.
  - `⌘W` closes; dirty-close confirms; neighbour activation is correct (right, then left).
  - New File and Help each open as their own tab.
  - Quit/relaunch restores open tabs + active tab; vanished files skipped.
  - M1/Phase-1/2 still work: view modes, soft wrap, explorer, file management.

  Automated, browser-harness, and native-launch evidence is recorded. The remaining
  hands-on checks are explicit in `docs/review.md`.

- [x] **Step 3: Update `docs/tasks.md`** — mark Phase 3 done; set Phase 4 (Sub window + per-window view modes) as next.

- [x] **Step 4: Commit**

```bash
git add docs/review.md docs/tasks.md
git commit -m "test: Shell Phase 3 smoke test recorded"
```

---

## Self-Review

**Spec coverage (Phase 3 scope):**
- Multiple files open as tabs in the main window → Tasks 4, 5 ✓
- Open/focus-existing from explorer + File menu → Task 5 (`openDoc` + `findByPath`) ✓
- Per-tab cursor + undo isolation → Task 3 (per-doc `EditorState`) ✓
- Dirty indicator → Tasks 4, 5 ✓
- Close (`⌘W` + confirm if dirty) + neighbour activation → Tasks 1, 5 ✓
- Tab overflow scroll → Task 4 CSS ✓
- Session: persist + restore open tabs → Task 6 ✓
- Single main window; view modes stay global (Sub window deferred) → matches spec phasing ✓

**Placeholder scan:** none — every code step is complete. The confirm/error flows use the
dialog plugin (`confirm`). No "handle edge cases" hand-waving.

**Type consistency:** `TabMeta` shape identical across `tabops.ts`, `store.ts`, `tabbar.ts`,
`main.ts`. Editor handle methods (`openState`, `switchTo`, `closeState`, `getText`,
`setSoftWrap`, `setLineNumbers`, `focus`) match call sites in `main.ts`. `onChange(id, text)`
signature matches `onDocChange`. `nextActiveAfterClose`/`findByPath` signatures match usage.

**Notes:**
- View modes (Editor/Read/Split) remain **global** in Phase 3; they become **per-window** in
  Phase 4 when the Sub window arrives. Soft-wrap/line-numbers are global toggles applied to
  the active view via shared compartments.
- Tab drag-reorder stays in the backlog (spec). Phase 3 tabs are fixed-order (open order).
