import { parentPath } from "./paths";

export type DropPoint = { x: number; y: number };

export function logicalDropPoint(
  position: DropPoint,
  viewport: { width: number; height: number },
  scaleFactor: number,
): DropPoint {
  if (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x <= viewport.width &&
    position.y <= viewport.height
  ) {
    return position;
  }
  const scale = scaleFactor > 0 ? scaleFactor : 1;
  return { x: position.x / scale, y: position.y / scale };
}

export function explorerDropDirectory(
  rootFolder: string,
  hoveredPath: string | null,
  hoveredIsDirectory: boolean,
): string {
  if (!hoveredPath) return rootFolder;
  return hoveredIsDirectory ? hoveredPath : parentPath(hoveredPath);
}
