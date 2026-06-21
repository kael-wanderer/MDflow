export type OutlineHeading = {
  level: number;
  text: string;
  line: number;
};

export function markdownOutline(source: string): OutlineHeading[] {
  const headings: OutlineHeading[] = [];
  source.split(/\r?\n/).forEach((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) return;
    headings.push({
      level: match[1].length,
      text: match[2],
      line: index + 1,
    });
  });
  return headings;
}
