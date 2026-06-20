# Mindmap Rich Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users format individual mindmap nodes — shape (rect/rounded/pill/circle), fill color, text color, font size, and bold — from the on-board toolbar, persisted in the `.mind` file.

**Architecture:** Build on jsMind's built-in per-node styling (`set_node_color`, `set_node_font_style`, which write into each node's `data` and re-render) and add shapes via a `mm-shape` value in node `data` mapped to a CSS class. A pure helper module holds the shape/color/size logic and is unit-tested; `mindmapview.ts` wires a selection-driven format toolbar row to jsMind; styling lives in `styles.css`. Node `data` already round-trips through `src/mindmap-document.ts`, so the `.mind` format is unchanged.

**Tech Stack:** TypeScript (no framework), jsMind 0.9.1, Vitest, CSS variables.

Design spec: `docs/superpowers/specs/2026-06-20-mindmap-rich-editor-design.md`.

## Global Constraints

- Clean-room: never copy code/CSS from Kaelio; no names "mx"/"Vibery"/"Kaelio".
- jsMind is pinned at 0.9.1; use only its public methods: `get_node(id)`,
  `get_selected_node()`, `select_node(node)`, `begin_edit(node)`,
  `add_node(parent,id,topic)`, `insert_node_after(node,id,topic)`,
  `remove_node(node)`, `set_node_color(id,bg,fg)`,
  `set_node_font_style(id,size,weight,style?)`, `get_data("node_tree")`.
- jsMind event types: `show=1, resize=2, edit=3, select=4`.
- `set_node_color`/`set_node_font_style` only apply truthy args (a `null`/`""`
  argument leaves that property unchanged), so set fill and text independently.
- No `.mind` format change: all style lives in node `data`.
- Plain TypeScript, one responsibility per file. TDD for the pure module.
  Frequent commits.
- Scope fences (do NOT build): branch-wide apply, per-node font family,
  cloud/organic shapes, curved connectors, clear-to-default color.

---

### Task 1: Pure mindmap-style module (TDD)

**Files:**
- Create: `src/mindmap-style.ts`
- Create: `src/__tests__/mindmap-style.test.ts`

**Interfaces:**
- Produces:
  - `SHAPES: readonly ["rect","rounded","pill","circle"]`, `type MindShape`
  - `type NodeStyle = { shape: MindShape; fill: string; text: string; fontSize: number; bold: boolean }`
  - `FILL_SWATCHES: readonly string[]`, `TEXT_SWATCHES: readonly string[]`
  - `DEFAULT_FONT_SIZE: number`
  - `clampFontSize(n: unknown): number` (10–40, round, fallback default)
  - `normalizeShape(shape: unknown): MindShape` (unknown → `"rounded"`)
  - `shapeClass(shape: unknown): string` (e.g. `"mm-shape-pill"`; fallback `"mm-shape-rounded"`)
  - `readNodeStyle(data: unknown): NodeStyle`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/mindmap-style.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  clampFontSize,
  normalizeShape,
  shapeClass,
  readNodeStyle,
  DEFAULT_FONT_SIZE,
} from "../mindmap-style";

describe("clampFontSize", () => {
  it("clamps below and above the range", () => {
    expect(clampFontSize(4)).toBe(10);
    expect(clampFontSize(999)).toBe(40);
  });
  it("rounds and falls back on non-numbers", () => {
    expect(clampFontSize(17.6)).toBe(18);
    expect(clampFontSize("nope")).toBe(DEFAULT_FONT_SIZE);
    expect(clampFontSize(undefined)).toBe(DEFAULT_FONT_SIZE);
  });
});

describe("normalizeShape / shapeClass", () => {
  it("keeps known shapes", () => {
    expect(normalizeShape("circle")).toBe("circle");
    expect(shapeClass("pill")).toBe("mm-shape-pill");
  });
  it("falls back to rounded for unknown", () => {
    expect(normalizeShape("blob")).toBe("rounded");
    expect(normalizeShape(undefined)).toBe("rounded");
    expect(shapeClass(42)).toBe("mm-shape-rounded");
  });
});

