import type { HttpProvider } from "./aisettings";

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
};

export function chatContentText(content: ChatMessage["content"]): string {
  return typeof content === "string"
    ? content
    : content
        .filter((part): part is Extract<ChatContentPart, { type: "text" }> =>
          part.type === "text",
        )
        .map((part) => part.text)
        .join("\n");
}

export function buildHttpBody(
  provider: HttpProvider,
  messages: ChatMessage[],
): object {
  return { model: provider.model, messages, stream: true };
}

export function parseSSEDelta(line: string): string | null | "DONE" {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (payload === "[DONE]") return "DONE";
  try {
    const json = JSON.parse(payload);
    const content = json?.choices?.[0]?.delta?.content;
    return typeof content === "string" ? content : null;
  } catch {
    return null;
  }
}

export function substitutePrompt(run: string, prompt: string): string[] {
  return run
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token === "{prompt}" ? prompt : token));
}
