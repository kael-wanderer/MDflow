import { describe, expect, it } from "vitest";
import { hashText } from "../hash";

describe("hashText", () => {
  it("is stable and returns eight lowercase hex characters", () => {
    expect(hashText("abc")).toBe(hashText("abc"));
    expect(hashText("abc")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("changes with the input and supports empty text", () => {
    expect(hashText("abc")).not.toBe(hashText("abd"));
    expect(hashText("")).toMatch(/^[0-9a-f]{8}$/);
  });
});