describe("readNodeStyle", () => {
  it("returns defaults for empty data", () => {
    expect(readNodeStyle(undefined)).toEqual({
      shape: "rounded",
      fill: "",
      text: "",
      fontSize: DEFAULT_FONT_SIZE,
      bold: false,
    });
  });
  it("reads jsMind + mm-shape keys", () => {
    expect(
      readNodeStyle({
        "background-color": "#ffcc80",
        "foreground-color": "#1a1a1a",
        "font-size": 24,
        "font-weight": "bold",
        "mm-shape": "circle",
      }),
    ).toEqual({
      shape: "circle",
      fill: "#ffcc80",
      text: "#1a1a1a",
      fontSize: 24,
      bold: true,
    });
  });
  it("treats numeric/700 weight as bold and clamps size", () => {
    const s = readNodeStyle({ "font-weight": 700, "font-size": 99 });
    expect(s.bold).toBe(true);
    expect(s.fontSize).toBe(40);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/__tests__/mindmap-style.test.ts`
Expected: FAIL (cannot find module `../mindmap-style`).

- [ ] **Step 3: Implement the module**

Create `src/mindmap-style.ts`:

```ts
export const SHAPES = ["rect", "rounded", "pill", "circle"] as const;
export type MindShape = (typeof SHAPES)[number];

export type NodeStyle = {
  shape: MindShape;
  fill: string;
  text: string;
  fontSize: number;
  bold: boolean;
};

export const FILL_SWATCHES = [
  "#ef9a9a",
  "#ffcc80",
  "#fff59d",
  "#a5d6a7",
  "#80deea",
  "#90caf9",
  "#ce93d8",
  "#bcaaa4",
] as const;

export const TEXT_SWATCHES = [
  "#1a1a1a",
  "#ffffff",
  "#b71c1c",
  "#1b5e20",
  "#0d47a1",
  "#4a148c",
  "#e65100",
  "#37474f",
] as const;

export const DEFAULT_FONT_SIZE = 16;

export function clampFontSize(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return DEFAULT_FONT_SIZE;
  return Math.min(40, Math.max(10, Math.round(v)));
}

export function normalizeShape(shape: unknown): MindShape {
  return SHAPES.includes(shape as MindShape) ? (shape as MindShape) : "rounded";
}

export function shapeClass(shape: unknown): string {
  return `mm-shape-${normalizeShape(shape)}`;
}

export function readNodeStyle(data: unknown): NodeStyle {
  const d = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  const weight = d["font-weight"];
  return {
    shape: normalizeShape(d["mm-shape"]),
    fill: typeof d["background-color"] === "string" ? (d["background-color"] as string) : "",
    text: typeof d["foreground-color"] === "string" ? (d["foreground-color"] as string) : "",
    fontSize: d["font-size"] === undefined ? DEFAULT_FONT_SIZE : clampFontSize(d["font-size"]),
    bold: weight === "bold" || weight === 700 || weight === "700",
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/__tests__/mindmap-style.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mindmap-style.ts src/__tests__/mindmap-style.test.ts
git commit -m "feat(mindmap): pure node-style helpers (shape/color/size)"
```

---

### Task 2: Shape persistence + apply-on-load + CSS

**Files:**
- Modify: `src/mindmapview.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `SHAPES`, `MindShape`, `normalizeShape` from `./mindmap-style` (Task 1).
- Produces (inside `mountMindmapBoard`): a `persist()` saver, a
  `reapplyShapes()` pass, and `applyShapeClass(id, shape)`; extended
  `JsMindInstance` type with `get_node`, `set_node_color`, `set_node_font_style`.

- [ ] **Step 1: Extend the jsMind type + import helpers**

In `src/mindmapview.ts`, add the import near the top (after the existing
`parseMindmap` import):

```ts
import { SHAPES, normalizeShape, type MindShape } from "./mindmap-style";
```

Replace the `MindNode` type and add methods to `JsMindInstance`:

```ts
type MindNode = {
  id: string;
  parent?: MindNode | null;
  data?: Record<string, unknown>;
};
```

Add these three members inside the `JsMindInstance` type (next to the existing
`add_node` etc.):

```ts
  get_node: (id: string) => MindNode | null;
  set_node_color: (id: string, bg: string | null, fg: string | null) => void;
  set_node_font_style: (
    id: string,
    size: number | null,
    weight: string | null,
    style?: string | null,
  ) => void;
```

- [ ] **Step 2: Add shape helpers and a shared `persist()` in `mountMindmapBoard`**

In `mountMindmapBoard`, immediately after `jm.show(mind);`, add:

```ts
  const applyShapeClass = (id: string, shape: MindShape): void => {
    const el = canvas.querySelector(`jmnode[nodeid="${CSS.escape(id)}"]`);
    if (!el) return;
    for (const s of SHAPES) el.classList.toggle(`mm-shape-${s}`, s === shape);
  };
  const reapplyShapes = (): void => {
    for (const el of canvas.querySelectorAll<HTMLElement>("jmnode")) {
      const id = el.getAttribute("nodeid");
      if (!id) continue;
      const node = jm.get_node(id);
      applyShapeClass(id, normalizeShape(node?.data?.["mm-shape"]));
    }
  };
  reapplyShapes();
```

Then find the existing change-listener block:

```ts
  let accepting = false;
  let last = serializeMindmap(jm.get_data("node_tree"));
  const timer = window.setTimeout(() => {
    accepting = true;
  }, 250);
  const listener = (): void => {
    if (!accepting) return;
    const serialized = serializeMindmap(jm.get_data("node_tree"));
    if (serialized === last) return;
    last = serialized;
    onChange(serialized);
  };
  jm.add_event_listener(listener);
```

Replace it with:

```ts
  let accepting = false;
  let last = serializeMindmap(jm.get_data("node_tree"));
  const timer = window.setTimeout(() => {
    accepting = true;
  }, 250);
  const persist = (): void => {
    const serialized = serializeMindmap(jm.get_data("node_tree"));
    if (serialized === last) return;
    last = serialized;
    onChange(serialized);
  };
  const listener = (): void => {
    reapplyShapes();
    if (accepting) persist();
  };
  jm.add_event_listener(listener);
```

> `persist` is also called directly by the format handlers in Task 3.
> `reapplyShapes` runs on every jsMind event so node classes survive re-renders.

- [ ] **Step 3: Add the CSS shape classes**

In `src/styles.css`, after the existing `.window-document-board jmnode { … }`
rule, add:

```css
.window-document-board jmnode.mm-shape-rect {
  border-radius: 2px;
}

.window-document-board jmnode.mm-shape-rounded {
  border-radius: 8px;
}

.window-document-board jmnode.mm-shape-pill {
  border-radius: 999px;
}

.window-document-board jmnode.mm-shape-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  padding: 6px;
  text-align: center;
  border-radius: 50%;
  overflow: hidden;
}
```

- [ ] **Step 4: Build and manually verify shapes render from saved data**

Run: `npm run build`
Expected: clean.

Manual: create a `.mind` file whose root has `"data": {"mm-shape": "circle"}`
(or edit one through the app once Task 3 lands), open it in the app, and confirm
the node renders as a circle. (If verifying before Task 3, hand-edit the JSON.)

- [ ] **Step 5: Commit**

```bash
git add src/mindmapview.ts src/styles.css
git commit -m "feat(mindmap): persist + render per-node shapes"
```

---

### Task 3: Format toolbar row + control wiring

**Files:**
- Modify: `src/mindmapview.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `persist`, `reapplyShapes`, `applyShapeClass` (Task 2);
  `readNodeStyle`, `clampFontSize`, `FILL_SWATCHES`, `TEXT_SWATCHES`, `SHAPES`,
  `MindShape` (Task 1).

- [ ] **Step 1: Import the remaining helpers**

Extend the Task-2 import in `src/mindmapview.ts` to:

```ts
import {
  SHAPES,
  FILL_SWATCHES,
  TEXT_SWATCHES,
  clampFontSize,
  normalizeShape,
  readNodeStyle,
  type MindShape,
} from "./mindmap-style";
```

- [ ] **Step 2: Restructure the toolbar into two rows**

Find the existing toolbar construction:

```ts
  const bar = document.createElement("div");
  bar.className = "mm-toolbar";
  wrap.append(canvas, bar);
```

Replace with:

```ts
  const bar = document.createElement("div");
  bar.className = "mm-toolbar";
  const nodeRow = document.createElement("div");
  nodeRow.className = "mm-row";
  const formatRow = document.createElement("div");
  formatRow.className = "mm-row mm-format";
  formatRow.hidden = true;
  bar.append(nodeRow, formatRow);
  wrap.append(canvas, bar);
```

Then find the existing `bar.append(` call that adds the node buttons:

```ts
  bar.append(
    makeButton("+ Child", addChild),
    makeButton("+ Sibling", addSibling),
    makeButton("Rename", renameSelected),
    makeButton("Delete", removeSelected),
  );
```

Change `bar.append(` to `nodeRow.append(`.

- [ ] **Step 3: Build the format controls and handlers**

Immediately after the `nodeRow.append(...)` call, add:

```ts
  const selectedNode = (): MindNode | null => jm.get_selected_node();

  const setShape = (shape: MindShape): void => {
    const node = selectedNode();
    if (!node) return;
    (node.data ??= {})["mm-shape"] = shape;
    applyShapeClass(node.id, shape);
    persist();
    updateFormatRow();
  };
  const setFill = (color: string): void => {
    const node = selectedNode();
    if (!node) return;
    jm.set_node_color(node.id, color, null);
    reapplyShapes();
    persist();
    updateFormatRow();
  };
  const setText = (color: string): void => {
    const node = selectedNode();
    if (!node) return;
    jm.set_node_color(node.id, null, color);
    reapplyShapes();
    persist();
    updateFormatRow();
  };
  const bumpSize = (delta: number): void => {
    const node = selectedNode();
    if (!node) return;
    const style = readNodeStyle(node.data);
    const size = clampFontSize(style.fontSize + delta);
    jm.set_node_font_style(node.id, size, style.bold ? "bold" : null);
    reapplyShapes();
    persist();
    updateFormatRow();
  };
  const toggleBold = (): void => {
    const node = selectedNode();
    if (!node) return;
    const style = readNodeStyle(node.data);
    jm.set_node_font_style(node.id, style.fontSize, style.bold ? null : "bold");
    reapplyShapes();
    persist();
    updateFormatRow();
  };

  const shapeButtons = SHAPES.map((shape) => {
    const button = makeButton(shape, () => setShape(shape));
    button.dataset.shape = shape;
    return button;
  });
  for (const button of shapeButtons) formatRow.appendChild(button);

  const fillInput = document.createElement("input");
  fillInput.type = "color";
  fillInput.className = "mm-color";
  fillInput.title = "Fill color";
  fillInput.addEventListener("input", () => setFill(fillInput.value));
  for (const color of FILL_SWATCHES) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "mm-swatch";
    swatch.style.background = color;
    swatch.title = `Fill ${color}`;
    swatch.addEventListener("click", () => setFill(color));
    formatRow.appendChild(swatch);
  }
  formatRow.appendChild(fillInput);

  const textInput = document.createElement("input");
  textInput.type = "color";
  textInput.className = "mm-color";
  textInput.title = "Text color";
  textInput.addEventListener("input", () => setText(textInput.value));
  for (const color of TEXT_SWATCHES) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "mm-swatch mm-swatch-text";
    swatch.style.background = color;
    swatch.title = `Text ${color}`;
    swatch.addEventListener("click", () => setText(color));
    formatRow.appendChild(swatch);
  }
  formatRow.appendChild(textInput);

  const sizeDown = makeButton("A-", () => bumpSize(-2));
  const sizeLabel = document.createElement("span");
  sizeLabel.className = "mm-size";
  const sizeUp = makeButton("A+", () => bumpSize(2));
  const boldButton = makeButton("B", toggleBold);
  boldButton.classList.add("mm-bold");
  formatRow.append(sizeDown, sizeLabel, sizeUp, boldButton);

  function updateFormatRow(): void {
    const node = selectedNode();
    if (!node) {
      formatRow.hidden = true;
      return;
    }
    formatRow.hidden = false;
    const style = readNodeStyle(node.data);
    for (const button of shapeButtons) {
      button.classList.toggle("active", button.dataset.shape === style.shape);
    }
    if (style.fill) fillInput.value = style.fill;
    if (style.text) textInput.value = style.text;
    sizeLabel.textContent = `${style.fontSize}px`;
    boldButton.classList.toggle("active", style.bold);
  }
  updateFormatRow();
```

- [ ] **Step 4: Refresh the format row on jsMind events**

In the `listener` from Task 2, add `updateFormatRow()` so selection/edit updates
the row. Final listener:

```ts
  const listener = (): void => {
    reapplyShapes();
    updateFormatRow();
    if (accepting) persist();
  };
```

- [ ] **Step 5: Add CSS for the format row, swatches, and size label**

In `src/styles.css`, change the existing single-row toolbar rule. Find:

```css
.mm-toolbar {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 5;
  display: flex;
  gap: 6px;
}
```

Replace with:

```css
.mm-toolbar {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mm-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.mm-swatch {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: default;
}

.mm-color {
  width: 24px;
  height: 22px;
  padding: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: default;
}

.mm-size {
  min-width: 34px;
  font-size: 12px;
  text-align: center;
  color: var(--text);
}

.mm-btn.active {
  border-color: var(--accent);
  color: var(--text-strong);
}

.mm-bold {
  font-weight: 700;
}
```

- [ ] **Step 6: Build and manually verify**

Run: `npm run build`
Expected: clean.

Manual: open/create a `.mind`, select a node (the format row appears), then:
change shape to each of rect/rounded/pill/circle; pick a fill swatch and a custom
fill; pick a text color; A+/A- changes size; B toggles bold. Deselect → row hides.
Save, close, reopen → all styling persists. Export PNG → styling shows.

- [ ] **Step 7: Commit**

```bash
git add src/mindmapview.ts src/styles.css
git commit -m "feat(mindmap): per-node format toolbar (shape/color/size/bold)"
```

---

### Task 4: Docs + test cases

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/test-cases/14-mindmap.md`
- Modify: `docs/tasks.md`

- [ ] **Step 1: Update CLAUDE.md**

In `CLAUDE.md`, in the `mindmapview.ts` architecture line and the special-pane
paragraph, note that mindmap nodes support per-node shape (rect/rounded/pill/
circle), fill/text color, font size, and bold, stored in node `data` and
persisted in the `.mind` file (no format change).

- [ ] **Step 2: Add manual test cases**

Append to `docs/test-cases/14-mindmap.md`:

```markdown
### MIND-FMT-01 — Format row appears on selection
- Steps: Open a `.mind`; click a node.
- Expected: A second toolbar row appears with shape buttons, fill/text swatches +
  custom pickers, A-/A+ size, and B (bold). Deselecting hides the row.
- Status: [ ]  Notes:

### MIND-FMT-02 — Shapes
- Steps: Select a node; click rect, rounded, pill, circle in turn.
- Expected: The node re-renders in each shape; circle is a fixed round node.
- Status: [ ]  Notes:

### MIND-FMT-03 — Colors
- Steps: Select a node; click a fill swatch, then a custom fill; a text swatch,
  then a custom text color.
- Expected: Fill and text colors update independently and immediately.
- Status: [ ]  Notes:

### MIND-FMT-04 — Size and bold
- Steps: Select a node; click A+ a few times, A- once; toggle B twice.
- Expected: Font size grows/shrinks within 10–40px; bold toggles on/off.
- Status: [ ]  Notes:

### MIND-FMT-05 — Persistence + export
- Steps: Format several nodes (shape/color/size/bold); Save; close the tab;
  reopen the file; then export PNG.
- Expected: All formatting is restored on reopen and visible in the PNG.
- Status: [ ]  Notes:
```

- [ ] **Step 3: Update docs/tasks.md**

In `docs/tasks.md` under the M11 mindmap section, add:

```markdown
[x] Rich node editor: per-node shape (rect/rounded/pill/circle), fill/text color,
    font size, bold; stored in node data; persists in .mind (no format change)
```

- [ ] **Step 4: Final verification**

```bash
npm run build && npx vitest run && (cd src-tauri && cargo check)
```
Expected: build clean, all Vitest pass, cargo check clean.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/test-cases/14-mindmap.md docs/tasks.md
git commit -m "docs(mindmap): record rich node editor + test cases"
```

---

## Self-Review

- **Spec coverage:**
  - Data model in node `data` (no format change) → Task 2 (persist via existing
    serialize), Task 1 (`readNodeStyle` keys). ✔
  - Shapes rect/rounded/pill/circle → Task 1 (`SHAPES`/`shapeClass`), Task 2
    (apply + CSS), Task 3 (shape buttons). ✔
  - Fill/text color (8 swatches + custom) → Task 1 (`*_SWATCHES`), Task 3
    (swatches + `<input type=color>`). ✔
  - Font size + bold → Task 1 (`clampFontSize`), Task 3 (`bumpSize`/`toggleBold`). ✔
  - Toolbar second row, selection-driven show/hide → Task 3 (`updateFormatRow`). ✔
  - Persistence/reload + PNG → Task 2 (`persist`), Task 3 manual, Task 4 cases. ✔
  - Testing: pure unit + manual → Task 1 tests, Tasks 2–3 manual, Task 4 cases. ✔
- **Placeholder scan:** none; all steps contain concrete code/commands.
- **Type consistency:** `MindShape`, `SHAPES`, `readNodeStyle`, `clampFontSize`,
  `normalizeShape`, `persist`, `reapplyShapes`, `applyShapeClass`,
  `updateFormatRow`, and the jsMind methods (`get_node`, `set_node_color`,
  `set_node_font_style`, `get_selected_node`) are used with identical names and
  signatures across Tasks 1–3.
- **Scope:** single cohesive feature; no decomposition needed.
