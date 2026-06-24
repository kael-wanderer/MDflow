import { describe, expect, it } from "vitest";
import { buildIndex, retrieve } from "../ai/retrieval";

const chunks = [
  { path: "/a.md", heading: "Auth", text: "login uses okta saml single sign on" },
  { path: "/b.md", heading: "Email", text: "smtp settings for outbound email relay" },
  { path: "/c.md", heading: "Okta", text: "okta okta okta provisioning and scim" },
];

describe("retrieve (BM25)", () => {
  it("ranks the most relevant chunk first", () => {
    const index = buildIndex(chunks);
    const hits = retrieve(index, "okta provisioning", 3);
    expect(hits[0].path).toBe("/c.md");
  });

  it("returns at most k hits with positive score only", () => {
    const index = buildIndex(chunks);
    const hits = retrieve(index, "okta", 1);
    expect(hits).toHaveLength(1);
    expect(retrieve(index, "nonexistentterm", 5)).toEqual([]);
  });

  it("excludes the active document path", () => {
    const index = buildIndex(chunks);
    const hits = retrieve(index, "okta", 5, "/c.md");
    expect(hits.some((hit) => hit.path === "/c.md")).toBe(false);
    expect(hits[0].path).toBe("/a.md");
  });

  it("handles an empty index", () => {
    expect(retrieve(buildIndex([]), "anything", 5)).toEqual([]);
  });
});
