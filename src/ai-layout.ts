export function maxAgentPanelWidth(options: {
  windowWidth: number;
  explorerVisible: boolean;
  explorerWidth: number;
}): number {
  const activityWidth = 48;
  const handlesWidth = options.explorerVisible ? 8 : 4;
  const explorerWidth = options.explorerVisible ? options.explorerWidth : 0;
  const minimumDocumentWidth = 180;
  const eightyPercent = Math.floor(options.windowWidth * 0.8);
  const remaining = Math.floor(
    options.windowWidth -
      activityWidth -
      handlesWidth -
      explorerWidth -
      minimumDocumentWidth,
  );
  return Math.max(240, Math.min(eightyPercent, remaining));
}

export function clampAgentPanelWidth(
  width: number,
  options: Parameters<typeof maxAgentPanelWidth>[0],
): number {
  return Math.max(240, Math.min(maxAgentPanelWidth(options), width));
}
