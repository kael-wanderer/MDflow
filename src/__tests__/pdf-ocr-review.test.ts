import { describe, expect, it } from "vitest";
import { addPdfEditOperation, createPdfEditDocument } from "../pdf-edit-document";
import {
  listOcrReviewItems,
  removeOcrReviewItem,
  summarizeOcrReview,
  updateOcrReviewText,
} from "../pdf-ocr-review";

const page = { page: 1, width: 300, height: 200 };

describe("pdf OCR review helpers", () => {
  it("lists OCR blocks in page and vertical order", () => {
    let edits = createPdfEditDocument("sample");
    edits = addPdfEditOperation(edits, page, {
      id: "b",
      type: "ocrTextBlock",
      page: 1,
      rect: { x: 20, y: 80, width: 100, height: 12 },
      text: "second",
      confidence: 0.9,
    });
    edits = addPdfEditOperation(edits, page, {
      id: "a",
      type: "ocrTextBlock",
      page: 1,
      rect: { x: 20, y: 30, width: 100, height: 12 },
      text: "first",
      confidence: 0.6,
    });

    expect(listOcrReviewItems(edits).map((item) => item.id)).toEqual(["a", "b"]);
    expect(summarizeOcrReview(listOcrReviewItems(edits))).toEqual({
      total: 2,
      lowConfidence: 1,
    });
  });

  it("updates and removes OCR review text", () => {
    const edits = addPdfEditOperation(createPdfEditDocument("sample"), page, {
      id: "ocr-1",
      type: "ocrTextBlock",
      page: 1,
      rect: { x: 20, y: 30, width: 100, height: 12 },
      text: "teh",
      confidence: 0.5,
    });

    const updated = updateOcrReviewText(edits, "ocr-1", "the");
    expect(listOcrReviewItems(updated)[0]?.text).toBe("the");

    const removed = removeOcrReviewItem(updated, "ocr-1");
    expect(listOcrReviewItems(removed)).toEqual([]);
  });
});
