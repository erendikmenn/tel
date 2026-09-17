import { PaperSheet } from "@/components/PaperSheet";
import { buildDigest } from "@/lib/digest";
import { buildPaper, findSection } from "@/lib/paper";

export const revalidate = 1800;

export const metadata = {
  title: "Tel · Günün baskısı",
  description: "Yapay zekâ haberlerinden kural motoruyla dizilen günlük gazete sayfası.",
};

export default async function GazetePage() {
  const digest = await buildDigest();
  const section = findSection("ai");
  return <PaperSheet paper={buildPaper(digest.items, undefined, section)} />;
}
