import { describe, expect, it } from "vitest";
import { buildMessages } from "../ai/conversation";

describe("buildMessages", () => {
  it("injects the document and the prompt", () => {
    const output = buildMessages({
      history: [],
      prompt: "summarize",
      docText: "# Hi",
      selection: "",
      editMode: false,
    });
    expect(output[0].role).toBe("system");
    expect(output.some((message) => message.content.includes("# Hi"))).toBe(
      true,
    );
    expect(output[output.length - 1]).toEqual({
      role: "user",
      content: "summarize",
    });
  });

  it("prioritizes the selection when present", () => {
    const output = buildMessages({
      history: [],
      prompt: "fix",
      docText: "full doc",
      selection: "just this",
      editMode: false,
    });
    expect(
      output.find((message) => message.content.includes("just this")),
    ).toBeTruthy();
    expect(
      output.some((message) => message.content.includes("full doc")),
    ).toBe(false);
  });

  it("adds an edit instruction in edit mode", () => {
    const output = buildMessages({
      history: [],
      prompt: "rewrite",
      docText: "x",
      selection: "",
      editMode: true,
    });
    expect(output[0].content.toLowerCase()).toContain("return only");
  });

  it("keeps prior history", () => {
    const history = [{ role: "user" as const, content: "earlier" }];
    const output = buildMessages({
      history,
      prompt: "next",
      docText: "",
      selection: "",
      editMode: false,
    });
    expect(output.some((message) => message.content === "earlier")).toBe(
      true,
    );
  });
});
