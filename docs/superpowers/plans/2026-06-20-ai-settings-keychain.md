# AI Settings + Keychain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store AI API keys in the macOS Keychain (never plaintext in `ai.json`), migrate existing keys automatically, and reshape Agent settings into two clearer tabs (CLI Agents + Models) with shippable default providers.

**Architecture:** A new Rust module exposes keychain get/set/delete/has commands via the `keyring` crate (account = provider `id`). `ai.json` stops storing secrets; the frontend reads a provider's key from the keychain at request time. The settings panel collapses the two HTTP tabs into one "Models" tab with per-row Use/Set-key/Remove, and a one-time loader migrates legacy plaintext keys.

**Tech Stack:** Rust (`keyring` 3, Tauri 2 commands), TypeScript (no framework), Vitest.

Design spec: `docs/superpowers/specs/2026-06-20-ai-settings-keychain-design.md`.

## Global Constraints

- Clean-room: no copied code/CSS from Kaelio; no names "mx"/"Vibery"/"Kaelio".
- Keychain service constant: `"com.kael.mdflow"`; account = provider `id`.
- `ai.json` MUST NOT contain API keys after this work; keys live only in the keychain.
- `keyring = { version = "3", features = ["apple-native"] }` (macOS verified; other
  platforms are out of scope here).
- Plain TypeScript, one responsibility per file. TDD for pure functions. Frequent commits.
- Two Agent tabs: **CLI Agents** (`command`) and **Models** (`http`, local + remote).
- Default providers: keep ollama, lmstudio, claude, codex, opencode, pi; add empty-key
  templates OpenAI (`https://api.openai.com/v1`, `gpt-4.1-mini`), Anthropic
  (`https://api.anthropic.com/v1`, `claude-3-5-haiku-latest`), OpenRouter
  (`https://openrouter.ai/api/v1`, `openai/gpt-4.1-mini`).
- Scope fences (do NOT build): Rust-side HTTP streaming, inline base-URL/model editing,
  key sync, Stronghold/master-password.

---

### Task 1: Keychain commands (Rust)

**Files:**
- Create: `src-tauri/src/secrets.rs`
- Modify: `src-tauri/Cargo.toml` (add `keyring`)
- Modify: `src-tauri/src/lib.rs` (declare module + register 4 commands)

**Interfaces:**
- Produces Tauri commands: `set_secret(id: String, secret: String) -> Result<(), String>`,
  `get_secret(id: String) -> Option<String>`, `delete_secret(id: String) -> Result<(), String>`,
  `has_secret(id: String) -> bool`.

- [ ] **Step 1: Add the dependency**

In `src-tauri/Cargo.toml`, under `[dependencies]`, add:

```toml
keyring = { version = "3", features = ["apple-native"] }
```

- [ ] **Step 2: Create the module**

Create `src-tauri/src/secrets.rs`:

```rust
use keyring::{Entry, Error};

const SERVICE: &str = "com.kael.mdflow";

fn entry(id: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_secret(id: String, secret: String) -> Result<(), String> {
    entry(&id)?.set_password(&secret).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_secret(id: String) -> Option<String> {
    entry(&id).ok()?.get_password().ok()
}

#[tauri::command]
pub fn delete_secret(id: String) -> Result<(), String> {
    match entry(&id)?.delete_credential() {
        Ok(()) | Err(Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn has_secret(id: String) -> bool {
    get_secret(id).is_some()
}
```

- [ ] **Step 3: Register module + commands**

In `src-tauri/src/lib.rs`, add `mod secrets;` next to the other `mod` lines, and add
these four entries to the `tauri::generate_handler![ … ]` list (alongside the existing
commands):

```rust
            secrets::set_secret,
            secrets::get_secret,
            secrets::delete_secret,
            secrets::has_secret,
```

- [ ] **Step 4: Verify compile**

Run: `cd src-tauri && cargo check`
Expected: clean (the `keyring` crate compiles and links).

