import type { ViewMode } from "./state";

export function applyViewMode(mode: ViewMode): void {
  document.body.classList.remove("view-split", "view-editor", "view-preview");
  document.body.classList.add(`view-${mode}`);
}

export function applyZoom(zoom: number): void {
  document.getElementById("app")?.style.setProperty("--zoom", String(zoom));
}
