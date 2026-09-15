import { buildDigest } from "../src/lib/digest";
import { filterItems } from "../src/lib/filter";

async function main() {
  const digest = await buildDigest();
  const items = digest.items;

  console.log(
    `digest  ${items.length} haber` +
      (digest.failedFeeds.length ? `  ulaşılamayan: ${digest.failedFeeds.join(", ")}` : ""),
  );

  const cases = [
    { name: "limit=5", filter: { limit: 5 } },
    { name: "source=bbc-tr limit=5", filter: { source: "bbc-tr", limit: 5 } },
    { name: "sinceHours=6 limit=5", filter: { sinceHours: 6, limit: 5 } },
    { name: 'q="Libya" limit=10', filter: { q: "Libya", limit: 10 } },
  ];

  for (const test of cases) {
    const found = filterItems(items, test.filter);
    console.log(`\n${test.name}  →  ${found.length}`);
    for (const item of found) {
      console.log(`  - [${item.source}] ${item.title}`);
      console.log(`    ${item.link}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
