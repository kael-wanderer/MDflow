# AI Panel + Render + Export Implementation Plan (Phases 6–7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tasks are numbered continuously across phases — implement in order.

**Goal:** Add an AI panel (chat + embedded terminal), rich preview rendering (mermaid, KaTeX, raw HTML), a PDF reader, and document export (PDF/DOCX/HTML/PNG/JPG), plus a settings rework and an explorer-icon fix.

**Architecture:** New `src/ai/` module for the AI panel; preview gains post-processing for mermaid/KaTeX and raw-HTML passthrough; `.pdf` files route to a pdf.js viewer; export shells out to user-installed pandoc/typst from a new Rust `export.rs`; settings split into `settings.json` (editor) + `ai.json` (AI). AI chat providers are configurable in `ai.json` (`http` for OpenAI-compatible local servers, `command` for headless agent CLIs); the terminal runs an agent CLI via a Rust PTY.

**Tech Stack:** Tauri 2 + Rust, vanilla TS, CodeMirror 6, markdown-it. New JS: `mermaid`, `katex`, `pdfjs-dist`, `@xterm/xterm`, `@xterm/addon-fit`. New Rust: `portable-pty`. External: `pandoc`, `typst` (user-installed).

## Global Constraints

- **Clean-room MIT.** Kaelio (`/Users/cong.bui/Kael/20-Projects/kaelio`) may be read as a behavior/tech reference only. Reimplement fresh; never copy code/CSS. No names "mx", "Vibery", "Kaelio".
- **Activity-bar order: Explorer → Search → ✦ AI → Gear.** Gear always last.
- **Test env is Node** (`vite.config.ts` → `environment: "node"`; `src/__tests__/setup.ts` shims `localStorage`). No `document` in tests — only non-DOM pure logic is unit-tested. Test files live in `src/__tests__/<name>.test.ts`.
- **No placeholders** — keys/commands are edited as JSON. Keys are plaintext in `ai.json` (app config dir, never committed).
- Small focused files, one responsibility each. New AI code under `src/ai/`.
- After any `npm install`, run `npm approve-scripts esbuild fsevents` if prompted.

---

## Phase A — Settings rework

### Task 1: `get_ai_settings` Rust command + `ai.json`

**Files:**
- Modify: `src-tauri/src/files.rs` (add `get_ai_settings`)
- Modify: `src-tauri/src/lib.rs` (register)
- Modify: `src/filesys.ts` (wrapper)

**Interfaces:**
- Produces (Rust): `#[tauri::command] pub fn get_ai_settings(app: tauri::AppHandle, default: String) -> Result<SettingsFile, String>` — creates `<app config dir>/ai.json` from `default` if missing, returns `{ path, contents }`. Reuses the existing `SettingsFile` struct from the Phase-5 `get_settings`.
- Produces (TS): `getAISettingsFile(defaultJson: string): Promise<{ path: string; contents: string }>`

- [ ] **Step 1: Add the command in `src-tauri/src/files.rs`** (next to `get_settings`)

```rust
#[tauri::command]
pub fn get_ai_settings(
    app: tauri::AppHandle,
    default: String,
) -> Result<SettingsFile, String> {
    use tauri::Manager;
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = dir.join("ai.json");
    if !file.exists() {
        fs::write(&file, &default).map_err(|e| e.to_string())?;
    }
    let contents = fs::read_to_string(&file).map_err(|e| e.to_string())?;
    Ok(SettingsFile {
        path: file.to_string_lossy().into_owned(),
        contents,
    })
}
```

- [ ] **Step 2: Register it** — in `src-tauri/src/lib.rs` `generate_handler!`, after `files::get_settings,`:

```rust
            files::get_ai_settings,
```

- [ ] **Step 3: Verify compile** — `cd src-tauri && cargo check` → Expected: Finished, no errors.

- [ ] **Step 4: Add the TS wrapper** — append to `src/filesys.ts`:

```ts
export function getAISettingsFile(
  defaultJson: string,
): Promise<{ path: string; contents: string }> {
  return invoke<RawSettingsFile>("get_ai_settings", { default: defaultJson });
}
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit` → no errors.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/files.rs src-tauri/src/lib.rs src/filesys.ts
git commit -m "feat: ai.json settings file command"
```

---

### Task 2: AI settings model (pure)

**Files:**
- Create: `src/ai/aisettings.ts`
- Test: `src/__tests__/aisettings.test.ts`

**Interfaces:**
- Produces: `HttpProvider = { id: string; label: string; type: "http"; baseUrl: string; model: string; key: string }`; `CommandProvider = { id: string; label: string; type: "command"; run: string }`; `Provider = HttpProvider | CommandProvider`; `TerminalEntry = { id: string; label: string; run: string }`; `AISettings = { providers: Provider[]; terminals: TerminalEntry[]; defaultProvider: string; defaultTerminal: string }`.
- Produces: `DEFAULT_AI_SETTINGS: AISettings`, `DEFAULT_AI_SETTINGS_JSON: string`, `parseAISettings(raw: string): AISettings` (never throws; invalid → defaults; drops malformed provider entries).

- [ ] **Step 1: Write the failing test** — `src/__tests__/aisettings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_AI_SETTINGS, parseAISettings } from "../ai/aisettings";

describe("parseAISettings", () => {
  it("returns defaults for invalid JSON", () => {
    expect(parseAISettings("nope")).toEqual(DEFAULT_AI_SETTINGS);
  });

  it("keeps valid providers and drops malformed ones", () => {
    const raw = JSON.stringify({
      providers: [
        { id: "a", label: "A", type: "http", baseUrl: "u", model: "m", key: "" },
        { id: "bad", type: "http" },
        { id: "c", label: "C", type: "command", run: "claude {prompt}" },
      ],
      terminals: [{ id: "t", label: "T", run: "claude" }],
      defaultProvider: "a",
      defaultTerminal: "t",
    });
    const s = parseAISettings(raw);
    expect(s.providers.map((p) => p.id)).toEqual(["a", "c"]);
    expect(s.terminals).toHaveLength(1);
    expect(s.defaultProvider).toBe("a");
  });

  it("falls back defaultProvider to first provider when unknown", () => {
    const raw = JSON.stringify({
      providers: [{ id: "x", label: "X", type: "command", run: "r {prompt}" }],
      defaultProvider: "missing",
    });
    expect(parseAISettings(raw).defaultProvider).toBe("x");
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npm run test -- aisettings` → FAIL (module not found).

- [ ] **Step 3: Implement `src/ai/aisettings.ts`**

```ts
export type HttpProvider = {
  id: string;
  label: string;
  type: "http";
  baseUrl: string;
  model: string;
  key: string;
};

export type CommandProvider = {
  id: string;
  label: string;
  type: "command";
  run: string;
};

export type Provider = HttpProvider | CommandProvider;

export type TerminalEntry = { id: string; label: string; run: string };

export type AISettings = {
  providers: Provider[];
  terminals: TerminalEntry[];
  defaultProvider: string;
  defaultTerminal: string;
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  providers: [
    { id: "ollama", label: "Ollama (local)", type: "http", baseUrl: "http://localhost:11434/v1", model: "llama3", key: "" },
    { id: "lmstudio", label: "LM Studio", type: "http", baseUrl: "http://localhost:1234/v1", model: "local-model", key: "" },
    { id: "claude", label: "Claude Code", type: "command", run: "claude -p {prompt}" },
    { id: "codex", label: "Codex", type: "command", run: "codex exec {prompt}" },
    { id: "pi", label: "Pi", type: "command", run: "pi {prompt}" },
  ],
  terminals: [
    { id: "claude-term", label: "Claude Code", run: "claude" },
    { id: "codex-term", label: "Codex", run: "codex" },
  ],
  defaultProvider: "ollama",
  defaultTerminal: "claude-term",
};

export const DEFAULT_AI_SETTINGS_JSON = JSON.stringify(DEFAULT_AI_SETTINGS, null, 2);

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function provider(raw: unknown): Provider | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.label !== "string") return null;
  if (r.type === "http") {
    if (typeof r.baseUrl !== "string" || typeof r.model !== "string") return null;
    return { id: r.id, label: r.label, type: "http", baseUrl: r.baseUrl, model: r.model, key: str(r.key) };
  }
  if (r.type === "command") {
    if (typeof r.run !== "string") return null;
    return { id: r.id, label: r.label, type: "command", run: r.run };
  }
  return null;
}

function terminal(raw: unknown): TerminalEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.label !== "string" || typeof r.run !== "string") return null;
  return { id: r.id, label: r.label, run: r.run };
}

