import {
  removePdfEditOperation,
  type PdfEditDocument,
  type PdfOcrTextBlockOperation,
} from "./pdf-edit-document";

export type PdfOcrReviewItem = {
  id: string;
  page: number;
  text: string;
  confidence: number;
  y: number;
};

export type PdfOcrReviewSummary = {
  total: number;
  lowConfidence: number;
};

export function listOcrReviewItems(edits: PdfEditDocument): PdfOcrReviewItem[] {
  return edits.pages
    .flatMap((page) =>
      page.operations.flatMap((operation) =>
        operation.type === "ocrTextBlock"
          ? [
              {
                id: operation.id,
                page: operation.page,
                text: operation.text,
                confidence: operation.confidence,
                y: operation.rect.y,
              },
            ]
          : [],
      ),
    )
    .sort((left, right) => left.page - right.page || left.y - right.y);
}

export function summarizeOcrReview(
  items: PdfOcrReviewItem[],
  lowConfidenceThreshold = 0.75,
): PdfOcrReviewSummary {
  return {
    total: items.length,
    lowConfidence: items.filter((item) => item.confidence < lowConfidenceThreshold).length,
  };
}

export function updateOcrReviewText(
  edits: PdfEditDocument,
  id: string,
  text: string,
): PdfEditDocument {
  return {
    ...edits,
    pages: edits.pages.map((page) => ({
      ...page,
      operations: page.operations.map((operation) =>
        operation.id === id && operation.type === "ocrTextBlock"
          ? ({ ...operation, text } satisfies PdfOcrTextBlockOperation)
          : operation,
      ),
    })),
  };
}

export function removeOcrReviewItem(edits: PdfEditDocument, id: string): PdfEditDocument {
  return removePdfEditOperation(edits, id);
}
