# Set MDflow as Default App (macOS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Set MDflow as Default" menu actually register MDflow as the default handler for Markdown/text and PDF on macOS, declare those document types, and open files passed by the OS.

**Architecture:** Declare `CFBundleDocumentTypes` in the Tauri config/Info.plist; add a Rust `set_default_handler` command using macOS LaunchServices; handle the Tauri file-open event to open OS-launched files in a tab; wire the existing menu items to the command with a System-Settings fallback.

**Tech Stack:** Tauri 2, Rust (macOS LaunchServices via objc2/core-foundation), TypeScript. Design spec: `docs/superpowers/specs/2026-06-20-set-default-app-design.md`.

## Global Constraints

- macOS only. Bundle id: `com.kael.mdflow`.
- Types: Markdown/text (`.md`, `.markdown`, `.txt` → `public.plain-text` + a Markdown UTI) and PDF (`.pdf` → `com.adobe.pdf`, viewer role).
- Never silently fail: on API refusal, show a friendly message + open the relevant System Settings pane.
- Frequent commits; verify the native pieces in a packaged build (`npm run tauri build`).

---

### Task 1: Declare document types

**Files:**
- Modify: `src-tauri/tauri.conf.json` (and an `Info.plist` fragment if the bundle config requires it)

- [ ] **Step 1: Add document types**

In `tauri.conf.json` under `bundle.macOS`, add `CFBundleDocumentTypes` declaring two
handlers:
- Editor role for plain text + Markdown: extensions `md`, `markdown`, `txt`; UTIs
  `public.plain-text`, `net.daringfireball.markdown`; role `Editor`.
- Viewer role for PDF: extension `pdf`; UTI `com.adobe.pdf`; role `Viewer`.

If `net.daringfireball.markdown` is not a system-declared UTI, add a
`UTExportedTypeDeclarations`/`UTImportedTypeDeclarations` entry for it (conforming to
`public.plain-text`).

- [ ] **Step 2: Build the bundle and inspect Info.plist**

Run: `npm run tauri build` (or a debug bundle) and inspect the generated
`MDflow.app/Contents/Info.plist`.
Expected: `CFBundleDocumentTypes` present with both handlers. Record in the task report.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat(default): declare markdown/text + pdf document types"
```

---

### Task 2: Open OS-passed files

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/main.ts`

**Interfaces:**
- Produces: a frontend event `open-path` (payload: absolute path) the app listens for and opens in a tab.

- [ ] **Step 1: Emit file-open events from Rust**

In `lib.rs`, in the Tauri run loop, handle `tauri::RunEvent::Opened { urls }` (macOS file
association open). For each URL/path, emit a window event `open-path` with the file path
string. (Also handle any paths passed as launch args if applicable.)

- [ ] **Step 2: Open them in the frontend**

In `src/main.ts`, `listen<string>("open-path", (e) => void doOpenPath(e.payload))`
(reusing the existing open routine, which already routes PDF/board/markdown correctly).

- [ ] **Step 3: Verify compile + build**

Run: `cd src-tauri && cargo check` then `npm run build`.
Expected: clean. (Manual, packaged build: double-clicking a `.md` opens it in MDflow once
MDflow is the default — verified after Task 3.)

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src/main.ts
git commit -m "feat(default): open files passed by the OS in a tab"
```

---

### Task 3: `set_default_handler` command + menu wiring

**Files:**
- Modify: `src-tauri/src/lib.rs` (command + registration), maybe a new `src-tauri/src/defaults.rs`
- Modify: `src/main.ts` (menu handlers)

**Interfaces:**
- Produces (Tauri command): `set_default_handler(role: String) -> Result<(), String>` where `role` is `"markdown"` or `"pdf"`.

- [ ] **Step 1: Implement the command**

Add `set_default_handler` (in `defaults.rs`, `mod defaults;` in lib.rs). For `role`:
- `"markdown"` → call `LSSetDefaultRoleHandlerForContentType` for `public.plain-text`
  (and the Markdown UTI) with role `kLSRolesEditor` and bundle id `com.kael.mdflow`.
- `"pdf"` → same for `com.adobe.pdf` with role `kLSRolesViewer`.

Use the macOS LaunchServices API via `objc2-foundation`/`core-foundation` (confirm the
exact crate during implementation — see the spec's open questions). Return `Ok(())` on
success or `Err(message)` on failure. Register the command in `invoke_handler`.

- [ ] **Step 2: Wire the menu handlers**

In `src/main.ts`, replace the informational `setAsDefault` dialog with:
```ts
async function setAsDefault(role: "markdown" | "pdf"): Promise<void> {
  try {
    await invoke("set_default_handler", { role });
    await message(`MDflow is now your default ${role === "pdf" ? "PDF" : "Markdown"} app.`,
      { title: "Set as Default", kind: "info" });
  } catch {
    await message(
      "macOS didn't allow changing the default automatically. Open System Settings ▸ "
      + "(file type) and choose MDflow under “Open with”.",
      { title: "Set as Default", kind: "info" });
  }
}
```
Map `default.markdown`/`default.pdf` menu events to `setAsDefault("markdown"|"pdf")`.

- [ ] **Step 3: Verify compile + build**

Run: `cd src-tauri && cargo check` then `npm run build`.
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/defaults.rs src-tauri/src/lib.rs src/main.ts
git commit -m "feat(default): set-default-handler command + menu wiring"
```

---

### Task 4: Docs + test cases

**Files:**
- Modify: `CLAUDE.md`, `docs/tasks.md`, `docs/test-cases/15-updater-default.md`

- [ ] **Step 1: Update + verify + commit**

Document the declared types + the default-handler behavior + the OS-open flow. Replace
the DEF-01/DEF-02 "informational" cases with real ones (set default → double-click in
Finder opens MDflow; fallback shows System Settings).
```bash
cd src-tauri && cargo check && cd .. && npm run build
git add CLAUDE.md docs/tasks.md docs/test-cases/15-updater-default.md
git commit -m "docs(default): record default-app handling + cases"
```

---

## Self-Review

- **Spec coverage:** document-type declarations (T1), OS open-file events (T2), set-default command + menu + fallback (T3), docs/cases (T4). Covered.
- **Placeholders:** the exact LaunchServices crate is flagged for implementation-time confirmation (spec open question) — verified in T3, not a logic placeholder.
- **Type consistency:** `set_default_handler(role)` (T3) matches `setAsDefault("markdown"|"pdf")` caller; `open-path` event (T2) consistent Rust↔TS.