export function parseAISettings(raw: string): AISettings {
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_AI_SETTINGS };
    data = parsed as Record<string, unknown>;
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
  const providers = Array.isArray(data.providers)
    ? (data.providers.map(provider).filter(Boolean) as Provider[])
    : DEFAULT_AI_SETTINGS.providers;
  const terminals = Array.isArray(data.terminals)
    ? (data.terminals.map(terminal).filter(Boolean) as TerminalEntry[])
    : DEFAULT_AI_SETTINGS.terminals;
  const list = providers.length ? providers : DEFAULT_AI_SETTINGS.providers;
  const wantProvider = str(data.defaultProvider);
  const defaultProvider = list.some((p) => p.id === wantProvider) ? wantProvider : list[0].id;
  const terms = terminals.length ? terminals : DEFAULT_AI_SETTINGS.terminals;
  const wantTerminal = str(data.defaultTerminal);
  const defaultTerminal = terms.some((t) => t.id === wantTerminal) ? wantTerminal : terms[0].id;
  return { providers: list, terminals: terms, defaultProvider, defaultTerminal };
}
```

- [ ] **Step 4: Run tests** — `npm run test -- aisettings` → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ai/aisettings.ts src/__tests__/aisettings.test.ts
git commit -m "feat: AI settings model + parser"
```

---

### Task 3: Gear menu → Editor / AI settings

**Files:**
- Modify: `src/main.ts` (gear opens a menu; load + open `ai.json`)

**Interfaces:**
- Consumes: `showContextMenu` from `./contextmenu`; `getAISettingsFile` from `./filesys`; `DEFAULT_AI_SETTINGS_JSON` from `./ai/aisettings`.

- [ ] **Step 1: Add imports to `src/main.ts`**

```ts
import { showContextMenu } from "./contextmenu";
import { getAISettingsFile } from "./filesys";
import { DEFAULT_AI_SETTINGS_JSON } from "./ai/aisettings";
```

(Merge `getAISettingsFile` into the existing `./filesys` import line.)

- [ ] **Step 2: Add AI settings path state + loader** (near `settingsPath`)

```ts
let aiSettingsPath = "";

async function loadAISettingsPath(): Promise<void> {
  try {
    const file = await getAISettingsFile(DEFAULT_AI_SETTINGS_JSON);
    aiSettingsPath = file.path;
  } catch {
    aiSettingsPath = "";
  }
}

function openAISettings(): void {
  if (aiSettingsPath) void doOpenPath(aiSettingsPath);
}
```

- [ ] **Step 3: Replace the gear handler with a menu.** Change the `initActivityBar(...)` call's settings callback to open a menu anchored at the gear button:

```ts
initActivityBar(requestWindowMeasure, () => palette.open(), (x, y) => {
  showContextMenu(x, y, [
    { label: "Editor Settings", action: () => openSettings() },
    { label: "AI Settings", action: () => openAISettings() },
  ]);
});
```

- [ ] **Step 4: Update `initActivityBar` to pass click coords** — in `src/activitybar.ts`, change the settings wiring:

```ts
  settingsButton.addEventListener("click", (event) => {
    const rect = settingsButton.getBoundingClientRect();
    onSettings(rect.right + 4, rect.top);
    void event;
  });
```

and the signature:

```ts
export function initActivityBar(
  onLayoutChange: () => void = () => {},
  onSearch: () => void = () => {},
  onSettings: (x: number, y: number) => void = () => {},
): void {
```

- [ ] **Step 5: Call `loadAISettingsPath()` in `boot()`** — add after `await loadSettings();`:

```ts
  await loadAISettingsPath();
```

- [ ] **Step 6: Verify** — `npx tsc --noEmit` → no errors. `npm run build` → built.

- [ ] **Step 7: Commit**

```bash
git add src/main.ts src/activitybar.ts
git commit -m "feat: gear menu opens Editor or AI settings"
```

---

## Phase B — Explorer icon fix

### Task 4: Replace explorer glyph with sidebar SVG

**Files:**
- Modify: `src/glyphs.ts` (fill-variant wrapper + new explorer glyph)

**Interfaces:**
- Produces: updated `glyphs.explorer` rendering the sidebar+chevron icon (fill-based, `viewBox 0 0 64 64`).

- [ ] **Step 1: Add a fill-based wrapper + replace `explorer` in `src/glyphs.ts`.** Add near the existing `wrap`:

```ts
const wrapFill = (inner: string): string =>
  `<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">${inner}</svg>`;
```

Replace the `explorer:` entry (the two paths are taken from `images/sidebar-collapse-layout-toggle-nav-navbar.svg`, recolored to `currentColor`):

```ts
  explorer: wrapFill(
    `<path d="M49.984,56l-35.989,0c-3.309,0-5.995,-2.686-5.995,-5.995l0,-36.011c0,-3.308 2.686,-5.995 5.995,-5.995l35.989,0c3.309,0 5.995,2.687 5.995,5.995l0,36.011c0,3.309-2.686,5.995-5.995,5.995Zm-25.984,-4.001l0,-39.999l-9.012,0c-1.65,0-2.989,1.339-2.989,2.989l0,34.021c0,1.65 1.339,2.989 2.989,2.989l9.012,0Zm24.991,-39.999l-20.991,0l0,39.999l20.991,0c1.65,0 2.989,-1.339 2.989,-2.989l0,-34.021c0,-1.65-1.339,-2.989-2.989,-2.989Z"/><path d="M19.999,38.774l-6.828,-6.828l6.828,-6.829l2.829,2.829l-4,4l4,4l-2.829,2.828Z"/>`,
  ),
```

- [ ] **Step 2: Verify** — `npm run build` → built. Visually the explorer activity-bar button shows the sidebar icon (confirmed in Task 20 smoke).

- [ ] **Step 3: Commit**

```bash
git add src/glyphs.ts
git commit -m "fix: explorer activity-bar icon uses sidebar SVG"
```

---

## Phase C — AI panel

### Task 5: Editor selection + mutation methods

**Files:**
- Modify: `src/editor.ts` (extend `EditorHandle`)

**Interfaces:**
- Produces on `EditorHandle`: `getSelection(): { from: number; to: number; text: string }`; `replaceRange(from: number, to: number, text: string): void`; `setText(text: string): void`. All operate on the active document.

- [ ] **Step 1: Extend the `EditorHandle` type** (add to the type in `src/editor.ts`):

```ts
  getSelection(): { from: number; to: number; text: string };
  replaceRange(from: number, to: number, text: string): void;
  setText(text: string): void;
```

- [ ] **Step 2: Implement on the returned `handle`** (add inside the `handle` object):

```ts
    getSelection() {
      const sel = view.state.selection.main;
      return { from: sel.from, to: sel.to, text: view.state.sliceDoc(sel.from, sel.to) };
    },
    replaceRange(from, to, text) {
      view.dispatch({ changes: { from, to, insert: text } });
    },
    setText(text) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    },
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` → no errors.

- [ ] **Step 4: Commit**

```bash
git add src/editor.ts
git commit -m "feat: editor selection + replaceRange + setText"
```

---

### Task 6: AI providers (pure)

**Files:**
- Create: `src/ai/providers.ts`
- Test: `src/__tests__/providers.test.ts`

**Interfaces:**
- Produces: `ChatMessage = { role: "system" | "user" | "assistant"; content: string }`.
- Produces: `buildHttpBody(p: HttpProvider, messages: ChatMessage[]): object` — OpenAI-compatible chat body with `stream: true`.
- Produces: `parseSSEDelta(line: string): string | null | "DONE"` — extracts `choices[0].delta.content` from a `data:` line; `"DONE"` for `data: [DONE]`; `null` for non-content lines.
- Produces: `substitutePrompt(run: string, prompt: string): string[]` — splits the command template on whitespace, replaces the `{prompt}` token with `prompt` as one argv element.

- [ ] **Step 1: Write the failing test** — `src/__tests__/providers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildHttpBody, parseSSEDelta, substitutePrompt } from "../ai/providers";
import type { HttpProvider } from "../ai/aisettings";

const p: HttpProvider = { id: "x", label: "X", type: "http", baseUrl: "u", model: "m", key: "" };

describe("buildHttpBody", () => {
  it("produces a streaming OpenAI-compatible body", () => {
    const body = buildHttpBody(p, [{ role: "user", content: "hi" }]) as any;
    expect(body.model).toBe("m");
    expect(body.stream).toBe(true);
    expect(body.messages[0]).toEqual({ role: "user", content: "hi" });
  });
});

describe("parseSSEDelta", () => {
  it("extracts delta content", () => {
    expect(parseSSEDelta('data: {"choices":[{"delta":{"content":"He"}}]}')).toBe("He");
  });
  it("returns DONE on the terminator", () => {
    expect(parseSSEDelta("data: [DONE]")).toBe("DONE");
  });
  it("returns null for empty or non-data lines", () => {
    expect(parseSSEDelta("")).toBeNull();
    expect(parseSSEDelta(": ping")).toBeNull();
  });
});

