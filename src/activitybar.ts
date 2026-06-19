import { getState, setState } from "./store";
import { glyphs } from "./glyphs";

export function initActivityBar(
  onLayoutChange: () => void = () => {},
  onSearch: () => void = () => {},
  onSettings: () => void = () => {},
): void {
  const explorerButton = document.getElementById("ab-explorer")!;
  explorerButton.innerHTML = glyphs.explorer;

  const searchButton = document.getElementById("ab-search")!;
  searchButton.innerHTML = glyphs.search;
  searchButton.addEventListener("click", onSearch);

  const settingsButton = document.getElementById("ab-settings")!;
  settingsButton.innerHTML = glyphs.gear;
  settingsButton.addEventListener("click", onSettings);

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
