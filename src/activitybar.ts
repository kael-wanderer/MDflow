import { getState, setState } from "./store";

export function initActivityBar(onLayoutChange: () => void = () => {}): void {
  const explorerButton = document.getElementById("ab-explorer")!;

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
