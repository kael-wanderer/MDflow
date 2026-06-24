import { describe, expect, it } from "vitest";
import { attachSummary, markStatus, startRun } from "../ai/run-log";

const changedFiles = {
  added: ["a.md"],
  modified: ["b.md"],
  deleted: ["c.md"],
};

describe("run log", () => {
  it("starts a run as running and newest-first", () => {
    const records = startRun(
      [
        {
          id: "old",
          prompt: "old",
          provider: "CLI",
          cwd: null,
          status: "done",
          startedAt: 1,
        },
      ],
      {
        id: "new",
        prompt: "do it",
        provider: "CLI",
        cwd: "/repo",
        startedAt: 2,
      },
    );
    expect(records.map((record) => record.id)).toEqual(["new", "old"]);
    expect(records[0]).toMatchObject({ status: "running", cwd: "/repo" });
  });

  it("marks terminal statuses", () => {
    const running = startRun([], {
      id: "r",
      prompt: "x",
      provider: "CLI",
      cwd: null,
      startedAt: 1,
    });
    expect(markStatus(running, "r", "done")[0].status).toBe("done");
    expect(markStatus(running, "r", "failed")[0].status).toBe("failed");
    expect(markStatus(running, "r", "cancelled")[0].status).toBe(
      "cancelled",
    );
  });

  it("attaches changed-file summaries", () => {
    const records = startRun([], {
      id: "r",
      prompt: "x",
      provider: "CLI",
      cwd: null,
      startedAt: 1,
    });
    expect(attachSummary(records, "r", changedFiles)[0].changedFiles).toEqual(
      changedFiles,
    );
  });
});
