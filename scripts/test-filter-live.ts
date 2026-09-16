import { fetchRealItems } from "./support/real-feed";
import { checkFilterRules, printExamples } from "./support/filter-checks";

async function main() {
  const items = await fetchRealItems();
  console.log("Kaynak: canlı 5 RSS (" + items.length + " haber)");
  console.log("");
  printExamples(items);

  let failed = false;
  function assert(name: string, ok: boolean, detail?: string) {
    if (!ok) {
      console.error("FAIL  " + name + (detail ? " — " + detail : ""));
      failed = true;
      return;
    }
    console.log("ok    " + name);
  }

  checkFilterRules(items, assert);

  if (failed) {
    console.error("\ncanlı feed kontrolleri başarısız");
    process.exit(1);
  }
  console.log("\ntüm canlı kontroller geçti");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
