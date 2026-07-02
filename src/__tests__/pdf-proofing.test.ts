import { describe, expect, it } from "vitest";
import {
  DEFAULT_PDF_TEXT_STYLE,
  addPdfEditOperation,
  createPdfEditDocument,
} from "../pdf-edit-document";
import {
  applyPdfProofIssue,
  listPdfProofIssues,
  proofreadPdfEditText,
  reflowPdfEditOperationText,
  reflowPdfEditText,
} from "../pdf-proofing";

describe("pdf proofing", () => {
  it("suggests conservative text cleanup", () => {
    expect(proofreadPdfEditText("The the  total ,is ready.")).toEqual({
      issues: [
        { kind: "repeated-word", message: "Repeated word" },
        { kind: "extra-space", message: "Extra spacing" },
        { kind: "space-before-punctuation", message: "Space before punctuation" },
        {
          kind: "missing-space-after-punctuation",
          message: "Missing space after punctuation",
        },
      ],
      replacement: "The total, is ready.",
    });
  });

  it("reflows paragraph-like line breaks without flattening lists", () => {
    expect(reflowPdfEditText("This is a\nwrapped line.\n\n- keep\n- list")).toBe(
      "This is a wrapped line.\n\n- keep\n- list",
    );
  });

  it("lists and applies proofing suggestions to PDF edit operations", () => {
    const page = { page: 1, width: 300, height: 200 };
    const document = addPdfEditOperation(createPdfEditDocument("pdf"), page, {
      id: "text-1",
      type: "textBox",
      page: 1,
      rect: { x: 10, y: 10, width: 100, height: 30 },
      text: "Hello  world!",
      style: DEFAULT_PDF_TEXT_STYLE,
    });
    const issues = listPdfProofIssues(document);
    expect(issues).toHaveLength(1);
    const fixed = applyPdfProofIssue(document, issues[0]);
    expect(fixed.pages[0].operations[0]).toMatchObject({ text: "Hello world!" });
  });

  it("reflows selected operation text", () => {
    const page = { page: 1, width: 300, height: 200 };
    const document = addPdfEditOperation(createPdfEditDocument("pdf"), page, {
      id: "text-1",
      type: "textBox",
      page: 1,
      rect: { x: 10, y: 10, width: 100, height: 30 },
      text: "Line one\nline two",
      style: DEFAULT_PDF_TEXT_STYLE,
    });
    const reflowed = reflowPdfEditOperationText(document, page, "text-1");
    expect(reflowed.pages[0].operations[0]).toMatchObject({ text: "Line one line two" });
  });
});
