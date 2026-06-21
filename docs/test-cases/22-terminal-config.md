# Agent Console — commands, terminal apps, font/size, theme

Agent Console pickers + the Agent ▸ Agent Console settings section. Pre-req: Claude CLI
installed and on PATH; app open.

### TERM-01 — Terminal runs and finds the CLI
- Steps: AI panel ▸ Agent Console tab (default command "Claude Code").
- Expected: The agent CLI launches (no "command not found"); colored TUI renders.
- Status: [ ]  Notes:

### TERM-02 — Live picker switches program
- Steps: Use the Agent command dropdown to switch to "Shell".
- Expected: The terminal relaunches running zsh (a plain shell prompt).
- Status: [ ]  Notes:

### TERM-03 — Add a terminal
- Steps: Gear ▸ Agent ▸ Agent Console ▸ add { Name, Command }.
- Expected: New entry appears and shows in the Agent command dropdown.
- Status: [ ]  Notes:

### TERM-04 — Edit / Remove / Use
- Steps: Edit an entry's command; Use another; Remove one.
- Expected: Changes persist to agent.json; default updates; removed entry gone.
- Status: [ ]  Notes:

### TERM-05 — Font and size
- Steps: Terminals section ▸ change Font and Size.
- Expected: The terminal re-renders with the chosen font/size.
- Status: [ ]  Notes:

### TERM-06 — Theme colors
- Steps: Keep a terminal open and switch between light and dark themes.
- Expected: Plain output, cursor, and selection colors update live with readable
  contrast.
- Status: [ ]  Notes:

### TERM-07 — Aliases resolve (login shell)
- Steps: With a shell alias in ~/.zshrc (e.g. `claude-skip`), run it in a Shell
  terminal.
- Expected: The alias resolves (login interactive shell).
- Status: [ ]  Notes:

### TERM-08 — Pi built-in program
- Steps: Open AI → Terminal and inspect the Program dropdown.
- Expected: Pi appears alongside Claude Code, Codex, OpenCode, and Shell.
- Status: [ ]  Notes:

### TERM-09 — External terminal application
- Steps: Select Apple Terminal, Ghostty, then cmux from Terminal app; click Open
  terminal for a configured program.
- Expected: The selected program opens in the chosen native terminal at the current
  folder. Missing applications show a friendly error.
- Status: [ ]  Notes:
