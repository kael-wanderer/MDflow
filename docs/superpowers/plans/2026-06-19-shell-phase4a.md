# MDflow Shell — Phase 4a Implementation Plan (Per-window Toolbar + Line Numbers)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-window toolbar to the editor area — Editor / Read / Split buttons (mirroring the existing view modes) plus a Line Numbers toggle — and show disabled Sub-window and AI buttons as placeholders. No second window yet; that's Phase 4b.

**Architecture:** A small `windowtoolbar.ts` render module sits at the right of the tab strip. It wires the mode + line-number buttons to callbacks and exposes an `update()` to reflect current state. `main.ts` owns the state (the existing `ui.viewMode` plus a new `ui.lineNumbers`) and calls `update()` whenever it changes. Line-number toggling reuses the `editor.setLineNumbers` method already built in Phase 3.

**Tech Stack:** Tauri 2 + Rust, Vite + TS, CodeMirror 6 (all existing). No new dependencies.

## Global Constraints

- **License: MIT.** Clean-room — no Kaelio/mx/Vibery code or CSS. No "mx"/"Vibery"/"Kaelio" names anywhere.
- **Identifier:** `com.kael.mdflow`. Product name: **MDflow**.
- **Vanilla TS + the existing `store.ts`. No frontend framework.**
- Small, focused files; no premature abstraction — **do not** build a multi-window
  abstraction here; this is single-window only. The Sub window is Phase 4b.
- View modes remain global for now (one window). `ui.viewMode` uses `"preview"` for the
  "Read" button.
- Builds on Phases 1–3.

---

## File Structure (Phase 4a)

```
src/
  windowtoolbar.ts  # NEW: render the in-window toolbar (mode + line numbers + placeholders)
  state.ts          # MODIFY: add ui.lineNumbers
  main.ts           # MODIFY: wire toolbar; toggleLineNumbers; reflect state
  styles.css        # MODIFY: editor-header + toolbar styling
  __tests__/
    state.test.ts   # MODIFY: default-shape assertions include lineNumbers
index.html          # MODIFY: wrap tabbar + toolbar in an editor header row
```

---

### Task 1: `ui.lineNumbers` in persisted state

**Files:**
- Modify: `src/state.ts`, `src/__tests__/state.test.ts`

**Interfaces:**
- Produces: `UIState` gains `lineNumbers: boolean` (default `true`), persisted with the rest.

- [ ] **Step 1: Add the field in `src/state.ts`** — add to the `UIState` type:

```ts
  lineNumbers: boolean;
```

and to `DEFAULTS`:

```ts
  lineNumbers: true,
```

- [ ] **Step 2: Update the default-shape assertions in `src/__tests__/state.test.ts`** — add `lineNumbers: true` to each object that asserts the full default shape (the "returns defaults", "falls back to defaults", and "merges partial" tests).

- [ ] **Step 3: Run the state tests**

Run: `npm run test -- state`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/state.ts src/__tests__/state.test.ts
git commit -m "feat: persist line-numbers preference"
```

---

### Task 2: Editor-header DOM + toolbar CSS

**Files:**
- Modify: `index.html`, `src/styles.css`

**Interfaces:**
- Produces the DOM the toolbar module targets: an `#editor-header` row containing the
  existing `#tabbar` (left, flexes) and a `#window-toolbar` (right) with buttons
  `#mode-editor`, `#mode-read`, `#mode-split`, `#toggle-linenumbers`, `#toggle-subwindow`
  (disabled), `#toggle-ai` (disabled).

- [ ] **Step 1: Wrap the tab strip in `index.html`** — replace the existing `#tabbar` line inside `#editorarea` with:

```html
          <div id="editor-header" class="editor-header">
            <div id="tabbar" class="tabbar"></div>
            <div id="window-toolbar" class="window-toolbar">
              <button id="mode-editor" class="wt-btn" type="button" title="Editor (⌘E)">Editor</button>
              <button id="mode-read" class="wt-btn" type="button" title="Read (⌘P)">Read</button>
              <button id="mode-split" class="wt-btn" type="button" title="Split (⌘B)">Split</button>
              <span class="wt-sep" aria-hidden="true"></span>
              <button id="toggle-linenumbers" class="wt-btn wt-icon" type="button" title="Line numbers">#</button>
              <span class="wt-sep" aria-hidden="true"></span>
              <button id="toggle-subwindow" class="wt-btn wt-icon" type="button" title="Sub window (coming in Phase 4b)" disabled>⊞</button>
              <button id="toggle-ai" class="wt-btn wt-icon" type="button" title="AI panel (coming soon)" disabled>✦</button>
            </div>
          </div>
```

