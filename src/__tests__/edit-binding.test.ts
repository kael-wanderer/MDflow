import { describe, expect, it } from "vitest";
import { validateBinding, type EditBinding } from "../ai/edit-binding";
import { hashText } from "../hash";

const binding = (text: string): EditBinding => ({
  windowId: "main",
  tabId: "t1",
  baseHash: hashText(text),
  selection: "",
  from: 0,
  to: 0,
});

describe("validateBinding", () => {
  it("allows an unchanged source tab", () => {
    expect(validateBinding(binding("hello"), () => "hello")).toBe("apply");
  });

  it("rejects changed source text", () => {
    expect(validateBinding(binding("hello"), () => "HELLO")).toBe("changed");
  });

  it("rejects a closed source tab", () => {
    expect(validateBinding(binding("hello"), () => null)).toBe("closed");
  });
});
