export type RecentItems = {
  files: string[];
  folders: string[];
};

export function addRecent(list: string[], path: string, limit = 12): string[] {
  return [path, ...list.filter((item) => item !== path)].slice(0, limit);
}

export function loadRecent(key = "mdflow.recent"): RecentItems {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}");
    return {
      files: Array.isArray(value.files) ? value.files : [],
      folders: Array.isArray(value.folders) ? value.folders : [],
    };
  } catch {
    return { files: [], folders: [] };
  }
}

export function saveRecent(items: RecentItems, key = "mdflow.recent"): void {
  localStorage.setItem(key, JSON.stringify(items));
}
