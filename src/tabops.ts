export type TabMeta = {
  id: string;
  path: string | null;
  name: string;
  dirty: boolean;
};

export function findByPath(tabs: TabMeta[], path: string): TabMeta | undefined {
  return tabs.find((tab) => tab.path === path);
}

export function nextActiveAfterClose(
  tabs: TabMeta[],
  closingId: string,
  activeId: string | null,
): string | null {
  if (closingId !== activeId) return activeId;

  const index = tabs.findIndex((tab) => tab.id === closingId);
  if (index === -1) return activeId;

  return (tabs[index + 1] ?? tabs[index - 1])?.id ?? null;
}
