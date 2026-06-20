# MDflow Help

## Formatting Markdown

Markdown documents show a formatting row above the editor. Select text and choose
Bold, Italic, Heading, Link, Inline Code, Quote, Bullet List, or Horizontal Rule.
Formatting changes use the normal editor undo and redo history.

HTML files use HTML syntax highlighting and continue to render in the Read or Split
preview.

## Excalidraw boards

Open a `.excalidraw` file from the Explorer, quick-open palette, or File menu to edit
it as a full-pane visual board. Use the normal Save, Save As, tab close, and session
restore commands. Text-only view and formatting controls are hidden while a board is
active.

## Updates

Choose **Help → Check for Updates…** to check manually. You can also open the Gear
menu, choose **Update**, and enable a once-daily automatic check. MDflow asks before
it downloads and installs an available update.

Welcome to **MDflow** — a fast, lightweight markdown editor. You write on the
left and read the typeset result on the right.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘N` | New file |
| `⌘O` | Open a file |
| `⌘S` | Save |
| `⌘⇧S` | Save As… |
| `⌘B` | Split view |
| `⌘E` | Editor only |
| `⌘P` | Read (preview) only |

All of these also live in the menu bar under **File** and **View**.

## Views

- **Split** — editor and preview side by side.
- **Editor** — just the editor.
- **Read** — just the rendered preview.
- **Soft Wrap** (View menu) toggles wrapping of long lines.

## Files

MDflow opens and saves Markdown, text, HTML, JSON, PDF, and `.excalidraw` files.
Your view mode, soft-wrap setting, and zoom are remembered between sessions.

## What renders

Standard GitHub-style markdown: headings, **bold**, *italic*, ~~strikethrough~~,
lists, tables, blockquotes, links, and fenced code with syntax highlighting:

```js
function render(src) {
  return md.render(src); // live preview
}
```

> This help document is itself a markdown file, opened in MDflow.

MDflow also includes diagrams, math, a file explorer, export, AI tools, and update
checks.
