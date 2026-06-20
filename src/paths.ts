function separatorIndex(path: string): number {
  return Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
}

export function parentPath(path: string): string {
  const index = separatorIndex(path);
  if (index < 0) return ".";
  if (index === 0) return path[0];
  if (index === 2 && path[1] === ":") return path.slice(0, 3);
  return path.slice(0, index);
}

export function joinPath(directory: string, name: string): string {
  const separator = directory.includes("\\") && !directory.includes("/") ? "\\" : "/";
  if (directory.endsWith("/") || directory.endsWith("\\")) {
    return `${directory}${name}`;
  }
  return `${directory}${separator}${name}`;
}

export function relativePath(root: string, path: string): string {
  if (path === root) return "";
  const prefix = root.endsWith("/") || root.endsWith("\\") ? root : `${root}/`;
  const normalizedRoot = prefix.replace(/\\/g, "/");
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith(normalizedRoot)
    ? normalizedPath.slice(normalizedRoot.length)
    : path;
}

export function breadcrumbsPath(root: string | null, path: string): string {
  const value = root ? relativePath(root, path) : path;
  return value.split(/[\\/]/).filter(Boolean).join(" › ");
}
