# AI Settings + Keychain — Design

> Status: approved design, pre-implementation. Next: writing-plans.
> Scope: move AI API keys to the OS keychain and reshape the Agent settings into
> two clearer tabs (CLI Agents + Models), with shippable default providers.

## Problem

AI API keys are stored in plaintext in `ai.json` (`HttpProvider.key`), which is not
safe for a public release. The Agent settings also split HTTP providers into two tabs
(Local model / API model) auto-sorted by URL, which users find confusing, and the
provider list is add-only (no way to remove a provider or change a key from the UI).

## Goals

- Store API keys in the macOS Keychain (via the Rust `keyring` crate); never persist
  secrets in `ai.json`.
- Migrate any existing plaintext keys in `ai.json` into the keychain automatically,
  once, on load.
- Reshape Agent settings into two tabs: **CLI Agents** and **Models** (local + remote
  unified), each with a one-line description.
- Make the Models list manageable: per-row **Use / Set key… / Remove**.
- Ship sensible defaults: keep current locals/CLIs and add empty-key **OpenAI /
  Anthropic / OpenRouter** templates.

## Non-goals (YAGNI)

- Moving HTTP streaming into Rust so keys never enter JS memory (bigger refactor;
  deferred — keys transiting app memory for a request is acceptable for a local app).
- Encrypted-vault/master-password flows (Stronghold).
- Editing a provider's base URL / model inline (Remove + re-add covers it).
- Per-key sync across machines.

## Approach

Keys live in the OS keychain keyed by provider `id`. `ai.json` describes providers
without secrets. The frontend reads a provider's key from the keychain at request
time. This keeps the change small while removing plaintext secrets from disk.

## Components

### `src-tauri/src/secrets.rs` (new) + `Cargo.toml` + `lib.rs`

Add dependency `keyring = "3"`. New Tauri commands (service constant
`"com.kael.mdflow"`, account = provider `id`):

- `set_secret(id: String, secret: String) -> Result<(), String>` — `Entry::new(SERVICE, &id)?.set_password(&secret)`.
- `get_secret(id: String) -> Option<String>` — returns the password, or `None` if
  `keyring::Error::NoEntry` (any other error → `None`, logged).
- `delete_secret(id: String) -> Result<(), String>` — `delete_credential()`; treat
  `NoEntry` as success.
- `has_secret(id: String) -> bool` — `get_secret(id).is_some()`.

Register all four in `lib.rs`'s `invoke_handler`.

### `src/ai/aisettings.ts`

- `HttpProvider` becomes `{ id; label; type: "http"; baseUrl: string; model: string }`
  (drop the persisted `key`).
- `parseProvider` for `http` ignores any `key` field present (legacy tolerance) and no
  longer requires/emits it.
- `DEFAULT_AI_SETTINGS.providers` keeps ollama, lmstudio, claude, codex, opencode, pi
  and adds three Models templates (no key):
  - OpenAI — `https://api.openai.com/v1`, model `gpt-4.1-mini`
  - Anthropic — `https://api.anthropic.com/v1`, model `claude-3-5-haiku-latest`
  - OpenRouter — `https://openrouter.ai/api/v1`, model `openai/gpt-4.1-mini`
- New pure helper `extractLegacyKeys(raw: string): { cleaned: string; keys: { id: string; secret: string }[] }`
  — parses raw `ai.json`, collects non-empty `key` values from http providers, returns
  the JSON re-serialized without `key` fields plus the list of `{id, secret}`. On parse
  failure returns `{ cleaned: raw, keys: [] }`.

### `src/ai/client.ts`

Before streaming an http provider, `const key = await invoke<string|null>("get_secret", { id: provider.id });`
and set `Authorization: Bearer ${key}` only when `key` is truthy.

### `src/main.ts` (`loadAISettings`)

After reading the `ai.json` text and before parsing:
1. `const { cleaned, keys } = extractLegacyKeys(text);`
2. if `keys.length`, `await invoke("set_secret", …)` for each, then
   `await writeFile(aiSettingsPath, cleaned)` and use `cleaned` for parsing.
3. parse as today.

### `src/settingspanel.ts`

- `AgentGroup` = `"command" | "model"`. Tabs: **CLI Agents** (`command`), **Models**
  (`model`). `providerGroup`: `command` → `command`; `http` → `model`.
- Under each tab title, a one-line description:
  - CLI Agents: "Installed agent CLIs (Claude Code, Codex, OpenCode, Pi). The agent
    chooses its own model and uses its own login."
  - Models: "OpenAI-compatible endpoints — local servers (Ollama, LM Studio) or hosted
    APIs. Keys are stored in your macOS Keychain."
- Models list rows: `label`, `model @ baseURL`, a "Key saved" badge when
  `has_secret(id)` is true, and actions **Use** (set default), **Set key…** (prompt →
  `set_secret`), **Remove** (`delete_secret(id)` + remove provider from settings).
- CLI Agents rows: existing **Use** plus **Remove** (remove provider).
- Models add-form: Name, Base URL, Model ID, API key (optional), with a light
  **Local / Remote** segmented toggle that only swaps placeholder examples
  (`http://localhost:11434/v1` vs `https://api.openai.com/v1`) and the key hint. On
  submit: create the http provider (no key in object); if a key was entered,
  `set_secret(id, key)`.
- All mutations continue to flow through the existing `updateAI` → save `ai.json` path;
  secret writes/deletes are awaited alongside.

## Data flow

- Add model with key → provider written to `ai.json` (no key) + `set_secret(id,key)`.
- Chat with http provider → `get_secret(id)` → Bearer header (or none).
- Remove provider → `delete_secret(id)` + drop from `ai.json`.
- First load with legacy keys → `extractLegacyKeys` → `set_secret` each → rewrite
  `ai.json` without keys.

## Error handling

- `get_secret` returns `None` on `NoEntry` or any keyring error → request proceeds
  with no Authorization header (server may 401, surfaced as today's HTTP error).
- `set_secret`/`delete_secret` errors surface a small inline message in the panel; the
  provider change still saves to `ai.json` (key just isn't stored).
- `delete_secret` on a missing entry is a success (idempotent).
- Migration is best-effort: if a `set_secret` fails, that key is left in `ai.json` for
  the next attempt (don't strip a key we failed to store).

## Testing

- Unit (`aisettings.test.ts`): http provider parses without a `key`; a legacy `key` is
  ignored by the parser; `providerGroup` returns `command`/`model`; defaults include
  OpenAI/Anthropic/OpenRouter. `extractLegacyKeys`: pulls keys + strips them; empty/no
  keys → unchanged; invalid JSON → `{cleaned: raw, keys: []}`.
- Manual: keychain round-trip (set/get/delete) on macOS; add a Models provider with a
  key, confirm it's absent from `ai.json` and a real API call works; Set key / Remove;
  migrate an `ai.json` containing a plaintext key (key moves to keychain, file cleaned).

## Out-of-scope follow-ups

Rust-side HTTP streaming (keys never in JS), inline base-URL/model editing, key sync,
and non-macOS keychain validation (the `keyring` crate supports them but only macOS is
verified here).
