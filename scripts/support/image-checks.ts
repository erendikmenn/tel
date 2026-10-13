import type { DigestItem } from "../../src/lib/digest";
import { usableImage } from "../../src/lib/image";
import { itemImage, type ImageSource } from "../../src/lib/media";
import { buildPaper, findSection } from "../../src/lib/paper";

export type ImageAssert = (name: string, ok: boolean, detail?: string) => void;

const INVESTING = "content-media.investing.com";

function host(url?: string) {
  return url ? new URL(url).hostname : "";
}

/**
 * Görsel kuralları ve ekonomi baskısının fotoğraf yerleri. Haberler 13 Ekim 2026
 * feed'lerinden (başlık, link, enclosure gerçek). Sabah 06:15'te Investing.com TR
 * en taze kaynaktı ve görselleri her isteğe 403 dönüyordu: fotoğraf yerlerini o
 * doldurunca baskı boş kutularla çıktı.
 */
export function checkImageRules(assert: ImageAssert) {
  const jpeg = (url: string): ImageSource => ({ enclosure: { url, type: "image/jpeg" } });
  const investingPhoto = "https://" + INVESTING + "/news/LYNXMPEA601YK_M.jpg";
  const dunyaPhoto =
    "https://image.dunya.com/rcman/Cw1280h720q95gc/storage/files/images/2026/10/13/kivanc-enerji-3-cbvs_cover.jpg";

  assert("görsel: investing.com görseli (her isteğe 403) görsel sayılmaz", itemImage(jpeg(investingPhoto)) === undefined);
  assert(
    "görsel: kapalı enclosure atlanır, sıradaki aday alınır",
    itemImage({ ...jpeg(investingPhoto), mediaThumbnail: { $: { url: dunyaPhoto } } }) === dunyaPhoto,
  );
  assert("görsel: og:image yolunda da kapalı sunucu düşer", usableImage("https://i-invdn-com.investing.com/news/a.jpg") === undefined);
  assert("görsel: açık sunucudaki enclosure aynen kalır", itemImage(jpeg(dunyaPhoto)) === dunyaPhoto);
  assert(
    "görsel: BBC küçük resmi büyütülür",
    itemImage({ mediaThumbnail: { $: { url: "https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/5a5e/live/a.jpg" } } }) ===
      "https://ichef.bbci.co.uk/ace/standard/976/cpsprodpb/5a5e/live/a.jpg",
  );

  // 13 Ekim 2026, 06:15 (İstanbul): Investing.com TR kalemleri en yenisi.
  const now = Date.parse("2026-10-13T03:15:00Z");
  const story = (source: string, minutesAgo: number, title: string, link: string, photo: string): DigestItem => ({
    id: link,
    title,
    link,
    source,
    isoDate: new Date(now - minutesAgo * 60_000).toISOString(),
    image: itemImage(jpeg(photo)),
    topics: ["ekonomi"],
  });
  const investing = (minutesAgo: number, title: string, slug: string, photo: string) =>
    story("Investing.com TR", minutesAgo, title, "https://tr.investing.com/news/" + slug, "https://" + INVESTING + "/news/" + photo);
  const pool = [
    investing(5, "Bellway hissesi bugün neden yükselişte?", "stock-market-news/bellway-hissesi-bugun-neden-yukseliste-93CH-4100456", "LYNXMPEA601YK_M.jpg"),
    investing(6, "Ak Yatırım, 1,5 milyar TL’lik finansman bonosu ihraç etti", "global-filings/ak-yatrm-15-milyar-tllik-finansman-bonosu-ihrac-etti-93CH-4100454", "moved_LYNXMPEM4510G_1200_L.jpg"),
    investing(8, "Bytes Technology hissesi bugün neden düşüyor?", "stock-market-news/bytes-technology-hissesi-bugun-neden-dusuyor-93CH-4100451", "LYNXNPEC0Q1B5_M.jpg"),
    investing(11, "Generac CEO’su Aaron Jagdfeld 1,03 milyon dolarlık hisse sattı", "insider-trading-news/generac-ceosu-aaron-jagdfeld-103-milyon-dolarlk-hisse-satt-93CH-4100450", "moved_LYNXMPEM3Q0WG_1200_L.jpg"),
    investing(13, "Goldman Sachs, Orion180 Insurance hissesine al önerisiyle başladı", "analyst-ratings/goldman-sachs-orion180-insurance-hissesine-al-onerisiyle-baslad-93CH-4100447", "moved_LYNXMPEM3T1AG_1200_L.jpg"),
    investing(14, "Publicis Groupe hisseleri neden yükselişte?", "stock-market-news/publicis-groupe-hisseleri-neden-yukseliste-93CH-4100446", "LYNXNPEB9606Q_M.jpg"),
    story("Bloomberg HT", 40, "Dış ticaret haddinde olumsuz sinyaller sürdü", "https://www.bloomberght.com/dis-ticaret-haddi-agustos-3791173", "https://geoim.bloomberght.com/l/2026/10/13/ver1791874782/3791173/jpg/1280x720"),
    story("Bloomberg HT", 45, "Altın, güçlü dolar ve faiz beklentileriyle geriledi", "https://www.bloomberght.com/altin-guclu-dolar-ve-faiz-beklentileriyle-geriledi-3791146", "https://geoim.bloomberght.com/l/2026/10/13/ver1791863457/3791146/jpg/1280x720"),
    story("Dünya", 70, "Ekonomistlerin TCMB faiz beklentileri netleşti", "https://www.dunya.com/ekonomi/ekonomistlerin-tcmb-faiz-beklentileri-netlesti-haberi-843658", "https://image.dunya.com/rcman/Cw1280h720q95gc/storage/files/images/2026/10/06/tcmb-nssg_cover.jpg"),
    story("Dünya", 90, "Kıvanç Enerji rotayı ABD’ye çevirdi: İhracatla küresel büyüme hedefi", "https://www.dunya.com/sirketler/kivanc-enerji-rotayi-abdye-cevirdi-ihracatla-kuresel-buyume-hedefi-haberi-843660", dunyaPhoto),
    story("Ekonomim", 100, "Küba, eski petrol yasalarını değiştirdi: Yabancı şirketlere yeni fırsatlar", "https://www.ekonomim.com/dunya/kuba-eski-petrol-yasalarini-degistirdi-yabanci-sirketlere-yeni-firsatlar-haberi-924336", "https://img.ekonomim.com/storage/files/images/2026/10/13/kuba-eski-petrol-yasalarini-degistirdi-yabanci-sirketlere-yeni-firsatlar-dm5g_cover.jpg"),
    story("Ekonomim", 120, "Yapı Merkezi'ne tahkim müjdesi: Etiyopya'dan 307 milyon dolar alacak!", "https://www.ekonomim.com/sirketler/yapi-merkezine-tahkim-mujdesi-etiyopyadan-307-milyon-dolar-alacak-haberi-924341", "https://img.ekonomim.com/storage/files/images/2026/10/13/yapi-merkezine-tahkim-mujdesi-etiyopyadan-307-milyon-dolar-alacak-4zvf_cover.jpg"),
  ];

  const paper = buildPaper(pool, now, findSection("ekonomi"));
  const photos = [paper.lead, ...paper.stories];
  const page = [paper.lead, ...paper.strip, ...paper.flankers, ...paper.stories, ...paper.sidebar, ...paper.briefs];
  assert(
    "ekonomi: sabah baskısının fotoğraf yerleri açılan görsellerle dolu",
    paper.stories.length === 3 && photos.every((item) => Boolean(item?.image) && host(item?.image) !== INVESTING),
    photos.map((item) => item?.source + " " + host(item?.image)).join(" | "),
  );
  assert(
    "ekonomi: görselsiz kalan Investing.com TR haberleri yazı olarak sayfada",
    page.some((item) => item?.source === "Investing.com TR"),
  );
}
