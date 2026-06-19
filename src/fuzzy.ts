export function fuzzyMatch(query: string, text: string): number | null {
  if (!query) return 0;
  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();
  let queryIndex = 0;
  let score = 0;
  let lastHit = -2;

  for (
    let textIndex = 0;
    textIndex < normalizedText.length && queryIndex < normalizedQuery.length;
    textIndex++
  ) {
    if (normalizedText[textIndex] !== normalizedQuery[queryIndex]) continue;
    score += lastHit === textIndex - 1 ? 3 : 1;
    if (textIndex === 0 || /[/\\ _.\-]/.test(normalizedText[textIndex - 1])) score += 2;
    lastHit = textIndex;
    queryIndex++;
  }

  if (queryIndex < normalizedQuery.length) return null;
  return score - normalizedText.length * 0.01;
}

export function rankItems<T>(
  query: string,
  items: T[],
  key: (item: T) => string,
): T[] {
  if (!query) return items;
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const score = fuzzyMatch(query, key(item));
    if (score !== null) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.item);
}
