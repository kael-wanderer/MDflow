# AI Chat — attachments, @mention, send key

File attachments (📎 / drag-drop / @mention), Enter-to-send, and provider-aware
file handling. Pre-req: a folder open; one CLI agent (e.g. Claude) and one HTTP
model configured; a `.png` and a `.txt` in the folder.

### ATT-01 — Attach via 📎 picker
- Steps: Chat tab ▸ 📎 ▸ select one or more files.
- Expected: Each file appears as a removable chip above the input.
- Status: [ ]  Notes:

### ATT-02 — Drag-drop onto the panel
- Steps: Drag a file from Finder onto the AI panel.
- Expected: It's added as a chip (panel switches to Chat if on Terminal).
- Status: [ ]  Notes:

### ATT-03 — @mention picker
- Steps: Type `@` then part of a filename.
- Expected: A fuzzy dropdown of folder files; ↑/↓ + Enter/Tab selects; the `@token`
  is removed and the file becomes a chip.
- Status: [ ]  Notes:

### ATT-04 — Remove a chip
- Steps: Click ✕ on a chip.
- Expected: The chip is removed; it won't be sent.
- Status: [ ]  Notes:

### ATT-05 — CLI agent receives paths + runs in folder
- Steps: With a CLI agent selected, attach an image, ask "describe this image and
  write the description to notes.md".
- Expected: The agent reads the image and writes `notes.md` into the open folder.
- Status: [ ]  Notes:

### ATT-06 — HTTP model text + vision attachments
- Steps: With an HTTP model selected, attach a `.txt` and a `.png`; send.
- Expected: The `.txt` contents are included as context and the PNG is sent as a
  multimodal image input (using a vision-capable model).
- Status: [ ]  Notes:

### ATT-07 — Enter sends, Shift+Enter newline
- Steps: Type a message, press Enter. Then type, press Shift+Enter.
- Expected: Enter sends; Shift+Enter inserts a newline.
- Status: [ ]  Notes:

### ATT-08 — Attachments clear after send
- Steps: Send a message with chips attached.
- Expected: Chips clear; the user bubble notes the attached filenames.
- Status: [ ]  Notes:
