import { describe, it, expect, beforeEach } from "vitest";
import { loadState, saveState } from "../state";

describe("state", () => {
  beforeEach(() => localStorage.clear());

  it("returns defaults when nothing stored", () => {
    expect(loadState()).toEqual({ viewMode: "split", zoom: 1, softWrap: true });
  });

  it("round-trips saved state", () => {
    saveState({ viewMode: "preview", zoom: 1.2, softWrap: false });
    expect(loadState()).toEqual({ viewMode: "preview", zoom: 1.2, softWrap: false });
  });

  it("falls back to defaults on corrupt json", () => {
    localStorage.setItem("mdflow.ui", "{not json");
    expect(loadState()).toEqual({ viewMode: "split", zoom: 1, softWrap: true });
  });

  it("merges partial stored state over defaults", () => {
    localStorage.setItem("mdflow.ui", JSON.stringify({ viewMode: "editor" }));
    expect(loadState()).toEqual({ viewMode: "editor", zoom: 1, softWrap: true });
  });
});
