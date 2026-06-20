# M9 Editing Affordances Design

## Goal

Make common Markdown edits one click away and make standalone HTML files feel like
real HTML source documents instead of Markdown documents with fallback coloring.

## Markdown toolbar

When the active editor tab is Markdown, show a compact formatting row above the
CodeMirror surface:

- Bold
- Italic
- Heading
- Link
- Inline code
- Quote
- Bullet list
- Horizontal rule

Inline commands wrap the current selection. With no selection they insert a useful
placeholder and select it for immediate typing. Line commands toggle prefixes on all
selected lines. Heading cycles plain text through H1, H2, H3, then back to plain.
Horizontal rule inserts `---` on its own line.

The toolbar is hidden for HTML, PDF, and other non-Markdown document types.

## HTML editing mode

Tabs ending in `.html` or `.htm` use CodeMirror's HTML language package. Language
mode belongs to each tab state, so switching between Markdown and HTML tabs restores
the correct parser and highlighting without rebuilding the editor.

HTML preview continues to use the existing sandboxed iframe.

## Accessibility and UX

- Every control is a real button with a title and accessible label.
- Toolbar clicks keep the document active and restore editor focus.
- Formatting participates in normal CodeMirror undo/redo history.