- [ ] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/secrets.rs src-tauri/src/lib.rs
git commit -m "feat(ai): keychain commands for API key storage"
```

> Manual check (later, in the app): set a key, confirm it appears in Keychain Access
> under service "com.kael.mdflow", and that get/delete behave.

---

### Task 2: Drop persisted keys, add defaults + extractLegacyKeys (TDD)

**Files:**
- Modify: `src/ai/aisettings.ts`
- Modify: `src/__tests__/aisettings.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `HttpProvider` without a `key` field; `DEFAULT_AI_SETTINGS` with OpenAI/
  Anthropic/OpenRouter templates; `extractLegacyKeys(raw: string): { cleaned: string; keys: { id: string; secret: string }[] }`.

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/aisettings.test.ts` (inside the file, after the existing
`describe` block) :

```ts
import { extractLegacyKeys } from "../ai/aisettings";

describe("http providers carry no key", () => {
  it("parses an http provider without a key field", () => {
    const raw = JSON.stringify({
      providers: [{ id: "a", label: "A", type: "http", baseUrl: "u", model: "m", key: "sekret" }],
    });
    const provider = parseAISettings(raw).providers[0];
    expect(provider).not.toHaveProperty("key");
  });

  it("ships OpenAI, Anthropic, and OpenRouter templates", () => {
    const ids = DEFAULT_AI_SETTINGS.providers.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining(["openai", "anthropic", "openrouter"]),
    );
    const openai = DEFAULT_AI_SETTINGS.providers.find((p) => p.id === "openai");
    expect(openai).not.toHaveProperty("key");
  });
});

