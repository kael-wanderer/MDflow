# Settings (Gear) & Themes

The Gear panel with **Theme / Format / General / Agent** tabs, the `settings.json` /
`ai.json` files, and theme switching.

### SET-01 — Open Gear panel
- Steps: Click the Gear activity-bar icon.
- Expected: A panel opens with tabs: Theme, Format, General, Agent. The panel has a
  fixed size that does NOT jump when switching tabs.
- Status: [ ]  Notes:

### SET-02 — Theme switching
- Steps: Theme tab → pick each theme (Light, Dark, Catppuccin Mocha, Everforest Dark,
  Nord, …).
- Expected: The whole UI + editor syntax recolor immediately; choice persists.
- Status: [ ]  Notes:

### SET-03 — Custom theme name
- Steps: Theme tab → type a known theme name (e.g. "Everforest Dark") in the custom
  field; Apply.
- Expected: Applies if recognized; otherwise a friendly inline error.
- Status: [ ]  Notes:

### SET-04 — Format tab: zone + font + size
- Steps: Format tab → pick a zone (Explorer / Main / Sub), choose a font and a size
  (and try a custom value).
- Expected: The chosen zone's typography updates live; the Font and Size groups appear
  under clear subheadings.
- Status: [ ]  Notes:

### SET-05 — General tab: Restore session
- Steps: General tab → toggle "Restore last session".
- Expected: Setting persists and governs startup (see TAB-08/09).
- Status: [ ]  Notes:

### SET-06 — General tab: Auto-update
- Steps: General tab → toggle "Automatically check for updates"; click "Check for
  Updates".
- Expected: Toggle persists (daily check); the button triggers an update check (see
  UPD-01).
- Status: [ ]  Notes:

### SET-07 — Agent tab
- Steps: Agent tab → switch Local agent / Local model / API model; add a provider;
  select a default.
- Expected: Providers list/add correctly; the default is marked "Selected".
- Status: [ ]  Notes:

### SET-08 — Open settings.json / ai.json
- Steps: Footer buttons "Open settings.json" / "Open ai.json".
- Expected: Each opens as a normal editor tab; saving applies the config.
- Status: [ ]  Notes:

### SET-09 — Dismiss
- Steps: Click outside the panel or press Esc.
- Expected: The panel closes.
- Status: [ ]  Notes:
