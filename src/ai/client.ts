import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { PermissionMode, Provider } from "./aisettings";
import {
  buildHttpBody,
  chatContentText,
  parseSSEDelta,
  substitutePrompt,
  type ChatMessage,
} from "./providers";

export function connectionDetail(
  status: number,
  bodyText: string,
): { ok: boolean; detail: string } {
  if (status >= 200 && status < 300) {
    return { ok: true, detail: "OK" };
  }
  if (status === 401) {
    return { ok: false, detail: "API key rejected (401)" };
  }
  if (status === 404) {
    return { ok: false, detail: "Model or endpoint not found (404)" };
  }
  return {
    ok: false,
    detail: `HTTP ${status}: ${bodyText.slice(0, 200)}`,
  };
}

export async function testConnection(
  provider: Extract<Provider, { type: "http" }>,
): Promise<{ ok: boolean; detail: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const key = await invoke<string | null>("get_secret", { id: provider.id });
    if (key) headers.Authorization = `Bearer ${key}`;
    const response = await fetch(
      `${provider.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
      },
    );
    return connectionDetail(
      response.status,
      response.ok ? "" : await response.text(),
    );
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function streamHttp(
  provider: Extract<Provider, { type: "http" }>,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = await invoke<string | null>("get_secret", { id: provider.id });
  if (key) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(
    `${provider.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(buildHttpBody(provider, messages)),
      signal,
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
  permissionMode: PermissionMode,
  cwd: string | null,
  attachmentPaths: string[],
  signal?: AbortSignal,
): Promise<void> {
  const preamble = attachmentPaths.length
    ? `Attached files (read them from disk as needed):\n${attachmentPaths
        .map((path) => `- ${path}`)
        .join("\n")}\n\n`
    : "";
  const prompt =
    preamble +
    messages
      .map(
        (message) =>
          `${message.role.toUpperCase()}: ${chatContentText(message.content)}`,
      )
      .join("\n\n");
  const run =
    permissionMode === "bypass" && provider.bypassRun
      ? provider.bypassRun
      : provider.run;
  const args = substitutePrompt(run, prompt);
  const requestId = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const unlisteners: UnlistenFn[] = [];
  let resolveStream: () => void = () => {};
  let rejectStream: (error: unknown) => void = () => {};
  const streamComplete = new Promise<void>((resolve, reject) => {
    resolveStream = resolve;
    rejectStream = reject;
  });
  const cleanUp = (): void => {
    unlisteners.splice(0).forEach((unlisten) => unlisten());
  };
  const abort = (): void => {
    void invoke("ai_cancel", { requestId });
    rejectStream(new DOMException("AI request cancelled.", "AbortError"));
  };
  signal?.addEventListener("abort", abort, { once: true });

  try {
    unlisteners.push(
      await listen<{ requestId: string; chunk: string }>(
        "ai-chunk",
        (event) => {
          if (event.payload.requestId === requestId) {
            onChunk(event.payload.chunk);
          }
        },
      ),
    );
    unlisteners.push(
      await listen<{ requestId: string }>("ai-done", (event) => {
        if (event.payload.requestId === requestId) resolveStream();
      }),
    );
    unlisteners.push(
      await listen<{ requestId: string; message: string }>(
        "ai-error",
        (event) => {
          if (event.payload.requestId === requestId) {
            rejectStream(new Error(event.payload.message));
          }
        },
      ),
    );
    await invoke("ai_run", { requestId, args, cwd });
    await streamComplete;
  } finally {
    signal?.removeEventListener("abort", abort);
    cleanUp();
  }
}

export function streamChat(
  provider: Provider,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  permissionMode: PermissionMode = "ask",
  options: {
    cwd?: string | null;
    attachmentPaths?: string[];
    signal?: AbortSignal;
  } = {},
): Promise<void> {
  return provider.type === "http"
    ? streamHttp(provider, messages, onChunk, options.signal)
    : streamCommand(
        provider,
        messages,
        onChunk,
        permissionMode,
        options.cwd ?? null,
        options.attachmentPaths ?? [],
        options.signal,
      );
}
