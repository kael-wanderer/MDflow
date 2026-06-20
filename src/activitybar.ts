import { getState, setState } from "./store";
import { glyphs } from "./glyphs";
import excalidrawIconUrl from "../images/excalidraw.png";
import mindmapIconUrl from "../images/mindmap.png";
import agentIconUrl from "../images/agent.png";

const maskIcon = (url: string): string =>
  `<span class="ab-img-icon" style="-webkit-mask-image:url(${url});mask-image:url(${url})" aria-hidden="true"></span>`;

// agent.png is a line-art robot on a solid white background (no alpha). Key the
// white out so the icon renders as a themeable monochrome mask like the others.
function setKeyedMaskIcon(el: HTMLElement, url: string): void {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      el.innerHTML = maskIcon(url);
      return;
    }
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < px.data.length; i += 4) {
      if (px.data[i] > 230 && px.data[i + 1] > 230 && px.data[i + 2] > 230) {
        px.data[i + 3] = 0;
      }
    }
    ctx.putImageData(px, 0, 0);
    el.innerHTML = maskIcon(canvas.toDataURL());
  };
  img.onerror = () => {
    el.innerHTML = maskIcon(url);
  };
  img.src = url;
}

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
  setKeyedMaskIcon(aiButton, agentIconUrl);
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
