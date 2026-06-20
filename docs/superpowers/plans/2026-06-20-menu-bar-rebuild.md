# Menu Bar Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **DECISION GATE (confirm before Task 3):** the View menu reassigns shortcuts —
> ⌘B → Show/Hide Explorer (was Split), ⌘P → Show/Hide Preview (palette becomes **⌘K only**),
> ⌘E → Reading View (was Editor-only). If the user wants different bindings, adjust the
> accelerators in Task 3 before implementing.

**Goal:** Rebuild the native View menu (pane toggles, Soft Wrap submenu, zoom, Font/Text Size/Explorer Text Size/Theme submenus) and add Window menu items (Enter Full Screen, Move to Left/Right Half).

**Architecture:** `menu.rs` is rebuilt with new submenus + ids; menu events route to existing app functions in `main.ts` (view toggles, zoom, settings apply) plus new behavior for Soft Wrap modes (settings + CodeMirror) and window tiling (Tauri window APIs).

**Tech Stack:** Tauri 2 menus, Rust, TypeScript/CodeMirror, Vitest. Design spec: `docs/superpowers/specs/2026-06-20-menu-bar-rebuild-design.md`.

## Global Constraints

- View menu layout (exact, from the mockup): Show/Hide Explorer ⌘B; Show/Hide Preview ⌘P; Reading View ⌘E; Show/Hide Line Numbers; Soft Wrap ▸ Off | Window Width | Page Guide; ─; Zoom In ⌘=; Zoom Out ⌘−; Reset Zoom ⌘0; ─; Font ▸; Text Size ▸; Explorer Text Size ▸; Theme ▸.
- Window menu adds: Enter Full Screen; Move to Left Half; Move to Right Half (plus existing Minimize).
- Soft Wrap modes: `off` | `window` | `guide` (Page Guide = wrap + ruler at a fixed column, default 80).
- Palette becomes ⌘K only once ⌘P is reassigned.
- Clean-room; TDD for settings parsing; frequent commits.

---

### Task 1: Soft-wrap mode + wrap column settings (pure)

**Files:**
- Modify: `src/settings.ts`, `src/__tests__/settings.test.ts`

**Interfaces:**
- Produces: `Settings.softWrapMode: "off" | "window" | "guide"`, `Settings.wrapColumn: number` (default 80).

- [ ] **Step 1: Write the failing test**

```ts
// add to src/__tests__/settings.test.ts
describe("soft wrap", () => {
  it("defaults to window-width wrap, column 80", () => {
    const s = parseSettings("{}");
    expect(s.softWrapMode).toBe("window");
    expect(s.wrapColumn).toBe(80);
  });
  it("accepts a guide mode and column", () => {
    const s = parseSettings('{"softWrapMode":"guide","wrapColumn":100}');
    expect(s.softWrapMode).toBe("guide");
    expect(s.wrapColumn).toBe(100);
  });
  it("clamps an out-of-range column", () => {
    expect(parseSettings('{"wrapColumn":5}').wrapColumn).toBe(20);
    expect(parseSettings('{"wrapColumn":500}').wrapColumn).toBe(200);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/__tests__/settings.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add `softWrapMode` (`"off"|"window"|"guide"`, default `"window"` — preserving today's
soft-wrap-on default) and `wrapColumn` (default 80, clamped 20–200) to `Settings`,
`DEFAULT_SETTINGS`, and `parseSettings`. Migrate the existing `softWrap` boolean if
present: `true → "window"`, `false → "off"`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/__tests__/settings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/settings.ts src/__tests__/settings.test.ts
git commit -m "feat(menu): soft-wrap mode + wrap column settings"
```

---

### Task 2: Editor honors soft-wrap mode + page guide

**Files:**
- Modify: `src/editor.ts`

**Interfaces:**
- Consumes: `softWrapMode`, `wrapColumn` (Task 1).
- Produces: `EditorHandle.setSoftWrapMode(mode: "off" | "window" | "guide", column: number): void`.

- [ ] **Step 1: Implement**

Replace the existing boolean `setSoftWrap` usage with `setSoftWrapMode`. Behavior:
- `off` → no line wrapping.
- `window` → `EditorView.lineWrapping` (wrap at pane width — current behavior).
- `guide` → `EditorView.lineWrapping` plus a visual column guide at `column` (a
  CodeMirror decoration/theme rule placing a vertical rule at `column` ch), and wrap
  there. Implement the guide via a compartment so it reconfigures live.

Keep a thin `setSoftWrap(boolean)` shim only if other callers still use it; otherwise
update callers to `setSoftWrapMode`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: clean. (Manual: Off / Window Width / Page Guide each behave; the guide ruler
shows at the configured column.)

- [ ] **Step 3: Commit**

```bash
git add src/editor.ts
git commit -m "feat(menu): editor soft-wrap modes + page guide"
```

---

### Task 3: Rebuild the native View + Window menus

**Files:**
- Modify: `src-tauri/src/menu.rs`

**Interfaces:**
- Produces menu event ids consumed by Task 4: `view.toggle_explorer`, `view.toggle_preview`, `view.reading`, `view.toggle_lines`, `view.wrap.off`, `view.wrap.window`, `view.wrap.guide`, `view.zoom_in`, `view.zoom_out`, `view.zoom_reset`, `view.font.<value>`, `view.size.<n>`, `view.explorer_size.<n>`, `view.theme.<id>`, `window.fullscreen`, `window.left_half`, `window.right_half`.

- [ ] **Step 1: Build the View submenu**

