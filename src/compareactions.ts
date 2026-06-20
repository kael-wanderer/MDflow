export type CompareAction = {
  kind: "compare" | "select";
  label: string;
};

export function compareActions(selectedPath: string | null): CompareAction[] {
  return [
    ...(selectedPath
      ? [{ kind: "compare", label: "Compare with Selected" } as const]
      : []),
    { kind: "select", label: "Select for Compare" },
  ];
}
