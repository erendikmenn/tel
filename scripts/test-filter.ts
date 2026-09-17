import { buildPaper } from "../src/lib/paper";
import { REAL_ITEMS } from "./fixtures/real-items";
import { checkFilterRules, printExamples, printTopicReport } from "./support/filter-checks";
import { checkPaperRules, checkPaperSections, printPaper } from "./support/paper-checks";
import { checkReadRules } from "./support/read-checks";

let failed = false;

function assert(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    console.error("FAIL  " + name + (detail ? " — " + detail : ""));
    failed = true;
    return;
  }
  console.log("ok    " + name);
}

console.log("Kaynak: scripts/fixtures/real-items.ts — gerçek feed snapshot'ı (" + REAL_ITEMS.length + " haber)");
console.log("");
printTopicReport(REAL_ITEMS);
printExamples(REAL_ITEMS);
checkFilterRules(REAL_ITEMS, assert);
checkReadRules(REAL_ITEMS, assert);
checkPaperRules(REAL_ITEMS, assert);
checkPaperSections(REAL_ITEMS, Date.now(), assert);
printPaper(buildPaper(REAL_ITEMS));

if (failed) {
  console.error("\nfilter checks failed");
  process.exit(1);
}
console.log("\ntüm gerçek-veri kontrolleri geçti");