Rebuild the View submenu per the layout in Global Constraints, with these accelerators:
Show/Hide Explorer `CmdOrCtrl+B`, Show/Hide Preview `CmdOrCtrl+P`, Reading View
`CmdOrCtrl+E`, Zoom In `CmdOrCtrl+=`, Zoom Out `CmdOrCtrl+-`, Reset Zoom `CmdOrCtrl+0`.
Soft Wrap is a nested submenu with three check items (`view.wrap.off/window/guide`),
the active one checked. Font / Text Size / Explorer Text Size / Theme are nested
submenus built from the same option lists the Gear panel uses (font families; sizes
12,14,16,18,20,24; the theme ids/labels), each item id suffixed with its value, the
active value checked.

- [ ] **Step 2: Build the Window submenu**

Window submenu: `window.fullscreen` ("Enter Full Screen", accelerator `Ctrl+Cmd+F`),
`window.left_half` ("Move to Left Half"), `window.right_half` ("Move to Right Half"),
then the existing Minimize.

- [ ] **Step 3: Remove superseded items**

Remove the old `view.split`/`view.editor`/`view.read`/`view.softwrap` items replaced by
the above. (Optional: keep a "Split View" item under View with `Ctrl+Cmd+B` if a split
shortcut is still wanted — confirm with the decision gate.)

- [ ] **Step 4: Verify compile**

Run: `cd src-tauri && cargo check`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/menu.rs
git commit -m "feat(menu): rebuilt View + Window native menus"
```

---

### Task 4: Route menu events in the frontend + reassign palette

**Files:**
- Modify: `src/main.ts`
- Modify: wherever ⌘P/⌘K are bound for the palette (search `palette.open`)

**Interfaces:**
- Consumes: menu ids (Task 3), `setSoftWrapMode` (Task 2), settings apply, view-mode functions.

- [ ] **Step 1: Handle the new menu events**

In the `menu` event listener in `main.ts`, add cases:
- `view.toggle_explorer` → click `#ab-explorer` (existing toggle).
- `view.toggle_preview` → toggle the active window editor↔split.
- `view.reading` → set the active window to preview-only (toggle back if already).
- `view.toggle_lines` → `toggleLineNumbers()`.
- `view.wrap.off|window|guide` → set `settings.softWrapMode` and apply via
  `setSoftWrapMode(mode, settings.wrapColumn)` to all editors.
- `view.zoom_in|zoom_out|zoom_reset` → existing focused-zoom functions.
- `view.font.<v>` / `view.size.<n>` / `view.explorer_size.<n>` / `view.theme.<id>` →
  update the matching setting and `applySettings`.
- `window.fullscreen|left_half|right_half` → invoke the window commands (Task 5).

- [ ] **Step 2: Reassign the palette to ⌘K only**

Remove the ⌘P keybinding for the palette so ⌘P is free for the menu's Show/Hide Preview;
keep ⌘K. Verify no other feature relies on ⌘P.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean. (Manual: each View item drives the right behavior; ⌘K opens the
palette; ⌘P toggles preview.)

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat(menu): route View/Window menu events; palette to Cmd+K"
```

---

### Task 5: Window full-screen + left/right half tiling

**Files:**
- Modify: `src-tauri/src/lib.rs` (commands)

**Interfaces:**
- Produces (Tauri commands): `window_fullscreen_toggle()`, `window_tile(side: String)` where side is `"left"` or `"right"`.

- [ ] **Step 1: Implement**

`window_fullscreen_toggle`: read the focused window's `is_fullscreen()` and
`set_fullscreen(!current)`.
`window_tile(side)`: get the window's `current_monitor()`, compute the monitor work-area
size; set the window position to the monitor origin (left) or origin+half-width (right)
and size to half-width × full-height. No-op if monitor info is unavailable. Register both
commands; the menu handlers in Task 4 invoke them.

- [ ] **Step 2: Verify compile + build**

Run: `cd src-tauri && cargo check` then `npm run build`.
Expected: clean. (Manual, multi-monitor: full screen toggles; left/right half tile
correctly on the active display.)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(menu): window fullscreen + left/right half tiling"
```

---

### Task 6: Docs + test cases

**Files:**
- Modify: `CLAUDE.md`, `docs/tasks.md`, and add `docs/test-cases/17-menu-bar.md`

- [ ] **Step 1: Document + cases + verify + commit**

Note the new menu structure, the keybinding changes (palette → ⌘K), Soft Wrap modes, and
window tiling. Add a `17-menu-bar.md` test-cases file covering each View item, the Soft
Wrap modes, Font/Size/Theme submenus applying with the active value checked, and Window
full-screen/left/right half. Add it to the test-cases README index.
```bash
npm run build && npx vitest run && (cd src-tauri && cargo check)
git add CLAUDE.md docs/tasks.md docs/test-cases/
git commit -m "docs(menu): record menu rebuild + test cases"
```

---

## Self-Review

- **Spec coverage:** View menu (T3, T4), Soft Wrap modes + Page Guide (T1, T2, T3, T4), zoom (T3, T4), Font/Size/Theme submenus (T3, T4), Window full-screen + tiling (T3, T5), keybinding reassignment incl. palette → ⌘K (T4), docs/cases (T6). Covered.
- **Placeholders:** none; menu-id strings are defined in T3 and consumed verbatim in T4.
- **Type consistency:** `setSoftWrapMode(mode, column)` (T2) used in T4; `window_tile(side)`/`window_fullscreen_toggle` (T5) invoked from T4 handlers; menu ids identical between T3 (produce) and T4 (consume).
