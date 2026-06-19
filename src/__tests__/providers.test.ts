import { describe, expect, it } from "vitest";
import type { HttpProvider } from "../ai/aisettings";
import {
  buildHttpBody,
  parseSSEDelta,
  substitutePrompt,
} from "../ai/providers";

const provider: HttpProvider = {
  id: "x",
  label: "X",
  type: "http",
  baseUrl: "u",
  model: "m",
  key: "",
};

describe("buildHttpBody", () => {
  it("produces a streaming OpenAI-compatible body", () => {
    const body = buildHttpBody(provider, [
      { role: "user", content: "hi" },
    ]) as {
      model: string;
      stream: boolean;
      messages: unknown[];
    };
    expect(body.model).toBe("m");
    expect(body.stream).toBe(true);
    expect(body.messages[0]).toEqual({ role: "user", content: "hi" });
  });
});

describe("parseSSEDelta", () => {
  it("extracts delta content", () => {
    expect(
      parseSSEDelta(
        'data: {"choices":[{"delta":{"content":"He"}}]}',
      ),
    ).toBe("He");
  });

  it("returns DONE on the terminator", () => {
    expect(parseSSEDelta("data: [DONE]")).toBe("DONE");
  });

  it("returns null for empty or non-data lines", () => {
    expect(parseSSEDelta("")).toBeNull();
    expect(parseSSEDelta(": ping")).toBeNull();
  });
});

describe("substitutePrompt", () => {
  it("replaces the {prompt} token with the full prompt as one arg", () => {
    expect(
      substitutePrompt("claude -p {prompt}", "hello world"),
    ).toEqual(["claude", "-p", "hello world"]);
  });
});
