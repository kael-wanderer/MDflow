import { getState, subscribe } from "./store";

export function initTabbar(handlers: {
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}): void {
  const element = document.getElementById("tabbar")!;

  const render = (): void => {
    const { tabs, activeTabId } = getState();
    element.replaceChildren();
    element.classList.toggle("empty", tabs.length === 0);

    for (const item of tabs) {
      const tab = document.createElement("div");
      const active = item.id === activeTabId;
      tab.className = `tab${active ? " active" : ""}`;
      tab.dataset.tabId = item.id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.addEventListener("click", () => handlers.onActivate(item.id));
      tab.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handlers.onActivate(item.id);
        }
      });

      const dot = document.createElement("span");
      dot.className = `tab-dot${item.dirty ? " dirty" : ""}`;
      dot.setAttribute("aria-hidden", "true");

      const name = document.createElement("span");
      name.className = "tab-name";
      name.textContent = item.name;

      const close = document.createElement("button");
      close.className = "tab-close";
      close.type = "button";
      close.textContent = "×";
      close.title = `Close ${item.name}`;
      close.setAttribute("aria-label", `Close ${item.name}`);
      close.addEventListener("click", (event) => {
        event.stopPropagation();
        handlers.onClose(item.id);
      });

      tab.append(dot, name, close);
      element.appendChild(tab);
      if (active) {
        requestAnimationFrame(() => {
          tab.scrollIntoView({ block: "nearest", inline: "nearest" });
        });
      }
    }
  };

  subscribe(render);
  render();
}
