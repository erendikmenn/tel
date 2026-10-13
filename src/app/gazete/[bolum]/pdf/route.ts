import { PAPER_SECTIONS } from "@/lib/paper";
import { handlePaperPdf } from "@/lib/paperPdf";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ bolum: string }> }) {
  const { bolum } = await params;
  const section = PAPER_SECTIONS.find((entry) => entry.id === bolum);
  // Bilinmeyen bölüm için tarayıcı açılmaz (sayfası da 404).
  if (!section) {
    return new Response("Böyle bir baskı yok.\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  // Yapay zekâ baskısı kök adreste durur: /gazete/ai diye bir sayfa yok.
  return handlePaperPdf(request, section.id === "ai" ? "/gazete" : "/gazete/" + section.id);
}
