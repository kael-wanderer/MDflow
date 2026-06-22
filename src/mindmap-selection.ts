export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function toggleSelection(
  set: Set<string>,
  id: string,
  additive: boolean,
): Set<string> {
  if (!additive) return new Set([id]);
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.left <= b.right &&
    a.right >= b.left &&
    a.top <= b.bottom &&
    a.bottom >= b.top
  );
}

export function marqueeHits(
  nodes: { id: string; rect: Rect }[],
  marquee: Rect,
): string[] {
  return nodes
    .filter((node) => rectsIntersect(node.rect, marquee))
    .map((node) => node.id);
}

export function topLevelSelection(
  ids: string[],
  parentOf: (id: string) => string | null,
  rootId: string,
): string[] {
  const selected = new Set(ids);
  const hasSelectedAncestor = (id: string): boolean => {
    let parent = parentOf(id);
    while (parent !== null) {
      if (parent !== rootId && selected.has(parent)) return true;
      parent = parentOf(parent);
    }
    return false;
  };
  return ids.filter((id) => id !== rootId && !hasSelectedAncestor(id));
}
