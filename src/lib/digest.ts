import Parser from "rss-parser";
import { FEEDS } from "@/lib/feeds";
import { MAX_ITEMS } from "@/lib/config";
import { enlargeImage, pageImage } from "@/lib/image";
import { normalizeText } from "@/lib/text";

export type DigestItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  isoDate?: string;
  summary?: string;
  image?: string;
};

type MediaNode = {
  $?: {
    url?: string;
    type?: string;
    medium?: string;
    width?: string;
  };
};

type ParsedItem = Parser.Item & {
  mediaThumbnail?: MediaNode;
  mediaContent?: MediaNode | MediaNode[];
  "content:encoded"?: string;
};

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
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
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

function mediaUrl(node?: MediaNode) {
  const url = node?.$?.url;
  if (!url) return undefined;
  const type = node.$?.type ?? "";
  const medium = node.$?.medium ?? "";
  if (type && !type.startsWith("image/")) return undefined;
  if (medium && medium !== "image") return undefined;
  return url;
}

function itemImage(item: ParsedItem) {
  const enclosure = item.enclosure;
  if (enclosure?.url && (!enclosure.type || enclosure.type.startsWith("image/"))) {
    return enlargeImage(enclosure.url);
  }

  const thumb = mediaUrl(item.mediaThumbnail);
  if (thumb) return enlargeImage(thumb);

  const contents = Array.isArray(item.mediaContent)
    ? item.mediaContent
    : item.mediaContent
      ? [item.mediaContent]
      : [];
  const ranked = contents
    .map((node) => ({ url: mediaUrl(node), width: Number(node.$?.width || 0) }))
    .filter((node): node is { url: string; width: number } => Boolean(node.url))
    .sort((a, b) => b.width - a.width);
  if (ranked[0]) return enlargeImage(ranked[0].url);

  const html = item.content || item["content:encoded"] || "";
  return enlargeImage(html.match(/<img[^>]+src=["']([^"']+)/i)?.[1]);
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
    .flatMap((item) => {
      const parsed = item as ParsedItem;
      const title = stripHtml(parsed.title!);
      const key = normalizeText(title);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [
        {
          id: parsed.guid || parsed.link!,
          title,
          link: parsed.link!,
          source: feed.name,
          isoDate: parsed.isoDate ?? parsed.pubDate,
          summary: itemSummary(parsed, title),
          image: itemImage(parsed),
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
