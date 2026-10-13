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

export async function pageImage(url: string) {
  try {
    const response = await fetch(url, {
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return undefined;

    const html = (await response.text()).slice(0, 120_000);
    const found = metaImage(html);
    if (!found) return undefined;
    return usableImage(new URL(found, url).href);
  } catch {
    return undefined;
  }
}
