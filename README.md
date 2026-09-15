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
- Alınan kalemler **son 36 saat** ile sınırlıdır (`ITEM_MAX_AGE_HOURS` — `src/lib/config.ts`).
- Kaynak başına en fazla **12** kalem alınır (`FEED_ITEM_LIMIT`).
- Aynı başlık (Türkçe normalize) bir kez gösterilir.

Yani RSS’ler tarayıcıda sürekli poll edilmez; Next.js sayfayı `revalidate` dolunca baştan kurar. `npm run dev` içinde dosya değişince sayfa yine yenilenir.

## Sayfa nasıl kurulur

`buildDigest()` tüm taze kalemleri birleştirir, saate göre sıralar. `splitHome()` bunu üçe böler (`src/lib/home.ts`):

1. **Manşet** — görseli olan en yeni haber (yoksa listedeki ilk kalem)
2. **Sağ sütun** — sonraki 4 haber (yalnızca başlık)
3. **Son haberler** — kalanı ızgarada

Kartlar `rel="noreferrer"` ile dışarı gider.

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

## Ayarlar

| Ne | Nerede | Varsayılan |
| --- | --- | --- |
| Kaynak listesi | `src/lib/feeds.ts` | 5 feed |
| Sayfa yenileme | `src/app/page.tsx` → `revalidate` | 1800 sn (30 dk) |
| Haber penceresi | `src/lib/config.ts` → `ITEM_MAX_AGE_HOURS` | 36 saat |
| Kaynak başı tavan | `src/lib/config.ts` → `FEED_ITEM_LIMIT` | 12 |

Yığın: Next.js 16, React 19, Tailwind v4, `rss-parser`.

## Sürümler

[SemVer](https://semver.org/lang/tr/): `MAJOR.MINOR.PATCH` (`package.json` + git etiketi `vX.Y.Z`).

`0.x` iken ürün henüz 1.0 değil; **minor** yeni katman (MCP, mail, Postgres), **patch** bozulanı düzeltme, **major** (1.0) “bu sözleşme duruyor” dediğin an. `0.1.0` = kamu anasayfa (5 kaynak, dış link, varsayılan 30 dk).

Yeni sürüm:

1. `package.json` içindeki `version` alanını yükselt
2. Bu listedeki bir satırı güncelle
3. Commit et, `git tag -a vX.Y.Z -m "…"`, `git push && git push --tags`
4. GitHub’da Release aç (`gh release create vX.Y.Z`)

| Sürüm | Ne |
| --- | --- |
| **0.1.0** | Anasayfa: 5 RSS, 36 saat, manşet + sütun + ızgara, tık kaynağa |
| 0.1.x | Aynı ürün, hata / küçük UI |
| 0.2 | MCP (digest sorgusu) |
| 0.3 | Postgres + tasnif |
| 0.4 | Mail (ilgi alanı, onay, çıkış) |

## Lisans

[MIT](LICENSE)
