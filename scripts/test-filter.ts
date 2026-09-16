import { REAL_ITEMS } from "./fixtures/real-items";
import { checkFilterRules, printExamples, printTopicReport } from "./support/filter-checks";

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

if (failed) {
  console.error("\nfilter checks failed");
  process.exit(1);
}
console.log("\ntüm gerçek-veri kontrolleri geçti");