describe("substitutePrompt", () => {
  it("replaces the {prompt} token with the full prompt as one arg", () => {
    expect(substitutePrompt("claude -p {prompt}", "hello world")).toEqual([
      "claude", "-p", "hello world",
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npm run test -- providers` → FAIL.

- [ ] **Step 3: Implement `src/ai/providers.ts`**

```ts
import type { HttpProvider } from "./aisettings";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function buildHttpBody(p: HttpProvider, messages: ChatMessage[]): object {
  return { model: p.model, messages, stream: true };
}

export function parseSSEDelta(line: string): string | null | "DONE" {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (payload === "[DONE]") return "DONE";
  try {
    const json = JSON.parse(payload);
    const content = json?.choices?.[0]?.delta?.content;
    return typeof content === "string" ? content : null;
  } catch {
    return null;
  }
}

export function substitutePrompt(run: string, prompt: string): string[] {
  return run
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token === "{prompt}" ? prompt : token));
}
```

- [ ] **Step 4: Run tests** — `npm run test -- providers` → PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ai/providers.ts src/__tests__/providers.test.ts
git commit -m "feat: AI provider request/parse helpers"
```

---

### Task 7: Conversation builder (pure)

**Files:**
- Create: `src/ai/conversation.ts`
- Test: `src/__tests__/conversation.test.ts`

**Interfaces:**
- Consumes: `ChatMessage` from `./providers`.
- Produces: `buildMessages(opts: { history: ChatMessage[]; prompt: string; docText: string; selection: string; editMode: boolean }): ChatMessage[]` — prepends a system message; injects doc context (or the selection when non-empty); in `editMode` instructs the model to return only the revised text.

- [ ] **Step 1: Write the failing test** — `src/__tests__/conversation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildMessages } from "../ai/conversation";

describe("buildMessages", () => {
  it("injects the document and the prompt", () => {
    const out = buildMessages({ history: [], prompt: "summarize", docText: "# Hi", selection: "", editMode: false });
    expect(out[0].role).toBe("system");
    expect(out.some((m) => m.content.includes("# Hi"))).toBe(true);
    expect(out[out.length - 1]).toEqual({ role: "user", content: "summarize" });
  });

  it("prioritizes the selection when present", () => {
    const out = buildMessages({ history: [], prompt: "fix", docText: "full doc", selection: "just this", editMode: false });
    const ctx = out.find((m) => m.content.includes("just this"));
    expect(ctx).toBeTruthy();
    expect(out.some((m) => m.content.includes("full doc"))).toBe(false);
  });

  it("adds an edit instruction in edit mode", () => {
    const out = buildMessages({ history: [], prompt: "rewrite", docText: "x", selection: "", editMode: true });
    expect(out[0].content.toLowerCase()).toContain("return only");
  });

  it("keeps prior history", () => {
    const history = [{ role: "user" as const, content: "earlier" }];
    const out = buildMessages({ history, prompt: "next", docText: "", selection: "", editMode: false });
    expect(out.some((m) => m.content === "earlier")).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npm run test -- conversation` → FAIL.

- [ ] **Step 3: Implement `src/ai/conversation.ts`**

```ts
import type { ChatMessage } from "./providers";

const CHAT_SYSTEM =
  "You are an assistant inside a markdown editor. Help the user understand and improve the open document. Be concise.";
const EDIT_SYSTEM =
  "You are editing a markdown document. Return only the revised text with no commentary, no code fences, no explanation.";

export function buildMessages(opts: {
  history: ChatMessage[];
  prompt: string;
  docText: string;
  selection: string;
  editMode: boolean;
}): ChatMessage[] {
  const messages: ChatMessage[] = [];
  messages.push({ role: "system", content: opts.editMode ? EDIT_SYSTEM : CHAT_SYSTEM });

  const context = opts.selection.trim() ? opts.selection : opts.docText;
  if (context.trim()) {
    const label = opts.selection.trim() ? "Selected text" : "Document";
    messages.push({ role: "system", content: `${label}:\n\n${context}` });
  }

  for (const m of opts.history) messages.push(m);
  messages.push({ role: "user", content: opts.prompt });
  return messages;
}
```

- [ ] **Step 4: Run tests** — `npm run test -- conversation` → PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ai/conversation.ts src/__tests__/conversation.test.ts
git commit -m "feat: AI conversation/context builder"
```

---

### Task 8: Line diff (pure)

**Files:**
- Create: `src/ai/diff.ts`
- Test: `src/__tests__/diff.test.ts`

**Interfaces:**
- Produces: `DiffLine = { type: "same" | "add" | "del"; text: string }`; `lineDiff(oldText: string, newText: string): DiffLine[]` — LCS-based line diff.

- [ ] **Step 1: Write the failing test** — `src/__tests__/diff.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { lineDiff } from "../ai/diff";

describe("lineDiff", () => {
  it("marks unchanged lines as same", () => {
    expect(lineDiff("a\nb", "a\nb")).toEqual([
      { type: "same", text: "a" },
      { type: "same", text: "b" },
    ]);
  });

  it("detects an added line", () => {
    const d = lineDiff("a", "a\nb");
    expect(d).toContainEqual({ type: "add", text: "b" });
  });

  it("detects a removed line", () => {
    const d = lineDiff("a\nb", "a");
    expect(d).toContainEqual({ type: "del", text: "b" });
  });

  it("detects a replacement as del + add", () => {
    const d = lineDiff("a\nb\nc", "a\nx\nc");
    expect(d).toContainEqual({ type: "del", text: "b" });
    expect(d).toContainEqual({ type: "add", text: "x" });
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npm run test -- diff` → FAIL.

- [ ] **Step 3: Implement `src/ai/diff.ts`** (classic LCS table, then backtrack)

```ts
export type DiffLine = { type: "same" | "add" | "del"; text: string };

export function lineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: "del", text: a[i] });
      i++;
    } else {
      out.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "del", text: a[i++] });
  while (j < m) out.push({ type: "add", text: b[j++] });
  return out;
}
```

- [ ] **Step 4: Run tests** — `npm run test -- diff` → PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ai/diff.ts src/__tests__/diff.test.ts
git commit -m "feat: LCS line diff for AI apply-edits"
```

---

### Task 9: Rust `ai_run` (command-provider streaming)

**Files:**
- Create: `src-tauri/src/ai.rs`
- Modify: `src-tauri/src/lib.rs` (`mod ai;` + register + emit handle)

**Interfaces:**
- Produces (Rust): `#[tauri::command] pub fn ai_run(app: tauri::AppHandle, request_id: String, args: Vec<String>) -> Result<(), String>` — spawns `args[0]` with `args[1..]`, streams stdout lines as `ai-chunk` events `{ requestId, chunk }`, emits `ai-done` `{ requestId }` (or `ai-error` `{ requestId, message }`).

- [ ] **Step 1: Create `src-tauri/src/ai.rs`**

```rust
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::Emitter;

#[derive(Clone, serde::Serialize)]
struct Chunk {
    #[serde(rename = "requestId")]
    request_id: String,
    chunk: String,
}

#[derive(Clone, serde::Serialize)]
struct Done {
    #[serde(rename = "requestId")]
    request_id: String,
}

#[derive(Clone, serde::Serialize)]
struct ErrorMsg {
    #[serde(rename = "requestId")]
    request_id: String,
    message: String,
}

#[tauri::command]
pub fn ai_run(app: tauri::AppHandle, request_id: String, args: Vec<String>) -> Result<(), String> {
    if args.is_empty() {
        return Err("Empty command".into());
    }
    let mut command = Command::new(&args[0]);
    command.args(&args[1..]);
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(e) => {
            let _ = app.emit("ai-error", ErrorMsg { request_id: request_id.clone(), message: format!("Failed to start: {e}") });
            return Err(e.to_string());
        }
    };

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let app_handle = app.clone();
    let id = request_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let _ = app_handle.emit("ai-chunk", Chunk { request_id: id.clone(), chunk: format!("{line}\n") });
        }
        let _ = child.wait();
        let _ = app_handle.emit("ai-done", Done { request_id: id.clone() });
    });
    Ok(())
}
```

- [ ] **Step 2: Wire it in `src-tauri/src/lib.rs`** — add `mod ai;` near `mod files;`, then register in `generate_handler!`:

```rust
            ai::ai_run,
```

- [ ] **Step 3: Verify** — `cd src-tauri && cargo check` → Finished, no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/ai.rs src-tauri/src/lib.rs
git commit -m "feat: ai_run streams command-provider output"
```

---

### Task 10: AI client (http stream + command)

**Files:**
- Create: `src/ai/client.ts`

**Interfaces:**
- Consumes: `buildHttpBody`, `parseSSEDelta`, `substitutePrompt`, `ChatMessage` from `./providers`; `Provider` from `./aisettings`; `invoke`, `listen` from Tauri.
- Produces: `streamChat(provider: Provider, messages: ChatMessage[], onChunk: (text: string) => void): Promise<void>` — http via `fetch` SSE; command via `ai_run` + `ai-chunk`/`ai-done` events. Resolves when the stream ends; rejects on error.

- [ ] **Step 1: Implement `src/ai/client.ts`**

```ts
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Provider } from "./aisettings";
import { buildHttpBody, parseSSEDelta, substitutePrompt, type ChatMessage } from "./providers";

async function streamHttp(
  provider: Extract<Provider, { type: "http" }>,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (provider.key) headers.Authorization = `Bearer ${provider.key}`;
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(buildHttpBody(provider, messages)),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const delta = parseSSEDelta(line);
      if (delta === "DONE") return;
      if (typeof delta === "string") onChunk(delta);
    }
  }
}

