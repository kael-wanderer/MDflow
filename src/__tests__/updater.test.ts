import { describe, expect, it } from "vitest";
import {
  shouldCheckForUpdates,
  UPDATE_CHECK_INTERVAL_MS,
} from "../updater";

describe("shouldCheckForUpdates", () => {
  it("never checks when automatic updates are disabled", () => {
    expect(shouldCheckForUpdates(false, null, 100)).toBe(false);
  });

  it("checks immediately when enabled and never checked", () => {
    expect(shouldCheckForUpdates(true, null, 100)).toBe(true);
  });

  it("checks again after one day", () => {
    expect(shouldCheckForUpdates(true, 100, 100 + UPDATE_CHECK_INTERVAL_MS - 1)).toBe(
      false,
    );
    expect(shouldCheckForUpdates(true, 100, 100 + UPDATE_CHECK_INTERVAL_MS)).toBe(
      true,
    );
  });
});
