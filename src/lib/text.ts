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
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
