# MDflow Shell — Phase 4b Implementation Plan (Sub Window + Per-window View Modes)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠️ **This plan has a high-risk structural refactor (Tasks 3–5) followed by additive features (Tasks 6–9).** Tasks 3–5 must each leave the app building **and behaving identically to today (one window)** before moving on. Do not start Task 6 until the single-window app works exactly as it did after Phase 4a.

**Goal:** Add a second editor window. The editor area becomes **Main** (always on) + an optional **Sub** window, each with its own tabs and its own view mode (Editor / Read / Split). A toolbar button toggles the Sub window; the explorer can "Open in Sub Window"; layout is drag-resizable; both windows restore on launch.

**Architecture:** Extract the editor area into a reusable `windowview.ts` component — it owns one window's DOM (tab strip + toolbar + editor pane + preview pane), its own CodeMirror editor (the multi-doc handle from Phase 3), and renders itself from a `WindowState` in the store. The store moves from a flat `tabs`/`activeTabId` to `windows: WindowState[]` (1–2 entries) + `activeWindowId`. `main.ts` becomes an orchestrator over windows. A document is open in at most one window (ownership); "Open in Sub Window" moves it. View mode moves from a global body class to a per-window class.

**Tech Stack:** Tauri 2 + Rust, Vite + TS, CodeMirror 6 (all existing). No new dependencies.

## Global Constraints

- **License: MIT.** Clean-room — no Kaelio/mx/Vibery code or CSS. No "mx"/"Vibery"/"Kaelio" names anywhere.
- **Identifier:** `com.kael.mdflow`. Product name: **MDflow**.
- **Vanilla TS + the existing `store.ts`. No frontend framework.**
- **Max two windows.** Main is always present; Sub is optional.
- **A document is open in at most one window** (one editor tab across all windows). Opening an already-open file focuses its existing tab; "Open in Sub Window" *moves* it.
- View modes are **per-window** now. `ViewMode` values stay `"editor" | "preview" | "split"` ("preview" = the Read button).
- Closing a dirty tab confirms; never lose edits silently.
- Builds on Phases 1–4a. Reuses `editor.ts` (multi-doc, unchanged), `preview.ts`, `tabops.ts`, `explorer.ts`, `state.ts`.

---

## Target architecture

```
#editorarea
  #windows                       (flex row)
    .window[data-window-id=main] (built by windowview)
      .editor-header  (.tabbar + .window-toolbar)
      .panes          (.pane-editor [CodeMirror]  .seam  .pane-preview)
    #window-splitter             (drag-resize; only when Sub is on)
    .window[data-window-id=sub]  (built by windowview; only when Sub is on)
```

Each `.window` carries a `window-mode-editor | window-mode-preview | window-mode-split`
class controlling its pane layout, and an `active` class when it is the active window.

### Store shape (after Task 2)

```ts
export type WindowState = {
  id: string;
  tabs: TabMeta[];
  activeTabId: string | null;
  mode: ViewMode; // "editor" | "preview" | "split"
};
// ShellState gains:
//   windows: WindowState[];     // [0] = main, optional [1] = sub
//   activeWindowId: string;
// and DROPS the flat: tabs, activeTabId
```

`TabMeta` (from `tabops.ts`, unchanged) is `{ id, path, name, dirty }`. A tab's id is also
the id used for that doc's CodeMirror `EditorState` **inside that window's editor**.

---

### Task 1: `windowops.ts` — pure ownership helper

**Files:**
- Create: `src/windowops.ts`, `src/__tests__/windowops.test.ts`

**Interfaces:**
- Produces:
  - `findTabByPath(windows: WindowState[], path: string): { windowId: string; tab: TabMeta } | null`
    — locate which window holds an open file (for the one-open-copy ownership rule).

- [ ] **Step 1: Write the failing test** — `src/__tests__/windowops.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { findTabByPath, type WindowState } from "../windowops";

const w = (id: string, paths: (string | null)[]): WindowState => ({
  id,
  tabs: paths.map((p, i) => ({ id: `${id}${i}`, path: p, name: p ?? "Untitled", dirty: false })),
  activeTabId: null,
  mode: "split",
});

describe("findTabByPath", () => {
  it("finds the window holding a path", () => {
    const windows = [w("main", ["/a.md", null]), w("sub", ["/b.md"])];
    expect(findTabByPath(windows, "/b.md")?.windowId).toBe("sub");
    expect(findTabByPath(windows, "/a.md")?.tab.id).toBe("main0");
  });
  it("returns null when not open", () => {
    expect(findTabByPath([w("main", ["/a.md"])], "/missing.md")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- windowops`
Expected: FAIL — cannot find `../windowops`.

- [ ] **Step 3: Implement `src/windowops.ts`**

