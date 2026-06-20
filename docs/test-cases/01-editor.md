# Editor

CodeMirror 6 editor: markdown highlighting, soft-wrap, line numbers, HTML editing
mode, and the markdown formatting toolbar.

### EDIT-01 — Markdown syntax highlighting
- Steps: Open or create a `.md` file; type headings, **bold**, `code`, links, lists.
- Expected: Markdown tokens are colored per the active theme; no lag while typing.
- Status: [ ]  Notes:

### EDIT-02 — Soft wrap toggle
- Steps: View ▸ Soft Wrap (toggle). Type a line longer than the pane width.
- Expected: With soft wrap on, long lines wrap; off, they scroll horizontally. The
  menu item shows a checkmark reflecting state.
- Status: [ ]  Notes:

### EDIT-03 — Line numbers toggle (toolbar)
- Steps: Click the line-numbers button in the window toolbar.
- Expected: The gutter with line numbers shows/hides; state persists when switching
  tabs.
- Status: [ ]  Notes:

### EDIT-04 — Line numbers toggle (Explorer ⋯ menu)
- Steps: Explorer ▸ ⋯ ▸ Toggle Line Numbers.
- Expected: Same effect as the toolbar toggle.
- Status: [ ]  Notes:

### EDIT-05 — HTML editing mode
- Pre-req: a standalone `.html` file.
- Steps: Open the `.html` file; view the editor pane (split mode).
- Expected: The editor highlights HTML (tags/attributes), not markdown; auto-close
  tags work when typing `<div>`.
- Status: [ ]  Notes:

### EDIT-06 — Formatting toolbar: inline styles
- Pre-req: a `.md` file open with some text selected.
- Steps: Click Bold, then Italic, then Inline code on a selection.
- Expected: Selection is wrapped (`**`, `*`, `` ` ``); clicking again toggles it off.
- Status: [ ]  Notes:

### EDIT-07 — Formatting toolbar: block styles
- Steps: With the cursor on a line, click Heading (cycles #/##/###), Quote, Bullet,
  and Horizontal rule.
- Expected: Heading cycles levels; Quote prefixes `>`; Bullet prefixes `- `; Rule
  inserts `---`.
- Status: [ ]  Notes:

### EDIT-08 — Formatting toolbar: link
- Steps: Select text, click Link.
- Expected: Selection becomes `[text](url)` with the cursor positioned to type the URL.
- Status: [ ]  Notes:

### EDIT-09 — Toolbar hidden for non-markdown
- Steps: Open a `.html`, `.excalidraw`, or `.mind` file.
- Expected: The markdown formatting toolbar is hidden (it only applies to markdown).
- Status: [ ]  Notes:

### EDIT-10 — Undo/redo isolation per tab
- Steps: Edit tab A, switch to tab B, edit B, undo (⌘Z) — confirm it only undoes B;
  switch back to A and undo — only A's edits revert.
- Expected: Undo history is per-document, not shared.
- Status: [ ]  Notes:
