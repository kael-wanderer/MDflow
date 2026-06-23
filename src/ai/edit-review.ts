import { lineDiff } from "./diff";
import { validateBinding, type EditBinding } from "./edit-binding";

export type EditReviewDeps = {
  lookupTabText: (windowId: string, tabId: string) => string | null;
  applyEditTo: (
    windowId: string,
    tabId: string,
    newText: string,
    selection: { text: string; from: number; to: number },
  ) => void;
  beforeApply?: (binding: EditBinding) => void | Promise<void>;
};

function showInlineMessage(host: HTMLElement, text: string): void {
  host.querySelector(".ai-inline-msg")?.remove();
  const message = document.createElement("div");
  message.className = "ai-inline-msg";
  message.textContent = text;
  host.appendChild(message);
}

export function showDiff(
  anchor: HTMLElement,
  oldText: string,
  newText: string,
  binding: EditBinding,
  deps: EditReviewDeps,
): void {
  const view = document.createElement("div");
  view.className = "ai-diff";
  for (const line of lineDiff(oldText, newText)) {
    const lineElement = document.createElement("div");
    lineElement.className = `ai-diff-line ${line.type}`;
    const prefix =
      line.type === "add" ? "+ " : line.type === "del" ? "- " : "  ";
    lineElement.textContent = `${prefix}${line.text}`;
    view.appendChild(lineElement);
  }

  const actions = document.createElement("div");
  actions.className = "ai-actions";
  const accept = document.createElement("button");
  accept.type = "button";
  accept.textContent = "Accept";
  accept.addEventListener("click", () => {
    const state = validateBinding(binding, deps.lookupTabText);
    if (state === "closed") {
      showInlineMessage(
        actions,
        "The document this edit was for is no longer open — regenerate.",
      );
      return;
    }
    if (state === "changed") {
      showInlineMessage(
        actions,
        "The document changed since this reply — regenerate.",
      );
      return;
    }
    void Promise.resolve(deps.beforeApply?.(binding)).then(() => {
      deps.applyEditTo(binding.windowId, binding.tabId, newText, {
        text: binding.selection,
        from: binding.from,
        to: binding.to,
      });
      view.remove();
      actions.remove();
    });
  });
  const reject = document.createElement("button");
  reject.type = "button";
  reject.textContent = "Reject";
  reject.addEventListener("click", () => {
    view.remove();
    actions.remove();
  });
  actions.append(accept, reject);
  anchor.after(view, actions);
}