```ts
import type { TabMeta } from "./tabops";
import type { ViewMode } from "./state";

export type WindowState = {
  id: string;
  tabs: TabMeta[];
  activeTabId: string | null;
  mode: ViewMode;
};

export function findTabByPath(
  windows: WindowState[],
  path: string
): { windowId: string; tab: TabMeta } | null {
  for (const w of windows) {
    const tab = w.tabs.find((t) => t.path === path);
    if (tab) return { windowId: w.id, tab };
  }
  return null;
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- windowops`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/windowops.ts src/__tests__/windowops.test.ts
git commit -m "feat: window ownership helper + tests"
```

---

### Task 2: Store — `windows[]` model

**Files:**
- Modify: `src/store.ts`

**Interfaces:**
- Consumes: `WindowState` (Task 1).
- Produces: `ShellState` now has `windows: WindowState[]` + `activeWindowId` instead of
  `tabs`/`activeTabId`. Adds helpers:
  - `getWindow(id: string): WindowState | undefined`
  - `mainWindow(): WindowState` (always `windows[0]`)
  - `activeWindow(): WindowState`
  - `patchWindow(id: string, patch: Partial<WindowState>): void` (immutably updates + notifies)

- [ ] **Step 1: Update `src/store.ts`** — replace the `tabs`/`activeTabId` parts:

Change the import:

```ts
import type { WindowState } from "./windowops";
```

In `ShellState`, replace `tabs: TabMeta[]; activeTabId: string | null;` with:

```ts
  windows: WindowState[];
  activeWindowId: string;
```

In the initial `state`, replace `tabs: [], activeTabId: null,` with:

```ts
  windows: [{ id: "main", tabs: [], activeTabId: null, mode: "split" }],
  activeWindowId: "main",
```

Append helpers at the end of the file:

```ts
export function getWindow(id: string): WindowState | undefined {
  return state.windows.find((w) => w.id === id);
}

export function mainWindow(): WindowState {
  return state.windows[0];
}

export function activeWindow(): WindowState {
  return getWindow(state.activeWindowId) ?? state.windows[0];
}

export function patchWindow(id: string, patch: Partial<WindowState>): void {
  setState({ windows: state.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)) });
}
```

(Remove the now-unused `TabMeta` import if it is no longer referenced.)

- [ ] **Step 2: Type-check the store in isolation**

Run: `npx tsc --noEmit src/store.ts`
Expected: store compiles. (`main.ts`/`tabbar.ts` will be red until Task 5 — expected.)

- [ ] **Step 3: Commit**

```bash
git add src/store.ts
git commit -m "feat: windows[] state model + helpers"
```

---

### Task 3: DOM + CSS for the windowed editor area

**Files:**
- Modify: `index.html`, `src/styles.css`

**Interfaces:**
- Produces: `#editorarea` contains an empty `#windows` flex container (windows are built by
  `windowview` in Task 4). Per-window CSS: `.window`, `.window-mode-*`, `.window.active`,
  `#window-splitter`. Removes the static `#editor-header` + `.panes` (now per-window).

- [ ] **Step 1: Replace the `#editorarea` body in `index.html`** with:

```html
        <section id="editorarea">
          <div id="windows" class="windows"></div>
        </section>
```

(Delete the old `#editor-header`, `#tabbar`, `#window-toolbar`, and `.panes` markup —
`windowview` creates them per window now.)

- [ ] **Step 2: Replace the Shell/Tabs/header/pane CSS sections in `src/styles.css`** with per-window styles. Add:

```css
/* ---------- Windows ---------- */
#editorarea { display: flex; min-width: 0; min-height: 0; }
.windows { display: flex; flex: 1; min-width: 0; }
.window {
  display: flex; flex-direction: column; flex: 1 1 0; min-width: 0;
  position: relative;
}
.window + .window { border-left: 1px solid var(--border); }

#window-splitter { width: 4px; margin: 0 -2px; cursor: col-resize; z-index: 5; }
#window-splitter:hover { background: var(--accent); }

.editor-header {
  display: flex; align-items: stretch; min-height: 36px; flex-shrink: 0;
  background: var(--bg-elev); border-bottom: 1px solid var(--border);
}
.editor-header .tabbar { flex: 1; min-width: 0; }

.window-panes { display: flex; flex: 1; min-height: 0; }
.window .pane { min-width: 0; min-height: 0; overflow: auto; }
.window .pane-editor { background: var(--bg-editor); flex: 1; }
.window .pane-preview { background: var(--bg-preview); flex: 1; }
.window .seam { width: 1px; background: var(--border); }

/* per-window view mode */
.window-mode-editor .pane-preview, .window-mode-editor .seam { display: none; }
.window-mode-preview .pane-editor, .window-mode-preview .seam { display: none; }

/* active-window cue (only meaningful when Sub is open) */
.windows.has-sub .window:not(.active) .editor-header { opacity: 0.85; }
.windows.has-sub .window.active .editor-header { box-shadow: inset 0 2px 0 var(--accent); }
```

