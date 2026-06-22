import { hashText } from "../hash";

export type EditBinding = {
  windowId: string;
  tabId: string;
  baseHash: string;
  selection: string;
  from: number;
  to: number;
};

export type BindingState = "apply" | "closed" | "changed";

export function validateBinding(
  binding: EditBinding,
  lookup: (windowId: string, tabId: string) => string | null,
): BindingState {
  const text = lookup(binding.windowId, binding.tabId);
  if (text === null) return "closed";
  return hashText(text) === binding.baseHash ? "apply" : "changed";
}
