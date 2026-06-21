import { getState, setState } from "./store";
import { glyphs } from "./glyphs";
import excalidrawIconUrl from "../images/excalidraw.png";
import mindmapIconUrl from "../images/mindmap.png";

const maskIcon = (url: string): string =>
  `<span class="ab-img-icon" style="-webkit-mask-image:url(${url});mask-image:url(${url})" aria-hidden="true"></span>`;

export function initActivityBar(
  onLayoutChange: () => void = () => {},
  onSearch: () => void = () => {},
  onSettings: (x: number, y: number) => void = () => {},
  onAI: () => void = () => {},
  onExport: (x: number, y: number) => void = () => {},
  onNewBoard: (kind: "excalidraw" | "mind") => void = () => {},
): void {
  const explorerButton = document.getElementById("ab-explorer")!;
  explorerButton.innerHTML = glyphs.explorer;

  const searchButton = document.getElementById("ab-search")!;
  searchButton.innerHTML = glyphs.search;
  searchButton.addEventListener("click", onSearch);

  const aiButton = document.getElementById("ab-ai")!;
  aiButton.innerHTML = glyphs.ai;
  aiButton.addEventListener("click", onAI);

  const excalidrawButton = document.getElementById("ab-excalidraw")!;
  excalidrawButton.innerHTML = maskIcon(excalidrawIconUrl);
  excalidrawButton.addEventListener("click", () => onNewBoard("excalidraw"));

  const mindmapButton = document.getElementById("ab-mindmap")!;
  mindmapButton.innerHTML = maskIcon(mindmapIconUrl);
  mindmapButton.addEventListener("click", () => onNewBoard("mind"));

  const exportButton = document.getElementById("ab-export")!;
  exportButton.innerHTML = glyphs.export;
  exportButton.addEventListener("click", () => {
    const rect = exportButton.getBoundingClientRect();
    onExport(rect.right + 4, rect.top);
  });

  const settingsButton = document.getElementById("ab-settings")!;
  settingsButton.innerHTML = glyphs.gear;
  settingsButton.addEventListener("click", () => {
    const rect = settingsButton.getBoundingClientRect();
    onSettings(rect.right + 4, rect.top);
  });

  const applyVisibility = (visible: boolean): void => {
    document.body.classList.toggle("explorer-hidden", !visible);
    explorerButton.classList.toggle("active", visible);
    explorerButton.setAttribute("aria-pressed", String(visible));
  };

  applyVisibility(getState().explorerVisible);

  explorerButton.addEventListener("click", () => {
    const explorerVisible = !getState().explorerVisible;
    setState({ explorerVisible });
    applyVisibility(explorerVisible);
    onLayoutChange();
  });
}
