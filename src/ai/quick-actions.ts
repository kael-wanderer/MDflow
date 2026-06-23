import type { AISettings } from "./aisettings";

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
