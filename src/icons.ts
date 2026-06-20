const BY_EXTENSION: Record<string, string> = {
  md: "md",
  markdown: "md",
  txt: "txt",
  json: "json",
  html: "html",
  htm: "html",
  pdf: "pdf",
  excalidraw: "excalidraw",
  mind: "mind",
};

export function fileIcon(name: string, isDir: boolean): string {
  if (isDir) return "folder";
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[extension] ?? "file";
}
