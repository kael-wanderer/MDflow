import {
  addPdfEditOperation,
  removePdfEditOperation,
  type PdfEditDocument,
  type PdfEditOperation,
  type PdfPageBox,
} from "./pdf-edit-document";

export type PdfProofIssueKind =
  | "repeated-word"
  | "extra-space"
  | "space-before-punctuation"
  | "missing-space-after-punctuation"
  | "ocr-confusion";

export type PdfProofIssue = {
  id: string;
  operationId: string;
  page: number;
  kind: PdfProofIssueKind;
  message: string;
  replacement: string;
};

function textForOperation(operation: PdfEditOperation): string | null {
  if (operation.type === "textBox") return operation.text;
  if (operation.type === "replacementText") return operation.text.value;
  if (operation.type === "directTextEdit") return operation.replacementText;
  if (operation.type === "ocrTextBlock") return operation.text;
  return null;
}

function withOperationText(operation: PdfEditOperation, text: string): PdfEditOperation {
  if (operation.type === "textBox") return { ...operation, text };
  if (operation.type === "replacementText") {
    return { ...operation, text: { ...operation.text, value: text } };
  }
  if (operation.type === "directTextEdit") {
    return { ...operation, replacementText: text };
  }
  if (operation.type === "ocrTextBlock") return { ...operation, text };
  return operation;
}

export function proofreadPdfEditText(text: string): {
  issues: Array<{ kind: PdfProofIssueKind; message: string }>;
  replacement: string;
} {
  let replacement = text;
  const issues: Array<{ kind: PdfProofIssueKind; message: string }> = [];

  const repeatedWordPattern = /\b([A-Za-z][A-Za-z'-]*)\s+\1\b/gi;
  if (repeatedWordPattern.test(replacement)) {
    issues.push({ kind: "repeated-word", message: "Repeated word" });
    replacement = replacement.replace(repeatedWordPattern, "$1");
  }

  if (/[^\S\r\n]{2,}/.test(replacement)) {
    issues.push({ kind: "extra-space", message: "Extra spacing" });
    replacement = replacement.replace(/[^\S\r\n]{2,}/g, " ");
  }

  if (/\s+[,.!?;:]/.test(replacement)) {
    issues.push({ kind: "space-before-punctuation", message: "Space before punctuation" });
    replacement = replacement.replace(/\s+([,.!?;:])/g, "$1");
  }

  if (/[,.!?;:][A-Za-z]/.test(replacement)) {
    issues.push({
      kind: "missing-space-after-punctuation",
      message: "Missing space after punctuation",
    });
    replacement = replacement.replace(/([,.!?;:])([A-Za-z])/g, "$1 $2");
  }

  if (/\b([Il1])\s?([0O])\b/.test(replacement)) {
    issues.push({
      kind: "ocr-confusion",
      message: "Possible OCR I/O or 1/0 confusion",
    });
  }

  return { issues, replacement };
}

export function reflowPdfEditText(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) return "";
      if (lines.some((line) => /^([-*+]|\d+\.)\s+/.test(line))) {
        return lines.join("\n");
      }
      return lines.join(" ").replace(/[^\S\r\n]{2,}/g, " ");
    })
    .filter((paragraph) => paragraph.length > 0)
    .join("\n\n");
}

export function listPdfProofIssues(document: PdfEditDocument): PdfProofIssue[] {
  return document.pages.flatMap((page) =>
    page.operations.flatMap((operation) => {
      const text = textForOperation(operation);
      if (text === null) return [];
      const result = proofreadPdfEditText(text);
      if (result.replacement === text) return [];
      return result.issues.map((issue, index) => ({
        id: `${operation.id}:${issue.kind}:${index}`,
        operationId: operation.id,
        page: page.page,
        kind: issue.kind,
        message: issue.message,
        replacement: result.replacement,
      }));
    }),
  );
}

export function updatePdfEditOperationText(
  document: PdfEditDocument,
  page: PdfPageBox,
  operationId: string,
  text: string,
): PdfEditDocument {
  const operation = document.pages
    .find((item) => item.page === page.page)
    ?.operations.find((item) => item.id === operationId);
  if (!operation) return document;
  return addPdfEditOperation(
    removePdfEditOperation(document, operationId),
    page,
    withOperationText(operation, text),
  );
}

export function applyPdfProofIssue(
  document: PdfEditDocument,
  issue: PdfProofIssue,
): PdfEditDocument {
  const page = document.pages.find((item) => item.page === issue.page);
  if (!page) return document;
  return updatePdfEditOperationText(document, page, issue.operationId, issue.replacement);
}

export function reflowPdfEditOperationText(
  document: PdfEditDocument,
  page: PdfPageBox,
  operationId: string,
): PdfEditDocument {
  const operation = document.pages
    .find((item) => item.page === page.page)
    ?.operations.find((item) => item.id === operationId);
  const text = operation ? textForOperation(operation) : null;
  if (text === null) return document;
  return updatePdfEditOperationText(
    document,
    page,
    operationId,
    reflowPdfEditText(text),
  );
}
