import { handlePaperPdf } from "@/lib/paperPdf";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handlePaperPdf(request, "/gazete");
}
