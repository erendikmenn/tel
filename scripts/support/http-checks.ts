import { gzipSync } from "node:zlib";
import { decodeFeedBody } from "../../src/lib/http";

export type HttpAssert = (name: string, ok: boolean, detail?: string) => void;

/** Feed gövdesinin metne çevrilmesi (ağsız). */
export function checkFeedDecode(assert: HttpAssert) {
  const xml = '<?xml version="1.0" encoding="UTF-8"?><rss><channel><title>Google DeepMind – Ağ</title></channel></rss>';
  const plain = Buffer.from(xml, "utf8");

  assert("feed: düz gövde olduğu gibi", decodeFeedBody(plain, { "content-type": "text/xml" }) === xml);
  // 13 Ekim 2026: DeepMind kabaca her beş istekten birinde gzip'li gövdeyi Content-Encoding yazmadan gönderdi.
  assert(
    "feed: başlıksız gzip gövde açılır",
    decodeFeedBody(gzipSync(plain), { "content-type": "text/xml" }) === xml,
  );
  assert(
    "feed: ISO-8859-1 bildiren gövde Latin-1 okunur",
    decodeFeedBody(Buffer.from("café", "latin1"), { "content-type": "text/xml; charset=ISO-8859-1" }) === "café",
  );
}
