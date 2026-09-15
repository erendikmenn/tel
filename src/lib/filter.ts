import type { DigestItem } from "./digest";
import { FEEDS } from "./feeds";
import { normalizeText } from "./text";

export type DigestFilter = {
  q?: string;
  source?: string;
  sinceHours?: number;
  limit?: number;
};

function itemTime(item: DigestItem) {
  if (!item.isoDate) return 0;
  const time = Date.parse(item.isoDate);
  return Number.isNaN(time) ? 0 : time;
}

function matchesSource(item: DigestItem, source: string) {
  const needle = normalizeText(source);
  if (!needle) return true;

  const feed = FEEDS.find(
    (entry) =>
      normalizeText(entry.id) === needle || normalizeText(entry.name) === needle,
  );
  if (feed) return item.source === feed.name;

  return normalizeText(item.source).includes(needle);
}

function matchesQuery(item: DigestItem, q: string) {
  const tokens = normalizeText(q).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = normalizeText(
    [item.title, item.summary ?? "", item.source].join(" "),
  );
  return tokens.every((token) => haystack.includes(token));
}

function matchesTime(item: DigestItem, sinceHours: number) {
  if (sinceHours <= 0) return true;
  const time = itemTime(item);
  if (!time) return true;
  return Date.now() - time <= sinceHours * 60 * 60 * 1000;
}

export function filterItems(items: DigestItem[], filter: DigestFilter = {}) {
  const q = filter.q?.trim();
  const source = filter.source?.trim();
  const sinceHours = filter.sinceHours;
  const limit = filter.limit;

  const next = items.filter((item) => {
    if (q && !matchesQuery(item, q)) return false;
    if (source && !matchesSource(item, source)) return false;
    if (sinceHours != null && !matchesTime(item, sinceHours)) return false;
    return true;
  });

  if (limit == null || limit < 0) return next;
  return next.slice(0, limit);
}
