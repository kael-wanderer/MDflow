export type MenuEntry = {
  label: string;
  action?: () => void;
  disabled?: boolean;
  children?: MenuItem[];
};

export type MenuItem = MenuEntry | "separator";

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
    row.disabled = item.disabled ?? false;
    const label = document.createElement("span");
    label.textContent = item.label;
    row.appendChild(label);
    if (item.children?.length) {
      const arrow = document.createElement("span");
      arrow.className = "ctx-arrow";
      arrow.textContent = "›";
      row.appendChild(arrow);
    }
    row.setAttribute("role", "menuitem");
    row.addEventListener("click", () => {
      if (item.disabled || item.children?.length) return;
      dismiss();
      item.action?.();
    });
    if (item.children?.length) {
      row.addEventListener("mouseenter", () => {
        menu.querySelector(".ctx-submenu")?.remove();
        const submenu = buildMenu(item.children!, true);
        const rect = row.getBoundingClientRect();
        submenu.style.left = `${rect.width - 2}px`;
        submenu.style.top = `${row.offsetTop - 4}px`;
        menu.appendChild(submenu);
      });
    } else {
      row.addEventListener("mouseenter", () => {
        menu.querySelector(".ctx-submenu")?.remove();
      });
    }
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

function buildMenu(items: MenuItem[], submenu = false): HTMLElement {
  const menu = document.createElement("div");
  menu.className = submenu ? "ctx-menu ctx-submenu" : "ctx-menu";
  menu.setAttribute("role", "menu");
  for (const item of items) {
    if (item === "separator") {
      const separator = document.createElement("div");
      separator.className = "ctx-sep";
      menu.appendChild(separator);
      continue;
    }
    const row = document.createElement("button");
    row.className = "ctx-item";
    row.type = "button";
    row.disabled = item.disabled ?? false;
    row.textContent = item.label;
    row.addEventListener("click", () => {
      if (item.disabled) return;
      dismiss();
      item.action?.();
    });
    menu.appendChild(row);
  }
  return menu;
}
