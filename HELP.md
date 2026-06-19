# MDflow Help

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

MDflow opens and saves `.md`, `.markdown`, and `.txt` files. Your view mode,
soft-wrap setting, and zoom are remembered between sessions.

## What renders

Standard GitHub-style markdown: headings, **bold**, *italic*, ~~strikethrough~~,
lists, tables, blockquotes, links, and fenced code with syntax highlighting:

```js
function render(src) {
  return md.render(src); // live preview
}
```

> This help document is itself a markdown file, opened in MDflow.

More features — diagrams, math, a file explorer, export, and automatic updates —
are on the way in later releases.
