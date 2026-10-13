import http from "node:http";
import https from "node:https";
import { gunzipSync } from "node:zlib";

const HEADERS = {
  "User-Agent": "Tel/0.1 (+https://tel.local)",
  Accept: "application/rss+xml, application/xml, text/xml",
};
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;

/**
 * Feed'in XML'ini indirir; rss-parser'ın parseURL'ünün yerine geçer
 * (yönlendirme, durum kodu ve karakter kümesi aynı kurallarla). İki fark:
 *
 * - Gövde gzip ise açılır. Google DeepMind feed'i gzip'li gövdeyi
 *   Content-Encoding başlığı olmadan gönderiyor (13 Ekim 2026); parseURL onu
 *   düz metin sanıp "Non-whitespace before first tag" ile düşüyordu ve kaynak
 *   her sayfada "ulaşılamayan" listesindeydi.
 * - Süre dolunca istek gerçekten kesilir; parseURL yalnızca sözü reddediyor,
 *   soket açık kalıyordu.
 *
 * Saf modül: yalnızca Node modülleri, böylece test derlemesinde de yüklenir.
 */
export async function getFeedXml(url: string) {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let target = url;
  for (let redirects = 0; ; redirects += 1) {
    const response = await request(target, signal);
    if (response.location && response.status >= 300 && response.status < 400) {
      if (redirects >= MAX_REDIRECTS) throw new Error("Too many redirects");
      target = new URL(response.location, target).href;
      continue;
    }
    if (response.status >= 300) throw new Error("Status code " + response.status);
    return response.text;
  }
}

type Response = { status: number; location?: string; text: string };

function request(url: string, signal: AbortSignal) {
  const get = url.startsWith("https:") ? https.get : http.get;
  return new Promise<Response>((resolve, reject) => {
    const req = get(url, { headers: HEADERS, signal }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300) {
        res.resume();
        resolve({ status, location: res.headers.location, text: "" });
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("error", reject);
      res.on("end", () => {
        try {
          resolve({ status, text: decodeFeedBody(Buffer.concat(chunks), res.headers) });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
  });
}

/** Gövdeyi metne çevirir: gzip'liyse (başlık yazmasa da) açar. */
export function decodeFeedBody(body: Buffer, headers: http.IncomingHttpHeaders) {
  const gzip = headers["content-encoding"] === "gzip" || (body[0] === 0x1f && body[1] === 0x8b);
  const bytes = gzip ? gunzipSync(body) : body;
  // rss-parser gibi: UTF-8; yalnızca ISO-8859-1 bildiren feed Latin-1 okunur.
  const charset = /(?:encoding|charset)\s*=\s*"?([\w-]+)/i.exec(headers["content-type"] ?? "")?.[1]?.toLowerCase();
  return bytes.toString(charset === "iso-8859-1" || charset === "latin1" ? "latin1" : "utf8");
}
