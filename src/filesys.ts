import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

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
