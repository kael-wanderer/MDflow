import { describe, expect, it } from "vitest";
import { explorerDropDirectory, logicalDropPoint } from "../file-drop";

describe("logicalDropPoint", () => {
  it("keeps coordinates that are already in CSS pixels", () => {
    expect(
      logicalDropPoint({ x: 240, y: 160 }, { width: 800, height: 600 }, 2),
    ).toEqual({ x: 240, y: 160 });
  });

  it("converts physical pixels when they exceed the viewport", () => {
    expect(
      logicalDropPoint({ x: 1200, y: 800 }, { width: 800, height: 600 }, 2),
    ).toEqual({ x: 600, y: 400 });
  });
});

describe("explorerDropDirectory", () => {
  it("uses a hovered folder as the destination", () => {
    expect(explorerDropDirectory("/project", "/project/assets", true)).toBe(
      "/project/assets",
    );
  });

  it("uses the parent of a hovered file", () => {
    expect(explorerDropDirectory("/project", "/project/src/main.ts", false)).toBe(
      "/project/src",
    );
  });

  it("uses the Explorer root when no row is hovered", () => {
    expect(explorerDropDirectory("/project", null, false)).toBe("/project");
  });
});
