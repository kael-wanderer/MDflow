export type DiffLine = {
  type: "same" | "add" | "del";
  text: string;
};

export function lineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const oldLength = oldLines.length;
  const newLength = newLines.length;
  const lcs: number[][] = Array.from(
    { length: oldLength + 1 },
    () => new Array(newLength + 1).fill(0),
  );

  for (let oldIndex = oldLength - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLength - 1; newIndex >= 0; newIndex -= 1) {
      lcs[oldIndex][newIndex] =
        oldLines[oldIndex] === newLines[newIndex]
          ? lcs[oldIndex + 1][newIndex + 1] + 1
          : Math.max(
              lcs[oldIndex + 1][newIndex],
              lcs[oldIndex][newIndex + 1],
            );
    }
  }

  const output: DiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldLength && newIndex < newLength) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      output.push({ type: "same", text: oldLines[oldIndex] });
      oldIndex += 1;
      newIndex += 1;
    } else if (
      lcs[oldIndex + 1][newIndex] >= lcs[oldIndex][newIndex + 1]
    ) {
      output.push({ type: "del", text: oldLines[oldIndex] });
      oldIndex += 1;
    } else {
      output.push({ type: "add", text: newLines[newIndex] });
      newIndex += 1;
    }
  }
  while (oldIndex < oldLength) {
    output.push({ type: "del", text: oldLines[oldIndex] });
    oldIndex += 1;
  }
  while (newIndex < newLength) {
    output.push({ type: "add", text: newLines[newIndex] });
    newIndex += 1;
  }
  return output;
}
