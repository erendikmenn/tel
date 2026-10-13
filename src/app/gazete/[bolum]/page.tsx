import type { Metadata } from "next";
import { PaperSheet } from "@/components/PaperSheet";
import { buildDigest } from "@/lib/digest";
import { PAPER_SECTIONS, buildPaper, findSection } from "@/lib/paper";

export const revalidate = 1800;
// Yalnızca bilinen bölümler: findSection bilinmeyen adı yapay zekâ baskısına
// çeviriyordu, /gazete/herhangi-bir-sey 200 dönüp her yeni adresi baştan çekiyordu.
export const dynamicParams = false;

type Props = { params: Promise<{ bolum: string }> };

export function generateStaticParams() {
  return PAPER_SECTIONS.filter((section) => section.id !== "ai").map((section) => ({
    bolum: section.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = findSection((await params).bolum);
  return {
    title: section.label,
    description: section.short + " haberlerinden kural motoruyla dizilen günlük gazete sayfası.",
  };
}

export default async function GazeteBolumPage({ params }: Props) {
  const { bolum } = await params;
  const section = findSection(bolum);
  const digest = await buildDigest();
  return <PaperSheet paper={buildPaper(digest.items, undefined, section)} />;
}
