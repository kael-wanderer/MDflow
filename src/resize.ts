export function initResize(onCommit: (width: number) => void): void {
  const handle = document.getElementById("explorer-resize")!;
  const root = document.documentElement;
  let dragging = false;

  const clamp = (width: number): number => Math.max(160, Math.min(480, width));

  const handleMove = (event: MouseEvent): void => {
    if (!dragging) return;
    const width = clamp(event.clientX - 48);
    root.style.setProperty("--explorer-w", `${width}px`);
  };

  const handleUp = (): void => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove("resizing-explorer");
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleUp);

    const value = getComputedStyle(root).getPropertyValue("--explorer-w");
    onCommit(clamp(Number.parseInt(value, 10) || 240));
  };

  handle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    dragging = true;
    document.body.classList.add("resizing-explorer");
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  });
}
