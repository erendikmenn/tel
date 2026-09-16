# Tel

Seçilmiş RSS kaynaklarından günün haberleri. Abonelik, paywall veya Tel içinde haber sayfası yok — her kart kaynağın kendi yazısına çıkar.

Saat dilimi Europe/Istanbul. Haberler **en yeniden eskiye** dizilir.

## Kaynaklar

**5 kaynak.** Liste `src/lib/feeds.ts` içinde; eklemek veya çıkarmak oradan.

| Kaynak | RSS |
| --- | --- |
| BBC Türkçe | `https://feeds.bbci.co.uk/turkce/rss.xml` |
| BBC World | `https://feeds.bbci.co.uk/news/world/rss.xml` |
| The Guardian (world) | `https://www.theguardian.com/world/rss` |
| Al Jazeera | `https://www.aljazeera.com/xml/rss/all.xml` |
| NPR | `https://feeds.npr.org/1001/rss.xml` |

Bir kaynak cevap vermezse sayfa yine açılır; üstte `ulaşılamayan: …` yazar.

## Ne sıklıkla yenilenir

- Anasayfa `src/app/page.tsx` içindeki `revalidate` kadar sürede bir yeniden üretilir (varsayılan 1800 sn / 30 dk). Intro'daki geri sayım da aynı değeri okuduğu için süre değişince sayaç kendiliğinden uyum sağlar.
- Her üretimde 5 feed **paralel** çekilir (`rss-parser`, zaman aşımı 8 sn).
- Sunucu bir **üst küme** çeker: son **48 saat** (`ITEM_MAX_AGE_HOURS`) ve kaynak başına en fazla **20** kalem (`FEED_ITEM_LIMIT`) — `src/lib/config.ts`.
- Ekrandaki **varsayılan** görünüm son **36 saat** ve kaynak başına **12** kalemdir; kullanıcı bunları Filtreler panelinden değiştirebilir.
- Aynı başlık (Türkçe + aksan normalize, `normalizeText`) bir kez gösterilir.

Yani RSS’ler tarayıcıda sürekli poll edilmez; Next.js sayfayı `revalidate` dolunca baştan kurar. `npm run dev` içinde dosya değişince sayfa yine yenilenir.

## Sayfa nasıl kurulur

`buildDigest()` tüm taze kalemleri birleştirir, saate göre sıralar. `splitHome()` bunu üçe böler (`src/lib/home.ts`):

1. **Manşet** — görseli olan en yeni haber (yoksa listedeki ilk kalem)
2. **Sağ sütun** — sonraki 4 haber (yalnızca başlık)
3. **Son haberler** — kalanı ızgarada

Kartlar `rel="noreferrer"` ile dışarı gider.

Anasayfadaki `NewsExplorer` (client) arama ve filtreyi uygular, sonra aynı `splitHome()` ile manşet/sütun/ızgara kurar.

## Arama ve filtreleme

Anasayfanın üstündeki çubuktan arama yapılır; yanındaki **Filtreler** panelinden kaynak, pencere ve kaynak başına sayı seçilir. Hepsi **tarayıcıda** çalışır: sunucu bir kez üst kümeyi üretir (en fazla ~100 kalem), arama/filtre sunucuya istek atmadan anında uygulanır.

- **Arama** (`q`): kelime bazlı. Büyük-küçük harf ve aksan farkı gözetilmez (`AI` = `ai`, `İran` = `iran`). Noktalama ve tire kelimeyi **böler** (`AI-generated` → `ai generated`). **3 harften kısa** sorgular yalnızca **tam kelime** eşleşir (`ai` → sadece `AI`; `aim`/`aid`/`airport`/`ailem` değil); **3+ harf** prefix de kabul eder (`lib` → `libya`, `iran` → `iranian`/`iranbacked`). Varsayılan olarak tüm kelimeler eşleşmeli.
- **Kaynak**: çoklu seçim; seçilenler aralarında **VEYA**, diğer filtrelerle **VE**.
- **Pencere**: son 1 / 6 / 12 / 24 / 36 / 48 saat (varsayılan **36**). Sunucu en fazla `ITEM_MAX_AGE_HOURS` (48 saat) çeker.
- **Kaynak başına**: 6 / 12 / 16 / 20 haber (varsayılan **12**); `takePerSource()` ile tarayıcıda uygulanır, üretken bir kaynak sayfayı domine etmez.
- **URL'e yazılır**: `/?q=yapay+zeka&kaynak=bbc-tr,npr&zaman=6&kaynakbasi=20` paylaşılabilir. Pencere/kaynak-başına tercihi ayrıca `localStorage`'da tutulur (`tel:view`); **Temizle** hepsini varsayılana döndürür.
- Çekirdek: `src/lib/filter.ts` (`filterItems`, `takePerSource`, `countMatches`, `matchesFilter`); metin sadeleştirme `src/lib/text.ts` (`normalizeText`) — tekilleştirmeyle **aynı** fonksiyon.
- **Kategori** filtresi `0.3 tasnif` ile gelecek; `DigestFilter`'a `category` eklenince aynı çubukta yer alır.
- Testler **gerçek veriyle** çalışır: `npm test` canlıdan alınmış gerçek başlıklardan oluşan `scripts/fixtures/real-items.ts` snapshot'ı üzerinde kuralları doğrular; `npm run test:live` aynı kontrolleri canlı 5 RSS'te çalıştırır; `npm run fixtures` snapshot'ı yeniler.

