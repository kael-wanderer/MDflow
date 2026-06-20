export type HttpProvider = {
  id: string;
  label: string;
  type: "http";
  baseUrl: string;
  model: string;
  key: string;
};

export type CommandProvider = {
  id: string;
  label: string;
  type: "command";
  run: string;
  bypassRun?: string;
};

export type Provider = HttpProvider | CommandProvider;

export type TerminalEntry = {
  id: string;
  label: string;
  run: string;
};

export type AISettings = {
  providers: Provider[];
  terminals: TerminalEntry[];
  defaultProvider: string;
  defaultTerminal: string;
  permissionMode: PermissionMode;
};

export type PermissionMode = "ask" | "bypass";

export const DEFAULT_AI_SETTINGS: AISettings = {
  providers: [
    {
      id: "ollama",
      label: "Ollama (local)",
      type: "http",
      baseUrl: "http://localhost:11434/v1",
      model: "llama3",
      key: "",
    },
    {
      id: "lmstudio",
      label: "LM Studio",
      type: "http",
      baseUrl: "http://localhost:1234/v1",
      model: "local-model",
      key: "",
    },
    {
      id: "claude",
      label: "Claude Code",
      type: "command",
      run: "claude -p {prompt}",
      bypassRun: "claude --dangerously-skip-permissions -p {prompt}",
    },
    {
      id: "codex",
      label: "Codex",
      type: "command",
      run: "codex exec {prompt}",
      bypassRun:
        "codex exec --dangerously-bypass-approvals-and-sandbox {prompt}",
    },
    {
      id: "opencode",
      label: "OpenCode",
      type: "command",
      run: "opencode run {prompt}",
    },
    { id: "pi", label: "Pi", type: "command", run: "pi {prompt}" },
  ],
  terminals: [
    { id: "claude-term", label: "Claude Code", run: "claude" },
    { id: "codex-term", label: "Codex", run: "codex" },
    { id: "opencode-term", label: "OpenCode", run: "opencode" },
  ],
  defaultProvider: "ollama",
  defaultTerminal: "claude-term",
  permissionMode: "ask",
};

export const DEFAULT_AI_SETTINGS_JSON = JSON.stringify(
  DEFAULT_AI_SETTINGS,
  null,
  2,
);

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseProvider(raw: unknown): Provider | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string" || typeof value.label !== "string") {
    return null;
  }

  if (value.type === "http") {
    if (
      typeof value.baseUrl !== "string" ||
      typeof value.model !== "string"
    ) {
      return null;
    }
    return {
      id: value.id,
      label: value.label,
      type: "http",
      baseUrl: value.baseUrl,
      model: value.model,
      key: stringValue(value.key),
    };
  }

  if (value.type === "command" && typeof value.run === "string") {
    return {
      id: value.id,
      label: value.label,
      type: "command",
      run: value.run,
      bypassRun:
        typeof value.bypassRun === "string" ? value.bypassRun : undefined,
    };
  }

  return null;
}

function parseTerminal(raw: unknown): TerminalEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.label !== "string" ||
    typeof value.run !== "string"
  ) {
    return null;
  }
  return { id: value.id, label: value.label, run: value.run };
}

export function parseAISettings(raw: string): AISettings {
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_AI_SETTINGS };
    }
    data = parsed as Record<string, unknown>;
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }

  const parsedProviders = Array.isArray(data.providers)
    ? (data.providers.map(parseProvider).filter(Boolean) as Provider[])
    : DEFAULT_AI_SETTINGS.providers;
  const parsedTerminals = Array.isArray(data.terminals)
    ? (data.terminals.map(parseTerminal).filter(Boolean) as TerminalEntry[])
    : DEFAULT_AI_SETTINGS.terminals;
  const providers = parsedProviders.length
    ? parsedProviders
    : DEFAULT_AI_SETTINGS.providers;
  const terminals = parsedTerminals.length
    ? parsedTerminals
    : DEFAULT_AI_SETTINGS.terminals;
  const requestedProvider = stringValue(data.defaultProvider);
  const requestedTerminal = stringValue(data.defaultTerminal);
  const permissionMode: PermissionMode =
    data.permissionMode === "bypass" ? "bypass" : "ask";

  return {
    providers,
    terminals,
    defaultProvider: providers.some(
      (provider) => provider.id === requestedProvider,
    )
      ? requestedProvider
      : providers[0].id,
    defaultTerminal: terminals.some(
      (terminal) => terminal.id === requestedTerminal,
    )
      ? requestedTerminal
      : terminals[0].id,
    permissionMode,
  };
}
