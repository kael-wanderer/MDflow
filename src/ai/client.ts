import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Provider } from "./aisettings";
import {
  buildHttpBody,
  parseSSEDelta,
  substitutePrompt,
  type ChatMessage,
} from "./providers";

async function streamHttp(
  provider: Extract<Provider, { type: "http" }>,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (provider.key) headers.Authorization = `Bearer ${provider.key}`;
  const response = await fetch(
    `${provider.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(buildHttpBody(provider, messages)),
    },
  );
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const delta = parseSSEDelta(line);
      if (delta === "DONE") return;
      if (typeof delta === "string") onChunk(delta);
    }
    if (done) break;
  }
  const finalDelta = parseSSEDelta(buffer);
  if (typeof finalDelta === "string" && finalDelta !== "DONE") {
    onChunk(finalDelta);
  }
}

async function streamCommand(
  provider: Extract<Provider, { type: "command" }>,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  const prompt = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
  const args = substitutePrompt(provider.run, prompt);
  const requestId = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const unlisteners: UnlistenFn[] = [];

  try {
    await new Promise<void>(async (resolve, reject) => {
      const cleanUp = (): void => {
        unlisteners.splice(0).forEach((unlisten) => unlisten());
      };
      unlisteners.push(
        await listen<{ requestId: string; chunk: string }>(
          "ai-chunk",
          (event) => {
            if (event.payload.requestId === requestId) {
              onChunk(event.payload.chunk);
            }
          },
        ),
        await listen<{ requestId: string }>("ai-done", (event) => {
          if (event.payload.requestId === requestId) {
            cleanUp();
            resolve();
          }
        }),
        await listen<{ requestId: string; message: string }>(
          "ai-error",
          (event) => {
            if (event.payload.requestId === requestId) {
              cleanUp();
              reject(new Error(event.payload.message));
            }
          },
        ),
      );
      try {
        await invoke("ai_run", { requestId, args });
      } catch (error) {
        cleanUp();
        reject(error);
      }
    });
  } finally {
    unlisteners.splice(0).forEach((unlisten) => unlisten());
  }
}

export function streamChat(
  provider: Provider,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  return provider.type === "http"
    ? streamHttp(provider, messages, onChunk)
    : streamCommand(provider, messages, onChunk);
}
