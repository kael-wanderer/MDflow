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
