import Parser from "rss-parser";
import { FEEDS } from "@/lib/feeds";
import { MAX_AGE_HOURS, MAX_ITEMS } from "@/lib/config";
import { pageImage } from "@/lib/image";
import { itemImage, type MediaNode } from "@/lib/media";
import { decodeEntities, normalizeText } from "@/lib/text";
import { classify } from "@/lib/topics";

export type DigestItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  isoDate?: string;
  summary?: string;
  image?: string;
  /** Kural tabanlı konu etiketleri (en fazla 2). Boş = "Diğer". */
  topics?: string[];
};

type ParsedItem = Parser.Item & {
  mediaThumbnail?: MediaNode;
  mediaContent?: MediaNode | MediaNode[];
  "content:encoded"?: string;
};

/** RSS <category> değerleri: düz metin ya da { _: "Business", $: { domain } } olabilir. */
function itemCategories(item: ParsedItem): string[] {
  const raw = (item as { categories?: unknown }).categories;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) =>
      typeof entry === "string" ? entry : ((entry as { _?: string })?._ ?? ""),
    )
    .map((value) => value.trim())
    .filter(Boolean);
}

export type Digest = {
  items: DigestItem[];
  failedFeeds: string[];
};

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "Tel/0.1 (+https://tel.local)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content", "mediaContent", { keepArray: true }],
    ],
  },
});

function stripHtml(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function clip(value: string, max = 360) {
  if (value.length <= max) return value;
  const slice = value.slice(0, max);
  const cut = slice.lastIndexOf(" ");
  return `${(cut > 80 ? slice.slice(0, cut) : slice).trim()}…`;
}

function itemSummary(item: ParsedItem, title: string) {
  const raw = item.contentSnippet || item.summary || item.content || item["content:encoded"] || "";
  const text = stripHtml(raw);
  if (!text) return undefined;
  if (normalizeText(text) === normalizeText(title)) return undefined;
  return clip(text);
}

/** 30 günden eski kalem bayat/hatalı sayılır (feed'ler zaten birkaç günlük verir). */
function isSane(isoDate?: string) {
  if (!isoDate) return true;
  const then = Date.parse(isoDate);
  if (Number.isNaN(then)) return true;
  return Date.now() - then <= MAX_AGE_HOURS * 3600_000;
}

function itemTime(item: DigestItem) {
  if (!item.isoDate) return 0;
  const time = Date.parse(item.isoDate);
  return Number.isNaN(time) ? 0 : time;
}

async function fetchFeed(feed: (typeof FEEDS)[number]) {
  const parsed = await parser.parseURL(feed.url);
  const seen = new Set<string>();

  return (parsed.items ?? [])
    .filter((item) => item.title && item.link)
    .filter((item) => isSane(item.isoDate ?? item.pubDate))
    // Toplayıcı feed'ler (ör. Google News sorgusu) yüzlerce kalem döndürebiliyor;
    // havuzu domine etmemeleri için kaynak başına sınır verilebilir.
    .slice(0, feed.limit ?? Number.POSITIVE_INFINITY)
    .flatMap((item) => {
      const parsed = item as ParsedItem;
      const title = stripHtml(parsed.title!);
      const key = normalizeText(title);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      const summary = itemSummary(parsed, title);
      return [
        {
          id: parsed.guid || parsed.link!,
          title,
          link: parsed.link!,
          source: feed.name,
          isoDate: parsed.isoDate ?? parsed.pubDate,
          summary,
          image: itemImage(parsed),
          topics: classify({
            title,
            summary,
            source: feed.name,
            feedCategories: itemCategories(parsed),
            feedTopics: feed.topic ? [feed.topic] : undefined,
          }),
        },
      ];
    });
}

export async function buildDigest(): Promise<Digest> {
  const results = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed)));
  const items: DigestItem[] = [];
  const failedFeeds: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      failedFeeds.push(FEEDS[index].name);
      return;
    }
    items.push(...result.value);
  });

  items.sort((a, b) => itemTime(b) - itemTime(a));
  // Kaynak başına sınır yok; yalnızca genel güvenlik tavanı.
  const newest = items.slice(0, MAX_ITEMS);

  const filled = await Promise.all(
    newest.map(async (item) => {
      if (item.image) return item;
      return { ...item, image: await pageImage(item.link) };
    }),
  );

  return { items: filled, failedFeeds };
}
