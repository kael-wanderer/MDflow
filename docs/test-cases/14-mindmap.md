# Mindmap Board (M11 — jsMind)

Single-pane editable `.mind` board (lazy jsMind runtime). Format: jsMind `node_tree`
JSON; default root topic "Central Idea".

### MIND-01 — Open a .mind file
- Steps: Open a valid `.mind` from Explorer.
- Expected: The jsMind board fills the document pane (single mode); the MIND badge
  shows in the tree.
- Status: [ ]  Notes:

### MIND-02 — New .mind file
- Steps: Explorer ▸ New File `ideas.mind`; open it.
- Expected: A board with one root node "Central Idea" appears.
- Status: [ ]  Notes:

### MIND-03 — Add / rename nodes
- Steps: Select the root; add a child and a sibling; rename a node.
- Expected: Nodes add/rename on canvas; the tab goes dirty after the first real edit
  (NOT merely on selecting a node).
- Status: [ ]  Notes:

### MIND-04 — Drag re-parent & delete
- Steps: Drag a node onto a different parent; delete a node.
- Expected: The tree restructures; deletion removes the node and its subtree.
- Status: [ ]  Notes:

### MIND-05 — No remount on edit
- Steps: Make several consecutive edits (add, rename, drag).
- Expected: The board does NOT flicker/rebuild after each edit; selection, fold, and
  scroll position are preserved.
- Status: [ ]  Notes:

### MIND-06 — Save & reopen
- Steps: ⌘S; close; reopen.
- Expected: The mindmap is preserved; reopening shows no spurious dirty flag.
- Status: [ ]  Notes:

### MIND-07 — Export PNG
- Steps: With the `.mind` board active, choose Export ▸ PNG Image.
- Expected: A PNG of the board is written with nodes and connector lines present.
- Status: [ ]  Notes:

### MIND-08 — Invalid .mind JSON
- Steps: Open a malformed `.mind`.
- Expected: "This file does not contain a valid mindmap." error; the original file text
  is NOT destroyed.
- Status: [ ]  Notes:

### MIND-09 — Lazy load
- Steps: Confirm jsMind loads only when a `.mind` opens (not at startup).
- Expected: First open has a brief load; startup is unaffected.
- Status: [ ]  Notes:

### MIND-10 — Zoom shortcut doesn't remount
- Steps: With a `.mind` board focused, press ⌘+/⌘−/⌘0.
- Expected: The board is not torn down/rebuilt by zoom shortcuts.
- Status: [ ]  Notes:

### MIND-11 — Focus on activate
- Steps: Switch to a `.mind` tab.
- Expected: Keyboard focus goes to the board pane (not a hidden editor).
- Status: [ ]  Notes:

### MIND-12 — Activity-bar new board

- Steps: Click the Mindmap icon between Excalidraw and Export.
- Expected: A new `Untitled.mind` tab opens with root topic exactly "Central Idea".
- Status: [ ]  Notes:

### MIND-13 — Save a new board

- Steps: Edit the untitled mindmap and press ⌘S.
- Expected: Save As opens; saving with `.mind` creates a valid file that reopens.
- Status: [ ]  Notes:

### MIND-14 — Theme-aware board

- Steps: Open a mindmap in a dark theme, then switch to Light while it remains open.
- Expected: Canvas, nodes, selection, expanders, text, and connector lines remain
  legible and update to the active palette without remounting the board.
- Status: [ ]  Notes:

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
