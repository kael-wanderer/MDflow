import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_SETTINGS,
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
    expect(settings.terminals).toHaveLength(1);
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

  it("keeps bypass command and permission mode", () => {
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
    expect(settings.permissionMode).toBe("bypass");
    expect(settings.providers[0]).toMatchObject({
      bypassRun: "x --yes {prompt}",
    });
  });
});
