import { PaperSheet } from "@/components/PaperSheet";
import { buildDigest } from "@/lib/digest";
import { PAPER_SECTIONS, buildPaper, findSection } from "@/lib/paper";

export const revalidate = 1800;

export function generateStaticParams() {
  return PAPER_SECTIONS.filter((section) => section.id !== "ai").map((section) => ({
    bolum: section.id,
  }));
}

export default async function GazeteBolumPage({ params }: { params: Promise<{ bolum: string }> }) {
  const { bolum } = await params;
  const section = findSection(bolum);
  const digest = await buildDigest();
  return <PaperSheet paper={buildPaper(digest.items, undefined, section)} />;
}
