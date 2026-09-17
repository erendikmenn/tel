import { istanbulDate, istanbulStamp, istanbulWeekday } from "../src/lib/config";
import { buildPaper } from "../src/lib/paper";
import { TOPIC_ALL, topicLabel } from "../src/lib/topics";
import { fetchRealItems } from "./support/real-feed";

function line(label: string, value: string, width = 12) {
  console.log(label.padEnd(width) + value);
}

async function main() {
  const items = await fetchRealItems();
  const paper = buildPaper(items);

  console.log("");
  console.log("TEL — " + istanbulWeekday().toLocaleUpperCase("tr-TR") + " · " + istanbulDate());
  console.log("Sayı " + paper.edition + " · havuz " + items.length + " haber · " + paper.pool + " yapay zekâ adayı");
  console.log("═".repeat(78));

  if (paper.lead) {
    console.log("");
    line("MANŞET", paper.lead.title);
    line("", paper.lead.source + " · " + (istanbulStamp(paper.lead.isoDate) ?? ""));
    if (paper.lead.summary) console.log("".padEnd(12) + paper.lead.summary.slice(0, 220) + "…");
  }

  console.log("");
  console.log("FOTOĞRAFIN YANLARI");
  for (const item of paper.flankers) line(" •", item.title.slice(0, 74) + "  [" + item.source + "]");

  console.log("");
  console.log("SAYFA HABERLERİ");
  for (const item of paper.stories) line(" •", item.title.slice(0, 74) + "  [" + item.source + "]");

  console.log("");
  console.log("ÖNE ÇIKANLAR");
  for (const item of paper.sidebar) line(" •", item.title.slice(0, 74) + "  [" + item.source + "]");

  console.log("");
  console.log("KISA KISA");
  for (const item of paper.briefs) line(" •", item.title.slice(0, 74) + "  [" + item.source + "]");

  // Konu dağılımı (tüm havuz)
  const counts = new Map<string, number>();
  for (const item of items) {
    const topics = item.topics ?? [];
    if (topics.length === 0) counts.set(TOPIC_ALL, (counts.get(TOPIC_ALL) ?? 0) + 1);
    for (const id of topics) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  console.log("");
  console.log("KONU DAĞILIMI (tüm havuz)");
  for (const [id, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    line(" " + topicLabel(id), String(n).padStart(3) + "  " + "█".repeat(Math.round(n / 4)));
  }

  // Son gelen 12 haber (tüm kaynaklar)
  console.log("");
  console.log("SON GELEN 12 HABER");
  const newest = [...items]
    .sort((a, b) => Date.parse(b.isoDate ?? "") - Date.parse(a.isoDate ?? ""))
    .slice(0, 12);
  for (const item of newest) {
    line(" " + (istanbulStamp(item.isoDate) ?? ""), "[" + item.source + "] " + item.title.slice(0, 62));
  }
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
