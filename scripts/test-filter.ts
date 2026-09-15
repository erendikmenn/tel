import { filterItems, type DigestFilter } from "../src/lib/filter";
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

assert("q=Libya → 1,3", ids({ q: "Libya" }) === "1,3");
assert("q=libya ateşkes → only 1", ids({ q: "libya ateşkes" }) === "1");
assert("source=bbc-tr", ids({ source: "bbc-tr" }) === "1");
assert("source=BBC Türkçe", ids({ source: "BBC Türkçe" }) === "1");
assert("sinceHours=12 drops 30h Libya", ids({ q: "Libya", sinceHours: 12 }) === "1");
assert("limit=1", ids({ q: "Libya", limit: 1 }) === "1");
assert("empty filter keeps order", ids({}) === "1,2,3,4");

if (process.exitCode) {
  console.error("\nfilter fixtures failed");
  process.exit(1);
}

console.log("\nall fixture checks passed");
