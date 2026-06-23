import { describe, it, expect, vi } from "vitest";
import {
  QUICK_ACTIONS,
  actionScope,
  resolveQuickProvider,
  runQuickAction,
} from "../ai/quick-actions";
import { DEFAULT_AI_SETTINGS } from "../ai/aisettings";

vi.mock("../ai/client", () => ({
  streamChat: vi.fn(async (_p, _m, onChunk) => {
    onChunk("REVISED");
  }),
}));

describe("quick-action catalog", () => {
  it("defines the four v1 actions with correct kinds", () => {
    const byId = Object.fromEntries(QUICK_ACTIONS.map((a) => [a.id, a]));
    expect(byId["ai.quick.proofread"].kind).toBe("edit");
    expect(byId["ai.quick.rewrite"].kind).toBe("edit");
    expect(byId["ai.quick.summarize"].kind).toBe("chat");
    expect(byId["ai.quick.outline"].kind).toBe("chat");
    for (const action of QUICK_ACTIONS) {
      expect(action.prompt.trim().length).toBeGreaterThan(0);
      expect(action.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("actionScope", () => {
  it("uses the selection when present", () => {
    expect(actionScope("picked", "whole doc")).toEqual({
      text: "picked",
      whole: false,
    });
  });
  it("falls back to the whole document when selection is empty", () => {
    expect(actionScope("   ", "whole doc")).toEqual({
      text: "whole doc",
      whole: true,
    });
  });
});

describe("resolveQuickProvider", () => {
  it("returns quickActionProvider when it names a real provider", () => {
    const settings = { ...DEFAULT_AI_SETTINGS, quickActionProvider: "openai" };
    expect(resolveQuickProvider(settings)).toBe("openai");
  });
  it("falls back to defaultProvider when unset", () => {
    expect(resolveQuickProvider(DEFAULT_AI_SETTINGS)).toBe(
      DEFAULT_AI_SETTINGS.defaultProvider,
    );
  });
  it("falls back when quickActionProvider names a missing provider", () => {
    const settings = { ...DEFAULT_AI_SETTINGS, quickActionProvider: "nope" };
    expect(resolveQuickProvider(settings)).toBe(
      DEFAULT_AI_SETTINGS.defaultProvider,
    );
  });
});

function bubble() {
  return { textContent: "" as string | null };
}

function baseDeps(overrides = {}) {
  return {
    getSettings: () => DEFAULT_AI_SETTINGS,
    getProviderById: (id: string) =>
      DEFAULT_AI_SETTINGS.providers.find((p) => p.id === id),
    getDoc: () => ({
      text: "hello world",
      selection: "hello",
      windowId: "w1",
      tabId: "t1",
      from: 0,
      to: 5,
    }),
    reviewEdit: vi.fn(),
    appendBubble: vi.fn(() => bubble()),
    getWorkingDir: () => null,
    makeAbort: () => new AbortController(),
    ...overrides,
  };
}

describe("runQuickAction", () => {
  it("no-ops with a notice when selection and document are both empty", async () => {
    const append = vi.fn(() => bubble());
    await runQuickAction(QUICK_ACTIONS[0], {
      ...baseDeps(),
      getDoc: () => ({
        text: "",
        selection: "",
        windowId: "w1",
        tabId: "t1",
        from: 0,
        to: 0,
      }),
      appendBubble: append,
    });
    expect(append).toHaveBeenCalledWith(
      "system",
      expect.stringContaining("Nothing to"),
    );
  });

  it("errors when the resolved provider is missing", async () => {
    const append = vi.fn(() => bubble());
    await runQuickAction(QUICK_ACTIONS[0], {
      ...baseDeps(),
      getProviderById: () => undefined,
      appendBubble: append,
    });
    expect(append).toHaveBeenCalledWith("error", expect.any(String));
  });

  it("renders a chat-kind reply into a bubble", async () => {
    const el = bubble();
    const append = vi.fn(() => el);
    const review = vi.fn();
    await runQuickAction(
      QUICK_ACTIONS.find((a) => a.id === "ai.quick.summarize")!,
      { ...baseDeps(), appendBubble: append, reviewEdit: review },
    );
    expect(append).toHaveBeenCalledWith("assistant", "");
    expect(el.textContent).toBe("REVISED");
    expect(review).not.toHaveBeenCalled();
  });

  it("opens a diff review for an edit-kind action bound to the source", async () => {
    const review = vi.fn();
    await runQuickAction(
      QUICK_ACTIONS.find((a) => a.id === "ai.quick.proofread")!,
      { ...baseDeps(), reviewEdit: review },
    );
    expect(review).toHaveBeenCalledTimes(1);
    const [base, reply, binding] = review.mock.calls[0];
    expect(base).toBe("hello");
    expect(reply).toBe("REVISED");
    expect(binding).toMatchObject({ windowId: "w1", tabId: "t1", from: 0, to: 5 });
  });

  it("binds an edit to the whole document when nothing is selected", async () => {
    const review = vi.fn();
    await runQuickAction(
      QUICK_ACTIONS.find((a) => a.id === "ai.quick.rewrite")!,
      {
        ...baseDeps(),
        getDoc: () => ({
          text: "hello world",
          selection: "",
          windowId: "w1",
          tabId: "t1",
          from: 3,
          to: 3,
        }),
        reviewEdit: review,
      },
    );
    const [base, , binding] = review.mock.calls[0];
    expect(base).toBe("hello world");
    expect(binding).toMatchObject({ from: 0, to: "hello world".length, selection: "" });
  });
});