async function streamCommand(
  provider: Extract<Provider, { type: "command" }>,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
  const args = substitutePrompt(provider.run, prompt);
  const requestId = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await new Promise<void>((resolve, reject) => {
    const unlisten: (() => void)[] = [];
    void listen<{ requestId: string; chunk: string }>("ai-chunk", (e) => {
      if (e.payload.requestId === requestId) onChunk(e.payload.chunk);
    }).then((u) => unlisten.push(u));
    void listen<{ requestId: string }>("ai-done", (e) => {
      if (e.payload.requestId === requestId) {
        unlisten.forEach((u) => u());
        resolve();
      }
    }).then((u) => unlisten.push(u));
    void listen<{ requestId: string; message: string }>("ai-error", (e) => {
      if (e.payload.requestId === requestId) {
        unlisten.forEach((u) => u());
        reject(new Error(e.payload.message));
      }
    }).then((u) => unlisten.push(u));
    void invoke("ai_run", { requestId, args }).catch(reject);
  });
}

export async function streamChat(
  provider: Provider,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  if (provider.type === "http") return streamHttp(provider, messages, onChunk);
  return streamCommand(provider, messages, onChunk);
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ai/client.ts
git commit -m "feat: AI client streaming (http + command)"
```

---

### Task 11: Rust PTY commands

**Files:**
- Modify: `src-tauri/Cargo.toml` (add `portable-pty`)
- Create: `src-tauri/src/pty.rs`
- Modify: `src-tauri/src/lib.rs` (`mod pty;`, manage state, register)

**Interfaces:**
- Produces (Rust): `pty_open(app, id, cmd) -> Result<(), String>` (spawn shell-run via `sh -c cmd`, stream `pty-data` `{ id, data }`), `pty_write(id, data)`, `pty_resize(id, rows, cols)`, `pty_kill(id)`. State: `PtyState(Mutex<HashMap<String, PtyHandle>>)`.

- [ ] **Step 1: Add the dependency** — in `src-tauri/Cargo.toml` `[dependencies]`:

```toml
portable-pty = "0.8"
```

- [ ] **Step 2: Create `src-tauri/src/pty.rs`**

```rust
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use tauri::{Emitter, Manager};

struct PtyHandle {
    writer: Box<dyn Write + Send>,
    master: Box<dyn portable_pty::MasterPty + Send>,
}

#[derive(Default)]
pub struct PtyState(pub Mutex<HashMap<String, PtyHandle>>);

#[derive(Clone, serde::Serialize)]
struct PtyData {
    id: String,
    data: String,
}

#[tauri::command]
pub fn pty_open(app: tauri::AppHandle, id: String, cmd: String) -> Result<(), String> {
    let pty = native_pty_system();
    let pair = pty
        .openpty(PtySize { rows: 24, cols: 80, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())?;

    let mut builder = CommandBuilder::new("sh");
    builder.arg("-c");
    builder.arg(&cmd);
    if let Some(home) = dirs_home() {
        builder.cwd(home);
    }
    let mut child = pair.slave.spawn_command(builder).map_err(|e| e.to_string())?;

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let state = app.state::<PtyState>();
    state.0.lock().unwrap().insert(id.clone(), PtyHandle { writer, master: pair.master });

    let app_handle = app.clone();
    let read_id = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_handle.emit("pty-data", PtyData { id: read_id.clone(), data });
                }
            }
        }
        let _ = child.wait();
        let _ = app_handle.emit("pty-data", PtyData { id: read_id.clone(), data: "\r\n[process exited]\r\n".into() });
    });
    Ok(())
}

fn dirs_home() -> Option<std::path::PathBuf> {
    std::env::var_os("HOME").map(std::path::PathBuf::from)
}

#[tauri::command]
pub fn pty_write(app: tauri::AppHandle, id: String, data: String) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let mut map = state.0.lock().unwrap();
    if let Some(handle) = map.get_mut(&id) {
        handle.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        handle.writer.flush().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn pty_resize(app: tauri::AppHandle, id: String, rows: u16, cols: u16) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let map = state.0.lock().unwrap();
    if let Some(handle) = map.get(&id) {
        handle.master.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 }).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn pty_kill(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<PtyState>();
    state.0.lock().unwrap().remove(&id);
    Ok(())
}
```

- [ ] **Step 3: Wire in `src-tauri/src/lib.rs`** — add `mod pty;`, register state in the builder before `.run`:

```rust
        .manage(pty::PtyState::default())
```

and add to `generate_handler!`:

```rust
            pty::pty_open,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_kill,
```

- [ ] **Step 4: Verify** — `cd src-tauri && cargo check` → Finished (first build downloads `portable-pty`).

- [ ] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/pty.rs src-tauri/src/lib.rs
git commit -m "feat: PTY commands for embedded terminal"
```

---

### Task 12: Terminal view (xterm)

**Files:**
- Modify: `package.json` (add `@xterm/xterm`, `@xterm/addon-fit`)
- Create: `src/ai/terminal.ts`

**Interfaces:**
- Produces: `createTerminalView(host: HTMLElement, run: string): { resize: () => void; destroy: () => void }` — opens a PTY for `run`, wires xterm I/O over `pty-data` / `pty_write`, resizes via `pty_resize`.

- [ ] **Step 1: Install deps**

```bash
npm install @xterm/xterm @xterm/addon-fit
```

- [ ] **Step 2: Implement `src/ai/terminal.ts`**

```ts
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export function createTerminalView(
  host: HTMLElement,
  run: string,
): { resize: () => void; destroy: () => void } {
  const id = `pty-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const term = new Terminal({ fontFamily: "var(--font-mono)", fontSize: 13, theme: { background: "#00000000" } });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(host);
  fit.fit();

  const unlisteners: (() => void)[] = [];
  void listen<{ id: string; data: string }>("pty-data", (e) => {
    if (e.payload.id === id) term.write(e.payload.data);
  }).then((u) => unlisteners.push(u));

  term.onData((data) => void invoke("pty_write", { id, data }));

  void invoke("pty_open", { id, cmd: run }).then(() => {
    const { rows, cols } = term;
    void invoke("pty_resize", { id, rows, cols });
  });

  const resize = (): void => {
    fit.fit();
    void invoke("pty_resize", { id, rows: term.rows, cols: term.cols });
  };

  return {
    resize,
    destroy: () => {
      unlisteners.forEach((u) => u());
      void invoke("pty_kill", { id });
      term.dispose();
    },
  };
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` → no errors. `npm run build` → built.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/ai/terminal.ts
git commit -m "feat: xterm terminal view bound to PTY"
```

---

### Task 13: AI panel UI + ✦ button

**Files:**
- Modify: `index.html` (panel markup + ✦ button)
- Modify: `src/glyphs.ts` (add `ai` glyph)
- Modify: `src/activitybar.ts` (✦ button wiring)
- Create: `src/ai/panel.ts`
- Modify: `src/styles.css` (panel styles)

**Interfaces:**
- Produces: `createAIPanel(host, deps): AIPanel` where `deps = { getProviders: () => AISettings; getDoc: () => { text: string; selection: string }; onApply: (newText: string) => void; onInsert: (text: string) => void }` and `AIPanel = { render: () => void }`. The panel has Chat and Terminal tabs.
- Consumes: `streamChat` (`./client`), `buildMessages` (`./conversation`), `lineDiff` (`./diff`), `createTerminalView` (`./terminal`).

- [ ] **Step 1: Add the ✦ glyph** — in `src/glyphs.ts` `glyphs` object:

```ts
  ai: wrap(`<path d="M8 1.5l1.6 4.3 4.4 1.6-4.4 1.6L8 13.3 6.4 9 2 7.4l4.4-1.6z"/>`),
```