Keep the existing `.tabbar` / `.tab*` and `.window-toolbar` / `.wt-*` rules from Phases 3
and 4a (they still apply, now inside each `.window`). Keep the `.doc` preview-content rules.

- [ ] **Step 3: Commit** (app won't run until Task 5; that's expected for this DOM swap)

```bash
git add index.html src/styles.css
git commit -m "refactor: windowed editor-area DOM + per-window CSS"
```

---

### Task 4: `windowview.ts` — per-window component

**Files:**
- Create: `src/windowview.ts`

**Interfaces:**
- Consumes: `createEditor`/`EditorHandle` (`editor.ts`), `renderMarkdown` (`preview.ts`),
  store getters, `ViewMode`.
- Produces:
  - `type WindowHandlers = { onActivateTab; onCloseTab; onSetMode; onToggleLineNumbers; onToggleSub; onFocusWindow; onDocChange }` (signatures below).
  - `createWindowView(host: HTMLElement, windowId: string, isMain: boolean, h: WindowHandlers): WindowView`
  - `type WindowView = { id; editor: EditorHandle; render(): void; renderPreview(text: string): void; focus(): void; destroy(): void }`

- [ ] **Step 1: Implement `src/windowview.ts`**

```ts
import { createEditor, type EditorHandle } from "./editor";
import { renderMarkdown } from "./preview";
import { getWindow, getState } from "./store";
import type { ViewMode } from "./state";

export type WindowHandlers = {
  onActivateTab: (windowId: string, tabId: string) => void;
  onCloseTab: (windowId: string, tabId: string) => void;
  onSetMode: (windowId: string, mode: ViewMode) => void;
  onToggleLineNumbers: () => void;
  onToggleSub: () => void;
  onFocusWindow: (windowId: string) => void;
  onDocChange: (windowId: string, tabId: string, text: string) => void;
};

export type WindowView = {
  id: string;
  editor: EditorHandle;
  render: () => void;
  renderPreview: (text: string) => void;
  focus: () => void;
  destroy: () => void;
};

export function createWindowView(
  host: HTMLElement,
  windowId: string,
  isMain: boolean,
  h: WindowHandlers
): WindowView {
  const root = document.createElement("div");
  root.className = "window";
  root.dataset.windowId = windowId;
  root.innerHTML = `
    <div class="editor-header">
      <div class="tabbar"></div>
      <div class="window-toolbar">
        <button class="wt-btn" data-mode="editor" type="button" title="Editor (⌘E)">Editor</button>
        <button class="wt-btn" data-mode="preview" type="button" title="Read (⌘P)">Read</button>
        <button class="wt-btn" data-mode="split" type="button" title="Split (⌘B)">Split</button>
        <span class="wt-sep"></span>
        <button class="wt-btn wt-icon wt-lines" type="button" title="Line numbers">#</button>
        ${isMain ? `<span class="wt-sep"></span>
        <button class="wt-btn wt-icon wt-sub" type="button" title="Toggle Sub window">⊞</button>
        <button class="wt-btn wt-icon wt-ai" type="button" title="AI panel (coming soon)" disabled>✦</button>` : ""}
      </div>
    </div>
    <div class="window-panes">
      <div class="pane pane-editor"></div>
      <div class="seam"></div>
      <div class="pane pane-preview"></div>
    </div>`;
  host.appendChild(root);

  const tabbarEl = root.querySelector<HTMLElement>(".tabbar")!;
  const editorPane = root.querySelector<HTMLElement>(".pane-editor")!;
  const previewPane = root.querySelector<HTMLElement>(".pane-preview")!;

  root.addEventListener("mousedown", () => h.onFocusWindow(windowId));

  root.querySelectorAll<HTMLElement>("[data-mode]").forEach((btn) =>
    btn.addEventListener("click", () => h.onSetMode(windowId, btn.dataset.mode as ViewMode))
  );
  root.querySelector(".wt-lines")!.addEventListener("click", () => h.onToggleLineNumbers());
  root.querySelector(".wt-sub")?.addEventListener("click", () => h.onToggleSub());

  const editor = createEditor(editorPane, (tabId, text) => h.onDocChange(windowId, tabId, text));

  function render(): void {
    const w = getWindow(windowId);
    if (!w) return;
    // mode class
    root.classList.remove("window-mode-editor", "window-mode-preview", "window-mode-split");
    root.classList.add(`window-mode-${w.mode}`);
    root.classList.toggle("active", getState().activeWindowId === windowId);
    // toolbar active states
    root.querySelectorAll<HTMLElement>("[data-mode]").forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.mode === w.mode)
    );
    root.querySelector(".wt-lines")!.classList.toggle("active", getState().ui_lineNumbers ?? true);
    const sub = root.querySelector(".wt-sub");
    if (sub) sub.classList.toggle("active", getState().windows.length > 1);
    // tabs
    tabbarEl.innerHTML = "";
    tabbarEl.classList.toggle("empty", w.tabs.length === 0);
    for (const t of w.tabs) {
      const tab = document.createElement("div");
      tab.className = "tab" + (t.id === w.activeTabId ? " active" : "");
      tab.addEventListener("click", () => h.onActivateTab(windowId, t.id));
      const dot = document.createElement("span");
      dot.className = "tab-dot" + (t.dirty ? " dirty" : "");
      const name = document.createElement("span");
      name.className = "tab-name";
      name.textContent = t.name;
      const close = document.createElement("button");
      close.className = "tab-close";
      close.type = "button";
      close.textContent = "×";
      close.addEventListener("click", (e) => { e.stopPropagation(); h.onCloseTab(windowId, t.id); });
      tab.append(dot, name, close);
      tabbarEl.appendChild(tab);
    }
  }

  function renderPreview(text: string): void {
    previewPane.innerHTML = `<article class="doc">${renderMarkdown(text)}</article>`;
  }

  return {
    id: windowId,
    editor,
    render,
    renderPreview,
    focus: () => editor.focus(),
    destroy: () => root.remove(),
  };
}
```

