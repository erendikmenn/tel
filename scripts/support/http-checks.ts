import http from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { decodeFeedBody, getText } from "../../src/lib/http";
import { pageImage } from "../../src/lib/image";

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

/**
 * Süre sınırı ve og:image okuma, yerel sunucuyla (dış ağ yok). Next derlemede
 * fetch'in önbellekteki bayat kaydını yenilerken sinyali düşürdüğü yolda
 * (13 Ekim 2026 denemesi) yanıt vermeyen sayfa isteği 181 sn açık tuttu,
 * derleme "after 3 attempts" ile düştü; getText kendi soketini kendisi kapatır.
 */
export async function checkPageFetch(assert: HttpAssert) {
  const closed: Record<string, number> = {};
  const hits: Record<string, number> = {};
  const server = http.createServer((req, res) => {
    const opened = Date.now();
    hits[req.url ?? ""] = (hits[req.url ?? ""] ?? 0) + 1;
    req.socket.on("close", () => (closed[req.url ?? ""] = Date.now() - opened));
    if (req.url === "/makale") {
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end('<html><head><meta property="og:image" content="/img/a.jpg?w=1200&amp;h=630"></head></html>');
    } else if (req.url === "/damla") {
      res.writeHead(200, { "content-type": "text/html" });
      res.write("<html><head>");
      const drip = setInterval(() => res.write(" "), 50);
      res.on("close", () => clearInterval(drip));
    } else if (req.url === "/yok") {
      res.writeHead(404).end();
    }
    // /sessiz: hiç yanıt yok.
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;

  const timed = async (path: string) => {
    const start = Date.now();
    // Sınır işlemezse test asılı kalmasın: 2 sn sonra "hata yok" sayılır.
    const error = await Promise.race([
      getText(base + path, {}, 300).then(() => undefined, (failure: Error) => failure),
      new Promise<undefined>((resolve) => setTimeout(resolve, 2000)),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { ms: Date.now() - start, error, closed: closed[path] };
  };
  const silent = await timed("/sessiz");
  assert(
    "ağ: yanıt vermeyen sunucuda istek süre dolunca düşer, soket kapanır",
    Boolean(silent.error) && silent.ms < 1000 && silent.closed !== undefined,
    JSON.stringify({ ms: silent.ms, closed: silent.closed }),
  );
  const drip = await timed("/damla");
  assert(
    "ağ: gövdesi bitmeyen yanıtta da süre gövdeyi kapsar",
    Boolean(drip.error) && drip.ms < 1000 && drip.closed !== undefined,
    JSON.stringify({ ms: drip.ms, closed: drip.closed }),
  );
  const twice = await Promise.all([pageImage(base + "/makale"), pageImage(base + "/makale")]);
  assert(
    "görsel: og:image yerel sayfadan okunur, göreli adres ve &amp; çözülür",
    twice.every((image) => image === base + "/img/a.jpg?w=1200&h=630"),
    twice.join(" | "),
  );
  await pageImage(base + "/makale");
  await pageImage(base + "/yok");
  await pageImage(base + "/yok");
  assert(
    "görsel: aynı yazı bir kez indirilir, başarısız istek saklanmaz",
    hits["/makale"] === 1 && hits["/yok"] === 2,
    JSON.stringify(hits),
  );

  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
