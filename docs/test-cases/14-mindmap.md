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

### MIND-07 — Export PNG / JPG / PDF
- Steps: With the `.mind` board active: Export ▸ HTML ▸ PNG, then JPG, then PDF.
- Expected: Each writes an image/PDF of the board (white background, nodes + connector
  lines present, no jsMind watermark).
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
