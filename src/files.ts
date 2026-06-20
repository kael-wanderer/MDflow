import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

export type OpenResult = { path: string; contents: string } | null;

const FILTERS = [
  {
    name: "Documents",
    extensions: ["md", "markdown", "txt", "html", "htm", "pdf", "excalidraw", "mind"],
  },
];

export async function openFile(): Promise<OpenResult> {
  const path = await open({ multiple: false, filters: FILTERS });
  if (typeof path !== "string") return null;
  if (path.toLowerCase().endsWith(".pdf")) {
    return { path, contents: "" };
  }
  const contents = await invoke<string>("read_file", { path });
  return { path, contents };
}

export async function pickSavePath(): Promise<string | null> {
  return save({ filters: FILTERS });
}

export function pickExportPath(ext: string): Promise<string | null> {
  return save({
    filters: [
      { name: ext.toUpperCase(), extensions: [ext] },
    ],
  }).then((path) => path ?? null);
}

export function writeFile(path: string, contents: string): Promise<void> {
  return invoke("save_file", { path, contents });
}

// path === null triggers a Save-As dialog. Returns the path written, or null if cancelled.
export async function saveFile(path: string | null, contents: string): Promise<string | null> {
  let target = path;
  if (!target) {
    target = await pickSavePath();
    if (!target) return null;
  }
  await writeFile(target, contents);
  return target;
}

export async function getInitialFile(): Promise<OpenResult> {
  const path = await invoke<string | null>("get_initial_file");
  if (!path) return null;
  const contents = await invoke<string>("read_file", { path });
  return { path, contents };
}
