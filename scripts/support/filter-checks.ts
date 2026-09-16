import {
  DEFAULT_PER_SOURCE,
  DEFAULT_WINDOW_HOURS,
  PER_SOURCE_OPTIONS,
  PER_SOURCE_UNLIMITED,
  WINDOW_ALL,
  WINDOW_OPTIONS,
  perSourceLabel,
} from "../../src/lib/config";
import type { DigestItem } from "../../src/lib/digest";
import {
  countMatches,
  filterItems,
  matchesFilter,
  takePerSource,
  viewItems,
  type DigestView,
} from "../../src/lib/filter";
import { normalizeText } from "../../src/lib/text";
import { TOPICS, TOPIC_ALL, classify, topicLabel } from "../../src/lib/topics";

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

  // Kaynak başına cap: her kaynak en fazla N ve o kaynağın EN YENİ N'i (sıra korunur).
  const capped = takePerSource(items, 2);
  let perSourceOk = true;
  for (const source of new Set(items.map((i) => i.source))) {
    const kept = capped.filter((i) => i.source === source).map((i) => i.id);
    const expected = items.filter((i) => i.source === source).slice(0, 2).map((i) => i.id);
    if (kept.join(",") !== expected.join(",")) perSourceOk = false;
  }
  assert("takePerSource(2): kaynak başına <= 2 ve en yeniler", perSourceOk);
  assert("takePerSource sırayı korur", capped[0]?.id === items[0]?.id);

  // --- Görünüm (pencere + kaynak başına), gerçek veri üzerinde ---
  // WINDOW_ALL (0) = zaman süzgeci yok; monotonluk zincirinin en geniş kümesi.
  const maxWindow = WINDOW_ALL;
  const maxPerSource = PER_SOURCE_UNLIMITED;
  const sources = [...new Set(items.map((i) => i.source))];

  // Pencere monoton: dar küme, geniş kümenin alt kümesi olmalı.
  const windowIds = WINDOW_OPTIONS.map((hours) =>
    viewItems(items, { sinceHours: hours }).map((i) => i.id),
  );
  let windowMonotonic = true;
  for (let i = 1; i < windowIds.length; i += 1) {
    const bigger = new Set(windowIds[i]);
    for (const id of windowIds[i - 1]) if (!bigger.has(id)) windowMonotonic = false;
  }
  assert("pencere monoton (dar ⊆ geniş)", windowMonotonic);

  // Kaynak başına monoton.
  const capIds = PER_SOURCE_OPTIONS.map((perSource) =>
    viewItems(items, { sinceHours: maxWindow, perSource }).map((i) => i.id),
  );
  let capMonotonic = true;
  for (let i = 1; i < capIds.length; i += 1) {
    const bigger = new Set(capIds[i]);
    for (const id of capIds[i - 1]) if (!bigger.has(id)) capMonotonic = false;
  }
  assert("kaynak-başına monoton (az ⊆ çok)", capMonotonic);

  // Her N için tam olarak o kaynağın en yeni N'i kalmalı.
  let capExact = true;
  for (const perSource of PER_SOURCE_OPTIONS.filter((value) => value > 0)) {
    const view = viewItems(items, { sinceHours: maxWindow, perSource });
    for (const source of sources) {
      const kept = view.filter((i) => i.source === source).map((i) => i.id).join(",");
      const expected = items.filter((i) => i.source === source).slice(0, perSource).map((i) => i.id).join(",");
      if (kept !== expected) capExact = false;
    }
  }
  assert("kaynak-başına: tam olarak en yeni N", capExact);

  // Varsayılan görünüm üst kümenin alt kümesi.
  const defaults = viewItems(items, { sinceHours: DEFAULT_WINDOW_HOURS, perSource: DEFAULT_PER_SOURCE });
  const defaultsIds = new Set(defaults.map((i) => i.id));
  const maxView = viewItems(items, { sinceHours: maxWindow, perSource: maxPerSource });
  const maxIds = new Set(maxView.map((i) => i.id));
  assert("varsayılan ⊆ üst küme", [...defaultsIds].every((id) => maxIds.has(id)));
  assert("üst küme >= varsayılan", maxView.length >= defaults.length);

  // Arama + pencere birlikte.
  const searched = viewItems(items, { q: "iran", sinceHours: 6, perSource: 6 });
  assert("q=iran + pencere=6 hepsi eşleşiyor", searched.every((i) => matchesFilter(i, { q: "iran" })));

  // --- Konu etiketleri (kural tabanlı sınıflandırma) ---
  const untagged = items.filter((i) => !Array.isArray(i.topics));
  assert("her haberde topics dizisi var", untagged.length === 0, untagged.slice(0, 2).map((i) => i.title).join(" | "));

  const tooMany = items.filter((i) => (i.topics ?? []).length > 2);
  assert("en fazla 2 konu etiketi", tooMany.length === 0);

  for (const id of ["savas", "toplum", "siyaset", "teknoloji"]) {
    assert("konu dolu: " + topicLabel(id), items.some((i) => (i.topics ?? []).includes(id)));
  }

  for (const topic of TOPICS) {
    const found = filterItems(items, { category: topic.id });
    assert("category=" + topic.id + " tutarlı", found.every((i) => (i.topics ?? []).includes(topic.id)));
  }
  const others = filterItems(items, { category: TOPIC_ALL });
  assert("category=diger etiketsizleri getirir", others.every((i) => (i.topics ?? []).length === 0));

  const gaza = items.find((i) => /gaza|gazze/i.test(i.title));
  assert("Gaza haberi -> savas", !gaza || (gaza.topics ?? []).includes("savas"));
  const ai = items.find((i) => /\bAI\b|OpenAI|Anthropic|yapay zeka/i.test(i.title));
  assert("AI haberi -> teknoloji", !ai || (ai.topics ?? []).includes("teknoloji"));
  const sports = items.find((i) => /Asian Games|derby|Messi/i.test(i.title));
  assert("spor haberi -> spor", !sports || (sports.topics ?? []).includes("spor"));
  const econ = items.find((i) => /inflation|interest rates/i.test(i.title));
  assert("ekonomi haberi -> ekonomi", !econ || (econ.topics ?? []).includes("ekonomi"));

  // RSS <category> sinyali (yayıncının kendi etiketi)
  assert(
    "feed=Business -> ekonomi",
    classify({ title: "Publisher cuts 400 jobs", source: "The Guardian", feedCategories: ["Business"] }).includes("ekonomi"),
  );
  assert(
    "feed=Sport -> spor",
    classify({ title: "Eala reaches final", source: "Al Jazeera", feedCategories: ["Sport"] }).includes("spor"),
  );
  assert(
    "feed=Technology -> teknoloji",
    classify({ title: "Chip race heats up", source: "The Guardian", feedCategories: ["Technology"] }).includes("teknoloji"),
  );
}

