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

// Sayfadaki yerler (A4 tek sayfa)
export const PAPER_STRIP = 3; // üst bant teaser'ları
export const PAPER_FLANKERS = 2; // manşet fotoğrafının soluna/sağına konan haberler
export const PAPER_STORIES = 3; // fotoğraflı ikincil haberler
export const PAPER_SIDEBAR = 5; // çerçeveli yan sütun
export const PAPER_BRIEFS = 9; // kısa kısa

export const PAPER_LEAD_SUMMARY = 420;
export const PAPER_STORY_SUMMARY = 240;
/** Üst bant için kısa başlık sınırı. */
const STRIP_TITLE_MAX = 64;

export type Paper = {
  lead?: DigestItem;
  strip: DigestItem[];
  /** Manşet fotoğrafının soluna ve sağına yerleşen iki haber. */
  flankers: DigestItem[];
  stories: DigestItem[];
  sidebar: DigestItem[];
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

/** Manşet altı (deck): özetin ilk cümlesi — gazete kuralı, model değil. */
export function firstSentence(text: string | undefined, max = 160) {
  if (!text) return undefined;
  // 20 karakterden kısa "cümleler" kısaltma sayılır (ör. "ABD."), bölünmez.
  const match = text.match(/^(.{20,}?[.!?])\s/);
  return clipSummary(match ? match[1] : text, max);
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
  const rest = ranked.filter((item) => item.id !== lead?.id);

  // Üst bant: kısa başlıklar (dar kolonlara sığsın).
  const strip = rest.filter((item) => item.title.length <= STRIP_TITLE_MAX).slice(0, PAPER_STRIP);
  const afterStrip = rest.filter((item) => !strip.includes(item));

  // Fotoğrafın iki yanı: manşetten sonraki iki haber (kısa başlıklılar önce).
  const flankers = afterStrip
    .filter((item) => item.title.length <= 100)
    .slice(0, PAPER_FLANKERS);
  const afterFlankers = afterStrip.filter((item) => !flankers.includes(item));

  const stories = afterFlankers.filter((item) => item.image).slice(0, PAPER_STORIES);
  const afterStories = afterFlankers.filter((item) => !stories.includes(item));

  const sidebar = afterStories.slice(0, PAPER_SIDEBAR);
  const briefs = afterStories.slice(PAPER_SIDEBAR, PAPER_SIDEBAR + PAPER_BRIEFS);

  const used = [lead, ...strip, ...flankers, ...stories, ...sidebar, ...briefs].filter(
    (item): item is DigestItem => Boolean(item),
  );

  return {
    lead,
    strip,
    flankers,
    stories,
    sidebar,
    briefs,
    pool: ranked.length,
    edition: editionNumber(new Date(now)),
    sources: [...new Set(used.map((item) => item.source))].sort((a, b) => a.localeCompare(b, "tr")),
  };
}
