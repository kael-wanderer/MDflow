import { confirm } from "@tauri-apps/plugin-dialog";
import { showComparison } from "./compareview";
import { listSnapshots, readBinarySnapshot, readSnapshot } from "./recovery";

function button(label: string, action: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.dataset.action = action;
  element.textContent = label;
  return element;
}

export async function openHistoryPanel(options: {
  host: HTMLElement;
  path: string;
  name: string;
  currentText: string;
  onRestore: (text: string) => void;
}): Promise<void> {
  const entries = (await listSnapshots(options.path)).filter(
    (entry) => entry.kind !== "binary",
  );
  options.host.querySelector(".history-panel")?.remove();

  const panel = document.createElement("aside");
  panel.className = "history-panel";
  const header = document.createElement("header");
  const title = document.createElement("strong");
  title.textContent = `Version history — ${options.name}`;
  const close = button("×", "close");
  close.setAttribute("aria-label", "Close version history");
  close.addEventListener("click", () => panel.remove());
  header.append(title, close);

  const list = document.createElement("ul");
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "No snapshots yet.";
    list.appendChild(empty);
  }
  for (const entry of entries) {
    const item = document.createElement("li");
    const details = document.createElement("span");
    const label = entry.label ? ` — ${entry.label}` : "";
    details.textContent =
      `${new Date(entry.ts).toLocaleString()}${label} (${entry.size} B)`;
    const actions = document.createElement("span");
    actions.className = "history-actions";
    const compare = button("Compare", "compare");
    compare.addEventListener("click", async () => {
      const text = await readSnapshot(options.path, entry.ts);
      showComparison(
        options.host,
        {
          name: `${options.name} @ ${new Date(entry.ts).toLocaleString()}`,
          path: options.path,
          text,
        },
        {
          name: `${options.name} (current)`,
          path: options.path,
          text: options.currentText,
        },
      );
    });
    const restore = button("Restore", "restore");
    restore.addEventListener("click", async () => {
      const text = await readSnapshot(options.path, entry.ts);
      options.onRestore(text);
      panel.remove();
    });
    actions.append(compare, restore);
    item.append(details, actions);
    list.appendChild(item);
  }
  panel.append(header, list);
  options.host.appendChild(panel);
}

export async function openBinaryHistoryPanel(options: {
  host: HTMLElement;
  path: string;
  name: string;
  onRestore: (bytes: Uint8Array) => void;
}): Promise<void> {
  const entries = (await listSnapshots(options.path)).filter(
    (entry) => entry.kind === "binary",
  );
  options.host.querySelector(".history-panel")?.remove();

  const panel = document.createElement("aside");
  panel.className = "history-panel";
  const header = document.createElement("header");
  const title = document.createElement("strong");
  title.textContent = `Version history — ${options.name}`;
  const close = button("×", "close");
  close.setAttribute("aria-label", "Close version history");
  close.addEventListener("click", () => panel.remove());
  header.append(title, close);

  const list = document.createElement("ul");
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "No PDF snapshots yet.";
    list.appendChild(empty);
  }
  for (const entry of entries) {
    const item = document.createElement("li");
    const details = document.createElement("span");
    const label = entry.label ? ` — ${entry.label}` : "";
    details.textContent =
      `${new Date(entry.ts).toLocaleString()}${label} (${entry.size} B)`;
    const actions = document.createElement("span");
    actions.className = "history-actions";
    const restore = button("Restore", "restore");
    restore.addEventListener("click", async () => {
      const shouldRestore = await confirm(
        `Restore "${options.name}" to this PDF snapshot?`,
        {
          title: "Restore PDF snapshot",
          kind: "warning",
          okLabel: "Restore",
          cancelLabel: "Cancel",
        },
      );
      if (!shouldRestore) return;
      options.onRestore(await readBinarySnapshot(options.path, entry.ts));
      panel.remove();
    });
    actions.append(restore);
    item.append(details, actions);
    list.appendChild(item);
  }
  panel.append(header, list);
  options.host.appendChild(panel);
}
