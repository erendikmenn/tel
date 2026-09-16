import Parser from "rss-parser";
import { FEEDS } from "../../src/lib/feeds";
import { MAX_ITEMS } from "../../src/lib/config";
import { normalizeText } from "../../src/lib/text";
import type { DigestItem } from "../../src/lib/digest";

type RawItem = {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
};

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Canlı 5 RSS'ten gerçek kalemleri çeker (uygulamayla aynı: yaş sınırı yok, tekilleştirme + MAX_ITEMS). */
export async function fetchRealItems(): Promise<DigestItem[]> {
  const parser = new Parser({ timeout: 8000 });
  const seen = new Set<string>();
  const items: DigestItem[] = [];
  const results = await Promise.allSettled(
    FEEDS.map((feed) => parser.parseURL(feed.url).then((parsed) => ({ feed, parsed }))),
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { feed, parsed } = result.value;
    for (const raw of parsed.items as RawItem[]) {
      if (!raw.title || !raw.link) continue;
      const iso = raw.isoDate ?? raw.pubDate;
      const title = stripHtml(raw.title);
      const key = normalizeText(title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const summary = raw.contentSnippet ? stripHtml(raw.contentSnippet) : undefined;
      items.push({
        id: raw.guid ?? raw.link,
        title,
        link: raw.link,
        source: feed.name,
        isoDate: iso,
        summary: summary && normalizeText(summary) !== key ? summary : undefined,
      });
    }
  }

  items.sort((a, b) => Date.parse(b.isoDate ?? "") - Date.parse(a.isoDate ?? ""));
  return items.slice(0, MAX_ITEMS);
}
