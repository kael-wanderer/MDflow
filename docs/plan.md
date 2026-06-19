# MDflow Milestone 1 (Lean Core) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a genuinely usable markdown editor — open/save files, edit in CodeMirror 6, see live markdown-it preview, switch view modes — in a fresh MIT-licensed Tauri 2 app.

**Architecture:** Tauri 2 (Rust backend, IPC-first) + Vite/TypeScript frontend. Modular frontend: one file per responsibility (editor, preview, views, files, state) wired by a thin `main.ts`. Backend file ops live in `src-tauri/src/files.rs`, registered by `lib.rs`. The Tauri updater plugin is installed and registered but dormant (no update check runs) — M2 activates it.

**Tech Stack:** Tauri 2, Vite, TypeScript, CodeMirror 6 (`@codemirror/*`, `@codemirror/lang-markdown`), markdown-it, highlight.js, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-updater`.

## Global Constraints

- **License:** MIT. A root `LICENSE` (MIT) and `THIRD-PARTY-NOTICES` must exist. No GPL.
- **Clean-room:** never copy code or CSS from Kaelio (`/Users/cong.bui/Kael/20-Projects/kaelio`). Read it only as a behavior reference. No "mx" / "Vibery" / "Kaelio" strings anywhere.
- **Identifier:** `com.kael.mdflow`. **Product name:** `MDflow`.
- **Modular:** small files, one responsibility each. No monolithic `main.ts`.
- **Verification:** manual smoke tests per task (this is a desktop UI MVP, Vitest deferred per spec). Rust pure logic uses built-in `cargo test`.
- **Hotkeys in M1:** `Cmd+O` open, `Cmd+S` save, `Cmd+P` toggle preview/split, `Cmd+E` read mode. **`Cmd+B` is deferred to M3** (no sidebar exists in M1 — binding it now would be a no-op).
- **Commit** after each task with a `feat:`/`chore:`/`docs:` message + the Co-Authored-By trailer.

---

## File Structure

```
mdflow/
  index.html                 # app shell markup
  package.json               # deps + scripts
  vite.config.ts             # vite + tauri dev server (:1420)
  tsconfig.json
  LICENSE                    # MIT
  THIRD-PARTY-NOTICES        # bundled-library notices
  README.md
  src/
    main.ts                  # thin bootstrap + wiring only
    editor.ts                # CodeMirror 6 setup
    preview.ts               # markdown-it render pipeline
    views.ts                 # split/editor/preview mode switching
    files.ts                 # open/save via Tauri IPC
    state.ts                 # persisted prefs (view mode, zoom)
    styles.css               # refined dark theme (CSS variables)
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/
      main.rs                # entry (generated)
      lib.rs                 # register commands + plugins
      files.rs               # read_file, save_file, get_initial_file, word_count
```

---

### Task 1: Scaffold the Tauri 2 + Vite + TS project with MDflow branding & MIT license

**Files:**
- Create (via scaffold): `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/styles.css`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/{main.rs,lib.rs}`, icons, capabilities
- Create: `LICENSE`, `.gitignore` (scaffold provides one — verify)
- Preserve existing: `.git/`, `docs/`, `CLAUDE.md`

**Interfaces:**
- Produces: a runnable Tauri app shell (`npm run tauri dev` opens a window). No custom commands yet.

- [ ] **Step 1: Scaffold into a temp dir and merge in (preserves docs/ and git history)**

```bash
cd /Users/cong.bui/Kael/20-Projects
npm create tauri-app@latest mdflow-scaffold -- --template vanilla-ts --manager npm --yes
# merge generated files into the existing mdflow repo, keep our docs/CLAUDE.md/git
rsync -a --exclude '.git' --exclude 'README.md' --exclude 'docs' --exclude 'CLAUDE.md' mdflow-scaffold/ mdflow/
rm -rf mdflow-scaffold
```

- [ ] **Step 2: Set MDflow branding**

In `src-tauri/tauri.conf.json` set:
```json
{
  "productName": "MDflow",
  "identifier": "com.kael.mdflow",
  "app": {
    "windows": [{ "title": "MDflow", "width": 1100, "height": 760 }]
  }
}
```
In `package.json` set `"name": "mdflow"`. In `index.html` set `<title>MDflow</title>`.

