import { invoke } from "@tauri-apps/api/core";

export type FileStat = { mtimeMs: number; size: number };
export type FolderState = Map<string, FileStat>;

export type FolderDiff = {
  added: string[];
  modified: string[];
  deleted: string[];
};

export function diffFolderState(
  before: FolderState,
  after: FolderState,
): FolderDiff {
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  for (const [path, stat] of after) {
    const prev = before.get(path);
    if (!prev) added.push(path);
    else if (prev.mtimeMs !== stat.mtimeMs || prev.size !== stat.size) {
      modified.push(path);
    }
  }
  for (const path of before.keys()) {
    if (!after.has(path)) deleted.push(path);
  }
  return {
    added: added.sort(),
    modified: modified.sort(),
    deleted: deleted.sort(),
  };
}

/**
 * Snapshot the file mtimes/sizes under `dir` (relative paths → stats), so a
 * later capture can be diffed to find what a CLI agent changed. Best-effort:
 * a failure yields an empty map (no summary).
 */
export async function captureFolderState(dir: string): Promise<FolderState> {
  const state: FolderState = new Map();
  try {
    const files = await invoke<string[]>("list_files_recursive", {
      folder: dir,
    });
    await Promise.all(
      files.map(async (rel) => {
        try {
          const stat = await invoke<FileStat | null>("file_stat", {
            path: `${dir}/${rel}`,
          });
          if (stat) state.set(rel, stat);
        } catch {
          // Skip files that vanish or can't be stat'd.
        }
      }),
    );
  } catch {
    // Best-effort: an empty map yields no summary.
  }
  return state;
}