- [ ] **Step 2: Add toolbar CSS to `src/styles.css`** — and stack the header above the panes:

```css
/* ---------- Editor header (tabs + window toolbar) ---------- */
#editorarea { flex-direction: column; }
.editor-header {
  display: flex; align-items: stretch; min-height: 36px; flex-shrink: 0;
  background: var(--bg-elev); border-bottom: 1px solid var(--border);
}
.editor-header .tabbar { flex: 1; min-width: 0; border-bottom: 0; }
.editor-header .tabbar.empty { display: flex; } /* keep header height when no tabs */

.window-toolbar {
  display: flex; align-items: center; gap: 2px;
  padding: 0 8px; flex-shrink: 0;
}
.wt-btn {
  height: 24px; padding: 0 9px;
  font: inherit; font-size: 12.5px; color: var(--muted);
  background: transparent; border: 0; border-radius: 6px; cursor: default;
}
.wt-btn:hover:not(:disabled) { color: var(--text); background: rgba(255,255,255,0.05); }
.wt-btn.active { color: var(--text-strong); background: rgba(255,255,255,0.08); }
.wt-btn:disabled { opacity: 0.35; }
.wt-icon { padding: 0 7px; font-size: 14px; }
.wt-sep { width: 1px; height: 16px; margin: 0 4px; background: var(--border-soft); }
```

(Note: in Phase 3 the `.tabbar` had `.tabbar.empty { display: none }`. The override above
keeps the header visible even with no tabs so the toolbar is always reachable.)

- [ ] **Step 3: Verify the header renders** — `npm run tauri dev`: the tab strip now has Editor/Read/Split + `#` + disabled `⊞`/`✦` on its right. (Wiring is next.)

- [ ] **Step 4: Commit**

```bash
git add index.html src/styles.css
git commit -m "feat: editor header with window toolbar (mode + line numbers + placeholders)"
```

---

### Task 3: `windowtoolbar.ts` — render + wire

**Files:**
- Create: `src/windowtoolbar.ts`

**Interfaces:**
- Consumes: `ViewMode` from `state.ts`.
- Produces:
  - `initWindowToolbar(handlers: { onMode: (m: ViewMode) => void; onToggleLineNumbers: () => void }): { update: (mode: ViewMode, lineNumbers: boolean) => void }`
  - Clicking Editor/Read/Split calls `onMode("editor" | "preview" | "split")`; clicking `#`
    calls `onToggleLineNumbers`. `update()` reflects the active mode + line-number state on
    the buttons.

- [ ] **Step 1: Implement `src/windowtoolbar.ts`**

```ts
import type { ViewMode } from "./state";

export function initWindowToolbar(handlers: {
  onMode: (m: ViewMode) => void;
  onToggleLineNumbers: () => void;
}): { update: (mode: ViewMode, lineNumbers: boolean) => void } {
  const btnEditor = document.getElementById("mode-editor")!;
  const btnRead = document.getElementById("mode-read")!;
  const btnSplit = document.getElementById("mode-split")!;
  const btnLines = document.getElementById("toggle-linenumbers")!;

  btnEditor.addEventListener("click", () => handlers.onMode("editor"));
  btnRead.addEventListener("click", () => handlers.onMode("preview"));
  btnSplit.addEventListener("click", () => handlers.onMode("split"));
  btnLines.addEventListener("click", () => handlers.onToggleLineNumbers());

  return {
    update(mode, lineNumbers) {
      btnEditor.classList.toggle("active", mode === "editor");
      btnRead.classList.toggle("active", mode === "preview");
      btnSplit.classList.toggle("active", mode === "split");
      btnLines.classList.toggle("active", lineNumbers);
    },
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit src/windowtoolbar.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/windowtoolbar.ts
git commit -m "feat: window toolbar render module"
```