/** Konu dağılımı + örnek başlıklar (gerçek veri). */
export function printTopicReport(items: DigestItem[], log: (line: string) => void = console.log) {
  const classified = items.map((item) => ({ item, topics: item.topics ?? [] }));
  const counts = new Map<string, number>();
  for (const row of classified) {
    if (row.topics.length === 0) counts.set(TOPIC_ALL, (counts.get(TOPIC_ALL) ?? 0) + 1);
    for (const id of row.topics) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  log("");
  log("KONU DAĞILIMI (gerçek haberler)");
  for (const [id, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    log("  " + topicLabel(id).padEnd(24) + n);
  }
  log("");
  for (const topic of TOPICS) {
    const rows = classified.filter((row) => row.topics.includes(topic.id));
    log("### " + topic.label + " (" + rows.length + ")");
    for (const row of rows.slice(0, 4)) log("   - " + row.item.title.slice(0, 84));
    log("");
  }
}

/** Girdi -> çıktı örnekleri (gerçek haberler üzerinde). */
export function printExamples(items: DigestItem[], log: (line: string) => void = console.log) {
  const cases: { name: string; view: DigestView }[] = [
    { name: "pencere=36, kaynak başına=12  (varsayılan)", view: { sinceHours: 36, perSource: 12 } },
    { name: "pencere=48, kaynak başına=20+ (üst küme)", view: { sinceHours: 48, perSource: PER_SOURCE_UNLIMITED } },
    { name: "pencere=Tümü, kaynak başına=20+ (feed'in hepsi)", view: { sinceHours: WINDOW_ALL, perSource: PER_SOURCE_UNLIMITED } },
    { name: "pencere=36, kaynak başına=20+ (sınırsız)", view: { sinceHours: 36, perSource: PER_SOURCE_UNLIMITED } },
    { name: "pencere=6,  kaynak başına=12", view: { sinceHours: 6, perSource: 12 } },
    { name: "pencere=12, kaynak başına=6", view: { sinceHours: 12, perSource: 6 } },
    { name: "pencere=36, kaynak başına=" + perSourceLabel(16).replace(" haber", ""), view: { sinceHours: 36, perSource: 16 } },
    { name: "pencere=36, kaynak başına=6", view: { sinceHours: 36, perSource: 6 } },
    { name: 'q="ai",  pencere=36, kaynak başına=12', view: { q: "ai", sinceHours: 36, perSource: 12 } },
    { name: 'kaynak=[npr, bbc-tr], pencere=36, kaynak başına=12', view: { source: ["npr", "bbc-tr"], sinceHours: 36, perSource: 12 } },
    { name: 'q="iran", pencere=6, kaynak başına=6', view: { q: "iran", sinceHours: 6, perSource: 6 } },
  ];

  log("");
  log("GİRDİ -> ÇIKTI (gerçek haberler üzerinde)");
  for (const test of cases) {
    const out = viewItems(items, test.view);
    const perSource = new Map<string, number>();
    for (const item of out) perSource.set(item.source, (perSource.get(item.source) ?? 0) + 1);
    const dist = [...perSource.entries()].map(([source, n]) => source + " " + n).join(", ");

    log("");
    log("GİRDİ  " + test.name);
    log("ÇIKTI  " + out.length + " haber  [" + (dist || "boş") + "]");
    for (const item of out.slice(0, 3)) {
      log("        - [" + item.source + "] " + item.title.slice(0, 70));
    }
    if (out.length > 3) log("        … +" + (out.length - 3) + " haber");
  }
  log("");
}
