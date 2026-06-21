export type MarkdownFormat =
  | "bold"
  | "italic"
  | "heading"
  | "link"
  | "code"
  | "quote"
  | "bullet"
  | "rule"
  | "task"
  | "table";

export type FormatResult = {
  text: string;
  anchor: number;
  head: number;
};

function replace(
  text: string,
  from: number,
  to: number,
  insert: string,
  anchor: number,
  head: number,
): FormatResult {
  return {
    text: `${text.slice(0, from)}${insert}${text.slice(to)}`,
    anchor,
    head,
  };
}

function wrapInline(
  text: string,
  from: number,
  to: number,
  marker: string,
  placeholder: string,
): FormatResult {
  const selected = text.slice(from, to);
  const markerLength = marker.length;
  if (
    selected &&
    text.slice(Math.max(0, from - markerLength), from) === marker &&
    text.slice(to, to + markerLength) === marker
  ) {
    const start = from - markerLength;
    return replace(
      text,
      start,
      to + markerLength,
      selected,
      start,
      start + selected.length,
    );
  }

  const content = selected || placeholder;
  const insert = `${marker}${content}${marker}`;
  return replace(
    text,
    from,
    to,
    insert,
    from + markerLength,
    from + markerLength + content.length,
  );
}

function selectedLineRange(
  text: string,
  from: number,
  to: number,
): { start: number; end: number } {
  const start = text.lastIndexOf("\n", Math.max(0, from - 1)) + 1;
  const effectiveEnd = to > from && text[to - 1] === "\n" ? to - 1 : to;
  const nextBreak = text.indexOf("\n", effectiveEnd);
  return { start, end: nextBreak === -1 ? text.length : nextBreak };
}

function toggleLinePrefix(
  text: string,
  from: number,
  to: number,
  prefix: string,
): FormatResult {
  const { start, end } = selectedLineRange(text, from, to);
  const lines = text.slice(start, end).split("\n");
  const allPrefixed = lines.every(
    (line) => !line.trim() || line.startsWith(prefix),
  );
  const transformed = lines
    .map((line) => {
      if (!line.trim()) return line;
      return allPrefixed
        ? line.slice(prefix.length)
        : `${prefix}${line}`;
    })
    .join("\n");
  return replace(text, start, end, transformed, start, start + transformed.length);
}

function cycleHeading(
  text: string,
  from: number,
  to: number,
): FormatResult {
  const { start, end } = selectedLineRange(text, from, to);
  const transformed = text
    .slice(start, end)
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      const match = /^(#{1,3})\s+(.*)$/.exec(line);
      if (!match) return `# ${line}`;
      if (match[1].length === 3) return match[2];
      return `${"#".repeat(match[1].length + 1)} ${match[2]}`;
    })
    .join("\n");
  return replace(text, start, end, transformed, start, start + transformed.length);
}

function insertLink(
  text: string,
  from: number,
  to: number,
): FormatResult {
  const selected = text.slice(from, to);
  const label = selected || "text";
  const insert = `[${label}](url)`;
  const selectionStart = selected ? from + label.length + 3 : from + 1;
  const selectionEnd = selected
    ? selectionStart + 3
    : selectionStart + label.length;
  return replace(text, from, to, insert, selectionStart, selectionEnd);
}

function insertRule(
  text: string,
  from: number,
  to: number,
): FormatResult {
  const { end } = selectedLineRange(text, from, to);
  const before = end > 0 ? "\n" : "";
  const after = end < text.length ? "\n" : "";
  const insert = `${before}---${after}`;
  const cursor = end + insert.length;
  return replace(text, end, end, insert, cursor, cursor);
}

function insertTable(
  text: string,
  from: number,
  to: number,
): FormatResult {
  const selected = text.slice(from, to).trim();
  const firstCell = selected || "Column 1";
  const insert = `| ${firstCell} | Column 2 | Column 3 |\n| --- | --- | --- |\n|  |  |  |`;
  const start = from + 2;
  return replace(text, from, to, insert, start, start + firstCell.length);
}

export function applyMarkdownFormat(
  text: string,
  from: number,
  to: number,
  format: MarkdownFormat,
): FormatResult {
  switch (format) {
    case "bold":
      return wrapInline(text, from, to, "**", "bold text");
    case "italic":
      return wrapInline(text, from, to, "*", "italic text");
    case "code":
      return wrapInline(text, from, to, "`", "code");
    case "link":
      return insertLink(text, from, to);
    case "heading":
      return cycleHeading(text, from, to);
    case "quote":
      return toggleLinePrefix(text, from, to, "> ");
    case "bullet":
      return toggleLinePrefix(text, from, to, "- ");
    case "rule":
      return insertRule(text, from, to);
    case "task":
      return toggleLinePrefix(text, from, to, "- [ ] ");
    case "table":
      return insertTable(text, from, to);
  }
}
