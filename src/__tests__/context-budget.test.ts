import { describe, expect, it } from "vitest";
import {
  contextTrimWarning,
  fitContext,
  type ContextBlock,
} from "../ai/context-budget";

function block(label: string, content: string): ContextBlock {
  return {
    prefix: `<${label}>\n`,
    content,
    suffix: `\n</${label}>`,
  };
}

describe("fitContext", () => {
  it("keeps context unchanged when it is under the cap", () => {
    const blocks = [block("document", "DOC"), block("attachment", "FILE")];
    const expected =
      "<document>\nDOC\n</document>\n\n<attachment>\nFILE\n</attachment>";

    expect(fitContext(blocks, expected.length + 10)).toEqual({
      text: expected,
      truncatedChars: 0,
    });
  });

  it("trims deterministically and reports the exact dropped count", () => {
    const blocks = [block("document", "abcdefghij")];
    const original = "<document>\nabcdefghij\n</document>";
    const cap = original.length - 4;
    const result = fitContext(blocks, cap);

    expect(result.text).toBe("<document>\nabcdef\n</document>");
    expect(result.text).toHaveLength(cap);
    expect(result.truncatedChars).toBe(4);
  });

  it("preserves the document before spending budget on attachments", () => {
    const documentBlock = block("document", "PRIMARY");
    const attachmentBlock = block("attachment", "SECONDARY");
    const documentText = "<document>\nPRIMARY\n</document>";
    const cap = documentText.length + 2 + "<attachment>\n\n</attachment>".length;
    const result = fitContext([documentBlock, attachmentBlock], cap);

    expect(result.text).toContain("<document>\nPRIMARY\n</document>");
    expect(result.text).toContain("<attachment>\n\n</attachment>");
    expect(result.text).not.toContain("SECONDARY");
    expect(result.truncatedChars).toBe("SECONDARY".length);
  });

  it("omits lower-priority blocks when their wrappers cannot fit", () => {
    const documentBlock = block("document", "PRIMARY");
    const attachmentBlock = block("attachment", "SECONDARY");
    const documentText = "<document>\nPRIMARY\n</document>";
    const original = `${documentText}\n\n<attachment>\nSECONDARY\n</attachment>`;
    const result = fitContext(
      [documentBlock, attachmentBlock],
      documentText.length + 1,
    );

    expect(result.text).toBe(documentText);
    expect(result.truncatedChars).toBe(original.length - documentText.length);
  });
});

describe("contextTrimWarning", () => {
  it("states the dropped character count and priority", () => {
    expect(contextTrimWarning(12_345)).toBe(
      "Context limit reached — dropped 12,345 characters. The document/selection was kept before attachments.",
    );
  });
});
