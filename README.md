# Tel

Seçilmiş RSS kaynaklarından günün haberleri. Abonelik, paywall veya Tel içinde haber sayfası yok — her kart kaynağın kendi yazısına çıkar.

Saat dilimi Europe/Istanbul. Haberler **en yeniden eskiye** dizilir.

## Kaynaklar

**15 kaynak.** Liste `src/lib/feeds.ts` içinde; eklemek veya çıkarmak oradan.

**Dünya haberleri (5)**

| Kaynak | RSS |
| --- | --- |
| BBC Türkçe | `https://feeds.bbci.co.uk/turkce/rss.xml` |
| BBC World | `https://feeds.bbci.co.uk/news/world/rss.xml` |
| The Guardian (world) | `https://www.theguardian.com/world/rss` |
| Al Jazeera | `https://www.aljazeera.com/xml/rss/all.xml` |
| NPR | `https://feeds.npr.org/1001/rss.xml` |

**Yapay zekâ — laboratuvarların kendi blogları (5).** Hepsi `topic: "teknoloji"` taşır: kalemler başlıkta anahtar kelime olmasa da **Teknoloji & Yapay Zeka** konusuna düşer.

| Kaynak | RSS |
| --- | --- |
| OpenAI | `https://openai.com/news/rss.xml` |
| Google DeepMind | `https://deepmind.google/blog/rss.xml` |
| Google Research | `https://research.google/blog/rss/` |
| Hugging Face | `https://huggingface.co/blog/feed.xml` |
| NVIDIA | `https://blogs.nvidia.com/feed/` |

**Yapay zekâ — medya (4 + 1 toplayıcı).**

| Kaynak | RSS | Not |
| --- | --- | --- |
| TechCrunch AI | `techcrunch.com/category/artificial-intelligence/feed/` | |
| The Verge AI | `theverge.com/rss/ai-artificial-intelligence/index.xml` | |
| Wired AI | `wired.com/feed/tag/ai/latest/rss` | |
| The Decoder | `the-decoder.com/feed/` | AI odaklı |
| Anthropic (Google News) | `news.google.com/rss/search?q=Anthropic` | **Resmî RSS'i yok** (anthropic.com'da tüm adresler 404); haberleri Google News sorgusuyla gelir, `limit: 12` ile havuzu domine etmesi engellenir |

Anthropic, Meta AI, Mistral ve xAI'nin **resmî RSS'i yok** — ölçüldü (hepsi 404). Google News sorgusu bu boşluğu kapatıyor; kalemler ilgili haberin kaynağına çıkar.

Bir kaynak cevap vermezse sayfa yine açılır; üstte `ulaşılamayan: …` yazar.

## Ne sıklıkla yenilenir

- Anasayfa `src/app/page.tsx` içindeki `revalidate` kadar sürede bir yeniden üretilir (varsayılan 1800 sn / 30 dk). Intro'daki geri sayım da aynı değeri okuduğu için süre değişince sayaç kendiliğinden uyum sağlar.
- Her üretimde 15 feed **paralel** çekilir (`rss-parser`, zaman aşımı 8 sn).
- Sunucu bir **üst küme** çeker: **30 günden yeni her şey** (`MAX_AGE_HOURS`). Kaynak başına yapay sınır yok; `Feed.limit` yalnızca toplayıcı feed'ler için (Google News), genel `MAX_ITEMS = 400` güvenlik tavanı var (`src/lib/config.ts`). Pencere süzgeci **tarayıcıda** uygulanır.
- Ölçüm (16 Eyl 2026, 15 feed): havuz **307 kalem**; en kalabalık kaynak OpenAI 60, The Guardian 45, BBC World 26.
- Ekrandaki **varsayılan** görünüm son **24 saat** ve kaynak başına **12** kalemdir; kullanıcı bunları Filtreler panelinden değiştirebilir.
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

Anasayfanın üstündeki çubuktan arama yapılır; yanındaki **Filtreler** panelinden kaynak, pencere ve kaynak başına sayı seçilir. Hepsi **tarayıcıda** çalışır: sunucu bir kez üst kümeyi üretir (pratikte ~125 kalem), arama/filtre sunucuya istek atmadan anında uygulanır.

