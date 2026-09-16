import type { DigestItem } from "../../src/lib/digest";
import { countMatches, filterItems, matchesFilter } from "../../src/lib/filter";
import { normalizeText } from "../../src/lib/text";

export type Assert = (name: string, ok: boolean, detail?: string) => void;

/** Bir item'ın arama kelimeleri (title + summary + source). */
export function wordsOf(item: DigestItem) {
  return normalizeText([item.title, item.summary ?? "", item.source].join(" ")).split(" ");
}

/** Filtre kurallarını gerçek bir haber listesi ÜZERİNDE doğrular (snapshot ya da canlı). */
export function checkFilterRules(items: DigestItem[], assert: Assert) {
  assert("en az 20 gerçek haber", items.length >= 20, "bulunan: " + items.length);
  assert("en az 4 kaynak", new Set(items.map((i) => i.source)).size >= 4);
  assert("boş filtre hepsi", filterItems(items, {}).length === items.length);

  // 2 harfli token YALNIZCA tam kelime eşleşmeli: tüm gerçek item'larda kural birebir tutmalı.
  const aiBad = items.filter((i) => matchesFilter(i, { q: "ai" }) !== wordsOf(i).includes("ai"));
  assert(
    "q=ai yalnızca tam \"ai\" (tüm item'lar)",
    aiBad.length === 0,
    aiBad.slice(0, 2).map((i) => i.title).join(" | "),
  );
  assert("q=ai en az 1 gerçek sonuç", filterItems(items, { q: "ai" }).length >= 1);

  // "aim/aid/air/airport/ait/ailem" tek başına "ai" sayılmamalı.
  const decoys = ["aim", "aid", "air", "airport", "ait", "ailem"];
  const leaked = items.filter((i) => {
    const words = wordsOf(i);
    return words.some((w) => decoys.includes(w)) && !words.includes("ai") && matchesFilter(i, { q: "ai" });
  });
  assert("q=ai decoylere takılmıyor", leaked.length === 0, leaked.map((i) => i.title).join(" | "));

  // Uzun token: prefix kuralı tüm item'larda tutmalı.
  const iranBad = items.filter(
    (i) => matchesFilter(i, { q: "iran" }) !== wordsOf(i).some((w) => w === "iran" || w.startsWith("iran")),
  );
  assert("q=iran prefix kuralı (tüm item'lar)", iranBad.length === 0);
  assert("q=iran en az 1 gerçek sonuç", filterItems(items, { q: "iran" }).length >= 1);

  // Kaynak
  const npr = filterItems(items, { source: "npr" });
  assert("source=npr hepsi NPR", npr.length > 0 && npr.every((i) => i.source === "NPR"));
  const multi = filterItems(items, { source: ["npr", "aljazeera"] });
  assert("source çoklu OR", multi.every((i) => i.source === "NPR" || i.source === "Al Jazeera"));

  // Zaman
  const cutoff = Date.now() - 6 * 3600_000;
  const recent = filterItems(items, { sinceHours: 6 });
  assert("sinceHours=6 penceresi", recent.every((i) => !i.isoDate || Date.parse(i.isoDate) >= cutoff));

  // Dilimleme + total
  const all = filterItems(items, {});
  assert("countMatches = toplam", countMatches(items, {}) === items.length);
  assert("limit dilimler", filterItems(items, { limit: 3 }).length === Math.min(3, items.length));
  assert("offset kaydırır", filterItems(items, { offset: 2, limit: 2 })[0]?.id === all[2]?.id);
}
