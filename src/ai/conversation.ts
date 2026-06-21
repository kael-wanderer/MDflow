import type { ChatContentPart, ChatMessage } from "./providers";

const CHAT_SYSTEM =
  "You are an assistant inside a markdown editor. Help the user understand and improve the open document. Be concise.";
const EDIT_SYSTEM =
  "You are editing a markdown document. Return only the revised text with no commentary, no code fences, no explanation.";

export type AttachedFile =
  | { kind: "text"; name: string; content: string }
  | { kind: "image"; name: string; dataUrl: string };

export function buildMessages(options: {
  history: ChatMessage[];
  prompt: string;
  docText: string;
  selection: string;
  editMode: boolean;
  files?: AttachedFile[];
}): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: options.editMode ? EDIT_SYSTEM : CHAT_SYSTEM,
    },
  ];
  const context = options.selection.trim()
    ? options.selection
    : options.docText;
  if (context.trim()) {
    const label = options.selection.trim() ? "Selected text" : "Document";
    messages.push({
      role: "system",
      content: `${label}:\n\n${context}`,
    });
  }
  for (const file of options.files ?? []) {
    if (file.kind === "text") {
      messages.push({
        role: "system",
        content: `Attached file "${file.name}":\n\n${file.content}`,
      });
    }
  }
  messages.push(...options.history);
  const images = (options.files ?? []).filter(
    (file): file is Extract<AttachedFile, { kind: "image" }> =>
      file.kind === "image",
  );
  if (images.length) {
    const content: ChatContentPart[] = [
      { type: "text", text: options.prompt },
      ...images.map((file) => ({
        type: "image_url" as const,
        image_url: { url: file.dataUrl },
      })),
    ];
    messages.push({ role: "user", content });
  } else {
    messages.push({ role: "user", content: options.prompt });
  }
  return messages;
}
