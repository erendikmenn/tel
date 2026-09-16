import type { DigestItem } from "./digest";
import { FEEDS } from "./feeds";
import { normalizeText } from "./text";

/**
 * Gazete baskısı: saf kural motoru. Model yok, rastgelelik yok — aynı veri
 * her zaman aynı sayfayı üretir.
 *
 * Havuz: yapay zekâ kaynakları (Feed.group === "ai") + başlığında AI geçen
 * diğer haberler. Sıralama: tazelik + görsel + başlığın sığması.
 */
export const AI_SOURCES = new Set(
  FEEDS.filter((feed) => feed.group === "ai").map((feed) => feed.name),
);

const AI_WORDS = [
  "ai", "gpt", "chatgpt", "claude", "gemini", "llm", "openai", "anthropic", "deepmind",
  "chatbot", "copilot", "midjourney", "nvidia", "yapay", "zeka", "zekasi", "zekaya",
  "zekanin", "makine", "ogrenmesi", "neural", "algoritma", "robot", "agent", "ajan",
  "model", "modelleri", "veri",
];

export const PAPER_FEATURES = 4;
export const PAPER_BRIEFS = 8;
export const PAPER_LEAD_SUMMARY = 240;
export const PAPER_FEATURE_SUMMARY = 150;

export type Paper = {
  lead?: DigestItem;
  features: DigestItem[];
  briefs: DigestItem[];
  /** Kaç aday arasından seçildi (teşhis için). */
  pool: number;
  /** Yılın kaçıncı günü — "Sayı 259" gibi. */
  edition: number;
  sources: string[];
};

export function isAiItem(item: DigestItem, aiSources: Set<string> = AI_SOURCES) {
  if (aiSources.has(item.source)) return true;
  const words = new Set(normalizeText(item.title).split(" ").filter(Boolean));
  return AI_WORDS.some((word) => words.has(word));
}

/** Tazelik (4) + görsel (2) + başlık sığması (2) = en fazla 8 puan. */
export function paperScore(item: DigestItem, now = Date.now()) {
  const hours = item.isoDate ? (now - Date.parse(item.isoDate)) / 3_600_000 : 999;
  const fresh = hours <= 3 ? 4 : hours <= 8 ? 3 : hours <= 24 ? 2 : 1;
  const image = item.image ? 2 : 0;
  const length = item.title.length;
  const fit = length <= 70 ? 2 : length <= 100 ? 1 : 0;
  return fresh + image + fit;
}

/** İstanbul saatiyle yılın kaçıncı günü. */
export function editionNumber(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const year = Number(parts.slice(0, 4));
  const month = Number(parts.slice(5, 7));
  const day = Number(parts.slice(8, 10));
  const start = Date.UTC(year, 0, 1);
  return Math.round((Date.UTC(year, month - 1, day) - start) / 86_400_000) + 1;
}

/** Uzun özetleri kelime sınırında keser (baskıda taşmasın). */
export function clipSummary(text: string | undefined, max: number) {
  if (!text) return undefined;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return head.trimEnd() + "…";
}

export function buildPaper(items: DigestItem[], now = Date.now()): Paper {
  const ranked = items
    .filter((item) => isAiItem(item))
    .map((item) => ({ item, score: paperScore(item, now) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.item.isoDate ?? "") - Date.parse(a.item.isoDate ?? "") ||
        a.item.title.localeCompare(b.item.title, "tr"),
    )
    .map((row) => row.item);

  // Manşet görselli olur; hiç görsel yoksa en iyi haber manşete geçer.
  const lead = ranked.find((item) => item.image) ?? ranked[0];
  const rest = lead ? ranked.filter((item) => item.id !== lead.id) : [];
  const features = rest.slice(0, PAPER_FEATURES);
  const briefs = rest.slice(PAPER_FEATURES, PAPER_FEATURES + PAPER_BRIEFS);
  const used = [lead, ...features, ...briefs].filter((item): item is DigestItem => Boolean(item));

  return {
    lead,
    features,
    briefs,
    pool: ranked.length,
    edition: editionNumber(new Date(now)),
    sources: [...new Set(used.map((item) => item.source))].sort((a, b) => a.localeCompare(b, "tr")),
  };
}
