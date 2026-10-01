import type { DigestItem } from "../../src/lib/digest";
import { storyMatcher } from "../../src/lib/dedupe";
import {
  PAPER_BRIEFS,
  PAPER_FLANKERS,
  PAPER_SECTIONS,
  PAPER_SIDEBAR,
  PAPER_STORIES,
  PAPER_STRIP,
  WORLD_SOURCES,
  buildPaper,
  clipSummary,
  findSection,
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
  const pages = [
    paper.lead,
    ...paper.strip,
    ...paper.flankers,
    ...paper.stories,
    ...paper.sidebar,
    ...paper.briefs,
  ]
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
  assert("fotoğrafın iki yanı dolu (flanker)", paper.flankers.length === PAPER_FLANKERS);
  assert("flanker başlıkları kısa", paper.flankers.every((item) => item.title.length <= 100));
  assert("üst bant başlıkları kısa", paper.strip.every((item) => item.title.length <= 64));

  assert("sayfadaki her haber AI", pages.every((item) => isAiItem(item)));
  assert("aynı haber iki kez yok", new Set(pages.map((item) => item.id)).size === pages.length);

  const nonAi = items.find((item) => !isAiItem(item));
  assert("AI dışı haber sayfaya girmiyor", !nonAi || !pages.some((item) => item.id === nonAi.id));

  // "agent" tek başına yapay zekâ değil (1 Ekim 2026: ICE haberi AI sayfasına girmişti).
  const probe = (source: string, title: string): DigestItem => ({ id: "ai-word:" + title, title, link: "", source });
  assert("ICE ajanı haberi AI değil", !isAiItem(probe("BBC World", "Renee Good: Family of US woman killed by ICE agent sues Trump officials")));
  assert("başlığında AI geçen ajan haberi AI", isAiItem(probe("CNBC", "Google unveils latest AI model, but Wall Street wants a breakout personal agent")));
  assert("AI kaynağının ajan haberi AI", isAiItem(probe("The Verge AI", "OpenAI’s new agent is a shot at Meta — but can it compete with free?")));

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

/** Bölümler: her baskı kendi havuzundan, aynı kurallarla dizilir. */
export function checkPaperSections(items: DigestItem[], now: number, assert: (name: string, ok: boolean) => void) {
  assert("bölüm: üç baskı tanımlı", PAPER_SECTIONS.length === 3);
  assert(
    "bölüm: kimlikler ai/ekonomi/gundem",
    PAPER_SECTIONS.map((section) => section.id).join(",") === "ai,ekonomi,gundem",
  );
  assert("bölüm: bilinmeyen kimlik yapay zekâya düşer", findSection("yok").id === "ai");

  const ekonomi = buildPaper(items, now, findSection("ekonomi"));
  const ekonomiPool = [
    ...(ekonomi.lead ? [ekonomi.lead] : []),
    ...ekonomi.strip,
    ...ekonomi.flankers,
    ...ekonomi.stories,
    ...ekonomi.sidebar,
    ...ekonomi.briefs,
  ];
  assert("ekonomi: havuz ekonomi konulu", ekonomiPool.every((item) => (item.topics ?? []).includes("ekonomi")));
  assert("ekonomi: künye doğru", ekonomi.section.label === "Finans & Ekonomi baskısı");

  const gundem = buildPaper(items, now, findSection("gundem"));
  const gundemPool = [
    ...(gundem.lead ? [gundem.lead] : []),
    ...gundem.strip,
    ...gundem.flankers,
    ...gundem.stories,
    ...gundem.sidebar,
    ...gundem.briefs,
  ];
  assert("gündem: havuz dünya kaynaklarından", gundemPool.every((item) => WORLD_SOURCES.has(item.source)));
  assert("gündem: künye doğru", gundem.section.label === "Gündem baskısı");

  const ai = buildPaper(items, now);
  assert("yapay zekâ: varsayılan bölüm ai", ai.section.id === "ai");
  assert("yapay zekâ: havuz AI kalemlerinden", (ai.lead ? isAiItem(ai.lead) : true));
}

/** Test çıktısında gazetenin ön sayfasını metin olarak gösterir. */
export function printPaper(paper: Paper, log: (line: string) => void = console.log) {
  log("");
  log("GAZETE ÖN SAYFASI (kural motoru, AI yok)");
  log("  Tel · by erenailab · Sayı " + paper.edition + " · " + paper.pool + " aday haber");
  if (paper.lead) log("  MANŞET   " + paper.lead.title.slice(0, 80));
  for (const item of paper.strip) log("  BANT     " + item.title.slice(0, 78));
  for (const item of paper.flankers) log("  YANİ     " + item.title.slice(0, 78));
  for (const item of paper.stories) log("  HABER    [" + item.source + "] " + item.title.slice(0, 66));
  for (const item of paper.sidebar) log("  YAN      " + item.title.slice(0, 76));
  for (const item of paper.briefs) log("  KISA     " + item.title.slice(0, 76));
  log("");
}

/** Sayfadaki bütün haberler, yukarıdan aşağı. */
function pageItems(paper: Paper) {
  return [paper.lead, ...paper.strip, ...paper.flankers, ...paper.stories, ...paper.sidebar, ...paper.briefs].filter(
    (item): item is DigestItem => Boolean(item),
  );
}

/**
 * Aynı olayın tekrarları: 1 Ekim 2026 baskılarındaki gerçek başlık ve özetler,
 * fixture havuzuna eklenerek (nadirlik gerçekçi bir havuzda ölçülsün).
 */
export function checkDuplicateRules(items: DigestItem[], now: number, assert: PaperAssert) {
  const iso = new Date(now).toISOString();
  const story = (source: string, title: string, summary?: string): DigestItem => ({
    id: "tekrar:" + source + ":" + title,
    title,
    link: "https://example.com/" + encodeURIComponent(title),
    source,
    isoDate: iso,
    summary,
    image: "https://example.com/foto.jpg",
    topics: ["ekonomi"],
  });
  const lagarde = [
    story("Ekonomim", "ECB Başkanı Christine Lagarde’dan yapay zeka uyarısı", "ECB Başkanı Christine Lagarde, yapay zekanın finans sektöründe güvenli kullanılabilmesi için politika yapıcıların finansal sistemin bütününe yönelik riskleri öngörmesi gerektiğini vurguladı."),
    story("Bloomberg HT", "Lagarde'dan yapay zeka uyarısı", "Avrupa Merkez Bankası (AMB) ve Avrupa Sistemik Risk Kurulu (ESRB) Başkanı Christine Lagarde, yapay zekanın finans sektöründe güvenli kullanılabilmesi için politika yapıcıların finansal sistemin bütününe yönelik riskleri öngörmesi gerektiğini vurguladı."),
    story("Dünya", "Lagarde'dan yapay zeka uyarısı: Finans sistemini tehdit edebilir", "Avrupa Merkez Bankası (ECB) ve Avrupa Sistemik Risk Kurulu (ESRB) Başkanı Christine Lagarde, yapay zekanın finans sektöründe güvenli kullanılabilmesi için politika yapıcıların finansal sistemin bütününe yönelik riskleri öngörmesi gerektiğini vurguladı."),
  ];
  const boe = story("Bloomberg HT", "İngiltere Merkez Bankası'ndan yapay zeka kaynaklı şok uyarısı", "İngiltere Merkez Bankası (BOE) Başkanı Andrew Bailey, yapay zekanın finans piyasalarında sarsıntılara yol açabileceğini belirtti.");
  const bist = "Borsa İstanbul'da BIST 100 endeksi, günü yüzde 2,53 değer kazanarak 12.249,04 puandan tamamladı.";
  const borsa = [
    story("Ekonomim", "Borsa günü yükselişle kapattı", bist),
    story("Dünya", "Borsa İstanbul günü yükselişle tamamladı", bist),
    story("Hürriyet Ekonomi", "Borsa günü yükselişle tamamladı… İşte en çok değer kazanan sektörler", bist),
  ];
  const avrupa = [
    story("Dünya", "Avrupa borsaları düşüşle kapandı", "Avrupa borsaları, haftanın dördüncü işlem gününü düşüşle tamamladı."),
    story("Ekonomim", "Avrupa borsaları günü düşüşle kapattı", "Haftanın dördüncü işlem gününü Avrupa borsaları düşüşle tamamladı."),
  ];
  const pike = [
    story("BBC Türkçe", "Christa Pike'ın idam girişimi neden ölümle sonuçlanmadı?", "ABD'nin Tennessee eyaletinde infazı gerçekleştirilen idam mahkumu Christa Pike'ın hayatta kalmasıyla ilgili inceleme başlatılıyor."),
    story("BBC World", "What happened in the failed execution of Christa Pike - and what next?", "The convicted killer is in hospital in Tennessee after surviving two lethal injections, in a case that has raised many questions."),
  ];
  const france = [
    story("BBC World", "Fires break out at French schools as students protest nationwide", "The French government holds a crisis meeting as demonstrations grow and become violent in places."),
    story("Al Jazeera", "School protests spread as fires, blockades deepen unrest in France", "Police have detained hundreds as students protest overcrowded classrooms, teacher shortages and crumbling facilities."),
  ];
  const ice = [
    story("Al Jazeera", "US Supreme Court agrees to take up Trump’s ICE detention policy", "The case is the latest dispute over US President Donald Trump’s sweeping immigration crackdown."),
    story("Al Jazeera", "Renee Good’s family sues Trump administration over fatal ICE shooting", "Lawsuits accuse Trump officials of recklessness and civil rights violations in Renee Good's fatal Minneapolis shooting ."),
  ];
  const fon = [
    story("BBC Türkçe", "Fon krizinde para kaybedenler: 'Tazminatımı yatırdım, yılların emeği var'", "Türkiye'de yaşanan fon krizi, tasfiye sürecine alınan fonlarda birikimi bulunan yüz binlerce kişiyi kaygılandırıyor."),
    story("BBC Türkçe", "Erdoğan'dan TBMM'de fon krizi mesajı: 'Bu meseleyi süratle çözüyoruz'", "Türkiye Büyük Millet Meclisi, yaklaşık iki aylık aranın ardından düzenlenen oturumla yeniden toplandı."),
    story("BBC Türkçe", "SPK: Yüksek kazanç sağlayanlar için gönüllü iade hesapları açıldı", "Sermaye Piyasası Kurulu (SPK) yatırım fonlarında tasfiye kararından önce katılma paylarını satarak yüksek kazanç elde edenlerin, bu kazançları gönüllü olarak iade edebilmeleri için hesap açtı."),
    story("BBC Türkçe", "AKP Genel Başkan Yardımcısı Hayati Yazıcı, fon kriziyle ilgili iddialara ne yanıt verdi?", "AKP'nin Siyasi ve Hukuk İşlerinden sorumlu Genel Başkan Yardımcısı Hayati Yazıcı açıklama yaptı."),
  ];
  const added = [...lagarde, boe, ...borsa, ...avrupa, ...pike, ...france, ...ice, ...fon];
  const pool = [...added, ...items];
  const same = storyMatcher(pool);
  const allSame = (group: DigestItem[]) => group.every((a) => group.every((b) => same(a, b)));
  const noneSame = (group: DigestItem[]) => group.every((a) => group.every((b) => a === b || !same(a, b)));

  assert("tekrar: Lagarde'ın uyarısı üç kaynakta tek olay", allSame(lagarde));
  assert("tekrar: Borsa İstanbul kapanışı üç kaynakta tek olay", allSame(borsa));
  assert("tekrar: Avrupa borsaları iki kaynakta tek olay", allSame(avrupa));
  assert("tekrar: Christa Pike TR ↔ EN tek olay", allSame(pike));
  assert("tekrar: Fransa okul protestoları (French ↔ France) tek olay", allSame(france));
  assert("tekrar: BoE'nin uyarısı Lagarde'ınkinden ayrı", lagarde.every((item) => !same(item, boe)));
  assert("tekrar: yükselen borsa ile düşen borsa ayrı", !same(borsa[0], avrupa[1]));
  assert("tekrar: ICE davası ile Renee Good davası ayrı", noneSame(ice));
  assert("tekrar: fon krizinin farklı haberleri ayrı", noneSame(fon));
  assert("tekrar: haber kendisiyle aynı", same(boe, boe));

  for (const section of PAPER_SECTIONS) {
    const page = pageItems(buildPaper(pool, now, section));
    const repeats = page.flatMap((a, i) => page.slice(i + 1).filter((b) => same(a, b)).map((b) => a.title + " ~ " + b.title));
    assert("tekrar: " + section.id + " sayfasında aynı olay iki kez yok", repeats.length === 0, repeats.join(" | "));
  }
  const ai = pageItems(buildPaper(pool, now, findSection("ai")));
  assert("tekrar: yapay zekâ sayfasında tek Lagarde haberi", ai.filter((item) => item.title.includes("Lagarde")).length === 1);
  const real = buildPaper(items, now, findSection("gundem"));
  assert(
    "tekrar: ayıklama sonrası sayfa dolu",
    real.strip.length === PAPER_STRIP && real.sidebar.length === PAPER_SIDEBAR && real.briefs.length === PAPER_BRIEFS,
  );
}
