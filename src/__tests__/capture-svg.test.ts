import { describe, expect, it } from "vitest";
import { nodeToSvg } from "../capture";

describe("nodeToSvg", () => {
  it("wraps serialized HTML in a sized foreignObject SVG", () => {
    const clone = { outerHTML: "<div><p>hi</p></div>" };
    const node = {
      clientWidth: 120,
      scrollHeight: 40,
      cloneNode: () => clone,
      getBoundingClientRect: () => ({
        width: 120,
        height: 40,
      }),
    } as unknown as HTMLElement;

    const svg = nodeToSvg(node);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('width="120"');
    expect(svg).toContain("foreignObject");
    expect(svg).toContain("<p>hi</p>");
  });
});
