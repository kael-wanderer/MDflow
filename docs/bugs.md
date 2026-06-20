# MDflow — Bug Log

Bugs found during manual testing (see [`test-cases/`](test-cases/)). Add a row to the
table and a detail block below. Reference the failing test-case ID.

| ID | Date | Feature | Severity | Test case | Summary | Status |
|----|------|---------|----------|-----------|---------|--------|
| _example_ | 2026-06-20 | Export | Major | EXP-02 | DOCX export produced an empty file | open |

> Delete the example row once real bugs are logged.

**Severity:** Blocker · Major · Minor · Cosmetic
**Status:** open · in-progress · fixed · wontfix · cannot-reproduce

---

## Bug details

### BUG-000 (example — delete me)

- **Feature / test case:** Export / EXP-02
- **Severity:** Major
- **Environment:** macOS, dev build, commit `abc1234`
- **Steps to reproduce:**
  1. Open a `.md` file
  2. File ▸ Export ▸ Markdown ▸ Word (DOCX), choose a path
- **Expected:** A valid .docx with the document content.
- **Actual:** Empty/0-byte file.
- **Notes:** Pandoc installed? Console error?

<!--
Copy this template for each new bug:

### BUG-00N — short title

- **Feature / test case:**
- **Severity:**
- **Environment:** macOS, dev/release build, commit ``
- **Steps to reproduce:**
  1.
- **Expected:**
- **Actual:**
- **Notes:**
-->