- [ ] **Step 2: Add panel markup + ✦ button to `index.html`.** Add the ✦ button between `ab-search` and `ab-settings`:

```html
          <button
            class="ab-btn ab-ai"
            id="ab-ai"
            title="AI"
            type="button"
            aria-label="Toggle AI panel"
          ></button>
```

Add the panel + its resize handle right after the `<section id="editorarea">…</section>` close (so it sits on the right):

```html
        <div id="ai-resize" class="resize-handle ai-resize" aria-hidden="true"></div>
        <aside id="ai-panel" aria-label="AI">
          <div class="ai-tabs">
            <button class="ai-tab active" data-tab="chat" type="button">Chat</button>
            <button class="ai-tab" data-tab="terminal" type="button">Terminal</button>
          </div>
          <div class="ai-body"></div>
        </aside>
```

- [ ] **Step 3: Implement `src/ai/panel.ts`**

```ts
import { streamChat } from "./client";
import { buildMessages } from "./conversation";
import { lineDiff } from "./diff";
import { createTerminalView } from "./terminal";
import type { AISettings, Provider } from "./aisettings";
import type { ChatMessage } from "./providers";

export type AIPanelDeps = {
  getSettings: () => AISettings;
  getDoc: () => { text: string; selection: string };
  onApply: (newText: string) => void;
  onInsert: (text: string) => void;
};

export type AIPanel = { render: () => void };

export function createAIPanel(panelEl: HTMLElement, deps: AIPanelDeps): AIPanel {
  const body = panelEl.querySelector<HTMLElement>(".ai-body")!;
  const tabs = panelEl.querySelectorAll<HTMLElement>(".ai-tab");
  let tab: "chat" | "terminal" = "chat";
  let terminalView: { resize: () => void; destroy: () => void } | null = null;
  const history: ChatMessage[] = [];
  let editMode = false;

  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      tab = t.dataset.tab as "chat" | "terminal";
      tabs.forEach((x) => x.classList.toggle("active", x === t));
      render();
    }),
  );

  function currentProvider(): Provider | undefined {
    const s = deps.getSettings();
    return s.providers.find((p) => p.id === s.defaultProvider) ?? s.providers[0];
  }

  function renderChat(): void {
    if (terminalView) {
      terminalView.destroy();
      terminalView = null;
    }
    body.innerHTML = `
      <div class="ai-messages"></div>
      <div class="ai-input-row">
        <label class="ai-edit"><input type="checkbox" class="ai-editmode" ${editMode ? "checked" : ""}/> Edit mode</label>
        <textarea class="ai-input" rows="3" placeholder="Ask about this document…"></textarea>
        <button class="ai-send" type="button">Send</button>
      </div>`;
    const messagesEl = body.querySelector<HTMLElement>(".ai-messages")!;
    const input = body.querySelector<HTMLTextAreaElement>(".ai-input")!;
    body.querySelector<HTMLInputElement>(".ai-editmode")!.addEventListener("change", (e) => {
      editMode = (e.target as HTMLInputElement).checked;
    });

    const addBubble = (role: string, text: string): HTMLElement => {
      const el = document.createElement("div");
      el.className = `ai-bubble ai-${role}`;
      el.textContent = text;
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return el;
    };

    const send = async (): Promise<void> => {
      const prompt = input.value.trim();
      const provider = currentProvider();
      if (!prompt) return;
      if (!provider) {
        addBubble("error", "No AI provider configured. Add one in AI Settings.");
        return;
      }
      input.value = "";
      addBubble("user", prompt);
      const doc = deps.getDoc();
      const messages = buildMessages({ history, prompt, docText: doc.text, selection: doc.selection, editMode });
      const replyEl = addBubble("assistant", "");
      let reply = "";
      try {
        await streamChat(provider, messages, (chunk) => {
          reply += chunk;
          replyEl.textContent = reply;
          messagesEl.scrollTop = messagesEl.scrollHeight;
        });
        history.push({ role: "user", content: prompt });
        history.push({ role: "assistant", content: reply });
        addActions(replyEl, reply, editMode, doc);
      } catch (error) {
        addBubble("error", error instanceof Error ? error.message : String(error));
      }
    };

    body.querySelector<HTMLButtonElement>(".ai-send")!.addEventListener("click", () => void send());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void send();
      }
    });
  }

  function addActions(
    afterEl: HTMLElement,
    reply: string,
    wasEdit: boolean,
    doc: { text: string; selection: string },
  ): void {
    const row = document.createElement("div");
    row.className = "ai-actions";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", () => void navigator.clipboard.writeText(reply));
    row.appendChild(copy);

    const insert = document.createElement("button");
    insert.type = "button";
    insert.textContent = "Insert at cursor";
    insert.addEventListener("click", () => deps.onInsert(reply));
    row.appendChild(insert);

    if (wasEdit) {
      const apply = document.createElement("button");
      apply.type = "button";
      apply.textContent = "Apply (diff)";
      apply.addEventListener("click", () => showDiff(row, doc.selection.trim() ? doc.selection : doc.text, reply));
      row.appendChild(apply);
    }
    afterEl.after(row);
  }

  function showDiff(anchor: HTMLElement, oldText: string, newText: string): void {
    const diff = lineDiff(oldText, newText);
    const view = document.createElement("div");
    view.className = "ai-diff";
    for (const line of diff) {
      const ln = document.createElement("div");
      ln.className = `ai-diff-line ${line.type}`;
      ln.textContent = (line.type === "add" ? "+ " : line.type === "del" ? "- " : "  ") + line.text;
      view.appendChild(ln);
    }
    const actions = document.createElement("div");
    actions.className = "ai-actions";
    const accept = document.createElement("button");
    accept.type = "button";
    accept.textContent = "Accept";
    accept.addEventListener("click", () => {
      deps.onApply(newText);
      view.remove();
      actions.remove();
    });
    const reject = document.createElement("button");
    reject.type = "button";
    reject.textContent = "Reject";
    reject.addEventListener("click", () => {
      view.remove();
      actions.remove();
    });
    actions.append(accept, reject);
    anchor.after(view, actions);
  }

  function renderTerminal(): void {
    const s = deps.getSettings();
    const entry = s.terminals.find((t) => t.id === s.defaultTerminal) ?? s.terminals[0];
    body.innerHTML = `<div class="ai-terminal-host"></div>`;
    const tHost = body.querySelector<HTMLElement>(".ai-terminal-host")!;
    if (entry) {
      terminalView = createTerminalView(tHost, entry.run);
    } else {
      tHost.textContent = "No terminal configured. Add one in AI Settings.";
    }
  }

  function render(): void {
    if (tab === "chat") renderChat();
    else renderTerminal();
  }

  render();
  return { render };
}
```

- [ ] **Step 4: Add panel styles to `src/styles.css`** (append)

```css
/* ---------- AI panel ---------- */
#ai-panel {
  width: var(--ai-w, 320px);
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  background: var(--bg-elev);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
body.ai-hidden #ai-panel, body.ai-hidden .ai-resize { display: none; }
.ai-tabs { display: flex; border-bottom: 1px solid var(--border); }
.ai-tab { flex: 1; padding: 8px; background: transparent; border: 0; color: var(--muted); cursor: pointer; }
.ai-tab.active { color: var(--text-strong); box-shadow: inset 0 -2px 0 var(--accent); }
.ai-body { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.ai-messages { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.ai-bubble { padding: 8px 10px; border-radius: 8px; white-space: pre-wrap; font-size: 13px; }
.ai-user { background: var(--selection); align-self: flex-end; }
.ai-assistant { background: var(--code-bg); }
.ai-error { background: rgba(220, 80, 80, 0.15); color: #e88; }
.ai-actions { display: flex; gap: 6px; padding: 0 10px 8px; }
.ai-actions button { font-size: 12px; padding: 3px 8px; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; }
.ai-input-row { border-top: 1px solid var(--border); padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.ai-edit { font-size: 12px; color: var(--muted); }
.ai-input { resize: none; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 6px; font-family: var(--font-ui); }
.ai-send { align-self: flex-end; padding: 5px 14px; background: var(--accent); color: #111; border: 0; border-radius: 6px; cursor: pointer; }
.ai-diff { margin: 0 10px 8px; border: 1px solid var(--border); border-radius: 6px; overflow: auto; font-family: var(--font-mono); font-size: 12px; }
.ai-diff-line { padding: 0 6px; white-space: pre; }
.ai-diff-line.add { background: rgba(120, 200, 120, 0.16); }
.ai-diff-line.del { background: rgba(220, 100, 100, 0.16); }
.ai-terminal-host { flex: 1; min-height: 0; padding: 6px; }
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit` → no errors. `npm run build` → built.

