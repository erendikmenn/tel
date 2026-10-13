import { getText } from "./http";
import { decodeEntities } from "./text";

const BBC_ACE = /\/ace\/(standard|ws)\/\d+\//;

export function enlargeImage(url?: string) {
  if (!url) return url;
  return url.replace(BBC_ACE, (_match, kind: string) =>
    kind === "ws" ? "/ace/ws/800/" : "/ace/standard/976/",
  );
}

/**
 * Görsel sunucusu dışarıya kapalı kaynaklar: RSS görsel adresi veriyor ama
 * sunucu her isteğe 403 dönüyor (tarayıcı User-Agent'ı ya da Referer fark
 * etmiyor; ölçüldü, 13 Eki 2026: content-media.investing.com 10/10 → 403).
 * Bu adresler görsel sayılırsa haber fotoğraflı yere girip sayfada boş kutu
 * bırakıyor: Ekonomi baskısında 16 sayıda 64 fotoğraf yerinin 42'si böyle
 * boş basıldı (27 Eyl – 13 Eki 2026).
 */
const CLOSED_IMAGE_HOSTS = ["investing.com"];

function isClosedImage(url: string) {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return CLOSED_IMAGE_HOSTS.some((closed) => host === closed || host.endsWith("." + closed));
}

/** Sayfaya konabilecek görsel: kapalı sunucudakiler düşer, BBC görselleri büyütülür. */
export function usableImage(url?: string) {
  if (!url || isClosedImage(url)) return undefined;
  return enlargeImage(url);
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; Tel/0.1; +https://github.com/erendikmenn/tel)",
  Accept: "text/html",
};
const PAGE_TIMEOUT_MS = 5000;
const LOOKUP_TTL_MS = 30 * 60_000;
// og:image <head>'de, sayfanın gerisi indirilmez. CNBC sayfası ~800 KB; 124
// yazılık bir tur 45 MB indiriyordu, böyle 9 MB (13 Ekim 2026).
const PAGE_HEAD = { maxBytes: 120_000, stopAt: "</head>" };
// Aynı anda en fazla 16 sayfa. Sınırsızken bir sayfa üretimi ~120 isteği birden
// atıyordu (CNBC'ye 30, Al Jazeera'ya 25). 16, herkes yanıtsız kalsa bile
// (120 / 16 × 5 sn ≈ 40 sn) Next'in sayfa başına 60 sn'lik derleme sınırının altında.
const MAX_LOOKUPS = 16;

/** Sayfanın og:image / twitter:image adresi, HTML kaçışları çözülmüş (itemImage'daki <img> gibi). */
export function metaImage(html: string) {
  const patterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
  ];

  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (value) return decodeEntities(value);
  }
}

const lookups = new Map<string, { at: number; image: Promise<string | undefined> }>();

/**
 * Yazının og:image görseli. Sayfa fetch ile değil getText ile iner, böylece
 * 5 sn sınırı her yolda geçerli (bkz. getText).
 *
 * Aynı yazı 30 dk içinde bir kez sorulur; Next'in fetch önbelleği bunu
 * derlemede kendiliğinden yapıyordu: dört sayfa aynı ~120 yazıyı arıyor,
 * önbelleksiz derleme 192 yerine 572 sayfa isteği attı (13 Ekim 2026).
 * Başarısız istek (zaman aşımı, 403) saklanmaz, sonraki çağrı yeniden dener.
 */
export function pageImage(url: string) {
  const now = Date.now();
  for (const [key, entry] of lookups) if (now - entry.at > LOOKUP_TTL_MS) lookups.delete(key);
  const known = lookups.get(url);
  if (known) return known.image;
  const image = inTurn(() => lookUpImage(url)).catch(() => {
    lookups.delete(url);
    return undefined;
  });
  lookups.set(url, { at: now, image });
  return image;
}

let running = 0;
const waiting: (() => void)[] = [];

/** Sırası gelince çalıştırır; biten iş yerini doğrudan sıradakine verir. */
async function inTurn<T>(task: () => Promise<T>) {
  if (running < MAX_LOOKUPS) running += 1;
  else await new Promise<void>((resolve) => waiting.push(resolve));
  try {
    return await task();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running -= 1;
  }
}

async function lookUpImage(url: string) {
  const html = (await getText(url, HEADERS, PAGE_TIMEOUT_MS, PAGE_HEAD)).slice(0, PAGE_HEAD.maxBytes);
  const found = metaImage(html);
  if (!found) return undefined;
  return usableImage(new URL(found, url).href);
}
