import type { DigestItem } from "./digest";
import { FEEDS } from "./feeds";
import { normalizeText } from "./text";

/** Aramada hangi alanlara bakılacak. */
export type SearchField = "title" | "summary" | "source";

export type DigestFilter = {
  /** Serbest metin araması. Kelimelerin hepsi (mode="all") ya da biri (mode="any") eşleşmeli. */
  q?: string;
  /** "all" (varsayılan) = tüm kelimeler, "any" = kelimelerden biri. */
  mode?: "all" | "any";
  /** Aramanın bakacağı alanlar. Varsayılan: title + summary + source. */
  fields?: SearchField[];
  /** Kaynak adı/id'si (kısmi olabilir). Dizi verilirse aralarında OR vardır. */
  source?: string | string[];
  /** Yalnızca son N saat. > 0 değilse zaman filtresi uygulanmaz. */
  sinceHours?: number;
  /** Dilimleme: kaç item atlanacak. */
  offset?: number;
  /** Dilimleme: en fazla kaç item dönecek. */
  limit?: number;
};

const DEFAULT_FIELDS: SearchField[] = ["title", "summary", "source"];

// 3 harften kısa sorgular (ör. "ai") yalnızca TAM kelime eşleşir; aksi halde
// "aim", "aid", "airport", "ailem" gibi ilgisiz kelimeleri de toplardı.
const MIN_PREFIX_LENGTH = 3;

function itemTime(item: DigestItem) {
  if (!item.isoDate) return 0;
  const time = Date.parse(item.isoDate);
  return Number.isNaN(time) ? 0 : time;
}

function toArray(value?: string | string[]): string[] {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value]).map((v) => v.trim()).filter(Boolean);
}

function matchesSource(item: DigestItem, sources: string[]) {
  if (sources.length === 0) return true;
  const haystack = normalizeText(item.source);

  return sources.some((raw) => {
    const needle = normalizeText(raw);
    if (!needle) return true;

    const feed = FEEDS.find(
      (entry) =>
        normalizeText(entry.id) === needle || normalizeText(entry.name) === needle,
    );
    if (feed) return item.source === feed.name;

    return haystack.includes(needle);
  });
}

function searchWords(item: DigestItem, fields: SearchField[]) {
  const parts: string[] = [];
  for (const field of fields) {
    if (field === "title") parts.push(item.title);
    else if (field === "summary") parts.push(item.summary ?? "");
    else parts.push(item.source);
  }
  return normalizeText(parts.join(" ")).split(" ").filter(Boolean);
}

function matchesQuery(
  item: DigestItem,
  tokens: string[],
  mode: "all" | "any",
  fields: SearchField[],
) {
  if (tokens.length === 0) return true;

  const words = searchWords(item, fields);
  // Kelime sınırı: tam kelime her zaman; prefix yalnızca >= MIN_PREFIX_LENGTH.
  // Böylece "ai" → "AI"/"AI-generated" eşleşir ama "aim/aid/air/ailem" yakalanmaz;
  // "lib" → "libya", "iran" → "iranian"/"iranbacked" çalışır.
  const hit = (token: string) =>
    words.some(
      (word) => word === token || (token.length >= MIN_PREFIX_LENGTH && word.startsWith(token)),
    );
  return mode === "any" ? tokens.some(hit) : tokens.every(hit);
}

function matchesTime(item: DigestItem, sinceHours?: number) {
  if (sinceHours == null || !Number.isFinite(sinceHours) || sinceHours <= 0) return true;
  const time = itemTime(item);
  if (!time) return true; // tarihi olmayanı eleme
  return Date.now() - time <= sinceHours * 60 * 60 * 1000;
}

/** Tek bir item filtreye uyuyor mu? (saf predicate) */
export function matchesFilter(item: DigestItem, filter: DigestFilter = {}) {
  const tokens = normalizeText(filter.q ?? "").split(" ").filter(Boolean);
  const fields = filter.fields && filter.fields.length > 0 ? filter.fields : DEFAULT_FIELDS;
  const mode = filter.mode ?? "all";

  return (
    matchesSource(item, toArray(filter.source)) &&
    matchesTime(item, filter.sinceHours) &&
    matchesQuery(item, tokens, mode, fields)
  );
}

function normalizeLimit(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Math.floor(value);
}

/** Filtreye uyan item sayısı (limit/offset uygulanmadan). */
export function countMatches(items: DigestItem[], filter: DigestFilter = {}) {
  let count = 0;
  for (const item of items) {
    if (matchesFilter(item, filter)) count += 1;
  }
  return count;
}

/**
 * Sırayı koruyarak filtreler; sonra offset/limit dilimini uygular.
 * Sıralama bilinçli olarak çağırana bırakılır (digest zaten yeniden eskiye sıralı).
 */
export function filterItems(items: DigestItem[], filter: DigestFilter = {}) {
  const matched = items.filter((item) => matchesFilter(item, filter));
  const offset = normalizeLimit(filter.offset) ?? 0;
  const limit = normalizeLimit(filter.limit);
  return limit === undefined ? matched.slice(offset) : matched.slice(offset, offset + limit);
}
