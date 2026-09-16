import type { DigestItem } from "../../src/lib/digest";
import {
  PAPER_BRIEFS,
  PAPER_FEATURES,
  buildPaper,
  clipSummary,
  isAiItem,
  paperScore,
  type Paper,
} from "../../src/lib/paper";

export type PaperAssert = (name: string, ok: boolean, detail?: string) => void;

/** Gazete ön sayfası kuralları — gerçek haberler üzerinde. */
export function checkPaperRules(items: DigestItem[], assert: PaperAssert) {
  const paper = buildPaper(items);
  const pool = items.filter((item) => isAiItem(item));

  assert("manşet var", Boolean(paper.lead), "havuz: " + pool.length);
  assert("manşet yapay zekâ haberi", paper.lead ? isAiItem(paper.lead) : false);
  assert("havuz boş değil", pool.length > 0);
  assert(
    "manşet görselli adaydan seçilir",
    !pool.some((item) => item.image) || Boolean(paper.lead?.image),
  );
  assert("özellikler AI haberleri", paper.features.every((item) => isAiItem(item)));
  assert("kısa kısa AI haberleri", paper.briefs.every((item) => isAiItem(item)));
  assert("en fazla " + PAPER_FEATURES + " özellik", paper.features.length <= PAPER_FEATURES);
  assert("en fazla " + PAPER_BRIEFS + " kısa", paper.briefs.length <= PAPER_BRIEFS);

  const used = [paper.lead, ...paper.features, ...paper.briefs]
    .filter((item): item is DigestItem => Boolean(item))
    .map((item) => item.id);
  assert("aynı haber iki kez yok", new Set(used).size === used.length);

  const nonAi = items.find((item) => !isAiItem(item));
  assert("AI dışı haber sayfaya girmiyor", !nonAi || !used.includes(nonAi.id));

  assert("sayı (edition) 1..366", paper.edition >= 1 && paper.edition <= 366);
  assert("kaynak listesi dolu", paper.sources.length > 0);
  assert("deterministik: aynı veri, aynı sayfa", JSON.stringify(buildPaper(items)) === JSON.stringify(paper));

  // Saf puanlama kuralları (küçük birim kontrolleri).
  const base: DigestItem = {
    id: "test",
    title: "Kısa bir başlık",
    link: "https://example.com/a",
    source: "OpenAI",
    isoDate: new Date().toISOString(),
  };
  assert("puan: görsel puanı artırır", paperScore({ ...base, image: "https://example.com/a.jpg" }) > paperScore(base));
  assert(
    "puan: tazelik puanı düşürür",
    paperScore(base) > paperScore({ ...base, isoDate: new Date(Date.now() - 48 * 3600_000).toISOString() }),
  );
  assert(
    "puan: uzun başlık puan kaybederir",
    paperScore({ ...base, title: "x".repeat(120) }) < paperScore(base),
  );

  // Özet kırpma
  assert("kısa özet olduğu gibi kalır", clipSummary("kısa özet", 50) === "kısa özet");
  assert("boş özet undefined", clipSummary(undefined, 50) === undefined);
  assert("uzun özet kırpılır", (clipSummary("kelime ".repeat(60), 80) ?? "").length <= 82);
}

/** Test çıktısında gazetenin ön sayfasını metin olarak gösterir. */
export function printPaper(paper: Paper, log: (line: string) => void = console.log) {
  log("");
  log("GAZETE ÖN SAYFASI (kural motoru, AI yok)");
  log("  Tel · by erenailab · Sayı " + paper.edition + " · " + paper.pool + " aday haber");
  if (paper.lead) log("  MANŞET   " + paper.lead.title.slice(0, 80));
  for (const item of paper.features) log("  ÖZELLİK  [" + item.source + "] " + item.title.slice(0, 66));
  for (const item of paper.briefs) log("  KISA     " + item.title.slice(0, 74));
  log("");
}
