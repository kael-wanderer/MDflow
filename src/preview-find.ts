export function clearTextHighlights(host: HTMLElement): void {
  host.querySelectorAll("mark.preview-find-match").forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent ?? ""));
  });
  host.normalize();
}

export function highlightText(
  host: HTMLElement,
  query: string,
): HTMLElement[] {
  clearTextHighlights(host);
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "gi");
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (
      node.data.trim() &&
      !node.parentElement?.closest("script,style,textarea")
    ) {
      nodes.push(node);
    }
  }
  const matches: HTMLElement[] = [];
  for (const node of nodes) {
    pattern.lastIndex = 0;
    const fragments: Node[] = [];
    let cursor = 0;
    for (;;) {
      const match = pattern.exec(node.data);
      if (!match) break;
      fragments.push(document.createTextNode(node.data.slice(cursor, match.index)));
      const mark = document.createElement("mark");
      mark.className = "preview-find-match";
      mark.textContent = match[0];
      fragments.push(mark);
      matches.push(mark);
      cursor = match.index + match[0].length;
    }
    if (!fragments.length) continue;
    fragments.push(document.createTextNode(node.data.slice(cursor)));
    node.replaceWith(...fragments);
  }
  return matches;
}

export function activateTextMatch(
  matches: HTMLElement[],
  index: number,
): { count: number; active: number } {
  matches.forEach((match, candidate) =>
    match.classList.toggle("active", candidate === index),
  );
  matches[index]?.scrollIntoView({ block: "center", behavior: "smooth" });
  return { count: matches.length, active: matches.length ? index + 1 : 0 };
}
