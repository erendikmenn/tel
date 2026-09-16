import Parser from "rss-parser";
import { FEEDS } from "../../src/lib/feeds";
import { MAX_AGE_HOURS, MAX_ITEMS } from "../../src/lib/config";
import { normalizeText } from "../../src/lib/text";
import { classify } from "../../src/lib/topics";
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
      if (iso && Date.now() - Date.parse(iso) > MAX_AGE_HOURS * 3600_000) continue;
      const title = stripHtml(raw.title);
      const key = normalizeText(title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const rawSummary = raw.contentSnippet ? stripHtml(raw.contentSnippet) : undefined;
      const summary = rawSummary && normalizeText(rawSummary) !== key ? rawSummary : undefined;
      items.push({
        id: raw.guid ?? raw.link,
        title,
        link: raw.link,
        source: feed.name,
        isoDate: iso,
        summary,
        topics: classify({ title, summary, source: feed.name }),
      });
    }
  }

  items.sort((a, b) => Date.parse(b.isoDate ?? "") - Date.parse(a.isoDate ?? ""));
  return items.slice(0, MAX_ITEMS);
}
