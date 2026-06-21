import { describe, expect, it } from "vitest";
import { addRecent } from "../recent";

describe("addRecent", () => {
  it("moves duplicates to the front and respects the limit", () => {
    expect(addRecent(["a", "b", "c"], "b", 3)).toEqual(["b", "a", "c"]);
    expect(addRecent(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
  });
});