- [ ] **Step 6: Commit**

```bash
git add index.html src/glyphs.ts src/ai/panel.ts src/styles.css
git commit -m "feat: AI panel UI (chat + terminal tabs)"
```

---

### Task 14: Wire AI panel into the app

**Files:**
- Modify: `src/main.ts` (load AI settings content, create panel, ✦ toggle, persist visibility/width, resize)
- Modify: `src/state.ts` (persist `aiVisible`, `aiWidth`)
- Modify: `src/activitybar.ts` (✦ button)

**Interfaces:**
- Consumes: `createAIPanel` (`./ai/panel`), `parseAISettings` (`./ai/aisettings`), `initResize` (existing).

- [ ] **Step 1: Persist AI panel state** — in `src/state.ts`, add to `UIState` and `DEFAULTS`:

```ts
  aiVisible: boolean;
  aiWidth: number;
```
```ts
  aiVisible: false,
  aiWidth: 320,
```

- [ ] **Step 2: Add ✦ button wiring in `src/activitybar.ts`** — accept a 4th callback:

```ts
export function initActivityBar(
  onLayoutChange: () => void = () => {},
  onSearch: () => void = () => {},
  onSettings: (x: number, y: number) => void = () => {},
  onAI: () => void = () => {},
): void {
```

and inside:

```ts
  const aiButton = document.getElementById("ab-ai")!;
  aiButton.innerHTML = glyphs.ai;
  aiButton.addEventListener("click", () => onAI());
```

- [ ] **Step 3: In `src/main.ts`, load AI settings content + build the panel.** Extend `loadAISettingsPath` to also parse content into `currentAISettings`:

```ts
import { parseAISettings, DEFAULT_AI_SETTINGS_JSON, type AISettings } from "./ai/aisettings";
import { createAIPanel, type AIPanel } from "./ai/panel";

let currentAISettings: AISettings = parseAISettings("{}");
let aiPanel: AIPanel | null = null;

async function loadAISettingsPath(): Promise<void> {
  try {
    const file = await getAISettingsFile(DEFAULT_AI_SETTINGS_JSON);
    aiSettingsPath = file.path;
    currentAISettings = parseAISettings(file.contents);
  } catch {
    aiSettingsPath = "";
  }
}
```

- [ ] **Step 4: Create the panel + ✦ toggle.** After `initActivityBar(...)`, build the panel and pass the AI callback:

```ts
const aiPanelEl = document.getElementById("ai-panel")!;

function buildAIPanel(): void {
  aiPanel = createAIPanel(aiPanelEl, {
    getSettings: () => currentAISettings,
    getDoc: () => {
      const v = activeView();
      const t = activeMeta();
      const text = t ? v.editor.getText(t.id) : "";
      const sel = v.editor.getSelection();
      return { text, selection: sel.text };
    },
    onApply: (newText) => {
      const v = activeView();
      const sel = v.editor.getSelection();
      if (sel.text) v.editor.replaceRange(sel.from, sel.to, newText);
      else v.editor.setText(newText);
    },
    onInsert: (text) => {
      const v = activeView();
      const sel = v.editor.getSelection();
      v.editor.replaceRange(sel.from, sel.to, text);
    },
  });
}

function toggleAI(): void {
  const aiVisible = !ui.aiVisible;
  ui = { ...ui, aiVisible };
  document.body.classList.toggle("ai-hidden", !aiVisible);
  document.getElementById("ab-ai")!.classList.toggle("active", aiVisible);
  if (aiVisible && !aiPanel) buildAIPanel();
  saveState(ui);
  requestWindowMeasure();
}
```

Update the `initActivityBar` call to pass `toggleAI`:

```ts
initActivityBar(
  requestWindowMeasure,
  () => palette.open(),
  (x, y) => showContextMenu(x, y, [
    { label: "Editor Settings", action: () => openSettings() },
    { label: "AI Settings", action: () => openAISettings() },
  ]),
  () => toggleAI(),
);
```

- [ ] **Step 5: Apply persisted AI visibility + width at boot.** Near the explorer-state boot block (where `--explorer-w` is set):

```ts
document.documentElement.style.setProperty("--ai-w", `${ui.aiWidth}px`);
document.body.classList.toggle("ai-hidden", !ui.aiVisible);
if (ui.aiVisible) buildAIPanel();
```

- [ ] **Step 6: Re-apply AI settings when ai.json is saved.** In `doSave`, in the settings hook, add an `else if`:

```ts
    } else if (target === aiSettingsPath) {
      currentAISettings = parseAISettings(text);
    }
```

- [ ] **Step 7: Wire the AI resize handle.** After the existing `initResize(...)` for the explorer, add a resize for `#ai-resize` (drag adjusts `--ai-w`; mirror the explorer resize but clamp 240–560 and grow leftward):

```ts
const aiResize = document.getElementById("ai-resize")!;
aiResize.addEventListener("mousedown", (e) => {
  e.preventDefault();
  const startX = e.clientX;
  const startW = ui.aiWidth;
  const onMove = (ev: MouseEvent) => {
    const w = Math.max(240, Math.min(560, startW + (startX - ev.clientX)));
    ui = { ...ui, aiWidth: w };
    document.documentElement.style.setProperty("--ai-w", `${w}px`);
  };
  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    saveState(ui);
    requestWindowMeasure();
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
});
```

- [ ] **Step 8: Verify** — `npx tsc --noEmit` → no errors. `npm run test` → all pass. `npm run build` → built.

- [ ] **Step 9: Commit**

```bash
git add src/main.ts src/state.ts src/activitybar.ts
git commit -m "feat: wire AI panel toggle, persistence, apply/insert"
```

---

## Phase D — Render (mermaid, KaTeX, HTML)

### Task 15: Raw HTML + mermaid block extraction

**Files:**
- Modify: `package.json` (add `mermaid`, `katex`)
- Modify: `src/preview.ts` (enable `html: true`; export helpers)
- Test: `src/__tests__/render.test.ts`

**Interfaces:**
- Produces: `renderMarkdown` (existing) now allows raw HTML.
- Produces: `extractFenced(html: string, lang: string): { id: string; code: string }[]` is not needed — instead `markdownNeedsMermaid(text: string): boolean` and the render flow detects `<code class="language-mermaid">` blocks in the DOM (Task 16). For this task, add a pure helper `findMathSpans(text: string): { display: boolean; tex: string }[]` used by KaTeX.

- [ ] **Step 1: Install deps**

```bash
npm install mermaid katex
```

- [ ] **Step 2: Enable raw HTML in `src/preview.ts`.** Find the `MarkdownIt({...})` construction and set `html: true`. (Keep existing options.)

- [ ] **Step 3: Write the failing test** — `src/__tests__/render.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findMathSpans } from "../preview";

describe("findMathSpans", () => {
  it("finds inline math", () => {
    expect(findMathSpans("a $x^2$ b")).toContainEqual({ display: false, tex: "x^2" });
  });
  it("finds display math", () => {
    expect(findMathSpans("$$\\int x$$")).toContainEqual({ display: true, tex: "\\int x" });
  });
  it("ignores text without math", () => {
    expect(findMathSpans("no math here")).toEqual([]);
  });
});
```

- [ ] **Step 4: Run it to verify it fails** — `npm run test -- render` → FAIL.

- [ ] **Step 5: Add `findMathSpans` to `src/preview.ts`** (export it)

```ts
export function findMathSpans(text: string): { display: boolean; tex: string }[] {
  const out: { display: boolean; tex: string }[] = [];
  const display = /\$\$([\s\S]+?)\$\$/g;
  let m: RegExpExecArray | null;
  let stripped = text;
  while ((m = display.exec(text))) out.push({ display: true, tex: m[1].trim() });
  stripped = text.replace(display, "");
  const inline = /\$([^$\n]+?)\$/g;
  while ((m = inline.exec(stripped))) out.push({ display: false, tex: m[1].trim() });
  return out;
}
```

- [ ] **Step 6: Run tests** — `npm run test -- render` → PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/preview.ts src/__tests__/render.test.ts
git commit -m "feat: raw HTML in preview + math span detection"
```

---

### Task 16: Render mermaid + KaTeX in the preview

**Files:**
- Create: `src/render-extras.ts`
- Modify: `src/windowview.ts` (call extras after `renderPreview`)
- Modify: `src/preview.ts` (KaTeX rule for math, mermaid fenced passthrough)

**Interfaces:**
- Produces: `enhancePreview(container: HTMLElement): void` — finds `code.language-mermaid` blocks and renders them to SVG via mermaid; finds `[data-math]` placeholders and renders via KaTeX.

- [ ] **Step 1: Add a KaTeX inline/display rule + mermaid passthrough in `src/preview.ts`.** Register a markdown-it rule that replaces `$...$`/`$$...$$` with a placeholder span the extras step renders:

```ts
import katex from "katex";
import "katex/dist/katex.min.css";

