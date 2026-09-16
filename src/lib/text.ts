const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

/**
 * RSS başlıklarında sık görülen HTML kaçışlarını çözer:
 * `Meta&#8217;s` → `Meta’s`, `&amp;` → `&`.
 */
export function decodeEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith("#")) {
      const hex = code[1]?.toLowerCase() === "x";
      const parsed = Number.parseInt(hex ? code.slice(2) : code.slice(1), hex ? 16 : 10);
      return Number.isFinite(parsed) && parsed > 0 ? String.fromCodePoint(parsed) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Arama ve tekilleştirme için metni sadeleştirir:
 * - Türkçe küçük harfe indirir (İ → i)
 * - I / İ / ı / i ayrımını "i"de birleştirir (İngilizce "AI" da "ai" olur)
 * - aksanları katlar (â→a, ü→u, ş→s, ğ→g, ö→o, ç→c)
 * - noktalama ve fazla boşlukları temizler
 */
export function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