> **Implementer note:** `getState().ui_lineNumbers` above is a placeholder access — in Task 5
> the line-numbers flag lives in `main.ts`'s `ui` object, not the store. Replace the two
> `getState().ui_lineNumbers ?? true` / line-number reads by having `main.ts` pass the current
> `lineNumbers` boolean into `render()` via a module variable it sets before calling
> `view.render()` (simplest: add a `setLineNumbersFlag(on: boolean)` to the returned
> `WindowView` that stores it locally for the toolbar `active` state). Implement that setter
> and use it; do not read line-numbers from the store.

- [ ] **Step 2: Add `setLineNumbersFlag` to the component** — add a local `let lineNums = true;`
in `createWindowView`, use it in `render()` for the `.wt-lines` active state, and expose
`setLineNumbersFlag(on: boolean): void` on the returned object (sets `lineNums = on`). Remove
the `getState().ui_lineNumbers` placeholder. Add `setLineNumbersFlag` to the `WindowView` type.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit src/windowview.ts`
Expected: no errors (after Step 2's fix).

- [ ] **Step 4: Commit**

```bash
git add src/windowview.ts
git commit -m "feat: per-window view component (tabs + toolbar + editor + preview)"
```

---

### Task 5: Refactor `main.ts` to the windowed model (single window — behavior preserving)

**Files:**
- Modify: `src/main.ts`
- Delete: `src/tabbar.ts`, `src/windowtoolbar.ts`, `src/views.ts` (their roles move into `windowview.ts`)

**Interfaces:**
- Consumes: `createWindowView`, store window helpers, `tabops`, `windowops`.
- Produces: the app rendered through **one** `WindowView` (main), with identical behavior to
  Phase 4a. Per-window mode replaces the global body class.

- [ ] **Step 1: Rewrite the document/orchestration core of `main.ts`.** Remove the old
single-doc state, the `applyViewMode`/body-class usage, and the `initTabbar`/`initWindowToolbar`
calls. Replace with a window-oriented orchestrator. Key pieces:

```ts
import { createWindowView, type WindowView } from "./windowview";
import { getState, setState, subscribe, getWindow, activeWindow, patchWindow, mainWindow } from "./store";
import { nextActiveAfterClose, findByPath, type TabMeta } from "./tabops";
import { findTabByPath } from "./windowops";
import { confirm } from "@tauri-apps/plugin-dialog";

const windowsHost = document.getElementById("windows")!;
const statusPath = document.getElementById("status-path")!;
const statusWords = document.getElementById("status-words")!;

let ui = loadState();
let tabSeq = 0;
const nextId = () => `t${++tabSeq}`;
const basename = (p: string) => p.split("/").pop() || p;

const views = new Map<string, WindowView>();

const handlers = {
  onActivateTab: (wid: string, tid: string) => activateTab(wid, tid),
  onCloseTab: (wid: string, tid: string) => void closeTab(wid, tid),
  onSetMode: (wid: string, m: ViewMode) => setMode(wid, m),
  onToggleLineNumbers: () => toggleLineNumbers(),
  onToggleSub: () => toggleSub(),
  onFocusWindow: (wid: string) => { if (getState().activeWindowId !== wid) { setState({ activeWindowId: wid }); renderAll(); } },
  onDocChange: (wid: string, tid: string, text: string) => onDocChange(wid, tid, text),
};

function makeView(windowId: string, isMain: boolean): WindowView {
  const v = createWindowView(windowsHost, windowId, isMain, handlers);
  v.setLineNumbersFlag(ui.lineNumbers);
  views.set(windowId, v);
  return v;
}

