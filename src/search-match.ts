import type { SearchOptions } from "./filesys";

export function searchExpression(
  query: string,
  options: SearchOptions,
): RegExp | null {
  const escaped = options.regex
    ? query
    : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = options.wholeWord ? `\\b(?:${escaped})\\b` : escaped;
  try {
    return new RegExp(source, options.caseSensitive ? "g" : "gi");
  } catch {
    return null;
  }
}

export function firstSearchMatch(
  text: string,
  query: string,
  options: SearchOptions,
): { start: number; end: number } | null {
  const expression = searchExpression(query, options);
  const match = expression?.exec(text);
  return match
    ? { start: match.index, end: match.index + match[0].length }
    : null;
}
