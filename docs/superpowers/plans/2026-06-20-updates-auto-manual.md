# Updates: Auto / Manual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single auto-update checkbox with an explicit Manual / Automatic mode (both always prompt before installing).

**Architecture:** A `updateMode: "manual" | "auto"` setting (migrating the legacy `autoUpdate` boolean) drives whether the daily background check runs; the Gear ▸ General control and updater runtime read it.

**Tech Stack:** TypeScript, Vitest, Tauri updater. Design spec: `docs/superpowers/specs/2026-06-20-updates-auto-manual-design.md`.

## Global Constraints

- Modes (exact): **Manual** = never auto-checks; **Automatic** = once-per-24h background check, then prompts. Neither installs silently.
- Migrate legacy `autoUpdate: true → "auto"`, `false`/absent → `"manual"`.
- Manual "Check for Updates" remains available in both modes.
- TDD for settings parsing; small commits.

---

### Task 1: `updateMode` setting + migration

**Files:**
- Modify: `src/settings.ts`
- Modify: `src/__tests__/settings.test.ts`

**Interfaces:**
- Produces: `Settings.updateMode: "manual" | "auto"`; `parseSettings` maps legacy `autoUpdate`.

- [ ] **Step 1: Write the failing test**

```ts
// add to src/__tests__/settings.test.ts
import { parseSettings, DEFAULT_SETTINGS } from "../settings";

describe("updateMode", () => {
  it("defaults to manual", () => {
    expect(parseSettings("{}").updateMode).toBe("manual");
  });
  it("migrates legacy autoUpdate:true to auto", () => {
    expect(parseSettings('{"autoUpdate":true}').updateMode).toBe("auto");
  });
  it("migrates legacy autoUpdate:false to manual", () => {
    expect(parseSettings('{"autoUpdate":false}').updateMode).toBe("manual");
  });
  it("accepts an explicit updateMode", () => {
    expect(parseSettings('{"updateMode":"auto"}').updateMode).toBe("auto");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/settings.test.ts`
Expected: FAIL (`updateMode` undefined).

- [ ] **Step 3: Implement**

In `src/settings.ts`: add `updateMode: "manual" | "auto"` to the `Settings` type and
`DEFAULT_SETTINGS` (`"manual"`). In `parseSettings`, after reading the raw object:
```ts
const rawMode = raw.updateMode;
const legacy = raw.autoUpdate;
settings.updateMode =
  rawMode === "auto" || rawMode === "manual"
    ? rawMode
    : legacy === true
      ? "auto"
      : "manual";
```
Remove the old `autoUpdate` field from the typed `Settings` (keep reading it only for
migration). Update `applySettings`/any serializer to write `updateMode`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/settings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/settings.ts src/__tests__/settings.test.ts
git commit -m "feat(update): updateMode setting with legacy migration"
```

---

### Task 2: Runtime honors the mode

**Files:**
- Modify: `src/updater.ts`
- Modify: `src/main.ts` (pass the mode predicate)

**Interfaces:**
- Consumes: `Settings.updateMode` (Task 1).

- [ ] **Step 1: Gate the daily check**

`startDailyUpdateChecks(isEnabled)` already takes a predicate. In `main.ts`, change the
predicate from the old `autoUpdate` boolean to `() => currentSettings.updateMode === "auto"`.
No change to the 24h guard or `checkForUpdates` (manual) is needed.

- [ ] **Step 2: Add a focused unit test**

```ts
// src/__tests__/updater.test.ts — add
import { shouldCheckForUpdates } from "../updater";
it("manual mode never checks", () => {
  expect(shouldCheckForUpdates(false, null)).toBe(false); // enabled=false when mode=manual
});
```
(The predicate `isEnabled` is false in manual mode; `shouldCheckForUpdates` already
returns false when not enabled.)

- [ ] **Step 3: Run + build**

Run: `npx vitest run src/__tests__/updater.test.ts && npm run build`
Expected: pass + clean.

- [ ] **Step 4: Commit**

```bash
git add src/updater.ts src/main.ts src/__tests__/updater.test.ts
git commit -m "feat(update): runtime honors manual/auto update mode"
```

---

### Task 3: Gear ▸ General Manual / Automatic control

**Files:**
- Modify: `src/settingspanel.ts` (the General tab)

**Interfaces:**
- Consumes: `updateMode` (Task 1).

- [ ] **Step 1: Replace the checkbox**

In `renderGeneral` (the Updates subsection), replace the "Automatically check for
updates" checkbox with a two-option segmented/radio control labeled **Manual** and
**Automatic** bound to `settings.updateMode`; keep the existing "Check for Updates"
button below it (available in both modes). Selecting an option calls `updateSettings`
to set `updateMode` and re-renders.

- [ ] **Step 2: Build + manual check**

Run: `npm run build`
Expected: clean. (Manual: switching modes persists; Automatic enables the daily check.)

- [ ] **Step 3: Commit**

```bash
git add src/settingspanel.ts
git commit -m "feat(update): Manual/Automatic control in Gear General"
```

---

### Task 4: Docs + test cases

**Files:**
- Modify: `CLAUDE.md` (if it mentions autoUpdate), `docs/tasks.md`, `docs/test-cases/15-updater-default.md`

- [ ] **Step 1: Update + verify + commit**

Update the updater test cases for Manual/Automatic; record done in tasks.md.
```bash
npm run build && npx vitest run
git add CLAUDE.md docs/tasks.md docs/test-cases/15-updater-default.md
git commit -m "docs(update): record auto/manual mode + cases"
```

---

## Self-Review

- **Spec coverage:** updateMode + migration (T1), runtime gating (T2), Gear control (T3), docs (T4). Covered.
- **Placeholders:** none.
- **Type consistency:** `updateMode: "manual" | "auto"` consistent across T1–T3.