- [ ] **Step 3: Add MIT LICENSE**

Create `LICENSE` with the standard MIT text, `Copyright (c) 2026 kael-wanderer`.

- [ ] **Step 4: Install deps and run**

```bash
cd /Users/cong.bui/Kael/20-Projects/mdflow
npm install
npm run tauri dev
```
Expected: a desktop window titled **MDflow** opens showing the default Tauri vanilla-ts page. Close it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri 2 + Vite + TS app (MDflow, MIT)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Static UI shell (HTML + CSS only) — ⛔ USER APPROVAL GATE

> Build the *look* with no logic. This is where the UI/UX skills are used. **Stop and get the user's visual approval before Task 3.**

**Files:**
- Modify: `index.html` (replace scaffold body with the app shell)
- Rewrite: `src/styles.css` (fresh refined dark theme — written from scratch, never copied from Kaelio)
- Modify: `src/main.ts` (strip scaffold demo logic to a no-op for now)

**Interfaces:**
- Produces: DOM elements with stable IDs that later tasks attach to:
  `#topbar`, `#filename`, `#mode-split`, `#mode-editor`, `#mode-preview`, `#editor-pane`, `#preview-pane`, `#statusbar`, `#wordcount`. App container `#app` carries a `data-view` attribute (`split` | `editor` | `preview`).

- [ ] **Step 1: Invoke the UI skills for visual direction**