- **Arama** (`q`): kelime bazlı. Büyük-küçük harf ve aksan farkı gözetilmez (`AI` = `ai`, `İran` = `iran`). Noktalama ve tire kelimeyi **böler** (`AI-generated` → `ai generated`). **3 harften kısa** sorgular yalnızca **tam kelime** eşleşir (`ai` → sadece `AI`; `aim`/`aid`/`airport`/`ailem` değil); **3+ harf** prefix de kabul eder (`lib` → `libya`, `iran` → `iranian`/`iranbacked`). Varsayılan olarak tüm kelimeler eşleşmeli.
- **Kaynak**: çoklu seçim; seçilenler aralarında **VEYA**, diğer filtrelerle **VE**.
- **Pencere**: son 1 / 6 / 12 / 24 saat ya da **Tümü** (varsayılan **24 saat**), tarayıcıda uygulanır. **Ölçüm (kaynak başına 12):** 1s → 22, 6s → 58, 12s → 63, 24s → 95, Tümü → 169. Kaynak başına **20+** ile: 6s → 72, 12s → 96, 24s → 141, Tümü → 307. 36 ve 48 saat seçenekleri, kaynak başına sınır bağlayıcı olduğu için kaldırılmıştı; yapay zekâ feed'leriyle pencere yeniden ayrışıyor (24s 95'e karşı Tümü 169). **Tümü** = feed'in verdiği her şey; gerçek uzun pencereler arşiv (`0.3`) ile gelir.
- **Kaynak başına**: 6 / 12 / 16 / **20+** (sınırsız; varsayılan **12**); `takePerSource()` ile tarayıcıda uygulanır, üretken bir kaynak sayfayı domine etmez.
- **Kategori**: 9 konu + Diğer; `DigestFilter.category` ile süzülür (aşağıdaki **Kategoriler** bölümü).
- **Canlı sayaçlar**: panelde her seçeneğin yanında, **diğer gruplar sabitken** o seçimle kaç sonuç geleceği yazar (`src/lib/counts.ts`). Sonucu olmayan seçenekler solgun görünür; seçmeden önce "kaç haber gelir" görülür. Grup içi seçim sayıları değiştirmez (yönlü arama mantığı).
- **Okuma durumu**: bir habere tıklamak onu **okundu** işaretler; okunanlar solgunlaşır ve üstteki sayaç "N yeni" der. Kayıt tarayıcıda (`tel:okunan`) tutulur, sunucuya gitmez; 120 günden eski kayıtlar kendiliğinden düşer. ("Sadece yeni" görünümü kütüphanede duruyor: `viewItems(..., { onlyNew: true, reads })`; arayüzde düğmesi yok.)
- **URL'e yazılır**: `/?q=yapay+zeka&kaynak=bbc-tr,npr&kategori=teknoloji&zaman=6&kaynakbasi=20` paylaşılabilir. Pencere/kaynak-başına tercihi ayrıca `localStorage`'da tutulur (`tel:view`); **Temizle** hepsini varsayılana döndürür.
- Çekirdek: `src/lib/filter.ts` (`filterItems`, `takePerSource`, `countMatches`, `matchesFilter`); metin sadeleştirme `src/lib/text.ts` (`normalizeText`) — tekilleştirmeyle **aynı** fonksiyon.
- **Kategori** filtresi `0.3 tasnif` ile gelecek; `DigestFilter`'a `category` eklenince aynı çubukta yer alır.
- Testler **gerçek veriyle** çalışır: `npm test` canlıdan alınmış gerçek başlıklardan oluşan `scripts/fixtures/real-items.ts` snapshot'ı üzerinde kuralları doğrular; `npm run test:live` aynı kontrolleri canlı 5 RSS'te çalıştırır; `npm run fixtures` snapshot'ı yeniler.

## Kategoriler

Her habere **kural tabanlı** konu etiketi atanır (`src/lib/topics.ts`) ve filtre çubuğundan seçilir. **Sıfır bağımlılık**: model, API anahtarı veya indirme yok — herkes klonlayıp anında çalıştırır.

**9 konu + Diğer:** Savaş & Çatışma · Siyaset · Ekonomi · Teknoloji & Yapay Zeka · Sağlık · Bilim & Çevre · Spor · Kültür & Eğlence · Toplum & Adalet · Diğer

Kurallar:

- Eşleştirme **başlıkta** yapılır; ayrıca **RSS `<category>` etiketleri** başlıkla birlikte değerlendirilir. Özetler (özellikle Guardian) başka haberlerin teaser metnini taşıdığı için **kullanılmaz**.
- TR + EN anahtar kelimeler; `normalizeText` ile aksan/İ katlanır.
- **Kelime sınırı:** tam eşleşme ya da (4+ harfse) kelime başı → `savaş` → `savaşının`, `faiz` → `faizler`; ama `zam` → `zaman` değil.
- `"=kelime"` tam eşleşme zorunlu kılar (`=ai`); `"?kelime"` **zayıf** kelimedir (tek başına etiketler, sıralamada geride kalır).
- **Öbek** desteği: `yapay zeka`, `interest rate`, `trade war`.
- Bir habere en fazla **2 konu** atanır; hiçbiri tutmazsa boş kalır ve **Diğer** filtresi onu yakalar.

**RSS etiketleri (bedava sinyal):** Guardian 45/45 (`Business`, `Technology`, `AI (artificial intelligence)`, `Environment`, `US politics`…), Al Jazeera 25/25 (`Sport`, `News`); **BBC Türkçe, BBC World ve NPR hiç vermiyor.** Guardian etiketi `{ _: "Business", $: { domain } }` biçiminde geldiği için (rss-parser ham hâlde hata veriyordu) `itemCategories()` normalleştirir; anahtar listemizde olmayan `Business`/`Sport` değerleri küçük bir eşlemeyle bağlanır.

Ölçüm (125 gerçek haber): **Savaş 38 · Toplum 34 · Siyaset 27 · Ekonomi 17 · Diğer 17 · Teknoloji 14 · Bilim 9 · Spor 6 · Sağlık 5 · Kültür 4.** `npm test` bu dağılımı ve örnek başlıkları basar.

**Neden embedding yok:** proje local-first; ~120MB model indirmesi + native paket "klonla → çalıştır" deneyimini ağırlaştırır. Ölçüm bir konunun zayıf kaldığını gösterirse, kural katmanının **altına düşen opsiyonel** bir yerel embedding katmanı eklenebilir (kural → varsa embedding).

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
| Pencere seçenekleri | `src/lib/config.ts` → `WINDOW_OPTIONS` | 1 saat … 24 saat + Tümü (varsayılan 24 saat) |
| Fetch akıl sağlığı | `src/lib/config.ts` → `MAX_AGE_HOURS` | 30 gün (bundan eskisi elenir) |
| Genel güvenlik tavanı | `src/lib/config.ts` → `MAX_ITEMS` | 300 (pratikte ~125) |

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