function renderAll(): void {
  for (const v of views.values()) v.render();
  document.getElementById("windows")!.classList.toggle("has-sub", getState().windows.length > 1);
}
```

Tab + doc operations (note: doc text lives in each window's editor; the tab id is the editor
state id):

```ts
function activeView(): WindowView { return views.get(getState().activeWindowId)!; }

function activeMeta(): TabMeta | undefined {
  const w = activeWindow();
  return w.tabs.find((t) => t.id === w.activeTabId);
}

function activateTab(windowId: string, tabId: string): void {
  setState({ activeWindowId: windowId });
  patchWindow(windowId, { activeTabId: tabId });
  const v = views.get(windowId)!;
  v.editor.switchTo(tabId);
  const text = v.editor.getText(tabId);
  v.renderPreview(text);
  updateStatus();
  renderAll();
  v.focus();
}

function openInWindow(windowId: string, opts: { path: string | null; name: string; text: string }): void {
  if (opts.path) {
    const found = findTabByPath(getState().windows, opts.path);
    if (found) { activateTab(found.windowId, found.tab.id); return; }
  }
  const id = nextId();
  const w = getWindow(windowId)!;
  patchWindow(windowId, { tabs: [...w.tabs, { id, path: opts.path, name: opts.name, dirty: false }], activeTabId: id });
  views.get(windowId)!.editor.openState(id, opts.text);
  activateTab(windowId, id);
}

async function closeTab(windowId: string, tabId: string): Promise<void> {
  const w = getWindow(windowId)!;
  const t = w.tabs.find((x) => x.id === tabId);
  if (t?.dirty && !(await confirm(`Discard unsaved changes to "${t.name}"?`, { title: "Close tab", kind: "warning" }))) return;
  const next = nextActiveAfterClose(w.tabs, tabId, w.activeTabId);
  views.get(windowId)!.editor.closeState(tabId);
  patchWindow(windowId, { tabs: w.tabs.filter((x) => x.id !== tabId), activeTabId: next });
  if (next) activateTab(windowId, next);
  else { views.get(windowId)!.renderPreview(""); updateStatus(); renderAll(); }
}

function onDocChange(windowId: string, tabId: string, text: string): void {
  const w = getWindow(windowId)!;
  const t = w.tabs.find((x) => x.id === tabId);
  if (t && !t.dirty) patchWindow(windowId, { tabs: w.tabs.map((x) => (x.id === tabId ? { ...x, dirty: true } : x)) });
  if (windowId === getState().activeWindowId && tabId === w.activeTabId) schedulePreview(windowId, text);
}

function setMode(windowId: string, mode: ViewMode): void {
  patchWindow(windowId, { mode });
  views.get(windowId)!.render();
}
```

Preview debounce becomes per-window; status reflects the active window's active doc:

```ts
const timers = new Map<string, number>();
function schedulePreview(windowId: string, text: string): void {
  clearTimeout(timers.get(windowId));
  timers.set(windowId, window.setTimeout(async () => {
    views.get(windowId)!.renderPreview(text);
    if (windowId === getState().activeWindowId) {
      const n = await invoke<number>("word_count", { text });
      statusWords.textContent = `${n} ${n === 1 ? "word" : "words"}`;
    }
  }, 300));
}

function updateStatus(): void {
  const t = activeMeta();
  statusPath.textContent = t?.path ?? t?.name ?? "Untitled";
  const text = t ? activeView().editor.getText(t.id) : "";
  invoke<number>("word_count", { text }).then((n) => { statusWords.textContent = `${n} ${n === 1 ? "word" : "words"}`; });
}
```

File / save / help / line-numbers (line-numbers + soft-wrap apply to **all** windows):

```ts
async function doOpenPath(path: string): Promise<void> {
  const contents = await invoke<string>("read_file", { path });
  openInWindow("main", { path, name: basename(path), text: contents });
}
async function doOpen(): Promise<void> {
  const r = await openFile();
  if (r) openInWindow(getState().activeWindowId, { path: r.path, name: basename(r.path), text: r.contents });
}
function newDoc(): void { openInWindow(getState().activeWindowId, { path: null, name: "Untitled", text: "" }); }
function openHelp(): void { openInWindow(getState().activeWindowId, { path: null, name: "MDflow Help", text: helpDoc }); }
async function doSave(saveAs = false): Promise<void> {
  const t = activeMeta();
  if (!t) return;
  const written = await saveFile(saveAs ? null : t.path, activeView().editor.getText(t.id));
  if (written) { patchWindow(getState().activeWindowId, { tabs: activeWindow().tabs.map((x) => x.id === t.id ? { ...x, path: written, name: basename(written), dirty: false } : x) }); updateStatus(); renderAll(); }
}
function toggleLineNumbers(): void {
  ui = { ...ui, lineNumbers: !ui.lineNumbers };
  for (const v of views.values()) { v.editor.setLineNumbers(ui.lineNumbers); v.setLineNumbersFlag(ui.lineNumbers); }
  saveState(ui);
  renderAll();
}
function toggleSoftWrap(): void {
  ui = { ...ui, softWrap: !ui.softWrap };
  for (const v of views.values()) v.editor.setSoftWrap(ui.softWrap);
  saveState(ui);
}
```

- [ ] **Step 2: Mount the main window + menu/keyboard.** Create the main view and wire the
existing menu listener to the active-window operations:

```ts
makeView("main", true);
// apply persisted main-window mode
patchWindow("main", { mode: ui.viewMode });
for (const v of views.values()) { v.editor.setSoftWrap(ui.softWrap); v.editor.setLineNumbers(ui.lineNumbers); }
renderAll();

