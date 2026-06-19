import { describe, expect, it } from "vitest";
import { countWords } from "../windowview";

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("one")).toBe(1);
    expect(countWords(" one \n two\tthree ")).toBe(3);
  });
});
