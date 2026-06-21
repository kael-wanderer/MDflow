# MDflow Help

MDflow is a lightweight document workspace for Markdown, HTML, code/config files,
PDFs, Excalidraw boards, and visual mindmaps.

## Windows and panes

Choose **View → New Window** or press `⌘⇧N` to create an independent native window.
On macOS, you can also right-click the MDflow Dock icon and choose **New Window**.
Each native window has its own tabs and Explorer workspace.

Inside any native window, the Main/Sub control creates an optional second document
pane. Main and Sub have independent tabs and view modes.

## Document modes

- **Markdown and HTML:** Editor, Read, or Editor + Preview.
- **PDF:** Read-only.
- **TypeScript, JavaScript, JSON, YAML/YML, and other text/config files:** Editor-only.
- **Excalidraw and Mindmap:** focused full-pane visual editors.

## Opening and dropping files

Use **File → Open**, `⌘O`, the Explorer, or the command palette (`⌘K`).

You can also drag files from Finder:

- Drop on a Main/Sub document pane to open the file in that pane.
- Drop on an Explorer folder to copy into that folder.
- Drop on an Explorer file to copy beside that file.
- Hover over a closed Explorer folder briefly to expand it.

Existing destination files are not overwritten.

## Editing and saving

Markdown documents show formatting controls for Bold, Italic, Heading, Link,
Inline Code, Quote, Bullet List, and Horizontal Rule. HTML, TypeScript/JavaScript,
JSON, and YAML use language-aware syntax highlighting.

Use `⌘S` to save or `⌘⇧S` for Save As. Tabs show a dirty marker for unsaved changes.

## Mindmaps

Open or create a `.mind` file to use the visual mindmap editor.

- Add a child or sibling, rename, delete, and drag nodes to reorder or reparent.
- New nodes are text-only by default.
- Optional node shapes include rectangle, rounded, pill, and circle.
- Adjust fill/text color, font size, and bold.
- Use the board’s Open, Save, Reset, and zoom controls.

## Excalidraw

Open a `.excalidraw` file to edit it as a full-pane board. Normal Save, Save As,
dirty-close confirmation, tabs, and session workflows still apply.

## Search

- **Find in the current document:** `⌘F` opens the editor's find/replace bar.
- **Find in Folder:** `⌘⇧F` (or the activity-bar Search button) searches the contents
  of every text file in the open folder, plus the text inside `.mind` and
  `.excalidraw` drawings. Results are grouped by file — click one to open it at the
  matching line. (PDF text is not searched yet.)

## AI assistant

Toggle the right-side panel with the activity-bar agent button. It has two tabs:

- **Chat** — pick an agent and a permission mode (Ask / Bypass approvals). The open
  document (or your selection) is sent as context. **Enter** sends; **Shift+Enter**
  inserts a newline. Replies stream in, with Copy, Insert-at-cursor, and Apply-as-diff
  actions. Attach files with the 📎 button, by dragging files onto the panel, or by
  typing `@` to mention a file from the open folder. CLI agents read attached files
  themselves and run in the open folder; other (HTTP) models receive text-file
  contents inline.
- **Terminal** — an embedded terminal running a configured program (an agent CLI, or a
  plain shell). Switch programs with the picker; set the terminal font/size and manage
  entries under **Gear → Agent → Terminals**.

Agents, models, and terminals are configured in `agent.json` (open it from
**Gear → Open agent.json**). API keys are stored in the macOS Keychain.

## Keyboard shortcuts

All shortcuts are customizable: **View → Keyboard Shortcuts** (or the **Keys** tab in
Settings) lists every command and lets you rebind, reset, or restore defaults.

| Shortcut | Action |
|----------|--------|
| `⌘⇧N` | New window |
| `⌘N` | New file |
| `⌘O` | Open file |
| `⌘⇧O` | Open folder |
| `⌘S` | Save |
| `⌘⇧S` | Save As |
| `⌘W` | Close active tab |
| `⌘K` | Command/file palette |
| `⌘F` | Find in document |
| `⌘⇧F` | Find in folder |
| `⌘B` | Show/hide Explorer |
| `⌘P` | Show/hide Preview |
| `⌘E` | Reading View |
| `⌘+` / `⌘−` / `⌘0` | Zoom in / out / reset |
| `Enter` | Send AI chat message (Shift+Enter = newline) |

## Themes and status

Use the theme dropdown in the bottom status bar for quick switching. The status bar
also shows the file type, cursor line/column, and word count where applicable.

## Updates

Choose **Help → Check for Updates…** for a manual check. Gear → Update can enable
automatic checks at most once per 24 hours. MDflow always asks before installation.

## Export

Export options depend on the active document. Rendered PDF/DOCX export requires:

```bash
brew install pandoc typst
```

This help document is itself Markdown and opens as a normal MDflow tab.
