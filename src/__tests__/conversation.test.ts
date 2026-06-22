import { describe, expect, it } from "vitest";
import { buildMessages } from "../ai/conversation";
describe("buildMessages untrusted boundary", () => {
  it("keeps one system message with the untrusted-data note", () => {
    const output = buildMessages({
      history: [],
      prompt: "hi",
      docText: "DOC",
      selection: "",
      editMode: false,
    });
    const systems = output.filter((message) => message.role === "system");
    expect(systems).toHaveLength(1);
    expect(systems[0].content).toContain("untrusted data");
  });

  it("puts document and text attachments in the delimited user turn", () => {
    const output = buildMessages({
      history: [],
      prompt: "improve",
      docText: "DOC",
      selection: "",
      editMode: true,
      files: [{ kind: "text", name: "a.md", content: "ATTACH" }],
    });
    const last = output[output.length - 1];
    expect(last.role).toBe("user");
    const text = typeof last.content === "string" ? last.content : "";
    expect(text).toContain("<document>\nDOC\n</document>");
    expect(text).toContain('<attachment name="a.md">\nATTACH\n</attachment>');
    expect(text).toContain("improve");
  });

  it("prefers selection over the full document", () => {
    const output = buildMessages({
      history: [],
      prompt: "x",
      docText: "DOC",
      selection: "SEL",
      editMode: false,
    });
    const last = output[output.length - 1];
    const text = typeof last.content === "string" ? last.content : "";
    expect(text).toContain("<document>\nSEL\n</document>");
    expect(text).not.toContain("DOC");
  });

  it("keeps images as user multimodal parts with text first", () => {
    const output = buildMessages({
      history: [],
      prompt: "p",
      docText: "",
      selection: "",
      editMode: false,
      files: [
        {
          kind: "image",
          name: "i.png",
          dataUrl: "data:image/png;base64,AAA",
        },
      ],
    });
    const last = output[output.length - 1];
    expect(Array.isArray(last.content)).toBe(true);
    const parts = last.content as Array<{ type: string }>;
    expect(parts[0].type).toBe("text");
    expect(parts.some((part) => part.type === "image_url")).toBe(true);
  });
});