// After creating the MarkdownIt instance `md`, add a simple inline math renderer:
md.inline.ruler.after("escape", "math", (state, silent) => {
  const src = state.src.slice(state.pos);
  const display = src.startsWith("$$");
  const fence = display ? "$$" : "$";
  if (!src.startsWith(fence)) return false;
  const end = src.indexOf(fence, fence.length);
  if (end < 0) return false;
  const tex = src.slice(fence.length, end);
  if (!silent) {
    const token = state.push("math", "", 0);
    token.content = tex;
    token.meta = { display };
  }
  state.pos += end + fence.length;
  return true;
});
md.renderer.rules.math = (tokens, idx) => {
  const t = tokens[idx];
  try {
    return katex.renderToString(t.content, { displayMode: !!t.meta?.display, throwOnError: false });
  } catch {
    return `<code>${t.content}</code>`;
  }
};
```

(Mermaid fenced blocks render as `<pre><code class="language-mermaid">…</code></pre>` from the existing highlight path; the extras step converts them.)

- [ ] **Step 2: Implement `src/render-extras.ts`**

```ts
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });

let counter = 0;

export function enhancePreview(container: HTMLElement): void {
  const blocks = container.querySelectorAll<HTMLElement>("code.language-mermaid");
  blocks.forEach((block) => {
    const code = block.textContent ?? "";
    const host = document.createElement("div");
    host.className = "mermaid-rendered";
    const pre = block.closest("pre");
    (pre ?? block).replaceWith(host);
    const id = `mmd-${counter++}`;
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        host.innerHTML = svg;
      })
      .catch((error) => {
        host.innerHTML = `<pre class="mermaid-error">${String(error)}</pre>`;
      });
  });
}
```

- [ ] **Step 3: Call extras after each preview render** — in `src/windowview.ts` `renderPreview`, after setting `previewPane.innerHTML`:

```ts
    enhancePreview(previewPane);
```

and import at the top: `import { enhancePreview } from "./render-extras";`

- [ ] **Step 4: Verify** — `npx tsc --noEmit` → no errors. `npm run test` → pass. `npm run build` → built.

- [ ] **Step 5: Commit**

```bash
git add src/render-extras.ts src/windowview.ts src/preview.ts
git commit -m "feat: render mermaid diagrams + KaTeX math in preview"
```

---

## Phase E — PDF reader

### Task 17: Open PDFs with pdf.js

**Files:**
- Modify: `package.json` (add `pdfjs-dist`)
- Create: `src/pdfview.ts`
- Modify: `src/main.ts` (route `.pdf` to the viewer)

**Interfaces:**
- Produces: `renderPdf(host: HTMLElement, path: string): Promise<void>` — reads the PDF bytes (Rust `read_file_bytes` or fetch via `convertFileSrc`) and renders pages to canvases.

- [ ] **Step 1: Install dep**

```bash
npm install pdfjs-dist
```

- [ ] **Step 2: Implement `src/pdfview.ts`** (use Tauri asset URL + pdf.js worker)

```ts
import { convertFileSrc } from "@tauri-apps/api/core";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function renderPdf(host: HTMLElement, path: string): Promise<void> {
  host.innerHTML = "";
  const url = convertFileSrc(path);
  const doc = await pdfjs.getDocument(url).promise;
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1.4 });
    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
  }
}
```

- [ ] **Step 3: Route `.pdf` opens in `src/main.ts`.** In `doOpenPath`, branch before reading as text:

```ts
async function doOpenPath(path: string): Promise<void> {
  if (path.toLowerCase().endsWith(".pdf")) {
    openPdf(path);
    return;
  }
  try {
    const contents = await invoke<string>("read_file", { path });
    openInWindow("main", { path, name: basename(path), text: contents });
  } catch (error) {
    await showOpenError(error);
  }
}

function openPdf(path: string): void {
  const v = activeView();
  const pane = document.querySelector<HTMLElement>(`.window[data-window-id="${getState().activeWindowId}"] .pane-preview`);
  setMode(getState().activeWindowId, "preview");
  if (pane) void renderPdf(pane, path);
  void v;
}
```

Add the import: `import { renderPdf } from "./pdfview";`

(Note: this renders the PDF into the active window's preview pane in Read mode. A dedicated PDF tab kind is a later refinement; this keeps the change small and working.)

- [ ] **Step 4: Add minimal PDF styles to `src/styles.css`**

```css
.pdf-page { display: block; margin: 0 auto 12px; max-width: 100%; box-shadow: 0 1px 6px rgba(0,0,0,0.3); }
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit` → no errors. `npm run build` → built.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/pdfview.ts src/main.ts src/styles.css
git commit -m "feat: open PDF files with pdf.js"
```

---

## Phase F — Export

### Task 18: Rust export via pandoc/typst

**Files:**
- Create: `src-tauri/src/export.rs`
- Modify: `src-tauri/src/lib.rs` (`mod export;` + register)

**Interfaces:**
- Produces (Rust, behavior referenced from Kaelio — reimplemented fresh):
  - `find_pandoc() -> Option<PathBuf>`, `find_typst() -> Option<PathBuf>` (Homebrew paths then PATH).
  - `export_pdf(markdown: String, out: String) -> Result<(), String>` (pandoc `--pdf-engine=typst`).
  - `export_docx(markdown: String, out: String) -> Result<(), String>`.
  - `export_html(markdown: String, out: String) -> Result<(), String>` (pandoc standalone).

- [ ] **Step 1: Create `src-tauri/src/export.rs`**

```rust
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

const PANDOC_MISSING: &str = "Pandoc is required for export. Install it with: brew install pandoc";
const TYPST_MISSING: &str = "Typst is required for PDF export. Install it with: brew install typst";
const MD_FORMAT: &str = "markdown+task_lists+pipe_tables+grid_tables+multiline_tables+simple_tables+strikeout+footnotes";

fn find_bin(name: &str, brew: &[&str]) -> Option<PathBuf> {
    for candidate in brew {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return Some(path);
        }
    }
    // Fall back to PATH resolution by trying to run `name --version`.
    if Command::new(name).arg("--version").stdout(Stdio::null()).stderr(Stdio::null()).status().is_ok() {
        return Some(PathBuf::from(name));
    }
    None
}

fn find_pandoc() -> Option<PathBuf> {
    find_bin("pandoc", &["/opt/homebrew/bin/pandoc", "/usr/local/bin/pandoc"])
}

fn find_typst() -> Option<PathBuf> {
    find_bin("typst", &["/opt/homebrew/bin/typst", "/usr/local/bin/typst"])
}

fn run_pandoc(pandoc: &PathBuf, markdown: &str, args: &[String]) -> Result<(), String> {
    let mut child = Command::new(pandoc)
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    child.stdin.take().ok_or("no stdin")?.write_all(markdown.as_bytes()).map_err(|e| e.to_string())?;
    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }
    Ok(())
}

#[tauri::command]
pub fn export_pdf(markdown: String, out: String) -> Result<(), String> {
    let pandoc = find_pandoc().ok_or(PANDOC_MISSING)?;
    let typst = find_typst().ok_or(TYPST_MISSING)?;
    let args = vec![
        "--from".into(), MD_FORMAT.into(),
        "--pdf-engine".into(), typst.to_string_lossy().into_owned(),
        "-o".into(), out,
    ];
    run_pandoc(&pandoc, &markdown, &args)
}

#[tauri::command]
pub fn export_docx(markdown: String, out: String) -> Result<(), String> {
    let pandoc = find_pandoc().ok_or(PANDOC_MISSING)?;
    let args = vec!["--from".into(), MD_FORMAT.into(), "-o".into(), out];
    run_pandoc(&pandoc, &markdown, &args)
}

#[tauri::command]
pub fn export_html(markdown: String, out: String) -> Result<(), String> {
    let pandoc = find_pandoc().ok_or(PANDOC_MISSING)?;
    let args = vec!["--from".into(), MD_FORMAT.into(), "--standalone".into(), "-o".into(), out];
    run_pandoc(&pandoc, &markdown, &args)
}
```

- [ ] **Step 2: Register** — in `src-tauri/src/lib.rs`, add `mod export;` and to `generate_handler!`:

```rust
            export::export_pdf,
            export::export_docx,
            export::export_html,
```

