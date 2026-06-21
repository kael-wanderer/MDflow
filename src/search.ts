import { searchInFolder, type SearchHit } from "./filesys";

export type SearchPanel = {
  focus: () => void;
  refresh: () => void;
};

export type SearchPanelDeps = {
  getFolder: () => string | null;
  onOpenHit: (path: string, line: number) => void;
};

export function createSearchPanel(
  host: HTMLElement,
  deps: SearchPanelDeps,
): SearchPanel {
  host.innerHTML = `
    <div class="search-title"><span>SEARCH</span></div>
    <div class="search-input-row">
      <input class="search-input" type="text" placeholder="Search in folder…" spellcheck="false" />
    </div>
    <div class="search-status"></div>
    <div class="search-results"></div>`;
  const input = host.querySelector<HTMLInputElement>(".search-input")!;
  const status = host.querySelector<HTMLElement>(".search-status")!;
  const results = host.querySelector<HTMLElement>(".search-results")!;
  let timer: number | undefined;
  let token = 0;

  async function run(): Promise<void> {
    const folder = deps.getFolder();
    const query = input.value.trim();
    results.replaceChildren();
    if (!folder) {
      status.textContent = "Open a folder to search its files.";
      return;
    }
    if (query.length < 2) {
      status.textContent = query ? "Type at least 2 characters." : "";
      return;
    }
    status.textContent = "Searching…";
    const current = ++token;
    let hits: SearchHit[];
    try {
      hits = await searchInFolder(folder, query);
    } catch {
      if (current === token) status.textContent = "Search failed.";
      return;
    }
    if (current !== token) return;

    const groups = new Map<string, SearchHit[]>();
    for (const hit of hits) {
      const list = groups.get(hit.relative);
      if (list) list.push(hit);
      else groups.set(hit.relative, [hit]);
    }
    if (!hits.length) {
      status.textContent = "No results.";
      return;
    }
    const capped = hits.length >= 500 ? "+" : "";
    status.textContent = `${hits.length}${capped} result${
      hits.length === 1 ? "" : "s"
    } in ${groups.size} file${groups.size === 1 ? "" : "s"}`;

    for (const [relative, fileHits] of groups) {
      const group = document.createElement("div");
      group.className = "search-group";
      const head = document.createElement("div");
      head.className = "search-file";
      head.textContent = relative;
      head.title = relative;
      group.appendChild(head);
      for (const hit of fileHits) {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "search-hit";
        const ln = document.createElement("span");
        ln.className = "search-line";
        ln.textContent = String(hit.line);
        const snippet = document.createElement("span");
        snippet.className = "search-snippet";
        snippet.textContent = hit.snippet;
        row.append(ln, snippet);
        row.addEventListener("click", () => deps.onOpenHit(hit.path, hit.line));
        group.appendChild(row);
      }
      results.appendChild(group);
    }
  }

  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void run(), 250);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      window.clearTimeout(timer);
      void run();
    }
  });

  return {
    focus: () => {
      input.focus();
      input.select();
    },
    refresh: () => void run(),
  };
}
