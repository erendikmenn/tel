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

/** Dünya haberleri kaynakları — "gündem" baskısının havuzu. */
export const WORLD_SOURCES = new Set(
  FEEDS.filter((feed) => feed.group === "dunya").map((feed) => feed.name),
);

/**
 * Ekonomi bölümü için GÜÇLÜ sinyaller. Konu sınıflandırıcısı tek başına
 * yetmiyor: "bank cards" → "bank", "gambling advertising" → "advertising"
 * eşleşip bölüme kumar/kart haberleri düşüyordu (ölçüldü). Bu yüzden ekonomi
 * havuzu = konusu ekonomi OLAN ve başlığında bu kelimelerden birini taşıyanlar.
 */
const EKONOMI_STEMS = [
  "fed", "faiz", "enflas", "infla", "reses", "recess", "borsa", "piyasa", "tarif",
  "petrol", "oil", "dolar", "dollar", "euro", "butce", "budget", "issiz", "unemploy",
  "finan", "ekonom", "hisse", "stock", "borc", "debt", "vergi", "gdp", "ihracat",
  "export", "ithalat", "import", "sanayi", "industr", "ticaret", "trade",
];

/**
 * Başlıkta güçlü bir ekonomi sinyali var mı? Kök eşleşmesi kullanılır
 * ("finan" → finance/financial/finans, "ekonom" → economy/economic/ekonomi).
 * Böylece "bank cards" gibi yanlış eşleşmeler bölüme haber taşımıyor.
 */
function hasEconomySignal(title: string) {
  const words = normalizeText(title).split(" ");
  return EKONOMI_STEMS.some((stem) => words.some((word) => word.startsWith(stem)));
}

export type PaperSectionId = "ai" | "ekonomi" | "gundem";

/**
 * Türkiye sinyali: kaynak Türkçe yayın yapıyorsa ya da başlıkta ülke/market
 * geçiyorsa bu haber ön sayfada öne alınır. Ekonomi baskısı yalnızca Fed
 * haberleriyle doluyordu; "Borsa düştü, tutuklamalar" gibi manşetlik haberler
 * sayfaya hiç girmiyordu (ölçüldü).
 */
export const HOME_SOURCES = new Set([
  "BBC Türkçe",
  "Bloomberg HT",
  "Dünya",
  "Ekonomim",
  "Investing.com TR",
  "Hürriyet Ekonomi",
]);

const HOME_STEMS = ["turkiye", "istanbul", "borsa", "lira", "tcmb", "merkez", "bayrakli"];

export function isHomeItem(item: DigestItem) {
  if (HOME_SOURCES.has(item.source)) return true;
  const words = normalizeText(item.title).split(" ");
  return HOME_STEMS.some((stem) => words.some((word) => word.startsWith(stem)));
}

export type PaperSection = {
  id: PaperSectionId;
  /** Künyede görünen ad: "Yapay zekâ baskısı" gibi. */
  label: string;
  /** Kısa etiket (bölüm seçici). */
  short: string;
  /** Kalem bu bölüme giriyor mu? */
  match: (item: DigestItem) => boolean;
  /** Türkiye sinyalli haberler öne alınsın mı? (yerel gündem baskıları) */
  homeFirst?: boolean;
};

/** Bölümler: her biri kendi havuzundan, aynı kurallarla dizilir. */
export const PAPER_SECTIONS: PaperSection[] = [
  {
    id: "ai",
    label: "Yapay zekâ baskısı",
    short: "Yapay zekâ",
    match: (item) => isAiItem(item),
  },
  {
    id: "ekonomi",
    label: "Finans & Ekonomi baskısı",
    short: "Finans & Ekonomi",
    homeFirst: true,
    match: (item) => (item.topics ?? []).includes("ekonomi") && hasEconomySignal(item.title),
  },
  {
    id: "gundem",
    label: "Gündem baskısı",
    short: "Gündem",
    homeFirst: true,
    match: (item) => WORLD_SOURCES.has(item.source),
  },
];

export function findSection(id: string | undefined): PaperSection {
  return PAPER_SECTIONS.find((section) => section.id === id) ?? PAPER_SECTIONS[0];
}

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
// Kısa kısa: 3 kolona tam 3'er öğe (9). 8 olsaydı son kolonun ortası boş kalıyordu.
export const PAPER_BRIEFS = 9;

export const PAPER_LEAD_SUMMARY = 420;
export const PAPER_STORY_SUMMARY = 240;
/** Üst bant için kısa başlık sınırı. */
const STRIP_TITLE_MAX = 64;

export type Paper = {
  section: PaperSection;
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

export function buildPaper(
  items: DigestItem[],
  now = Date.now(),
  section: PaperSection = PAPER_SECTIONS[0],
): Paper {
  const ranked = items
    .filter((item) => section.match(item))
    .map((item) => ({
      item,
      // Yerel gündem baskılarında Türkiye sinyali +3 puan.
      score: paperScore(item, now) + (section.homeFirst && isHomeItem(item) ? 3 : 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.item.isoDate ?? "") - Date.parse(a.item.isoDate ?? "") ||
        a.item.title.localeCompare(b.item.title, "tr"),
    )
    .map((row) => row.item);

  // ÖNCE fotoğraflı yerler doldurulur (manşet + 3 haber): bant ve yanlar
  // görselli haberleri tüketirse alt sıra fotoğrafsız kalıyordu (ölçüldü).
  const photoSlots = 1 + PAPER_STORIES;
  const photos = ranked.filter((item) => item.image).slice(0, photoSlots);
  const lead = photos[0] ?? ranked[0];
  const stories = photos.slice(1);
  const rest = ranked.filter((item) => item !== lead && !stories.includes(item));

  // Üst bant: kısa başlıklar (dar kolonlara sığsın).
  const strip = rest.filter((item) => item.title.length <= STRIP_TITLE_MAX).slice(0, PAPER_STRIP);
  const afterStrip = rest.filter((item) => !strip.includes(item));

  // Fotoğrafın iki yanı: manşetten sonraki iki haber (kısa başlıklılar önce).
  const flankers = afterStrip
    .filter((item) => item.title.length <= 100)
    .slice(0, PAPER_FLANKERS);
  const afterStories = afterStrip.filter((item) => !flankers.includes(item));

  const sidebar = afterStories.slice(0, PAPER_SIDEBAR);
  const briefs = afterStories.slice(PAPER_SIDEBAR, PAPER_SIDEBAR + PAPER_BRIEFS);

  const used = [lead, ...strip, ...flankers, ...stories, ...sidebar, ...briefs].filter(
    (item): item is DigestItem => Boolean(item),
  );

  return {
    section,
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
