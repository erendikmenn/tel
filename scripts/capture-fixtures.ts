import fs from "node:fs";
import path from "node:path";
import { fetchRealItems } from "./support/real-feed";

async function main() {
  const items = await fetchRealItems();
  const out = path.join(process.cwd(), "scripts/fixtures/real-items.ts");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const body = [
    'import type { DigestItem } from "../../src/lib/digest";',
    "",
    "// GERÇEK feed snapshot'ı: canlı 5 RSS'ten alınıp donduruldu.",
    "// Yenilemek için: npm run fixtures",
    "export const REAL_ITEMS: DigestItem[] = " + JSON.stringify(items, null, 2) + ";",
    "",
  ].join("\n");
  fs.writeFileSync(out, body, "utf8");
  console.log("yazıldı:", out, "|", items.length, "gerçek haber");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
