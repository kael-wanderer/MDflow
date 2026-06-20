# MDflow Auto-update Design

## Goal

Let users check for signed MDflow releases manually and optionally check once per
day, while always asking before an update is downloaded and installed.

## Product behavior

- Help contains **Check for Updates…**.
- Gear contains an **Update** section with an automatic daily-check checkbox and a
  manual check button.
- No update shows an “up to date” message for manual checks.
- An available update shows its version and release notes, then asks for consent.
- Accepted updates download, install, and restart MDflow.
- Background checks are limited to once per 24 hours and stay quiet when no update
  exists or the network is unavailable.
- Automatic checking is off by default.

## Release requirement

The client only trusts Tauri-signed updater artifacts. Production releases must set
the updater endpoint and public key in `src-tauri/tauri.conf.json`; the matching
private key belongs in CI secrets and must never be committed.
