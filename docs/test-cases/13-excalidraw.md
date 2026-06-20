# Excalidraw Board (M10)

Single-pane editable `.excalidraw` board (lazy React/Excalidraw runtime).

### EXC-01 — Open an .excalidraw file
- Steps: Open a valid `.excalidraw` from Explorer.
- Expected: The Excalidraw board fills the document pane (single mode); the EX badge
  shows in the tree.
- Status: [ ]  Notes:

### EXC-02 — New .excalidraw
- Steps: Explorer ▸ New File `board.excalidraw`; open it.
- Expected: An empty board loads (no error).
- Status: [ ]  Notes:

### EXC-03 — Draw / edit
- Steps: Add shapes, text, arrows; move them.
- Expected: Edits work; the tab goes dirty after the first change (not on open).
- Status: [ ]  Notes:

### EXC-04 — Save & reopen
- Steps: ⌘S, close the tab, reopen the file.
- Expected: The drawing is preserved; reopening shows no spurious dirty flag.
- Status: [ ]  Notes:

### EXC-05 — Invalid .excalidraw JSON
- Steps: Open a malformed `.excalidraw`.
- Expected: A friendly error; the original file text is NOT destroyed.
- Status: [ ]  Notes:

### EXC-06 — Lazy load
- Steps: Observe startup vs first board open.
- Expected: The Excalidraw engine loads only when a board is opened (not at startup).
- Status: [ ]  Notes:

### EXC-07 — Move across windows / rename / session
- Steps: Move the board tab to Sub; rename the file; restart with session restore.
- Expected: Tab ownership, path, and restore all behave like normal tabs.
- Status: [ ]  Notes:

### EXC-08 — Activity-bar new board

- Steps: Click the Excalidraw icon between AI and Mindmap.
- Expected: A new `Untitled.excalidraw` tab opens as an empty board; the activity-bar
  order is Explorer, Search, AI, Excalidraw, Mindmap, Export, Gear.
- Status: [ ]  Notes:

### EXC-09 — Save a new board

- Steps: Draw one shape in the untitled board and press ⌘S.
- Expected: Save As opens; saving with `.excalidraw` creates a valid file that reopens.
- Status: [ ]  Notes:
