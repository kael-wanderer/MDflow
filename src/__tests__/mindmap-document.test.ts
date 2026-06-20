import { describe, expect, it } from "vitest";
import { parseMindmap, serializeMindmap } from "../mindmap-document";

describe("parseMindmap", () => {
  it("returns a default root for empty input", () => {
    const mind = parseMindmap("   ");
    expect(mind.format).toBe("node_tree");
    expect(mind.data.id).toBe("root");
    expect(mind.data.topic).toBe("Central Idea");
  });

  it("throws a friendly error on invalid JSON", () => {
    expect(() => parseMindmap("{not json")).toThrow(/valid mindmap/i);
  });

  it("throws when the root data node is missing an id", () => {
    expect(() => parseMindmap('{"format":"node_tree","data":{}}')).toThrow(
      /valid mindmap/i,
    );
  });

  it("keeps a valid node_tree document", () => {
    const raw = JSON.stringify({
      meta: { name: "x" },
      format: "node_tree",
      data: { id: "root", topic: "Hi", children: [{ id: "a", topic: "A" }] },
    });
    const mind = parseMindmap(raw);
    expect(mind.data.topic).toBe("Hi");
    expect(mind.data.children?.[0].id).toBe("a");
  });
});

describe("serializeMindmap", () => {
  it("round-trips a parsed document and is pretty-printed", () => {
    const raw = serializeMindmap(parseMindmap(""));
    expect(raw).toContain('"format": "node_tree"');
    expect(raw).toContain('"topic": "Central Idea"');
    expect(parseMindmap(raw).data.id).toBe("root");
  });

  it("falls back to a default root when given junk", () => {
    expect(serializeMindmap(null)).toContain('"id": "root"');
  });
});