listen<string>("menu", (e) => {
  const wid = getState().activeWindowId;
  switch (e.payload) {
    case "file.new": return newDoc();
    case "file.open": return void doOpen();
    case "file.save": return void doSave(false);
    case "file.save_as": return void doSave(true);
    case "view.split": return setMode(wid, "split");
    case "view.editor": return setMode(wid, "editor");
    case "view.read": return setMode(wid, "preview");
    case "view.softwrap": return toggleSoftWrap();
    case "help.guide": return openHelp();
  }
});

getInitialFile().then((r) => { if (r) openInWindow("main", { path: r.path, name: basename(r.path), text: r.contents }); });
```

- [ ] **Step 3: Update the session `subscribe` mirror** to read from `windows` (keep persisting
folder/explorer as before; tabs persisted in Task 8). For now keep the explorer mirror and
leave tab persistence to Task 8:

```ts
subscribe(() => {
  const s = getState();
  ui = { ...ui, folder: s.folder, explorerVisible: s.explorerVisible, explorerWidth: s.explorerWidth };
  saveState(ui);
});
```

- [ ] **Step 4: Delete the superseded modules**

```bash
git rm src/tabbar.ts src/windowtoolbar.ts src/views.ts
```

Remove their imports from `main.ts`.

- [ ] **Step 5: Type-check + run — MUST behave like Phase 4a**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run tauri dev` and verify the single-window app is **unchanged**: explorer opens
files as tabs, switching preserves undo, dirty dots, `⌘W` confirm, toolbar modes, line
numbers, save, soft wrap. The `⊞` button is present (toggles nothing useful yet — Task 6).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: render editor area through a single WindowView (behavior preserved)"
```

---

### Task 6: Sub window — toggle + splitter

**Files:**
- Modify: `src/main.ts`, `index.html`, `src/styles.css`

**Interfaces:**
- Produces: `⊞` toggles a Sub window. On: append `windows[1]` (`id: "sub"`, empty, `mode:
  "split"`) + its `WindowView` + a `#window-splitter` between them. Off: move Sub's tabs back
  to Main (confirming any unsaved), destroy the Sub view.

- [ ] **Step 1: Implement `toggleSub` in `src/main.ts`**

```ts
async function toggleSub(): Promise<void> {
  const s = getState();
  if (s.windows.length > 1) {
    // close sub: move its tabs back to main (confirm dirty)
    const sub = getWindow("sub")!;
    for (const t of sub.tabs) {
      if (t.dirty && !(await confirm(`Discard unsaved changes to "${t.name}"?`, { title: "Close Sub window", kind: "warning" }))) return;
    }
    const subView = views.get("sub")!;
    const main = mainWindow();
    const moved: TabMeta[] = [];
    for (const t of sub.tabs) {
      const id = nextId();
      moved.push({ ...t, id });
      views.get("main")!.editor.openState(id, subView.editor.getText(t.id));
    }
    subView.destroy();
    views.delete("sub");
    setState({
      windows: [{ ...main, tabs: [...main.tabs, ...moved] }],
      activeWindowId: "main",
    });
    removeSplitter();
    renderAll();
    if (mainWindow().activeTabId) activateTab("main", mainWindow().activeTabId!);
  } else {
    setState({ windows: [...s.windows, { id: "sub", tabs: [], activeTabId: null, mode: "split" }], activeWindowId: "sub" });
    addSplitter();
    makeView("sub", false);
    renderAll();
  }
}
```

- [ ] **Step 2: Add splitter helpers in `src/main.ts`** (drag-resize Main/Sub by flex-basis):

```ts
function addSplitter(): void {
  if (document.getElementById("window-splitter")) return;
  const splitter = document.createElement("div");
  splitter.id = "window-splitter";
  // insert between the two .window elements
  const mainEl = windowsHost.querySelector<HTMLElement>('.window[data-window-id="main"]')!;
  mainEl.after(splitter);
  let dragging = false;
  const onMove = (e: MouseEvent) => {
    if (!dragging) return;
    const rect = windowsHost.getBoundingClientRect();
    const ratio = Math.max(0.2, Math.min(0.8, (e.clientX - rect.left) / rect.width));
    const main = windowsHost.querySelector<HTMLElement>('.window[data-window-id="main"]')!;
    const sub = windowsHost.querySelector<HTMLElement>('.window[data-window-id="sub"]')!;
    main.style.flex = `${ratio} 1 0`;
    sub.style.flex = `${1 - ratio} 1 0`;
  };
  const onUp = () => { dragging = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  splitter.addEventListener("mousedown", (e) => { e.preventDefault(); dragging = true; document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp); });
}
function removeSplitter(): void {
  document.getElementById("window-splitter")?.remove();
  windowsHost.querySelectorAll<HTMLElement>(".window").forEach((el) => (el.style.flex = ""));
}
```

