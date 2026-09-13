const BBC_ACE = /\/ace\/(standard|ws)\/\d+\//;

export function enlargeImage(url?: string) {
  if (!url) return url;
  return url.replace(BBC_ACE, (_match, kind: string) =>
    kind === "ws" ? "/ace/ws/800/" : "/ace/standard/976/",
  );
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; Tel/0.1; +https://github.com/erendikmenn/tel)",
  Accept: "text/html",
};

function metaImage(html: string) {
  const patterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
  ];

  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (value) return value.replaceAll("&amp;", "&");
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
    return enlargeImage(new URL(found, url).href);
  } catch {
    return undefined;
  }
}
