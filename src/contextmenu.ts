export type MenuItem = { label: string; action: () => void } | "separator";

let current: HTMLElement | null = null;

function dismiss(): void {
  current?.remove();
  current = null;
  document.removeEventListener("mousedown", handleOutside, true);
  document.removeEventListener("keydown", handleKey, true);
}

function handleOutside(event: MouseEvent): void {
  if (current && !current.contains(event.target as Node)) dismiss();
}

function handleKey(event: KeyboardEvent): void {
  if (event.key === "Escape") dismiss();
}

export function showContextMenu(x: number, y: number, items: MenuItem[]): void {
  dismiss();

  const menu = document.createElement("div");
  menu.className = "ctx-menu";
  menu.setAttribute("role", "menu");

  for (const item of items) {
    if (item === "separator") {
      const separator = document.createElement("div");
      separator.className = "ctx-sep";
      separator.setAttribute("role", "separator");
      menu.appendChild(separator);
      continue;
    }

    const row = document.createElement("button");
    row.className = "ctx-item";
    row.type = "button";
    row.textContent = item.label;
    row.setAttribute("role", "menuitem");
    row.addEventListener("click", () => {
      dismiss();
      item.action();
    });
    menu.appendChild(row);
  }

  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  document.body.appendChild(menu);
  current = menu;

  const bounds = menu.getBoundingClientRect();
  if (bounds.right > window.innerWidth) {
    menu.style.left = `${Math.max(4, x - bounds.width)}px`;
  }
  if (bounds.bottom > window.innerHeight) {
    menu.style.top = `${Math.max(4, y - bounds.height)}px`;
  }

  document.addEventListener("mousedown", handleOutside, true);
  document.addEventListener("keydown", handleKey, true);
}