- [ ] **Step 3: Verify** — `npm run tauri dev`: `⊞` opens an empty Sub window with a splitter;
drag resizes; `⊞` again closes it and moves any tabs back to Main. Each window's toolbar modes
work independently.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts index.html src/styles.css
git commit -m "feat: Sub window toggle + resizable splitter"
```

---

### Task 7: "Open in Sub Window" + per-window keyboard

**Files:**
- Modify: `src/explorer.ts`, `src/main.ts`

**Interfaces:**
- Produces: an explorer context-menu item "Open in Sub Window" that (1) enables Sub if off,
  (2) opens the file there moving it out of Main if already open. `⌘E/P/B` act on the active
  window; `⌘W`/`⌘N` likewise.

- [ ] **Step 1: Expose an entry point in `src/main.ts`** — add a window-global function the
explorer can call (assign it to `window` so `explorer.ts` need not import `main`):

```ts
async function openInSub(path: string): Promise<void> {
  if (getState().windows.length < 2) await toggleSub();
  // move if already open in main
  const found = findTabByPath(getState().windows, path);
  if (found && found.windowId === "main") await closeTab("main", found.tab.id);
  const contents = await invoke<string>("read_file", { path });
  openInWindow("sub", { path, name: basename(path), text: contents });
}
(window as unknown as { mdflowOpenInSub: (p: string) => void }).mdflowOpenInSub = (p) => void openInSub(p);
```

- [ ] **Step 2: Add the context-menu item in `src/explorer.ts`** — in the row `contextmenu`
items array (Phase 2), add for files only:

```ts
      ...(node.isDir ? [] : [{ label: "Open in Sub Window", action: () => (window as unknown as { mdflowOpenInSub: (p: string) => void }).mdflowOpenInSub(node.path) }]),
```

- [ ] **Step 3: Keyboard shortcuts target the active window** — the menu accelerators already
emit `view.*` handled in the menu listener using `getState().activeWindowId` (Task 5 Step 2),
so `⌘E/P/B` already act on the active window. Verify `⌘W` is wired: add a `keydown` handler in
`main.ts` if not already present:

```ts
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
    e.preventDefault();
    const w = activeWindow();
    if (w.activeTabId) void closeTab(w.id, w.activeTabId);
  }
});
```

- [ ] **Step 4: Verify** — `npm run tauri dev`: right-click a file → "Open in Sub Window" opens
it in Sub (creating Sub if needed); if it was open in Main it moves. Click a window then `⌘B/E/P`
changes that window's mode; `⌘W` closes the active window's tab.

- [ ] **Step 5: Commit**

```bash
git add src/explorer.ts src/main.ts
git commit -m "feat: Open in Sub Window + per-window keyboard"
```

---

### Task 8: Session — persist + restore both windows

**Files:**
- Modify: `src/state.ts`, `src/__tests__/state.test.ts`, `src/main.ts`

**Interfaces:**
- Produces: persist each window's open paths + active path + mode, plus which window is active;
  restore on launch (skip vanished files; untitled/help tabs not restored).

- [ ] **Step 1: Replace the single-window session fields in `src/state.ts`.** Remove `openPaths`/
`activePath` and add:

```ts
  windows: { openPaths: string[]; activePath: string | null; mode: ViewMode }[];
  activeWindowIndex: number;
```

Add to `DEFAULTS`:

```ts
  windows: [{ openPaths: [], activePath: null, mode: "split" }],
  activeWindowIndex: 0,
