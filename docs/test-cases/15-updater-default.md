# Updater & Set-as-Default

Update checks support Manual and Automatic modes. Production checks require the
signed release feed and public key in `tauri.conf.json`.

### UPD-01 — Manual is the default

- Steps: Start with a fresh settings file; open Gear ▸ General.
- Expected: Manual is selected and MDflow performs no background update check.
- Status: [ ]  Notes:

### UPD-02 — Legacy preference migration

- Steps: Start once with `autoUpdate: true`, then with `autoUpdate: false`.
- Expected: `true` appears as Automatic; `false` appears as Manual. A subsequent Gear
  change writes `updateMode` instead of the legacy boolean.
- Status: [ ]  Notes:

### UPD-03 — Check for Updates in both modes

- Steps: In Manual, use Help ▸ Check for Updates and Gear ▸ General ▸ Check for
  Updates; repeat in Automatic.
- Expected: Both entry points work in both modes. Up-to-date, available-update, and
  not-configured results use the existing friendly dialogs.
- Status: [ ]  Notes:

### UPD-04 — Automatic daily guard

- Steps: Select Automatic, relaunch, and observe checks across repeated launches/hours.
- Expected: Background checking occurs at most once per 24 hours. A recent manual
  check also satisfies the guard.
- Status: [ ]  Notes:

### UPD-05 — Manual never checks automatically

- Steps: Select Manual, relaunch, and leave MDflow running beyond an hourly scheduler tick.
- Expected: No background update request or dialog occurs.
- Status: [ ]  Notes:

### UPD-06 — Installation always requires consent

- Pre-req: A configured feed advertising a newer version.
- Steps: Trigger an update from Manual and Automatic modes.
- Expected: Both show the Update/Later prompt before download and install. Neither
  mode installs silently.
- Status: [ ]  Notes:

### DEF-01 — Set as Default ▸ Markdown

- Steps: MDflow ▸ Set MDflow as Default ▸ As Markdown Editor.
- Expected: An informational dialog explains the current Finder-based setup.
- Status: [ ]  Notes:

### DEF-02 — Set as Default ▸ PDF

- Steps: MDflow ▸ Set MDflow as Default ▸ As PDF Reader.
- Expected: Same informational behavior for PDF.
- Status: [ ]  Notes:
