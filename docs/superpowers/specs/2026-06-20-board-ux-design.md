# Board UX Design (Spec B)

Date: 2026-06-20
Status: Approved (design); spec under review.
Sibling: `2026-06-20-export-overhaul-design.md` (Spec A — built first).

## What problem does this solve?

Two board polish items deferred from the M11 pass:

1. There is no quick way to **create** a new Excalidraw or Mindmap board — the user
   must make a `.excalidraw`/`.mind` file in the Explorer first.
2. The jsMind mindmap board uses jsMind's default (light) styling, which looks out of
   place in MDflow's dark themes (jsMind ships no dark theme).

## What does success look like?

- Dedicated **Excalidraw** and **Mindmap** icons in the activity bar create a new
  untitled board of that type in one click.
- The activity bar reads: **Explorer · Search · AI · Excalidraw · Mindmap · Export ·
  Gear** (Export moved to just before Gear).
- The mindmap board follows the active MDflow theme (light themes → light board, dark
  → dark), using the app palette and accent. (Excalidraw already follows the theme.)

## Scope

In: two activity-bar board buttons + reorder; new-untitled-board flow; jsMind theme CSS
that tracks the app theme. Out: board templates/galleries, per-board theme overrides,
Excalidraw theming changes (already native).

## Architecture

```
index.html        activity-bar markup: add ab-excalidraw, ab-mindmap; reorder so
                  ab-export precedes ab-settings
src/activitybar.ts  wire the two new buttons → onNewBoard("excalidraw"|"mind")
src/glyphs.ts     add excalidraw + mindmap glyphs (themeable inline SVG)
src/main.ts       newBoard(kind): open an untitled board tab
src/themes.css    (or styles.css) jsMind board theming that follows app theme
src/mindmapview.ts  set jsMind line color per active theme on mount
```

### Activity-bar board buttons + reorder

- Add `ab-excalidraw` and `ab-mindmap` buttons after `ab-ai`; move `ab-export` to sit
  immediately before `ab-settings` in `index.html`.
- `activitybar.ts` gains an `onNewBoard(kind)` callback wired to each button (and
  assigns the new glyphs), mirroring how the existing buttons are wired.

### New untitled board

`newBoard(kind: "excalidraw" | "mind")` in `main.ts` opens a tab named
`Untitled.excalidraw` / `Untitled.mind` with empty text. Because the tab name carries
the extension, `isExcalidrawFile`/`isMindmapFile` already route it to the board pane,
and the empty text yields each format's default (empty Excalidraw scene; mindmap root
"Central Idea") via the existing parse functions. First `⌘S` prompts for a save path
(existing untitled-save flow). No new persistence code.

### jsMind theming follows the app theme

jsMind has no dark theme, so add CSS targeting its DOM (`.jsmind-inner`, `jmnodes`,
`jmnode`, `jmnode.root`, `jmnode.selected`, `jmexpander`) that derives colors from the
MDflow theme variables (`--bg-preview`, `--bg-elev`, `--text`, `--text-strong`,
`--accent`, `--border`). Connector line color is a jsMind option, so `mindmapview`
reads the active theme (`document.documentElement.dataset.theme`) and passes a matching
`line_color` (and re-applies on remount). Light themes get a light board, dark a dark
board. No fixed jsMind theme name is used.

## Error handling

- New board creation reuses the existing tab/open flow — no new failure modes.
- If a theme variable is missing, the board falls back to readable defaults (no crash).

## Testing

- Manual (append to `docs/test-cases/`): the two activity-bar buttons each create a
  new board; activity-bar order is correct (Export before Gear); save-as on a new
  board writes the right extension; the mindmap board is legible in a dark theme and in
  a light theme, and updates when the theme changes.
- No new pure logic to unit-test beyond what Spec A/M11 already cover; the new-board
  flow rides existing tested paths.

## Deliverables

- [ ] Activity-bar Excalidraw + Mindmap buttons + reorder (Export before Gear)
- [ ] New-untitled-board flow for both kinds
- [ ] jsMind theme CSS + per-theme line color following the app theme
- [ ] Docs: CLAUDE.md, tasks, test-cases