---

### Task 4: Wire toolbar into `main.ts` + line-number toggle

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `initWindowToolbar` (Task 3); `editor.setLineNumbers` (Phase 3).
- Produces: toolbar reflects view mode + line numbers; line-number toggle applies + persists.

- [ ] **Step 1: Import and init the toolbar in `src/main.ts`** — add the import:

```ts
import { initWindowToolbar } from "./windowtoolbar";
```

After the editor is created and `ui` is loaded, add:

```ts
const toolbar = initWindowToolbar({
  onMode: (m) => setMode(m),
  onToggleLineNumbers: () => toggleLineNumbers(),
});
```

- [ ] **Step 2: Add `toggleLineNumbers` and reflect state** — add the function:

```ts
function toggleLineNumbers(): void {
  ui = { ...ui, lineNumbers: !ui.lineNumbers };
  editor.setLineNumbers(ui.lineNumbers);
  saveState(ui);
  toolbar.update(ui.viewMode, ui.lineNumbers);
}
```

And update `setMode` to refresh the toolbar — add `toolbar.update(...)` at its end:

```ts
function setMode(mode: ViewMode): void {
  ui = { ...ui, viewMode: mode };
  applyViewMode(mode);
  saveState(ui);
  toolbar.update(ui.viewMode, ui.lineNumbers);
}
```

- [ ] **Step 3: Apply line numbers + sync the toolbar on startup** — in the "Initial state" block (where `applyViewMode(ui.viewMode)` etc. run), add:

```ts
editor.setLineNumbers(ui.lineNumbers);
toolbar.update(ui.viewMode, ui.lineNumbers);
```

- [ ] **Step 4: Type-check + run**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run tauri dev` and verify:
  - Editor/Read/Split buttons switch the view and the active button highlights; they stay
    in sync with the View menu and ⌘E/P/B.
  - `#` toggles line numbers in the editor and persists across relaunch.
  - `⊞` and `✦` are visibly disabled.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire window toolbar + line-number toggle"
```

---

### Task 5: Smoke test + docs

**Files:**
- Modify: `docs/review.md`, `docs/tasks.md`

- [ ] **Step 1: Run all automated tests**

Run: `npm run test && (cd src-tauri && cargo test)`
Expected: all green (state test now asserts `lineNumbers`).

- [ ] **Step 2: Manual smoke (`npm run tauri dev`), record in `docs/review.md`:**
  - Toolbar Editor/Read/Split match the menu + keyboard; active button reflects mode.
  - Line-numbers `#` toggles and persists across relaunch.
  - Disabled `⊞` (Sub window) and `✦` (AI) show as placeholders.
  - Tabs, explorer, file management, save/soft-wrap all still work.

- [ ] **Step 3: Update `docs/tasks.md`** — mark Phase 4a done; set Phase 4b (Sub window) as next.

- [ ] **Step 4: Commit**

```bash
git add docs/review.md docs/tasks.md
git commit -m "test: Shell Phase 4a smoke test recorded"
```

---

## Self-Review

**Spec coverage (Phase 4a slice of the design's per-window toolbar):**
- Per-window toolbar Editor/Read/Split → Tasks 2, 3, 4 ✓
- Line-numbers toggle → Tasks 1, 4 (reuses `editor.setLineNumbers`) ✓
- Sub-window + AI buttons present but disabled (placeholders) → Task 2 ✓
- View modes stay global / single window (Sub window deferred to 4b) → matches the split ✓

**Placeholder scan:** none — every code step is complete. The disabled buttons are an
explicit, intended scope boundary (Phase 4b / AI sub-project), not unfinished work.

**Type consistency:** `ViewMode` (`"editor" | "preview" | "split"`) used consistently;
`initWindowToolbar` return type (`{ update }`) matches its use in `main.ts`; `update(mode,
lineNumbers)` signature matches all call sites; `editor.setLineNumbers(boolean)` matches the
Phase 3 `EditorHandle`.

**Note:** This phase intentionally does **not** introduce a window abstraction or a
`windows[]` store shape — that lands in Phase 4b when the second window actually needs it
(YAGNI). 4a only adds UI controls over the existing single-window model.