describe("extractLegacyKeys", () => {
  it("pulls non-empty http keys and strips them", () => {
    const raw = JSON.stringify({
      providers: [
        { id: "a", label: "A", type: "http", baseUrl: "u", model: "m", key: "k1" },
        { id: "b", label: "B", type: "http", baseUrl: "u", model: "m", key: "" },
        { id: "c", label: "C", type: "command", run: "r {prompt}" },
      ],
    });
    const { cleaned, keys } = extractLegacyKeys(raw);
    expect(keys).toEqual([{ id: "a", secret: "k1" }]);
    expect(cleaned).not.toContain("k1");
    expect(JSON.parse(cleaned).providers[0]).not.toHaveProperty("key");
  });

  it("returns the raw string unchanged on invalid JSON", () => {
    expect(extractLegacyKeys("nope")).toEqual({ cleaned: "nope", keys: [] });
  });

  it("returns no keys when none are present", () => {
    const raw = JSON.stringify({ providers: [{ id: "c", label: "C", type: "command", run: "r" }] });
    expect(extractLegacyKeys(raw).keys).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/__tests__/aisettings.test.ts`
Expected: FAIL (`extractLegacyKeys` not exported; defaults lack templates; http still has `key`).

- [ ] **Step 3: Implement**

In `src/ai/aisettings.ts`:

(a) Change the `HttpProvider` type to drop `key`:

```ts
export type HttpProvider = {
  id: string;
  label: string;
  type: "http";
  baseUrl: string;
  model: string;
};
```

(b) In `parseProvider`, the `http` branch returns no `key`:

```ts
  if (value.type === "http") {
    if (
      typeof value.baseUrl !== "string" ||
      typeof value.model !== "string"
    ) {
      return null;
    }
    return {
      id: value.id,
      label: value.label,
      type: "http",
      baseUrl: value.baseUrl,
      model: value.model,
    };
  }
```

(c) In `DEFAULT_AI_SETTINGS.providers`, add the three templates immediately after the
`lmstudio` entry (before the command entries):

```ts
    {
      id: "openai",
      label: "OpenAI",
      type: "http",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
    },
    {
      id: "anthropic",
      label: "Anthropic",
      type: "http",
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-3-5-haiku-latest",
    },
    {
      id: "openrouter",
      label: "OpenRouter",
      type: "http",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
    },
```

(d) Add `extractLegacyKeys` at the end of the file:

```ts
export function extractLegacyKeys(raw: string): {
  cleaned: string;
  keys: { id: string; secret: string }[];
} {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { cleaned: raw, keys: [] };
  }
  if (!data || typeof data !== "object") return { cleaned: raw, keys: [] };
  const obj = data as Record<string, unknown>;
  const providers = Array.isArray(obj.providers) ? obj.providers : [];
  const keys: { id: string; secret: string }[] = [];
  for (const entry of providers) {
    if (!entry || typeof entry !== "object") continue;
    const p = entry as Record<string, unknown>;
    if (p.type === "http" && typeof p.key === "string" && p.key !== "" && typeof p.id === "string") {
      keys.push({ id: p.id, secret: p.key });
    }
    delete (p as { key?: unknown }).key;
  }
  return { cleaned: JSON.stringify(obj, null, 2), keys };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/__tests__/aisettings.test.ts`
Expected: PASS (all, including the pre-existing tests).

- [ ] **Step 5: Commit**

```bash
git add src/ai/aisettings.ts src/__tests__/aisettings.test.ts
git commit -m "feat(ai): drop persisted keys; add API templates + extractLegacyKeys"
```

---

### Task 3: Migrate on load + read keys at request time

**Files:**
- Modify: `src/main.ts` (`loadAISettings`)
- Modify: `src/ai/client.ts` (`streamHttp`)

**Interfaces:**
- Consumes: `extractLegacyKeys` (Task 2); `set_secret` / `get_secret` (Task 1).

- [ ] **Step 1: Migrate legacy keys in `loadAISettings`**

In `src/main.ts`, add `extractLegacyKeys` to the import from `./ai/aisettings`
(the file already imports `parseAISettings`, `DEFAULT_AI_SETTINGS_JSON`, etc.). Then
in `loadAISettings`, replace the body that reads + parses the file:

```ts
async function loadAISettings(): Promise<void> {
  try {
    const file = await getAISettingsFile(DEFAULT_AI_SETTINGS_JSON);
    aiSettingsPath = file.path;
    const { cleaned, keys } = extractLegacyKeys(file.contents);
    if (keys.length) {
      for (const { id, secret } of keys) {
        try {
          await invoke("set_secret", { id, secret });
        } catch {
          /* leave this key in the file for a later attempt */
        }
      }
      const stored = await Promise.all(
        keys.map((k) => invoke<boolean>("has_secret", { id: k.id })),
      );
      if (stored.every(Boolean)) {
        await writeFile(aiSettingsPath, cleaned);
        currentAISettings = parseAISettings(cleaned);
      } else {
        currentAISettings = parseAISettings(file.contents);
      }
    } else {
      currentAISettings = parseAISettings(cleaned);
    }
    aiPanel?.render();
  } catch {
    aiSettingsPath = "";
    currentAISettings = parseAISettings("{}");
  }
}
```

> `invoke` and `writeFile` are already imported in `main.ts`. If `writeFile` is not in
> scope, import it from `./files` (it is used elsewhere in the file).

- [ ] **Step 2: Read the key from the keychain in `streamHttp`**

In `src/ai/client.ts`, replace:

```ts
  if (provider.key) headers.Authorization = `Bearer ${provider.key}`;
```

with:

```ts
  const key = await invoke<string | null>("get_secret", { id: provider.id });
  if (key) headers.Authorization = `Bearer ${key}`;
```

(`invoke` is already imported at the top of `client.ts`.)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean (no reference to `provider.key` remains; type error would appear if so).

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/ai/client.ts
git commit -m "feat(ai): migrate legacy keys to keychain; read keys at request time"
```

---

### Task 4: Two-tab Agent settings (CLI Agents + Models)

**Files:**
- Modify: `src/settingspanel.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `set_secret` / `delete_secret` / `has_secret` (Task 1); `HttpProvider`
  without `key` (Task 2); existing `updateAI`, `uniqueId`, `deps.getAISettings`.

- [ ] **Step 1: Import invoke + collapse the group type**

At the top of `src/settingspanel.ts`, add:

```ts
import { invoke } from "@tauri-apps/api/core";
```

Change the group type and helper. Replace:

```ts
type AgentGroup = "command" | "local" | "api";
```

with:

```ts
type AgentGroup = "command" | "model";
```

Delete the `isLocalHttp` function and replace `providerGroup` with:

```ts
function providerGroup(provider: Provider): AgentGroup {
  return provider.type === "command" ? "command" : "model";
}
```

Ensure the `activeAgentGroup` initial value is `"command"` (leave as-is if already).

- [ ] **Step 2: Replace `renderAgent` (tabs + description)**

Replace the existing `renderAgent` function with:

```ts
  function renderAgent(content: HTMLElement): void {
    const groups: Array<[AgentGroup, string]> = [
      ["command", "CLI Agents"],
      ["model", "Models"],
    ];
    const row = document.createElement("div");
    row.className = "settings-segment agent-segment";
    for (const [id, label] of groups) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("active", activeAgentGroup === id);
      button.textContent = label;
      button.addEventListener("click", () => {
        activeAgentGroup = id;
        render();
      });
      row.appendChild(button);
    }
    content.appendChild(row);
    const help = document.createElement("p");
    help.className = "settings-help";
    help.textContent =
      activeAgentGroup === "command"
        ? "Installed agent CLIs (Claude Code, Codex, OpenCode, Pi). The agent chooses its own model and uses its own login."
        : "OpenAI-compatible endpoints — local servers (Ollama, LM Studio) or hosted APIs. Keys are stored in your macOS Keychain.";
    content.appendChild(help);
    renderAgentEditor(content);
  }
```

- [ ] **Step 3: Replace `renderAgentEditor` (rows with actions + add form)**

Replace the entire existing `renderAgentEditor` function with:

```ts
  function renderAgentEditor(content: HTMLElement): void {
    const settings = deps.getAISettings();
    const providers = settings.providers.filter(
      (provider) => providerGroup(provider) === activeAgentGroup,
    );
    const list = document.createElement("div");
    list.className = "agent-list";
    for (const provider of providers) {
      const isDefault = settings.defaultProvider === provider.id;
      const rowEl = document.createElement("div");
      rowEl.className = `agent-row${isDefault ? " selected" : ""}`;

      const info = document.createElement("span");
      info.className = "agent-info";
      info.innerHTML = `<strong></strong><small></small>`;
      info.querySelector("strong")!.textContent = provider.label;
      info.querySelector("small")!.textContent =
        provider.type === "command"
          ? provider.run.split(/\s+/)[0]
          : `${provider.model} @ ${provider.baseUrl}`;

      const actions = document.createElement("span");
      actions.className = "agent-actions";

      const use = document.createElement("button");
      use.type = "button";
      use.className = "agent-use";
      use.textContent = isDefault ? "Selected" : "Use";
      use.addEventListener("click", () =>
        updateAI((next) => {
          next.defaultProvider = provider.id;
        }),
      );
      actions.appendChild(use);

      if (provider.type === "http") {
        const badge = document.createElement("span");
        badge.className = "agent-key-badge";
        badge.textContent = "Key saved";
        badge.hidden = true;
        void invoke<boolean>("has_secret", { id: provider.id }).then((ok) => {
          badge.hidden = !ok;
        });
        actions.appendChild(badge);

        const setKey = document.createElement("button");
        setKey.type = "button";
        setKey.className = "agent-setkey";
        setKey.textContent = "Set key…";
        setKey.addEventListener("click", () => {
          if (rowEl.querySelector(".agent-keyform")) return;
          const keyForm = document.createElement("form");
          keyForm.className = "agent-keyform";
          keyForm.innerHTML = `<input type="password" name="key" placeholder="Paste API key" /><button type="submit">Save</button>`;
          keyForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const value = String(new FormData(keyForm).get("key") ?? "").trim();
            if (value) {
              void invoke("set_secret", { id: provider.id, secret: value })
                .then(() => render())
                .catch(() => {});
            } else {
              keyForm.remove();
            }
          });
          rowEl.appendChild(keyForm);
          keyForm.querySelector("input")?.focus();
        });
        actions.appendChild(setKey);
      }

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "agent-remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        if (provider.type === "http") {
          void invoke("delete_secret", { id: provider.id }).catch(() => {});
        }
        updateAI((next) => {
          next.providers = next.providers.filter((p) => p.id !== provider.id);
          if (next.defaultProvider === provider.id) {
            next.defaultProvider = next.providers[0]?.id ?? "";
          }
        });
      });
      actions.appendChild(remove);

      rowEl.append(info, actions);
      list.appendChild(rowEl);
    }
    if (!providers.length) {
      const empty = document.createElement("p");
      empty.className = "settings-empty";
      empty.textContent = "No providers configured in this section.";
      list.appendChild(empty);
    }
    content.appendChild(list);

    const form = document.createElement("form");
    form.className = "agent-form";
    if (activeAgentGroup === "command") {
      form.innerHTML = `
        <label>Name<input name="label" placeholder="Claude Code" required /></label>
        <label>Command<input name="run" placeholder="claude -p {prompt}" required /></label>
        <label>Bypass command<input name="bypass" placeholder="Optional command for bypass mode" /></label>
        <button type="submit">Add agent</button>`;
    } else {
      form.innerHTML = `
        <div class="agent-locality settings-segment">
          <button type="button" data-loc="local" class="active">Local</button>
          <button type="button" data-loc="remote">Remote</button>
        </div>
        <label>Name<input name="label" placeholder="Ollama" required /></label>
        <label>Base URL<input name="base" placeholder="http://localhost:11434/v1" required /></label>
        <label>Model ID<input name="model" placeholder="Model name" required /></label>
        <label>API key<input name="key" type="password" placeholder="Optional — stored in Keychain" /></label>
        <button type="submit">Add model</button>`;
      const locButtons = Array.from(
        form.querySelectorAll<HTMLButtonElement>("[data-loc]"),
      );
      for (const button of locButtons) {
        button.addEventListener("click", () => {
          for (const other of locButtons) {
            other.classList.toggle("active", other === button);
          }
          const remote = button.dataset.loc === "remote";
          const baseInput = form.querySelector<HTMLInputElement>('[name="base"]')!;
          const labelInput = form.querySelector<HTMLInputElement>('[name="label"]')!;
          baseInput.placeholder = remote
            ? "https://api.openai.com/v1"
            : "http://localhost:11434/v1";
          labelInput.placeholder = remote ? "OpenAI" : "Ollama";
        });
      }
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const label = String(data.get("label") ?? "").trim();
      if (!label) return;
      if (activeAgentGroup === "command") {
        updateAI((next) => {
          const id = uniqueId(label, next);
          next.providers.push({
            id,
            label,
            type: "command",
            run: String(data.get("run") ?? "").trim(),
            bypassRun: String(data.get("bypass") ?? "").trim() || undefined,
          });
          next.defaultProvider = id;
        });
      } else {
        const key = String(data.get("key") ?? "").trim();
        let newId = "";
        updateAI((next) => {
          const id = uniqueId(label, next);
          newId = id;
          next.providers.push({
            id,
            label,
            type: "http",
            baseUrl: String(data.get("base") ?? "").trim(),
            model: String(data.get("model") ?? "").trim(),
          });
          next.defaultProvider = id;
        });
        if (key && newId) {
          void invoke("set_secret", { id: newId, secret: key }).catch(() => {});
        }
      }
    });
    content.appendChild(form);
  }
