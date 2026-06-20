# Updater & Set-as-Default

Update checks (manual + daily auto), and the macOS "Set MDflow as Default" menu.

> Production update checks require the signed release feed + public key in
> `tauri.conf.json`; until configured, a check shows a "not configured" message.

### UPD-01 — Check for Updates (Help menu)
- Steps: Help ▸ Check for Updates.
- Expected: If configured & up to date → "MDflow is up to date." If an update exists →
  a prompt to download/install. If not configured → a friendly "updates not configured"
  message.
- Status: [ ]  Notes:

### UPD-02 — Check for Updates (Gear)
- Steps: Gear ▸ General ▸ "Check for Updates".
- Expected: Same behavior as UPD-01.
- Status: [ ]  Notes:

### UPD-03 — Update available prompt
- Pre-req: a configured feed advertising a newer version.
- Steps: Trigger a check; choose Update.
- Expected: Downloads & installs, then prompts to restart; Later cancels.
- Status: [ ]  Notes:

### UPD-04 — Auto-update daily
- Steps: Enable auto-update; relaunch.
- Expected: A check runs at most once per 24h in the background; never more often.
- Status: [ ]  Notes:

### DEF-01 — Set as Default ▸ Markdown
- Steps: MDflow ▸ Set MDflow as Default ▸ As Markdown Editor.
- Expected: An informational dialog explaining how to set the default (the native UTI
  wiring is a planned follow-up).
- Status: [ ]  Notes:

### DEF-02 — Set as Default ▸ PDF
- Steps: MDflow ▸ Set MDflow as Default ▸ As PDF Reader.
- Expected: Same informational behavior for PDF.
- Status: [ ]  Notes:
