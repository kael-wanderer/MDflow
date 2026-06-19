import type { ViewMode } from "./state";

export function initWindowToolbar(handlers: {
  onMode: (m: ViewMode) => void;
  onToggleLineNumbers: () => void;
}): { update: (mode: ViewMode, lineNumbers: boolean) => void } {
  const btnEditor = document.getElementById("mode-editor")!;
  const btnRead = document.getElementById("mode-read")!;
  const btnSplit = document.getElementById("mode-split")!;
  const btnLines = document.getElementById("toggle-linenumbers")!;

  btnEditor.addEventListener("click", () => handlers.onMode("editor"));
  btnRead.addEventListener("click", () => handlers.onMode("preview"));
  btnSplit.addEventListener("click", () => handlers.onMode("split"));
  btnLines.addEventListener("click", () => handlers.onToggleLineNumbers());

  return {
    update(mode, lineNumbers) {
      btnEditor.classList.toggle("active", mode === "editor");
      btnRead.classList.toggle("active", mode === "preview");
      btnSplit.classList.toggle("active", mode === "split");
      btnLines.classList.toggle("active", lineNumbers);
    },
  };
}