- [ ] **Step 3: Verify** — `cd src-tauri && cargo check` → Finished, no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/export.rs src-tauri/src/lib.rs
git commit -m "feat: export PDF/DOCX/HTML via pandoc + typst"
```

---

### Task 19: Export menu + image export

**Files:**
- Modify: `src-tauri/src/menu.rs` (File ▸ Export submenu)
- Modify: `src/main.ts` (handle export menu events; PNG/JPG canvas capture)
- Modify: `src/filesys.ts` (export wrappers)

**Interfaces:**
- Consumes (TS): `invoke("export_pdf"|"export_docx"|"export_html", { markdown, out })`; `save` dialog for the output path.
- Produces: PNG/JPG via capturing the active preview pane to a canvas.

- [ ] **Step 1: Add the Export submenu in `src-tauri/src/menu.rs`.** In the File menu builder, add a submenu with items emitting ids `export.pdf`, `export.docx`, `export.html`, `export.png`, `export.jpg`. (Follow the existing `MenuItemBuilder`/`SubmenuBuilder` pattern already used for File.)

```rust
    let export = SubmenuBuilder::new(app, "Export")
        .items(&[
            &MenuItemBuilder::with_id("export.pdf", "PDF…").build(app)?,
            &MenuItemBuilder::with_id("export.docx", "Word (DOCX)…").build(app)?,
            &MenuItemBuilder::with_id("export.html", "HTML…").build(app)?,
            &MenuItemBuilder::with_id("export.png", "Image (PNG)…").build(app)?,
            &MenuItemBuilder::with_id("export.jpg", "Image (JPG)…").build(app)?,
        ])
        .build()?;
```

Add `&export` to the File submenu's items list.

- [ ] **Step 2: Add a save-dialog helper for exports in `src/files.ts`** (reuse `@tauri-apps/plugin-dialog` `save`):

```ts
import { save } from "@tauri-apps/plugin-dialog";

export function pickExportPath(ext: string): Promise<string | null> {
  return save({ filters: [{ name: ext.toUpperCase(), extensions: [ext] }] }).then((p) => p ?? null);
}
```

- [ ] **Step 3: Handle the export menu events in `src/main.ts`.** Add cases to the `listen<string>("menu", ...)` switch:

```ts
    case "export.pdf":
      return void exportDoc("pdf");
    case "export.docx":
      return void exportDoc("docx");
    case "export.html":
      return void exportDoc("html");
    case "export.png":
      return void exportImage("png");
    case "export.jpg":
      return void exportImage("jpg");
```

- [ ] **Step 4: Implement `exportDoc` + `exportImage` in `src/main.ts`**

```ts
import { pickExportPath } from "./files";

async function exportDoc(kind: "pdf" | "docx" | "html"): Promise<void> {
  const t = activeMeta();
  if (!t) return;
  const markdown = activeView().editor.getText(t.id);
  const out = await pickExportPath(kind);
  if (!out) return;
  const command = kind === "pdf" ? "export_pdf" : kind === "docx" ? "export_docx" : "export_html";
  try {
    await invoke(command, { markdown, out });
  } catch (error) {
    await message(error instanceof Error ? error.message : String(error), { title: "Export", kind: "error" });
  }
}

async function exportImage(kind: "png" | "jpg"): Promise<void> {
  const pane = document.querySelector<HTMLElement>(
    `.window[data-window-id="${getState().activeWindowId}"] .pane-preview .doc`,
  );
  if (!pane) return;
  const out = await pickExportPath(kind);
  if (!out) return;
  try {
    const { toCanvas } = await import("./capture");
    const canvas = await toCanvas(pane);
    const mime = kind === "png" ? "image/png" : "image/jpeg";
    const dataUrl = canvas.toDataURL(mime, 0.95);
    const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
    await invoke("save_bytes", { path: out, bytes: Array.from(bytes) });
  } catch (error) {
    await message(error instanceof Error ? error.message : String(error), { title: "Export image", kind: "error" });
  }
}
```

- [ ] **Step 5: Add a tiny `src/capture.ts`** that rasterizes a DOM node via SVG `foreignObject` (no new dependency):

```ts
export async function toCanvas(node: HTMLElement): Promise<HTMLCanvasElement> {
  const rect = node.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(node.scrollHeight);
  const clone = node.cloneNode(true) as HTMLElement;
  const html = new XMLSerializer().serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="background:#fff;color:#111;padding:16px;width:${width}px">${html}</div>` +
    `</foreignObject></svg>`;
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not rasterize preview"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0);
  return canvas;
}
```

- [ ] **Step 6: Add a `save_bytes` Rust command** — in `src-tauri/src/files.rs`:

```rust
#[tauri::command]
pub fn save_bytes(path: String, bytes: Vec<u8>) -> Result<(), String> {
    fs::write(&path, bytes).map_err(|e| e.to_string())
}
```

Register `files::save_bytes,` in `lib.rs`.

- [ ] **Step 7: Add export wrappers note** — exports are called via `invoke` directly (no filesys wrapper needed). Verify: `cd src-tauri && cargo check`; `npx tsc --noEmit`; `npm run build`.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/menu.rs src-tauri/src/files.rs src-tauri/src/lib.rs src/main.ts src/files.ts src/capture.ts
git commit -m "feat: export menu (PDF/DOCX/HTML) + image export (PNG/JPG)"
```

---

## Phase G — Docs + smoke

### Task 20: Prerequisites, docs, smoke

**Files:**
- Modify: `CLAUDE.md` (new files, ai.json, pandoc/typst prerequisite)
- Create: `docs/superpowers/plans/2026-06-19-ai-render-export-smoke.md`

- [ ] **Step 1: Manual smoke (`npm run tauri dev`)** — record pass/fail:
  1. Gear → menu → Editor Settings opens `settings.json`; AI Settings opens `ai.json`.
  2. Explorer activity-bar icon shows the sidebar glyph.
  3. ✦ toggles the AI panel; width persists across relaunch.
  4. Chat with a local provider (Ollama/LM Studio running) streams a reply; Copy + Insert at cursor work.
  5. Edit mode → Apply shows a diff; Accept replaces the doc; Reject discards.
  6. Terminal tab runs the configured agent CLI interactively.
  7. Preview renders a ```mermaid block, `$x^2$` math, and a raw `<div>`.
  8. Open a `.pdf` from the explorer → pages render.
  9. Export the doc to PDF, DOCX, HTML (with pandoc/typst installed); PNG/JPG of the preview.

- [ ] **Step 2: Update `CLAUDE.md`** — add the new `src/ai/*`, `src/render-extras.ts`, `src/pdfview.ts`, `src/capture.ts` files and `src-tauri/src/{ai,pty,export}.rs` to the Architecture map; note `ai.json` lives in the app config dir; note **PDF/DOCX/HTML export requires `brew install pandoc typst`**; note new deps (mermaid, katex, pdfjs-dist, @xterm/*, portable-pty).

- [ ] **Step 3: Record the smoke run** in `docs/superpowers/plans/2026-06-19-ai-render-export-smoke.md`.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/superpowers/plans/2026-06-19-ai-render-export-smoke.md
git commit -m "docs: Phases 6-7 architecture + smoke run"
```

---

## Self-Review

**Spec coverage:**
- Gear menu → Editor/AI settings → Tasks 1, 3. ✓
- `ai.json` configurable providers (http/command/terminal) → Tasks 1, 2. ✓
- Explorer icon → Task 4. ✓
- AI chat (context, streaming, copy/insert/apply-diff) → Tasks 5–10, 13, 14. ✓
- Embedded terminal (PTY + xterm) → Tasks 11, 12, 13. ✓
- mermaid + KaTeX + raw HTML → Tasks 15, 16. ✓
- PDF reader → Task 17. ✓
- Export PDF/DOCX/HTML (pandoc/typst) + PNG/JPG → Tasks 18, 19. ✓
- Tests: aisettings, providers, conversation, diff, render → Tasks 2, 6, 7, 8, 15. ✓

**Placeholder scan:** Code steps contain full code; no TBD/TODO. The PDF tab is intentionally simplified (renders into the preview pane) and flagged as such. ✓

**Type consistency:** `AISettings`/`Provider`/`parseAISettings` (Task 2) consumed in Tasks 10, 13, 14; `ChatMessage` (Task 6) in Tasks 7, 10; `streamChat` (Task 10) in 13; `lineDiff`/`DiffLine` (Task 8) in 13; `createAIPanel` deps (`getSettings/getDoc/onApply/onInsert`) defined in 13 and supplied in 14; editor `getSelection/replaceRange/setText` (Task 5) used in 14; `enhancePreview` (16) called in 16; `renderPdf` (17) in 17; export commands (18) invoked in 19; `save_bytes` (19). Activity-bar signature grows to 4 callbacks across Tasks 3, 14 — final signature `(onLayoutChange, onSearch, onSettings(x,y), onAI)`. ✓

**Known follow-ups (not blockers):** per-hunk diff; a dedicated PDF tab kind; KaTeX `$`-escaping edge cases; capture.ts external images may not inline.
```
