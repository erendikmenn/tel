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
 * HTML kaçışlarını bir kez çözer: başlıklarda `Meta&#8217;s` → `Meta’s`,
 * görsel adreslerinde `?a=1&#038;b=2`, `&amp;`, `&#x26;` → `&`.
 * Noktalı virgülsüz ya da bilinmeyen varlık ve geçersiz kod noktası
 * (`&#0;`, vekil, `&#x10FFFF;` üstü) olduğu gibi kalır: String.fromCodePoint
 * sonuncusunda hata fırlatır, tek bir bozuk başlık feed'in tamamını düşürürdü.
 */
export function decodeEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith("#")) {
      const hex = code[1]?.toLowerCase() === "x";
      const point = Number.parseInt(hex ? code.slice(2) : code.slice(1), hex ? 16 : 10);
      const valid = point > 0 && point <= 0x10ffff && (point < 0xd800 || point > 0xdfff);
      return valid ? String.fromCodePoint(point) : match;
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
