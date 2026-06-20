# Mindmap Rich Editor — Design

> Status: approved design, pre-implementation. Next: writing-plans.
> Scope: per-node visual editing for the jsMind board (`.mind` documents).

## Problem

The mindmap board (`src/mindmapview.ts`, jsMind 0.9.1) can now add/rename/delete
nodes via the floating toolbar, but nodes are visually uniform. Users want to make
mindmaps like the reference images: per-node **fill color, text color, font size,
bold**, and a choice of **shape** (rectangle, rounded rectangle, pill, circle).

## Goals

- Select a node → format it: shape, fill color, text color, font size, bold.
- Colors via 8 preset swatches plus a custom picker, for both fill and text.
- Formatting persists in the `.mind` file and survives reload, save, and Save As.
- Reuse the existing floating toolbar; no new panel, no file-format change.

## Non-goals (YAGNI)

- No "apply to whole branch" recursion — formatting is per selected node.
- No per-node font *family* (the board uses the app font).
- No cloud/blob shapes or organic/curved connectors (would replace jsMind rendering).
- No new export work — PNG capture already renders whatever jsMind shows.

## Approach

Build on jsMind's built-in per-node styling and add shapes with CSS.

jsMind already styles a node from keys in its `data` object and exposes APIs that
write those keys and re-render:

- `jm.set_node_color(id, backgroundColor, foregroundColor)`
- `jm.set_node_font_style(id, size, weight, style)`

Color, size, and bold therefore need no custom rendering. **Shape** is not native:
we store `mm-shape` in the node's `data` and apply a matching CSS class to the
node's DOM element.

Rejected alternatives:
- *Custom renderer* replacing jsMind — large, discards working behavior.
- *Parallel style map in file meta* — more complex serialization for no benefit;
  node `data` already round-trips.

## Data model (no format change)

Each node's style lives in its existing `data` object:

| Key | Meaning | Source |
|-----|---------|--------|
| `background-color` | fill color (hex) | jsMind native |
| `foreground-color` | text color (hex) | jsMind native |
| `font-size` | px number | jsMind native |
| `font-weight` | `"bold"` or unset | jsMind native |
| `mm-shape` | `rect` \| `rounded` \| `pill` \| `circle` | MDflow custom |

`jm.get_data("node_tree")` includes each node's `data`, and
`src/mindmap-document.ts` already passes the node tree through unchanged on
parse/serialize. So persistence needs **no changes** to the document module.
Default shape when `mm-shape` is absent: `rounded` (current look).

## Components

### `src/mindmap-style.ts` (new, pure, unit-tested)

Pure helpers with no DOM/jsMind dependency:

- `SHAPES = ["rect", "rounded", "pill", "circle"] as const` and `MindShape` type.
- `shapeClass(shape): string` → `"mm-shape-rounded"` etc.; unknown/empty → rounded.
- `readNodeStyle(data): NodeStyle` → normalize a node's `data` into
  `{ shape, fill, text, fontSize, bold }` (with defaults) for the toolbar state.
- `FILL_SWATCHES` / `TEXT_SWATCHES`: preset color arrays.
- `clampFontSize(n): number` (e.g. 10–40).

### `src/mindmapview.ts` (extend)

- Build a **second toolbar row** (`.mm-format`) appended to the existing `.mm-toolbar`,
  hidden by default.
- On jsMind **select** events, read the selected node's style via `readNodeStyle`,
  populate the format row, and show it; hide when no node is selected.
- Wire controls to the selected node:
  - Shape button → set `node.data["mm-shape"]`, toggle the shape class on that
    `jmnode` element, persist (triggers the existing change listener).
  - Fill/Text swatch or custom input → `jm.set_node_color(id, fill, text)`.
  - Size −/+ → `clampFontSize`, then `jm.set_node_font_style(id, size, weight)`.
  - Bold toggle → `jm.set_node_font_style(id, size, bold ? "bold" : null)`.
- On initial `show` and after structural changes, run one pass over
  `canvas.querySelectorAll("jmnode")`, look up each node's `mm-shape`, and apply
  the class so saved shapes render on load.
- Extend the `JsMindInstance` type with `set_node_color` and `set_node_font_style`,
  and a node lookup (`get_node(id)`) for reading current `data`.

### `src/styles.css` (extend)

- `.mm-format` row: same floating style as `.mm-toolbar`, second line, wraps.
- Shape classes on `jmnode`:
  - `.mm-shape-rect` → `border-radius: 2px`
  - `.mm-shape-rounded` → `border-radius: 8px` (default)
  - `.mm-shape-pill` → `border-radius: 999px`
  - `.mm-shape-circle` → equal width/height, `border-radius: 50%`, centered text
- Swatch buttons and the custom color input styling.
- Theme-aware defaults remain when a node has no custom color.

## Data flow

select node → read `data` → populate format row → user edits a control →
jsMind API / `mm-shape` write → node re-renders + shape class applied → existing
change listener serializes `node_tree` → autosave to `.mind`.

## Error handling / edge cases

- No selected node → format row hidden; control handlers no-op.
- Root node: formatting allowed (shape/color/size/bold), same as any node.
- Circle shape with long text: fixed size + centered, text wraps/clips per CSS;
  acceptable (matches spider-map references).
- Invalid/missing `mm-shape` on load → treated as `rounded` by `shapeClass`.
- Theme change: existing connector-recolor observer stays; custom node colors are
  user-set and intentionally not overridden by theme.

## Testing

- Unit (`src/mindmap-style.ts`): `shapeClass` mapping incl. fallback;
  `readNodeStyle` defaults and normalization; `clampFontSize` bounds.
- Manual (in app): select a node, change each control; confirm live update;
  save, reopen the file, confirm shapes/colors/size/bold persist; PNG export
  reflects the styling.

## Out-of-scope follow-ups

Branch-wide formatting, per-node font family, cloud/organic shapes and curved
connectors, and style presets/themes — all deferred.
