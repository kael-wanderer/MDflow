# AI Panel

Configurable AI chat + embedded terminal side panel.

> Requires a configured provider in `ai.json` (HTTP/SSE, command, or local model) and,
> for terminal, the native PTY.

### AI-01 — Toggle panel
- Steps: Click the AI activity-bar icon (or the add-to-chat action).
- Expected: The AI side panel shows/hides with Chat and Terminal tabs.
- Status: [ ]  Notes:

### AI-02 — Resize & persist
- Steps: Drag the AI panel's left edge; toggle it; restart.
- Expected: Width persists; reopening restores it.
- Status: [ ]  Notes:

### AI-03 — Chat streaming
- Pre-req: a valid chat provider.
- Steps: Type a prompt; send.
- Expected: The response streams token-by-token; document/selection context is
  included when relevant.
- Status: [ ]  Notes:

### AI-04 — Apply / insert edit
- Steps: Ask for a change; use Apply / Insert on a suggested edit.
- Expected: A line diff is shown; Apply updates the document, Insert inserts at cursor.
- Status: [ ]  Notes:

### AI-05 — Add file to chat
- Steps: Explorer row ▸ Add to chat (or equivalent).
- Expected: The file opens and the AI panel becomes visible with context.
- Status: [ ]  Notes:

### AI-06 — Terminal tab
- Pre-req: a configured terminal.
- Steps: Switch to Terminal; run a command.
- Expected: xterm renders output from the native PTY; input works.
- Status: [ ]  Notes:

### AI-07 — Provider/permission selectors
- Steps: Switch chat provider and ask/bypass permission mode.
- Expected: The selection takes effect for subsequent messages.
- Status: [ ]  Notes:

### AI-08 — Provider error
- Steps: Use an invalid endpoint/key.
- Expected: A friendly error in the chat, no crash.
- Status: [ ]  Notes:
