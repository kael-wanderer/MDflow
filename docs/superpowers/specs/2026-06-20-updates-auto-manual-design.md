# Updates: Auto / Manual Design

Date: 2026-06-20
Status: Draft — under review.

## What problem does this solve?

The updater client works, but the update behavior is a single "automatically check
for updates" checkbox. The user wants a clear **Auto vs Manual** choice.

## What does success look like?

- A single setting chooses the mode:
  - **Manual** — MDflow never checks on its own; the user checks via Help ▸ Check for
    Updates or Gear ▸ General.
  - **Automatic** — MDflow checks once per 24h in the background and, when an update is
    found, prompts the user. **It always asks before downloading/installing** (no
    silent install in either mode).
- The choice persists and is shown in Gear ▸ General.

## Out of scope

- Silent/auto-install without a prompt.
- Release-channel selection (stable/beta).
- The release infrastructure itself (signed feed, `latest.json`, CI signing) — tracked
  separately under M2.

## Design

- Settings model (`settings.ts`): replace the boolean `autoUpdate` with
  `updateMode: "manual" | "auto"` (migrate an existing `autoUpdate: true` → `"auto"`,
  `false`/absent → `"manual"`). Keep parsing tolerant of the old key.
- Gear ▸ General: replace the single checkbox with a two-option control (radio or
  segmented) labeled **Manual** / **Automatic**, plus the existing "Check for Updates"
  button (always available in both modes).
- Updater runtime (`updater.ts`): `startDailyUpdateChecks` runs only when
  `updateMode === "auto"`; the once-per-24h guard is unchanged. Manual checks
  (`checkForUpdates(interactive=true)`) are unaffected.
- Behavior on update found: unchanged — prompt to download/install, then restart.

## Error handling

- Not-configured feed → the existing friendly "updates not configured" message
  (manual checks only; auto checks stay silent on this).

## Testing

- Vitest: `parseSettings` maps legacy `autoUpdate` to the new `updateMode`;
  `shouldCheckForUpdates` returns false in manual mode and respects the 24h guard in
  auto mode.
- Manual (append to `docs/test-cases/15-updater-default.md`): toggling Manual/Automatic
  persists; auto runs a daily check at most once/24h; manual never auto-checks; both
  always prompt before install.

## Deliverables

- [ ] `updateMode` setting + legacy migration + tests
- [ ] Gear ▸ General Manual/Automatic control
- [ ] Runtime honors the mode
- [ ] Docs/test-cases updated
