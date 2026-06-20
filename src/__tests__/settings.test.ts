import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  normalizeThemeName,
  parseSettings,
  THEME_OPTIONS,
} from "../settings";

describe("parseSettings", () => {
  it("returns defaults for invalid JSON", () => {
    expect(parseSettings("{ not json")).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults for empty object", () => {
    expect(parseSettings("{}")).toEqual(DEFAULT_SETTINGS);
  });

  it("merges partial settings over defaults", () => {
    const settings = parseSettings('{ "theme": "nord", "main": { "size": 20 } }');
    expect(settings.theme).toBe("nord");
    expect(settings.main.size).toBe(20);
    expect(settings.main.font).toBe(DEFAULT_SETTINGS.main.font);
    expect(settings.explorer).toEqual(DEFAULT_SETTINGS.explorer);
  });

  it("falls back to dark for unknown theme", () => {
    expect(parseSettings('{ "theme": "neon" }').theme).toBe("dark");
  });

  it("accepts human-readable theme names", () => {
    expect(parseSettings('{ "theme": "Everforest Dark" }').theme).toBe(
      "everforest-dark",
    );
    expect(parseSettings('{ "theme": "Catppuccin Mocha" }').theme).toBe(
      "catppuccin-mocha",
    );
  });

  it("normalizes every installed theme option", () => {
    for (const option of THEME_OPTIONS) {
      expect(normalizeThemeName(option.label)).toBe(option.id);
      expect(normalizeThemeName(option.id)).toBe(option.id);
    }
  });

  it("clamps size into 10..28", () => {
    expect(parseSettings('{ "main": { "size": 200 } }').main.size).toBe(28);
    expect(parseSettings('{ "main": { "size": 2 } }').main.size).toBe(10);
  });

  it("ignores non-boolean restoreSession", () => {
    expect(parseSettings('{ "restoreSession": "yes" }').restoreSession).toBe(true);
  });

  it("parses the automatic update preference", () => {
    expect(parseSettings('{ "autoUpdate": true }').autoUpdate).toBe(true);
    expect(parseSettings('{ "autoUpdate": "yes" }').autoUpdate).toBe(false);
  });
});
