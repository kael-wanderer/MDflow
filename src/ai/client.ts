import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { PermissionMode, Provider } from "./aisettings";
import {
  buildHttpBody,
  chatContentText,
  parseAnthropicSSEDelta,
  parseSSEDelta,
  resolveCommandPermissionProfile,
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
    const key = await invoke<string | null>("get_secret", { id: provider.id });
    const headers = httpHeaders(provider, key);
    const body = buildHttpBody(provider, [
      { role: "user", content: "ping" },
    ]) as Record<string, unknown>;
    body.stream = false;
    if (provider.api === "anthropic") body.max_tokens = 1;
    else body.max_tokens = 1;
    const response = await fetch(
      httpEndpoint(provider),
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
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

function httpEndpoint(provider: Extract<Provider, { type: "http" }>): string {
  const baseUrl = provider.baseUrl.replace(/\/$/, "");
  return provider.api === "anthropic"
    ? `${baseUrl}/messages`
    : `${baseUrl}/chat/completions`;
}

function httpHeaders(
  provider: Extract<Provider, { type: "http" }>,
  key: string | null,
): Record<string, string> {
  if (provider.api === "anthropic") {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    };
    if (key) headers["x-api-key"] = key;
    return headers;
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function streamHttp(
  provider: Extract<Provider, { type: "http" }>,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const key = await invoke<string | null>("get_secret", { id: provider.id });
  const response = await fetch(httpEndpoint(provider), {
    method: "POST",
    headers: httpHeaders(provider, key),
    body: JSON.stringify(buildHttpBody(provider, messages)),
    signal,
  });
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
      const delta =
        provider.api === "anthropic"
          ? parseAnthropicSSEDelta(line)
          : parseSSEDelta(line);
      if (delta === "DONE") return;
      if (typeof delta === "string") onChunk(delta);
    }
    if (done) break;
  }
  const finalDelta =
    provider.api === "anthropic"
      ? parseAnthropicSSEDelta(buffer)
      : parseSSEDelta(buffer);
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
  onCommandStart?: (requestId: string) => void,
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
  const profile = resolveCommandPermissionProfile(provider, permissionMode);
  const args = substitutePrompt(profile.run, prompt);
  const requestId = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  onCommandStart?.(requestId);
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
    onCommandStart?: (requestId: string) => void;
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
        options.onCommandStart,
        options.signal,
      );
}

export function cancelCommandRun(requestId: string): Promise<void> {
  return invoke("ai_cancel", { requestId });
}
