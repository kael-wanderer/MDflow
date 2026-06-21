import { describe, expect, it } from "vitest";
import {
  clampAgentPanelWidth,
  maxAgentPanelWidth,
} from "../ai-layout";

describe("agent panel sizing", () => {
  it("allows up to 80% when the explorer is hidden", () => {
    expect(
      maxAgentPanelWidth({
        windowWidth: 1400,
        explorerVisible: false,
        explorerWidth: 240,
      }),
    ).toBe(1120);
  });

  it("preserves document space when the explorer is visible", () => {
    expect(
      maxAgentPanelWidth({
        windowWidth: 1000,
        explorerVisible: true,
        explorerWidth: 240,
      }),
    ).toBe(524);
  });

  it("clamps saved or dragged widths", () => {
    expect(
      clampAgentPanelWidth(2000, {
        windowWidth: 1200,
        explorerVisible: false,
        explorerWidth: 240,
      }),
    ).toBe(960);
  });
});
