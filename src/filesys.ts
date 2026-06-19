import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

export type Entry = {
  name: string;
  path: string;
  isDir: boolean;
};

type RawEntry = {
  name: string;
  path: string;
  is_dir: boolean;
};

export async function listDir(path: string): Promise<Entry[]> {
  const entries = await invoke<RawEntry[]>("list_dir", { path });
  return entries.map((entry) => ({
    name: entry.name,
    path: entry.path,
    isDir: entry.is_dir,
  }));
}

export async function pickFolder(): Promise<string | null> {
  const directory = await open({ directory: true, multiple: false });
  return typeof directory === "string" ? directory : null;
}

export function createFile(path: string): Promise<void> {
  return invoke("create_file", { path });
}

export function createDir(path: string): Promise<void> {
  return invoke("create_dir", { path });
}

export function renamePath(from: string, to: string): Promise<void> {
  return invoke("rename_path", { from, to });
}

export function deletePath(path: string): Promise<void> {
  return invoke("delete_to_trash", { path });
}

export function duplicatePath(path: string): Promise<string> {
  return invoke<string>("duplicate_path", { path });
}

export function revealInFinder(path: string): Promise<void> {
  return revealItemInDir(path);
}

export function copyPath(path: string): Promise<void> {
  return writeText(path);
}

export function listFilesRecursive(folder: string): Promise<string[]> {
  return invoke<string[]>("list_files_recursive", { folder });
}
