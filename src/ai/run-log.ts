import type { FolderDiff } from "./run-summary";

export type RunStatus = "running" | "done" | "failed" | "cancelled";

export type RunRecord = {
  id: string;
  prompt: string;
  provider: string;
  cwd: string | null;
  status: RunStatus;
  startedAt: number;
  changedFiles?: FolderDiff;
};

export function startRun(
  records: RunRecord[],
  run: Omit<RunRecord, "status" | "startedAt"> & { startedAt?: number },
): RunRecord[] {
  return [
    {
      ...run,
      status: "running",
      startedAt: run.startedAt ?? Date.now(),
    },
    ...records.filter((record) => record.id !== run.id),
  ];
}

export function markStatus(
  records: RunRecord[],
  id: string,
  status: RunStatus,
): RunRecord[] {
  return records.map((record) =>
    record.id === id ? { ...record, status } : record,
  );
}

export function attachSummary(
  records: RunRecord[],
  id: string,
  changedFiles: FolderDiff,
): RunRecord[] {
  return records.map((record) =>
    record.id === id ? { ...record, changedFiles } : record,
  );
}
