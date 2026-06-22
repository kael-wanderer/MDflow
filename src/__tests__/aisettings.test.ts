import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_SETTINGS,
  extractLegacyKeys,
  parseAISettings,
} from "../ai/aisettings";

describe("parseAISettings", () => {
  it("returns defaults for invalid JSON", () => {
    expect(parseAISettings("nope")).toEqual(DEFAULT_AI_SETTINGS);
  });

  it("keeps valid providers and drops malformed ones", () => {
    const raw = JSON.stringify({
      providers: [
        {
          id: "a",
          label: "A",
          type: "http",
          baseUrl: "u",
          model: "m",
          key: "",
        },
        { id: "bad", type: "http" },
        {
          id: "c",
          label: "C",
          type: "command",
          run: "claude {prompt}",
        },
      ],
      terminals: [{ id: "t", label: "T", run: "claude" }],
      defaultProvider: "a",
      defaultTerminal: "t",
    });
    const settings = parseAISettings(raw);
    expect(settings.providers.map((provider) => provider.id)).toEqual([
      "a",
      "c",
    ]);
    expect(settings.terminals.map((terminal) => terminal.id)).toEqual([
      "t",
      "pi-term",
    ]);
    expect(settings.defaultProvider).toBe("a");
    expect(settings.permissionMode).toBe("ask");
  });

  it("falls back defaultProvider to first provider when unknown", () => {
    const raw = JSON.stringify({
      providers: [
        { id: "x", label: "X", type: "command", run: "r {prompt}" },
      ],
      defaultProvider: "missing",
    });
    expect(parseAISettings(raw).defaultProvider).toBe("x");
  });

  it("keeps the bypass command but never restores bypass mode", () => {
    const settings = parseAISettings(
      JSON.stringify({
        providers: [
          {
            id: "x",
            label: "X",
            type: "command",
            run: "x {prompt}",
            bypassRun: "x --yes {prompt}",
          },
        ],
        permissionMode: "bypass",
      }),
    );
    expect(settings.permissionMode).toBe("ask");
    expect(settings.providers[0]).toMatchObject({
      bypassRun: "x --yes {prompt}",
    });
  });

  it("bundles the current Anthropic model id", () => {
    const provider = DEFAULT_AI_SETTINGS.providers.find(
      (candidate) => candidate.id === "anthropic",
    );
    expect(provider?.type === "http" && provider.model).toBe(
      "claude-haiku-4-5-20251001",
    );
  });
});

describe("http providers carry no key", () => {
  it("parses an http provider without a key field", () => {
    const raw = JSON.stringify({
      providers: [
        {
          id: "a",
          label: "A",
          type: "http",
          baseUrl: "u",
          model: "m",
          key: "sekret",
        },
      ],
    });
    const provider = parseAISettings(raw).providers[0];
    expect(provider).not.toHaveProperty("key");
  });

  it("ships OpenAI, Anthropic, and OpenRouter templates", () => {
    const ids = DEFAULT_AI_SETTINGS.providers.map((provider) => provider.id);
    expect(ids).toEqual(
      expect.arrayContaining(["openai", "anthropic", "openrouter"]),
    );
    const openai = DEFAULT_AI_SETTINGS.providers.find(
      (provider) => provider.id === "openai",
    );
    expect(openai).not.toHaveProperty("key");
  });

  it("ships Pi as an interactive terminal program", () => {
    expect(DEFAULT_AI_SETTINGS.terminals).toContainEqual({
      id: "pi-term",
      label: "Pi",
      run: "pi",
    });
  });

  it("parses the selected external terminal app", () => {
    expect(
      parseAISettings(JSON.stringify({ terminalApp: "ghostty" })).terminalApp,
    ).toBe("ghostty");
    expect(
      parseAISettings(JSON.stringify({ terminalApp: "unknown" })).terminalApp,
    ).toBe("embedded");
  });
});

describe("extractLegacyKeys", () => {
  it("pulls non-empty http keys and strips them", () => {
    const raw = JSON.stringify({
      providers: [
        {
          id: "a",
          label: "A",
          type: "http",
          baseUrl: "u",
          model: "m",
          key: "k1",
        },
        {
          id: "b",
          label: "B",
          type: "http",
          baseUrl: "u",
          model: "m",
          key: "",
        },
        { id: "c", label: "C", type: "command", run: "r {prompt}" },
      ],
    });
    const { cleaned, keys } = extractLegacyKeys(raw);
    expect(keys).toEqual([{ id: "a", secret: "k1" }]);
    expect(cleaned).not.toContain("k1");
    expect(JSON.parse(cleaned).providers[0]).not.toHaveProperty("key");
  });

  it("returns the raw string unchanged on invalid JSON", () => {
    expect(extractLegacyKeys("nope")).toEqual({ cleaned: "nope", keys: [] });
  });

  it("returns no keys when none are present", () => {
    const raw = JSON.stringify({
      providers: [{ id: "c", label: "C", type: "command", run: "r" }],
    });
    expect(extractLegacyKeys(raw).keys).toEqual([]);
  });
});
