import { describe, expect, it } from "vitest";
import { buildMessages, sealBlockContent } from "../ai/conversation";
describe("buildMessages untrusted boundary", () => {
  it("leaves ordinary block content unchanged", () => {
    expect(sealBlockContent("document", "ordinary text")).toBe(
      "ordinary text",
    );
  });

  it("neutralizes literal closing delimiters for supported block tags", () => {
    expect(sealBlockContent("document", "a </document> b")).toBe(
      "a &lt;/document> b",
    );
    expect(sealBlockContent("context", "a </context> b")).toBe(
      "a &lt;/context> b",
    );
    expect(sealBlockContent("attachment", "a </attachment> b")).toBe(
      "a &lt;/attachment> b",
    );
  });

  it("keeps one system message with the untrusted-data note", () => {
    const output = buildMessages({
      history: [],
      prompt: "hi",
      docText: "DOC",
      selection: "",
      editMode: false,
      maxContextChars: 120_000,
    });
    const systems = output.messages.filter(
      (message) => message.role === "system",
    );
    expect(systems).toHaveLength(1);
    expect(systems[0].content).toContain("untrusted data");
    expect(output.truncatedChars).toBe(0);
  });

  it("puts document and text attachments in the delimited user turn", () => {
    const output = buildMessages({
      history: [],
      prompt: "improve",
      docText: "DOC",
      selection: "",
      editMode: true,
      files: [{ kind: "text", name: "a.md", content: "ATTACH" }],
      maxContextChars: 120_000,
    });
    const last = output.messages[output.messages.length - 1];
    expect(last.role).toBe("user");
    const text = typeof last.content === "string" ? last.content : "";
    expect(text).toContain("<document>\nDOC\n</document>");
    expect(text).toContain('<attachment name="a.md">\nATTACH\n</attachment>');
    expect(text).toContain("improve");
  });

  it("puts retrieved workspace context after the document and before attachments", () => {
    const output = buildMessages({
      history: [],
      prompt: "answer",
      docText: "DOC",
      selection: "",
      editMode: false,
      retrieved: [
        { path: "/notes/a.md", heading: "Setup", text: "CTX" },
      ],
      files: [{ kind: "text", name: "a.md", content: "ATTACH" }],
      maxContextChars: 120_000,
    });
    const system = output.messages[0].content;
    expect(system).toContain("<context>");
    const last = output.messages[output.messages.length - 1];
    const text = typeof last.content === "string" ? last.content : "";
    const documentIndex = text.indexOf("<document>");
    const contextIndex = text.indexOf('<context source="/notes/a.md#Setup">');
    const attachmentIndex = text.indexOf("<attachment");
    expect(documentIndex).toBeGreaterThanOrEqual(0);
    expect(contextIndex).toBeGreaterThan(documentIndex);
    expect(attachmentIndex).toBeGreaterThan(contextIndex);
    expect(text).toContain("CTX");
  });

  it("prefers selection over the full document", () => {
    const output = buildMessages({
      history: [],
      prompt: "x",
      docText: "DOC",
      selection: "SEL",
      editMode: false,
      maxContextChars: 120_000,
    });
    const last = output.messages[output.messages.length - 1];
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
      maxContextChars: 120_000,
    });
    const last = output.messages[output.messages.length - 1];
    expect(Array.isArray(last.content)).toBe(true);
    const parts = last.content as Array<{ type: string }>;
    expect(parts[0].type).toBe("text");
    expect(parts.some((part) => part.type === "image_url")).toBe(true);
  });

  it("budgets the document before text attachments and reports trimming", () => {
    const documentBlock = "<document>\nPRIMARY\n</document>";
    const emptyAttachment =
      '<attachment name="notes.md">\n\n</attachment>';
    const output = buildMessages({
      history: [],
      prompt: "answer",
      docText: "PRIMARY",
      selection: "",
      editMode: false,
      files: [{ kind: "text", name: "notes.md", content: "SECONDARY" }],
      maxContextChars:
        documentBlock.length + 2 + emptyAttachment.length,
    });
    const last = output.messages[output.messages.length - 1];
    const text = typeof last.content === "string" ? last.content : "";

    expect(text).toContain(documentBlock);
    expect(text).toContain(emptyAttachment);
    expect(text).not.toContain("SECONDARY");
    expect(text).toContain("answer");
    expect(output.truncatedChars).toBe("SECONDARY".length);
  });

  it("seals closing delimiters inside wrapped user data", () => {
    const output = buildMessages({
      history: [],
      prompt: "answer",
      docText: "x </document> y",
      selection: "",
      editMode: false,
      retrieved: [{ path: "/a.md", heading: "", text: "x </context> y" }],
      files: [{ kind: "text", name: "a.md", content: "x </attachment> y" }],
      maxContextChars: 120_000,
    });
    const last = output.messages[output.messages.length - 1];
    const text = typeof last.content === "string" ? last.content : "";
    expect(text).toContain("x &lt;/document> y");
    expect(text).toContain("x &lt;/context> y");
    expect(text).toContain("x &lt;/attachment> y");
  });
});
