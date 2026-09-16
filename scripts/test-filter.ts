import { countMatches, filterItems, type DigestFilter } from "../src/lib/filter";
import type { DigestItem } from "../src/lib/digest";

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const items: DigestItem[] = [
  {
    id: "1",
    title: "Libya'da ateşkes görüşmeleri başladı",
    link: "https://example.com/1",
    source: "BBC Türkçe",
    isoDate: hoursAgo(2),
    summary: "Trablus ve Bingazi heyetleri Kahire'de buluştu.",
  },
  {
    id: "2",
    title: "Sweden election live: opposition claims lead",
    link: "https://example.com/2",
    source: "The Guardian",
    isoDate: hoursAgo(10),
    summary: "Partial count after Sunday's vote.",
  },
  {
    id: "3",
    title: "Libya coast guard intercepts boats",
    link: "https://example.com/3",
    source: "Al Jazeera",
    isoDate: hoursAgo(30),
    summary: "Mediterranean crossing attempts continue.",
  },
  {
    id: "4",
    title: "Trump warns against slowing down AI",
    link: "https://example.com/4",
    source: "NPR",
    isoDate: hoursAgo(4),
  },
  {
    id: "5",
    title: "He said the summit will resume",
    link: "https://example.com/5",
    source: "The Guardian",
    isoDate: hoursAgo(8),
    summary: "Officials did not give a date.",
  },
];

function assert(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok    ${name}`);
}

function ids(filter: DigestFilter) {
  return filterItems(items, filter)
    .map((item) => item.id)
    .join(",");
}

// Temel sıra
assert("boş filtre sırayı korur", ids({}) === "1,2,3,4,5");

// Kelime sınırı + prefix
assert("q=Libya → 1,3", ids({ q: "Libya" }) === "1,3");
assert("q=lib (prefix) → 1,3", ids({ q: "lib" }) === "1,3");
assert("q='lib ya' kelime sınırı → boş", ids({ q: "lib ya" }) === "");
assert("q=libya ateşkes → 1", ids({ q: "libya ateşkes" }) === "1");

// I/İ normalizasyonu (asıl hata buydu)
assert("q=ai → sadece AI (said değil)", ids({ q: "ai" }) === "4");
assert("q=AI → 4", ids({ q: "AI" }) === "4");
assert("q=said → 5", ids({ q: "said" }) === "5");
assert("q='Trump' Türkçe küçük harf → 4", ids({ q: "trump" }) === "4");

// Alan seçimi
assert("fields=title 'trablus' → boş", ids({ q: "trablus", fields: ["title"] }) === "");
assert("fields=summary 'trablus' → 1", ids({ q: "trablus", fields: ["summary"] }) === "1");

// OR modu
assert("mode=any 'libya ai' → 1,3,4", ids({ q: "libya ai", mode: "any" }) === "1,3,4");

// Kaynak (tek, çoklu, kısmi)
assert("source=bbc-tr → 1", ids({ source: "bbc-tr" }) === "1");
assert("source='BBC Türkçe' → 1", ids({ source: "BBC Türkçe" }) === "1");
assert("source='bbc' kısmi → 1", ids({ source: "bbc" }) === "1");
assert("source=[bbc-tr,npr] → 1,4", ids({ source: ["bbc-tr", "npr"] }) === "1,4");
assert("source=guardian → 2,5", ids({ source: "guardian" }) === "2,5");

// Zaman
assert("sinceHours=12 → 1,2,4,5", ids({ sinceHours: 12 }) === "1,2,4,5");
assert("sinceHours=0 filtre yok → hepsi", ids({ sinceHours: 0 }) === "1,2,3,4,5");
assert("q=Libya + sinceHours=12 → 1", ids({ q: "Libya", sinceHours: 12 }) === "1");

// Dilimleme
assert("limit=2 → 1,2", ids({ limit: 2 }) === "1,2");
assert("offset=1 limit=2 → 2,3", ids({ offset: 1, limit: 2 }) === "2,3");
assert("q=Libya limit=1 → 1", ids({ q: "Libya", limit: 1 }) === "1");
assert("q=Libya offset=1 → 3", ids({ q: "Libya", offset: 1 }) === "3");

// countMatches dilimden bağımsız
assert("countMatches q=Libya → 2", countMatches(items, { q: "Libya" }) === 2);
assert(
  "countMatches limit'ten etkilenmez → 2",
  countMatches(items, { q: "Libya", limit: 1 }) === 2,
);

if (process.exitCode) {
  console.error("\nfilter fixtures failed");
  process.exit(1);
}

console.log("\nall fixture checks passed");