Use `taste-skills`, `impeccable`, `ui-ux-pro-max`, `frontend-design` to choose the palette, typography, spacing, and chrome for a "refined / cleaner" dark editor. Produce the CSS variables and component styling. (Do NOT reference or open Kaelio's CSS.)

- [ ] **Step 2: Write the shell markup**

`index.html` body:
```html
<div id="app" data-view="split">
  <header id="topbar">
    <span id="filename">Untitled</span>
    <nav class="modes">
      <button id="mode-split"   title="Split (Cmd+P)">Split</button>
      <button id="mode-editor"  title="Editor">Editor</button>
      <button id="mode-preview" title="Preview (Cmd+E)">Preview</button>
    </nav>
  </header>
  <main id="panes">
    <section id="editor-pane"></section>
    <section id="preview-pane" class="markdown-body"></section>
  </main>
  <footer id="statusbar"><span id="wordcount">0 words</span></footer>
</div>
<script type="module" src="/src/main.ts"></script>
```

- [ ] **Step 3: Write the refined theme CSS**

`src/styles.css`: define CSS variables (`--bg`, `--bg-elev`, `--fg`, `--muted`, `--accent`, `--border`), a grid layout (topbar / panes / statusbar rows), and `#panes` as a 2-column fl/grid split. Drive layout from `#app[data-view]`:
```css
#app[data-view="editor"]  #preview-pane { display: none; }
#app[data-view="preview"] #editor-pane  { display: none; }
```
Style `.markdown-body` for readable preview (headings, code blocks, blockquotes, tables, lists). Fill exact values from Step 1.

- [ ] **Step 4: Neutralize scaffold logic**

Replace `src/main.ts` contents with `// MDflow bootstrap — wiring added in later tasks`.

- [ ] **Step 5: Run and visually verify**

```bash
npm run tauri dev
```
Expected: MDflow window shows topbar (filename + 3 mode buttons), an empty editor pane beside an empty preview pane, and a status bar. Clicking buttons does nothing yet — that's fine.

- [ ] **Step 6: ⛔ STOP — get user approval of the visual shell, then commit**

```bash
git add -A
git commit -m "feat: static UI shell + refined dark theme

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Backend file commands (`files.rs`)

**Files:**
- Create: `src-tauri/src/files.rs`
- Modify: `src-tauri/src/lib.rs` (declare module + register commands)

**Interfaces:**
- Produces (Tauri commands, called from frontend via `invoke`):
  - `read_file(path: String) -> Result<String, String>` — file contents as UTF-8
  - `save_file(path: String, content: String) -> Result<(), String>`
  - `get_initial_file() -> Option<String>` — path passed via CLI/file-association at launch, else `None`
  - `word_count(text: String) -> usize` — whitespace-separated word count

- [ ] **Step 1: Write the `word_count` failing test**

Create `src-tauri/src/files.rs`:
```rust
pub fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

#[cfg(test)]
mod tests {
    use super::count_words;
    #[test]
    fn counts_words() {
        assert_eq!(count_words("hello world"), 2);
        assert_eq!(count_words("  spaced   out \n words "), 3);
        assert_eq!(count_words(""), 0);
    }
}
```

- [ ] **Step 2: Run the test to verify it passes**

```bash
cd src-tauri && cargo test count_words
```
Expected: `test files::tests::counts_words ... ok`.

- [ ] **Step 3: Add the Tauri commands**

Append to `src-tauri/src/files.rs`:
```rust
use std::fs;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_initial_file() -> Option<String> {
    std::env::args().skip(1).find(|a| !a.starts_with('-')).filter(|p| std::path::Path::new(p).is_file())
}

#[tauri::command]
pub fn word_count(text: String) -> usize {
    count_words(&text)
}
```

- [ ] **Step 4: Register module + commands in `lib.rs`**

In `src-tauri/src/lib.rs`, add `mod files;` and register:
```rust
.invoke_handler(tauri::generate_handler![
    files::read_file,
    files::save_file,
    files::get_initial_file,
    files::word_count,
])
```
(Keep any scaffold-generated command in the list too, or remove it if unused.)

- [ ] **Step 5: Verify it compiles and runs**

```bash
npm run tauri dev
```
In the app's devtools console:
```js
const { invoke } = window.__TAURI__.core;
await invoke('word_count', { text: 'one two three' }); // 3
```
Expected: returns `3`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: backend file commands (read/save/initial/word_count)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: CodeMirror 6 editor (`editor.ts`)

**Files:**
- Create: `src/editor.ts`
- Modify: `src/main.ts` (mount editor into `#editor-pane`)
- Modify: `package.json` (deps)

**Interfaces:**
- Consumes: `#editor-pane` element from Task 2.
- Produces:
  - `createEditor(parent: HTMLElement, onChange: (doc: string) => void): EditorHandle`
  - `type EditorHandle = { getDoc(): string; setDoc(text: string): void; focus(): void }`

- [ ] **Step 1: Install editor deps**

```bash
npm install @codemirror/state @codemirror/view @codemirror/commands @codemirror/language @codemirror/lang-markdown @codemirror/theme-one-dark
```

- [ ] **Step 2: Write `editor.ts`**

```ts
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";

export type EditorHandle = { getDoc(): string; setDoc(text: string): void; focus(): void };

export function createEditor(parent: HTMLElement, onChange: (doc: string) => void): EditorHandle {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        oneDark,
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()); }),
      ],
    }),
  });
  return {
    getDoc: () => view.state.doc.toString(),
    setDoc: (text) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
    focus: () => view.focus(),
  };
}
```

- [ ] **Step 3: Mount it in `main.ts`**

```ts
import "./styles.css";
import { createEditor } from "./editor";

const editorPane = document.getElementById("editor-pane")!;
const editor = createEditor(editorPane, (_doc) => { /* preview wired in Task 5 */ });
editor.focus();
```

- [ ] **Step 4: Run and verify**

```bash
npm run tauri dev
```
Expected: clicking the editor pane and typing shows text with line numbers, markdown syntax coloring, and soft wrap. Cmd+Z undoes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: CodeMirror 6 editor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: markdown-it preview pipeline (`preview.ts`) + live debounce

**Files:**
- Create: `src/preview.ts`
- Modify: `src/main.ts` (debounced render + word count)
- Modify: `package.json` (deps)

**Interfaces:**
- Consumes: `#preview-pane`, `#wordcount`, the editor's `onChange` from Task 4.
- Produces:
  - `renderMarkdown(src: string): string` — sanitized HTML string
  - `mountPreview(el: HTMLElement): (src: string) => void` — returns an update fn

- [ ] **Step 1: Install preview deps**

```bash
npm install markdown-it highlight.js
npm install -D @types/markdown-it
```

- [ ] **Step 2: Write `preview.ts`**

```ts
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

const md = new MarkdownIt({
  html: false,          // clean-room + safety: no raw HTML passthrough
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try { return hljs.highlight(code, { language: lang }).value; } catch { /* fall through */ }
    }
    return "";
  },
});

export function renderMarkdown(src: string): string {
  return md.render(src);
}

export function mountPreview(el: HTMLElement): (src: string) => void {
  return (src: string) => { el.innerHTML = renderMarkdown(src); };
}
```

- [ ] **Step 3: Wire debounced render + word count in `main.ts`**

```ts
import { mountPreview } from "./preview";
import { invoke } from "@tauri-apps/api/core";

const previewPane = document.getElementById("preview-pane")!;
const wordcountEl = document.getElementById("wordcount")!;
const updatePreview = mountPreview(previewPane);

let t: number | undefined;
function onDocChange(doc: string) {
  if (t) clearTimeout(t);
  t = window.setTimeout(async () => {
    updatePreview(doc);
    const n = await invoke<number>("word_count", { text: doc });
    wordcountEl.textContent = `${n} words`;
  }, 300);
}
```
Replace the Task 4 `createEditor` callback with `onDocChange`.

- [ ] **Step 4: Add highlight.js theme CSS**

Import a dark hljs theme in `main.ts`: `import "highlight.js/styles/github-dark.css";`

- [ ] **Step 5: Run and verify**

```bash
npm run tauri dev
```
Type `# Hi` then a fenced ```js code block. Expected: preview shows a heading and syntax-highlighted code ~300ms after typing stops; status bar word count updates.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: markdown-it live preview + word count

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: View modes (`views.ts`)

**Files:**
- Create: `src/views.ts`
- Modify: `src/main.ts` (wire buttons + hotkeys)

**Interfaces:**
- Consumes: `#app`, `#mode-split`/`#mode-editor`/`#mode-preview`, `state.ts` (Task 7 persists the mode — until then default `split`).
- Produces:
  - `type ViewMode = "split" | "editor" | "preview"`
  - `setupViews(onModeChange?: (m: ViewMode) => void): { setMode(m: ViewMode): void; getMode(): ViewMode }`

- [ ] **Step 1: Write `views.ts`**

```ts
export type ViewMode = "split" | "editor" | "preview";

export function setupViews(onModeChange?: (m: ViewMode) => void) {
  const app = document.getElementById("app")!;
  const buttons: Record<ViewMode, HTMLElement> = {
    split: document.getElementById("mode-split")!,
    editor: document.getElementById("mode-editor")!,
    preview: document.getElementById("mode-preview")!,
  };
  function setMode(m: ViewMode) {
    app.setAttribute("data-view", m);
    (Object.keys(buttons) as ViewMode[]).forEach((k) => buttons[k].classList.toggle("active", k === m));
    onModeChange?.(m);
  }
  (Object.keys(buttons) as ViewMode[]).forEach((m) => buttons[m].addEventListener("click", () => setMode(m)));
  const getMode = () => (app.getAttribute("data-view") as ViewMode) ?? "split";
  return { setMode, getMode };
}
```

- [ ] **Step 2: Wire hotkeys in `main.ts`**

```ts
import { setupViews } from "./views";
const views = setupViews();

window.addEventListener("keydown", (e) => {
  if (!(e.metaKey || e.ctrlKey)) return;
  if (e.key === "p") { e.preventDefault(); views.setMode(views.getMode() === "split" ? "editor" : "split"); }
  if (e.key === "e") { e.preventDefault(); views.setMode(views.getMode() === "preview" ? "split" : "preview"); }
});
```

- [ ] **Step 3: Add `.active` button style**

In `styles.css`: `.modes button.active { color: var(--accent); }`

- [ ] **Step 4: Run and verify**

```bash
npm run tauri dev
```
Expected: clicking Editor hides preview; Preview hides editor; Split shows both. `Cmd+P` toggles split↔editor; `Cmd+E` toggles preview↔split. Active button is accented.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: split/editor/preview view modes + hotkeys

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: File open/save wiring (`files.ts`) + persisted state (`state.ts`)

**Files:**
- Create: `src/files.ts`, `src/state.ts`
- Modify: `src/main.ts` (wire Cmd+O/Cmd+S, initial file, restore view mode), `src-tauri/tauri.conf.json` (dialog plugin permissions)
- Modify: `package.json` (dialog plugin)

**Interfaces:**
- Consumes: `read_file`/`save_file`/`get_initial_file` (Task 3), `EditorHandle` (Task 4), `views` (Task 6).
- Produces:
  - `openFile(editor: EditorHandle): Promise<string | null>` — returns opened path or null
  - `saveFile(editor: EditorHandle, currentPath: string | null): Promise<string | null>` — returns saved path
  - `loadPath(editor: EditorHandle, path: string): Promise<void>`
  - state: `loadMode(): ViewMode`, `saveMode(m: ViewMode): void`

- [ ] **Step 1: Install dialog plugin**

```bash
npm install @tauri-apps/plugin-dialog
```
Add to `src-tauri/Cargo.toml` dependencies: `tauri-plugin-dialog = "2"`, and register in `lib.rs`: `.plugin(tauri_plugin_dialog::init())`. Add dialog permissions to `src-tauri/capabilities/default.json` (`"dialog:default"`).

- [ ] **Step 2: Write `state.ts`**

```ts
import type { ViewMode } from "./views";
const KEY = "mdflow-view-mode";
export function loadMode(): ViewMode {
  const v = localStorage.getItem(KEY);
  return v === "editor" || v === "preview" ? v : "split";
}
export function saveMode(m: ViewMode): void { localStorage.setItem(KEY, m); }
```

- [ ] **Step 3: Write `files.ts`**

```ts
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { EditorHandle } from "./editor";

const MD_FILTERS = [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }];

export async function loadPath(editor: EditorHandle, path: string): Promise<void> {
  const content = await invoke<string>("read_file", { path });
  editor.setDoc(content);
}

export async function openFile(editor: EditorHandle): Promise<string | null> {
  const path = await open({ multiple: false, filters: MD_FILTERS });
  if (typeof path !== "string") return null;
  await loadPath(editor, path);
  return path;
}

export async function saveFile(editor: EditorHandle, currentPath: string | null): Promise<string | null> {
  let path = currentPath;
  if (!path) {
    const chosen = await save({ filters: MD_FILTERS });
    if (!chosen) return null;
    path = chosen;
  }
  await invoke("save_file", { path, content: editor.getDoc() });
  return path;
}
```

- [ ] **Step 4: Wire it all in `main.ts`**

```ts
import { openFile, saveFile, loadPath } from "./files";
import { loadMode, saveMode } from "./state";

let currentPath: string | null = null;
const filenameEl = document.getElementById("filename")!;
function setPath(p: string | null) {
  currentPath = p;
  filenameEl.textContent = p ? p.split("/").pop()! : "Untitled";
}

// restore persisted view mode
const views = setupViews((m) => saveMode(m));
views.setMode(loadMode());

window.addEventListener("keydown", async (e) => {
  if (!(e.metaKey || e.ctrlKey)) return;
  if (e.key === "o") { e.preventDefault(); const p = await openFile(editor); if (p) setPath(p); }
  if (e.key === "s") { e.preventDefault(); const p = await saveFile(editor, currentPath); if (p) setPath(p); }
});

// open file passed at launch (file association / CLI arg)
invoke<string | null>("get_initial_file").then((p) => { if (p) loadPath(editor, p).then(() => setPath(p)); });
```
(Merge the keydown handler with Task 6's, or keep them as two listeners — both work.)

- [ ] **Step 5: Run and verify**

```bash
npm run tauri dev
```
Expected: `Cmd+O` opens a file dialog filtered to md/markdown/txt; choosing a file loads it into the editor and renders the preview; filename shows in the topbar. Edit, `Cmd+S` saves (no dialog if already has a path). A new doc with `Cmd+S` prompts save-as. Restart app → last view mode is restored.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: file open/save + persisted view mode

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Wire the Tauri updater plugin (dormant)

> Install + register the updater so M2 only has to add an endpoint, signing keys, and a check call. No update check runs in M1.

**Files:**
- Modify: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces: registered updater plugin; no frontend call. Build still succeeds.

- [ ] **Step 1: Install the plugin**

```bash
npm install @tauri-apps/plugin-updater
```
Add to `src-tauri/Cargo.toml`: `tauri-plugin-updater = "2"`.

- [ ] **Step 2: Register it (dormant)**

In `lib.rs`: `.plugin(tauri_plugin_updater::Builder::new().build())`. Do **not** call any check on startup.

- [ ] **Step 3: Minimal config placeholder**

In `tauri.conf.json` add a `plugins.updater` block with an empty `endpoints: []` and a `pubkey: ""` placeholder, and a comment in `docs/tasks.md` noting M2 must fill these + generate signing keys. Add `"updater:default"` to capabilities.

- [ ] **Step 4: Verify it still builds and runs**

```bash
npm run tauri dev
```
Expected: app launches normally; no update activity, no errors in console.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: wire Tauri updater plugin (dormant; activated in M2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: README, THIRD-PARTY-NOTICES, smoke test, update tracker

**Files:**
- Create: `README.md`, `THIRD-PARTY-NOTICES`
- Modify: `docs/tasks.md`

**Interfaces:**
- Produces: shippable M1 docs; tasks.md reflects M1 done + M2 next.

- [ ] **Step 1: Write `README.md`**

MDflow — what it is (markdown editor), MIT license line, prerequisites (Node, Rust), commands (`npm install`, `npm run tauri dev`, `npm run tauri build`), and a "built with" list. No mention of Kaelio/mx/Vibery.

- [ ] **Step 2: Write `THIRD-PARTY-NOTICES`**

List each bundled library and its license: CodeMirror (MIT), markdown-it (MIT), highlight.js (BSD-3), Tauri + plugins (MIT/Apache-2.0). Include their copyright lines.

- [ ] **Step 3: Run the full M1 smoke test**

Verify in one session: open a `.md` file → edits render live → word count updates → split/editor/preview modes work → `Cmd+P`/`Cmd+E` work → save edits → reopen file shows saved content → restart restores view mode. Record pass/fail in `docs/tasks.md`.

- [ ] **Step 4: Update `docs/tasks.md`**

Mark all M1 code tasks `[x]`; set current position to "M2 — activate auto-update". Note the updater config placeholders that M2 must fill.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: README, third-party notices, M1 smoke test recorded

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage check (M1 scope):**
- Open/save `.md`/`.markdown`/`.txt` → Tasks 3, 7 ✅
- CodeMirror 6 editor, md highlighting, soft-wrap → Task 4 ✅
- Live markdown-it preview, GFM + code highlighting → Task 5 ✅
- View modes split/editor/preview → Task 6 ✅
- Hotkeys Cmd+O/S/P/E → Tasks 6, 7 ✅ (Cmd+B deferred to M3 — noted in Global Constraints)
- Refined dark theme + icon/name → Tasks 1, 2 ✅ (custom app icon: scaffold ships a default; a bespoke MDflow icon is a nice-to-have, fold into M2 polish if not done in Task 1)
- Window/zoom persistence → view-mode persistence in Task 7 ✅; **zoom** persistence is deferred (no zoom control exists in M1 — add when a zoom control lands; not a regression since there's nothing to persist yet)
- Updater plugin wired but dormant → Task 8 ✅
- MIT license + THIRD-PARTY-NOTICES → Tasks 1, 9 ✅
- Modular file structure → enforced across Tasks 4–7 ✅

**Placeholder scan:** No "TBD/TODO" in build steps; the only intentional placeholders are the updater `endpoints`/`pubkey` (correct — they belong to M2) and the optional bespoke icon.

**Type consistency:** `EditorHandle` (getDoc/setDoc/focus) used consistently in Tasks 4–7; `ViewMode` union consistent in Tasks 6–7; command names (`read_file`, `save_file`, `get_initial_file`, `word_count`) match between `files.rs` registration (Task 3) and `invoke` calls (Tasks 5, 7).

**Deviations from spec, called out:** (1) `Cmd+B` deferred to M3; (2) zoom persistence deferred until a zoom control exists; (3) bespoke icon optional in M1. None change M1's usability.
