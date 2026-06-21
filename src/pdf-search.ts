import { invoke } from "@tauri-apps/api/core";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { SearchHit, SearchOptions } from "./filesys";
import { firstSearchMatch } from "./search-match";

export async function searchPdf(
  path: string,
  relative: string,
  query: string,
  options: SearchOptions,
): Promise<SearchHit[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const bytes = await invoke<number[]>("read_file_bytes", { path });
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const hits: SearchHit[] = [];
  for (let page = 1; page <= pdf.numPages && hits.length < 50; page += 1) {
    const content = await (await pdf.getPage(page)).getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const match = firstSearchMatch(text, query, options);
    if (!match) continue;
    const from = Math.max(0, match.start - 70);
    const to = Math.min(text.length, match.end + 130);
    const snippet = text.slice(from, to);
    hits.push({
      path,
      relative,
      page,
      line: page,
      snippet,
      match_start: match.start - from,
      match_end: match.end - from,
    });
  }
  return hits;
}
