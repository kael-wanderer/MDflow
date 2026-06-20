export type TabMeta = {
  id: string;
  path: string | null;
  name: string;
  dirty: boolean;
  pinned?: boolean;
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

export function otherTabIds(tabs: TabMeta[], tabId: string): string[] {
  return tabs.filter((tab) => tab.id !== tabId).map((tab) => tab.id);
}

export function tabIdsRightOf(tabs: TabMeta[], tabId: string): string[] {
  const index = tabs.findIndex((tab) => tab.id === tabId);
  return index < 0 ? [] : tabs.slice(index + 1).map((tab) => tab.id);
}

export function savedTabIds(tabs: TabMeta[]): string[] {
  return tabs.filter((tab) => !tab.dirty).map((tab) => tab.id);
}