```

- [ ] **Step 2: Update `src/__tests__/state.test.ts`** default-shape assertions: replace
`openPaths: [], activePath: null` with the new `windows`/`activeWindowIndex` defaults.

- [ ] **Step 3: Run state tests**

Run: `npm run test -- state`
Expected: PASS.

- [ ] **Step 4: Mirror windows into the session in `src/main.ts`** — extend the `subscribe`:

```ts
subscribe(() => {
  const s = getState();
  ui = {
    ...ui,
    folder: s.folder, explorerVisible: s.explorerVisible, explorerWidth: s.explorerWidth,
    windows: s.windows.map((w) => ({
      openPaths: w.tabs.map((t) => t.path).filter((p): p is string => !!p),
      activePath: w.tabs.find((t) => t.id === w.activeTabId)?.path ?? null,
      mode: w.mode,
    })),
    activeWindowIndex: s.windows.findIndex((w) => w.id === s.activeWindowId),
  };
  saveState(ui);
});
```

- [ ] **Step 5: Restore on launch in `src/main.ts`** — after `makeView("main", true)` and before
`getInitialFile()`:

```ts
async function restoreWindows(): Promise<void> {
  const saved = ui.windows;
  if (saved[1]) { setState({ windows: [...getState().windows, { id: "sub", tabs: [], activeTabId: null, mode: saved[1].mode }] }); addSplitter(); makeView("sub", false); }
  patchWindow("main", { mode: saved[0]?.mode ?? "split" });
  for (let i = 0; i < saved.length; i++) {
    const windowId = i === 0 ? "main" : "sub";
    for (const path of saved[i].openPaths) {
      try { const contents = await invoke<string>("read_file", { path }); openInWindow(windowId, { path, name: basename(path), text: contents }); }
      catch { /* vanished */ }
    }
    if (saved[i].activePath) {
      const found = findTabByPath(getState().windows, saved[i].activePath!);
      if (found && found.windowId === windowId) activateTab(windowId, found.tab.id);
    }
  }
  const ai = ui.activeWindowIndex === 1 ? "sub" : "main";
  if (getWindow(ai)) setState({ activeWindowId: ai });
  renderAll();
}
restoreWindows();
```

- [ ] **Step 6: Verify** — `npm run tauri dev`: open files in Main and Sub, set different modes,
quit, relaunch → both windows, their tabs, modes, and active states restore; vanished files skip.

- [ ] **Step 7: Commit**

```bash
git add src/state.ts src/__tests__/state.test.ts src/main.ts
git commit -m "feat: persist and restore both windows"
```

---

### Task 9: Smoke test + docs

**Files:**
- Modify: `docs/review.md`, `docs/tasks.md`

- [ ] **Step 1: Run all automated tests**

Run: `npm run test && (cd src-tauri && cargo test)`
Expected: all green (windowops ×2 added; tabops/paths/icons/treeops/state/preview as before).

- [ ] **Step 2: Manual smoke (`npm run tauri dev`), record in `docs/review.md`:**
  - Single window still behaves exactly as Phase 4a (tabs, modes, dirty, save, line numbers).
  - `⊞` opens/closes the Sub window; closing moves tabs back to Main (with dirty confirm).
  - Each window has independent tabs and independent Editor/Read/Split mode.
  - "Open in Sub Window" opens/moves a file into Sub; the same file never has two editor tabs.
  - Splitter resizes; clicking a window makes it active (`⌘E/P/B`, `⌘W` act on it).
  - Quit/relaunch restores both windows, their tabs, modes, and the active window.
  - Explorer, file management, soft wrap still work.

- [ ] **Step 3: Update `docs/tasks.md`** — mark Phase 4 done. The Shell sub-project's core
(explorer, tabs, split) is complete; note the remaining backlog (AI panel, top bar/search/
settings, compare/diff, drag-drop, copy-paste-move) and M2 (auto-update).

- [ ] **Step 4: Commit**

```bash
git add docs/review.md docs/tasks.md
git commit -m "test: Shell Phase 4b smoke test recorded"
```

---

## Self-Review

**Spec coverage (Phase 4 / Sub window):**
- Main + Sub windows, max 2 → Tasks 2, 6 ✓
- Each window own tabs + own view mode → Tasks 2, 4, 5, 6 ✓
- Sub toggle (top-right) → Task 6 ✓
- "Open in Sub Window" + one-open-copy ownership/move → Tasks 1, 7 ✓
- Resizable splitter → Task 6 ✓
- Per-window keyboard on active window → Tasks 5, 7 ✓
- Line numbers/soft wrap global across windows → Task 5 ✓
- Session for both windows → Task 8 ✓
- AI button remains disabled (AI sub-project) → Task 4 ✓

**Placeholder scan:** one intentional placeholder in Task 4 (`getState().ui_lineNumbers`) is
explicitly removed in Task 4 Step 2 with the `setLineNumbersFlag` setter — flagged, not left.
No other placeholders.

**Type consistency:** `WindowState` shared via `windowops.ts` and used by `store.ts`; `ViewMode`
used for window mode; `TabMeta` unchanged; editor handle methods (`openState`/`switchTo`/
`closeState`/`getText`/`setSoftWrap`/`setLineNumbers`/`focus`) match Phase 3; `WindowHandlers`/
`WindowView` signatures match `main.ts` call sites.

**Risk note:** Tasks 3–5 are the structural refactor — verify the single-window app is byte-for-
behavior identical to Phase 4a before Task 6. Tasks 6–9 are additive. The hardest correctness
point is doc ownership when moving tabs between windows (Tasks 6–7): a path must never have two
live editor tabs — `findTabByPath` + move-on-open enforce this.