```

- [ ] **Step 4: Add CSS**

In `src/styles.css`, after the existing `.agent-list { … }` rule, add:

```css
.settings-help {
  margin: 6px 0 10px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.agent-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.agent-row.selected {
  border-color: var(--accent);
}

.agent-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.agent-info small {
  color: var(--muted);
  font-size: 11px;
}

.agent-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.agent-actions button {
  padding: 4px 8px;
  color: var(--text);
  font: inherit;
  font-size: 11px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.agent-actions button:hover {
  color: var(--text-strong);
  border-color: var(--accent);
}

.agent-key-badge {
  color: var(--tok-string);
  font-size: 11px;
}

.agent-keyform {
  display: flex;
  gap: 6px;
  width: 100%;
  margin-top: 6px;
}

.agent-keyform input {
  flex: 1;
  min-width: 0;
  padding: 5px 8px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.agent-locality {
  margin-bottom: 8px;
}
```

> Note: the previous `.agent-row` was styled as a full-width button. If a conflicting
> `.agent-row` rule already exists, replace its body with the one above.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: clean.

Manual: open Gear ▸ Agent. Two tabs (CLI Agents, Models) each with a description.
Models lists local + hosted together; add a Models provider with a key → "Key saved"
badge appears, and the key is absent from `ai.json`; Set key… on an existing row;
Remove deletes the provider (and its key); Use sets the default.

- [ ] **Step 6: Commit**

```bash
git add src/settingspanel.ts src/styles.css
git commit -m "feat(ai): two-tab Agent settings (CLI Agents + Models) with keychain actions"
```

---

### Task 5: Docs + final verification

**Files:**
- Modify: `CHANGELOG.md`, `README.md`, `CLAUDE.md`, `docs/tasks.md`

- [ ] **Step 1: Update docs**

- `CHANGELOG.md` [Unreleased]: under **Changed**, add "API keys now stored in the
  macOS Keychain (via the `keyring` crate); `ai.json` no longer holds secrets and
  legacy plaintext keys migrate automatically." Under the existing **Notes**, replace
  the "API keys … stored in plaintext … planned" line with "API keys are stored in the
  macOS Keychain, not in `ai.json`." Update the Agent description to "two tabs — CLI
  Agents and Models (local + hosted)".
- `README.md`: in "Configuring the AI panel", replace the plaintext security note with:
  "API keys are stored in your macOS Keychain (service `com.kael.mdflow`), never in
  `ai.json`." Note the two Agent tabs (CLI Agents / Models) and that hosted templates
  (OpenAI, Anthropic, OpenRouter) ship by default.
- `CLAUDE.md`: in the AI/settings paragraph, note keys live in the OS keychain (not
  `ai.json`) and the Agent panel has CLI Agents + Models tabs; mention `src-tauri/src/secrets.rs`.
- `docs/tasks.md`: add `[x] AI settings + keychain: keys in macOS Keychain, two-tab
  Agent panel, hosted defaults, legacy migration`.

- [ ] **Step 2: Final verification**

```bash
npm run build && npx vitest run && (cd src-tauri && cargo check)
```
Expected: build clean, all Vitest pass, cargo check clean.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md README.md CLAUDE.md docs/tasks.md
git commit -m "docs(ai): record keychain key storage + two-tab Agent settings"
```

---

## Self-Review

- **Spec coverage:**
  - Keychain commands (keyring) → Task 1. ✔
  - `ai.json` holds no secrets; `HttpProvider` drops `key` → Task 2. ✔
  - Auto-migration of legacy keys → Task 2 (`extractLegacyKeys`) + Task 3 (loader). ✔
  - Read key at request time → Task 3 (`client.ts`). ✔
  - Two tabs (CLI Agents + Models) + descriptions → Task 4. ✔
  - Models rows Use/Set key/Remove; add-form with Local/Remote hint → Task 4. ✔
  - Default OpenAI/Anthropic/OpenRouter templates → Task 2. ✔
  - Tests: parser (no key, defaults), `extractLegacyKeys` units → Task 2; manual
    keychain/panel/API call → Tasks 1, 4. ✔
- **Placeholder scan:** none; every code step shows complete code. (The test helper
  `extractLegaceyKeysSafe` is intentionally defined in the test file.)
- **Type consistency:** `extractLegacyKeys` return shape `{ cleaned, keys:[{id,secret}] }`
  is identical in Task 2 (definition), Task 3 (consumer). `set_secret(id,secret)`,
  `get_secret(id)`, `delete_secret(id)`, `has_secret(id)` signatures match between Task 1
  (Rust) and Tasks 3–4 (invoke calls). `AgentGroup` = `command|model` consistent in Task 4.
- **Scope:** single cohesive feature; no decomposition needed.
