import Parser from "rss-parser";
import { FEEDS } from "../../src/lib/feeds";
import { MAX_AGE_HOURS, MAX_ITEMS } from "../../src/lib/config";
import { normalizeText } from "../../src/lib/text";
import { classify } from "../../src/lib/topics";
import type { DigestItem } from "../../src/lib/digest";
import { itemImage, type ImageSource } from "../../src/lib/media";

type RawItem = {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  categories?: unknown[];
};

/** RSS <category>: düz metin ya da { _: "Business", $: {...} }. */
function itemCategories(raw: RawItem): string[] {
  if (!Array.isArray(raw.categories)) return [];
  return raw.categories
    .map((entry) => (typeof entry === "string" ? entry : ((entry as { _?: string })?._ ?? "")))
    .map((value) => value.trim())
    .filter(Boolean);
}

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
    let taken = 0;
    for (const raw of parsed.items as RawItem[]) {
      if (!raw.title || !raw.link) continue;
      const iso = raw.isoDate ?? raw.pubDate;
      if (iso && Date.now() - Date.parse(iso) > MAX_AGE_HOURS * 3600_000) continue;
      if (taken >= (feed.limit ?? Number.POSITIVE_INFINITY)) continue;
      taken += 1;
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
        // Görsel kuralı da test edilebilsin: fixture'da gerçek görsel URL'leri olsun.
        image: itemImage(raw as ImageSource),
        topics: classify({
          title,
          summary,
          source: feed.name,
          feedCategories: itemCategories(raw),
          feedTopics: feed.topic ? [feed.topic] : undefined,
        }),
      });
    }
  }

  items.sort((a, b) => Date.parse(b.isoDate ?? "") - Date.parse(a.isoDate ?? ""));
  return items.slice(0, MAX_ITEMS);
}
