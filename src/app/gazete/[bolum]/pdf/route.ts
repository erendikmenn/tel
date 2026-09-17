import { findSection } from "@/lib/paper";
import { handlePaperPdf } from "@/lib/paperPdf";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ bolum: string }> }) {
  const { bolum } = await params;
  return handlePaperPdf(request, "/gazete/" + findSection(bolum).id);
}
