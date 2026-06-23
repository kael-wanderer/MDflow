import type { AISettings, Provider } from "./aisettings";
import { hashText } from "../hash";
import { buildMessages } from "./conversation";
import { streamChat } from "./client";
import type { EditBinding } from "./edit-binding";

export type QuickActionKind = "edit" | "chat";

export type QuickAction = {
  id: string;
  label: string;
  kind: QuickActionKind;
  prompt: string;
};

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "ai.quick.proofread",
    label: "Proofread",
    kind: "edit",
    prompt:
      "Proofread the text: fix grammar, spelling, and punctuation only. Preserve the meaning, tone, and all markdown formatting.",
  },
  {
    id: "ai.quick.rewrite",
    label: "Rewrite",
    kind: "edit",
    prompt:
      "Rewrite the text to improve clarity, flow, and concision. Preserve the original meaning and all markdown formatting.",
  },
  {
    id: "ai.quick.summarize",
    label: "Summarize",
    kind: "chat",
    prompt: "Summarize the text concisely.",
  },
  {
    id: "ai.quick.outline",
    label: "Generate outline",
    kind: "chat",
    prompt:
      "Produce a concise markdown outline (headings and bullet points) of the text.",
  },
];

export function actionScope(
  selection: string,
  docText: string,
): { text: string; whole: boolean } {
  return selection.trim()
    ? { text: selection, whole: false }
    : { text: docText, whole: true };
}

export function resolveQuickProvider(settings: AISettings): string {
  const wanted = settings.quickActionProvider;
  if (wanted && settings.providers.some((p) => p.id === wanted)) return wanted;
  return settings.defaultProvider;
}

/** Minimal handle the runner needs to stream text into a chat bubble. */
export type BubbleHandle = { textContent: string | null };

export type QuickActionDeps = {
  getSettings: () => AISettings;
  getProviderById: (id: string) => Provider | undefined;
  getDoc: () => {
    text: string;
    selection: string;
    windowId: string;
    tabId: string;
    from: number;
    to: number;
  };
  /** Open the source-bound diff review for an edit-kind reply. */
  reviewEdit: (base: string, reply: string, binding: EditBinding) => void;
  appendBubble: (role: string, text: string) => BubbleHandle;
  getWorkingDir: () => string | null;
  makeAbort: () => AbortController;
};

export async function runQuickAction(
  action: QuickAction,
  deps: QuickActionDeps,
): Promise<void> {
  const doc = deps.getDoc();
  const scope = actionScope(doc.selection, doc.text);
  if (!scope.text.trim()) {
    deps.appendBubble("system", "Nothing to send — the document is empty.");
    return;
  }
  const settings = deps.getSettings();
  const provider = deps.getProviderById(resolveQuickProvider(settings));
  if (!provider) {
    deps.appendBubble(
      "error",
      "No AI provider configured. Add one in AI Settings.",
    );
    return;
  }

  const messages = buildMessages({
    history: [],
    prompt: action.prompt,
    docText: scope.text,
    selection: "",
    editMode: action.kind === "edit",
    files: [],
  });

  const bubble = deps.appendBubble("assistant", "");
  let reply = "";
  const abort = deps.makeAbort();
  try {
    await streamChat(
      provider,
      messages,
      (chunk) => {
        reply += chunk;
        bubble.textContent = reply;
      },
      "ask",
      { cwd: deps.getWorkingDir(), signal: abort.signal },
    );
  } catch (error) {
    const cancelled =
      error instanceof DOMException && error.name === "AbortError";
    deps.appendBubble(
      cancelled ? "system" : "error",
      cancelled
        ? "Reply cancelled."
        : error instanceof Error
          ? error.message
          : String(error),
    );
    return;
  }

  if (action.kind === "edit") {
    const binding: EditBinding = {
      windowId: doc.windowId,
      tabId: doc.tabId,
      baseHash: hashText(doc.text),
      selection: scope.whole ? "" : doc.selection,
      from: scope.whole ? 0 : doc.from,
      to: scope.whole ? doc.text.length : doc.to,
    };
    const base = scope.whole ? doc.text : doc.selection;
    deps.reviewEdit(base, reply, binding);
  }
}