## Görseller

Sıra:

1. RSS enclosure / `media:thumbnail` / `media:content` / gövde `<img>`
2. Yoksa yazının `og:image` (veya Twitter image), 5 sn zaman aşımı
3. BBC `ichef` adresleri büyütülür: `/ace/standard/…` → 976px, `/ace/ws/…` → 800px

Bazı NPR kalemleri TIFF veya varsayılan logo gelebilir; bunu CSS düzeltmez.

## Düzen

Masaüstü (1920 hedef): foto + başlık + 360px sağ sütun, altında 4 sütun ızgara.

- **1280px ve altı:** daha dar kabuk, 300px sütun, 3 sütun ızgara
- **1023px ve altı:** manşet alta iner (önce başlık, 16:9 foto), sütun da alta gelir; ızgara 2 sütun
- **560px ve altı:** ızgara tek sütun

## Çalıştır

Node 24 önerilir (Homebrew `node@24`).

```bash
npm install
npm run dev
```

http://localhost:3000

```bash
npm run build
npm start
```

```bash
npm test          # dondurulmuş gerçek feed snapshot'ı (hızlı, ağsız)
npm run test:live # canlı 5 RSS ile aynı kontroller
npm run fixtures  # snapshot'ı canlıdan yenile
```

## Ayarlar

| Ne | Nerede | Varsayılan |
| --- | --- | --- |
| Kaynak listesi | `src/lib/feeds.ts` | 5 feed |
| Sayfa yenileme | `src/app/page.tsx` → `revalidate` | 1800 sn (30 dk) |
| Haber penceresi (fetch tavanı) | `src/lib/config.ts` → `ITEM_MAX_AGE_HOURS` | 48 saat (ekranda varsayılan 36) |
| Kaynak başı tavan (fetch) | `src/lib/config.ts` → `FEED_ITEM_LIMIT` | 20 (ekranda varsayılan 12) |

Yığın: Next.js 16, React 19, Tailwind v4, `rss-parser`.

## Sürümler

[SemVer](https://semver.org/lang/tr/): `MAJOR.MINOR.PATCH` (`package.json` + git etiketi `vX.Y.Z`).

`0.x` iken ürün henüz 1.0 değil; **minor** yeni katman (MCP, mail, Postgres), **patch** bozulanı düzeltme, **major** (1.0) “bu sözleşme duruyor” dediğin an. `0.1.x` = kamu anasayfa (5 kaynak, dış link, arama + filtre, varsayılan 30 dk).

Yeni sürüm:

1. `package.json` içindeki `version` alanını yükselt
2. Bu listedeki bir satırı güncelle
3. Commit et, `git tag -a vX.Y.Z -m "…"`, `git push && git push --tags`
4. GitHub’da Release aç (`gh release create vX.Y.Z`)

| Sürüm | Ne |
| --- | --- |
| **0.1.1** | Canlı arama (kelime bazlı; TR/EN/aksan duyarsız) + kaynak/zaman filtresi, URL'e yazılır; gerçek feed verisiyle testler |
| 0.1.0 | Anasayfa: 5 RSS, 36 saat, manşet + sütun + ızgara, tık kaynağa |
| 0.1.x | Aynı ürün, hata / küçük UI |
| 0.2 | MCP (digest sorgusu) |
| 0.3 | Postgres + tasnif |
| 0.4 | Mail (ilgi alanı, onay, çıkış) |

## Lisans

[MIT](LICENSE)
