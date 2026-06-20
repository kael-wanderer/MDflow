# MDflow Auto-update Implementation Plan

1. Regenerate all Tauri platform icons from the 512×512 logo.
2. Register the desktop updater plugin and restart command.
3. Add a focused frontend updater module for checking, prompting, installing, and
   the 24-hour schedule.
4. Add Help menu and Gear Update-section entry points.
5. Persist `autoUpdate` in `settings.json`.
6. Add pure scheduling/settings tests and run JS + Rust build checks.
7. Document the remaining signed-feed release configuration.
