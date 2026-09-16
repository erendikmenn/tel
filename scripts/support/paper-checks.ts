import type { DigestItem } from "../../src/lib/digest";
import {
  PAPER_BRIEFS,
  PAPER_SIDEBAR,
  PAPER_STORIES,
  PAPER_STRIP,
  buildPaper,
  clipSummary,
  firstSentence,
  isAiItem,
  paperScore,
  type Paper,
} from "../../src/lib/paper";
import { istanbulStamp, istanbulWeekday } from "../../src/lib/config";

export type PaperAssert = (name: string, ok: boolean, detail?: string) => void;

/** Gazete ön sayfası kuralları — gerçek haberler üzerinde. */
export function checkPaperRules(items: DigestItem[], assert: PaperAssert) {
  const paper = buildPaper(items);
  const pool = items.filter((item) => isAiItem(item));
  const pages = [paper.lead, ...paper.strip, ...paper.stories, ...paper.sidebar, ...paper.briefs]
    .filter((item): item is DigestItem => Boolean(item));

  assert("manşet var", Boolean(paper.lead), "havuz: " + pool.length);
  assert("manşet yapay zekâ haberi", paper.lead ? isAiItem(paper.lead) : false);
  assert("havuz boş değil", pool.length > 0);
  assert(
    "manşet görselli adaydan seçilir",
    !pool.some((item) => item.image) || Boolean(paper.lead?.image),
  );

  assert("üst bant en fazla " + PAPER_STRIP, paper.strip.length <= PAPER_STRIP);
  assert("ikincil haber en fazla " + PAPER_STORIES, paper.stories.length <= PAPER_STORIES);
  assert("yan sütun en fazla " + PAPER_SIDEBAR, paper.sidebar.length <= PAPER_SIDEBAR);
  assert("kısa kısa en fazla " + PAPER_BRIEFS, paper.briefs.length <= PAPER_BRIEFS);
  assert("ikincil haberler görselli", paper.stories.every((item) => Boolean(item.image)));
  assert("üst bant başlıkları kısa", paper.strip.every((item) => item.title.length <= 64));

  assert("sayfadaki her haber AI", pages.every((item) => isAiItem(item)));
  assert("aynı haber iki kez yok", new Set(pages.map((item) => item.id)).size === pages.length);

  const nonAi = items.find((item) => !isAiItem(item));
  assert("AI dışı haber sayfaya girmiyor", !nonAi || !pages.some((item) => item.id === nonAi.id));

  assert("sayı (edition) 1..366", paper.edition >= 1 && paper.edition <= 366);
  assert("kaynak listesi dolu", paper.sources.length > 0);
  assert(
    "tarih ve gün üretilebiliyor",
    istanbulWeekday().length > 0 && Boolean(istanbulStamp(new Date().toISOString())),
  );
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
  assert("puan: uzun başlık puan kaybeder", paperScore({ ...base, title: "x".repeat(120) }) < paperScore(base));

  // Metin kuralları
  assert("kısa özet olduğu gibi kalır", clipSummary("kısa özet", 50) === "kısa özet");
  assert("boş özet undefined", clipSummary(undefined, 50) === undefined);
  assert("uzun özet kırpılır", (clipSummary("kelime ".repeat(60), 80) ?? "").length <= 82);
  const sentence = firstSentence("Birinci cümle burada biter. İkinci cümle devam eder ve uzundur.");
  assert("deck ilk cümleyi alır", sentence === "Birinci cümle burada biter.");
  assert("tek cümlelik özet deck olur", (firstSentence("Kısa bir özet") ?? "").startsWith("Kısa"));
}

/** Test çıktısında gazetenin ön sayfasını metin olarak gösterir. */
export function printPaper(paper: Paper, log: (line: string) => void = console.log) {
  log("");
  log("GAZETE ÖN SAYFASI (kural motoru, AI yok)");
  log("  Tel · by erenailab · Sayı " + paper.edition + " · " + paper.pool + " aday haber");
  if (paper.lead) log("  MANŞET   " + paper.lead.title.slice(0, 80));
  for (const item of paper.strip) log("  BANT     " + item.title.slice(0, 78));
  for (const item of paper.stories) log("  HABER    [" + item.source + "] " + item.title.slice(0, 66));
  for (const item of paper.sidebar) log("  YAN      " + item.title.slice(0, 76));
  for (const item of paper.briefs) log("  KISA     " + item.title.slice(0, 76));
  log("");
}
