import { describe, it, expect } from "vitest";
import {
  QUICK_ACTIONS,
  actionScope,
  resolveQuickProvider,
} from "../ai/quick-actions";
import { DEFAULT_AI_SETTINGS } from "../ai/aisettings";

describe("quick-action catalog", () => {
  it("defines the four v1 actions with correct kinds", () => {
    const byId = Object.fromEntries(QUICK_ACTIONS.map((a) => [a.id, a]));
    expect(byId["ai.quick.proofread"].kind).toBe("edit");
    expect(byId["ai.quick.rewrite"].kind).toBe("edit");
    expect(byId["ai.quick.summarize"].kind).toBe("chat");
    expect(byId["ai.quick.outline"].kind).toBe("chat");
    for (const action of QUICK_ACTIONS) {
      expect(action.prompt.trim().length).toBeGreaterThan(0);
      expect(action.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("actionScope", () => {
  it("uses the selection when present", () => {
    expect(actionScope("picked", "whole doc")).toEqual({
      text: "picked",
      whole: false,
    });
  });
  it("falls back to the whole document when selection is empty", () => {
    expect(actionScope("   ", "whole doc")).toEqual({
      text: "whole doc",
      whole: true,
    });
  });
});

describe("resolveQuickProvider", () => {
  it("returns quickActionProvider when it names a real provider", () => {
    const settings = { ...DEFAULT_AI_SETTINGS, quickActionProvider: "openai" };
    expect(resolveQuickProvider(settings)).toBe("openai");
  });
  it("falls back to defaultProvider when unset", () => {
    expect(resolveQuickProvider(DEFAULT_AI_SETTINGS)).toBe(
      DEFAULT_AI_SETTINGS.defaultProvider,
    );
  });
  it("falls back when quickActionProvider names a missing provider", () => {
    const settings = { ...DEFAULT_AI_SETTINGS, quickActionProvider: "nope" };
    expect(resolveQuickProvider(settings)).toBe(
      DEFAULT_AI_SETTINGS.defaultProvider,
    );
  });
});
