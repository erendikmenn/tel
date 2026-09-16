import { NewsExplorer } from "@/components/NewsExplorer";
import { RefreshCountdown } from "@/components/RefreshCountdown";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { istanbulDate, istanbulWeekday } from "@/lib/config";
import { buildDigest } from "@/lib/digest";
import "./pack.css";

// Tek doğruluk kaynağı: intro'daki geri sayım da bu değeri kullanır.
// Next.js bu değeri derleme anında okuyabilmek için düz bir sabit ister.
export const revalidate = 1800;

export default async function Home() {
  const digest = await buildDigest();
  // Bu sürümün üretildiği an; geri sayımın çıkış noktası.
  const generatedAt = new Date().toISOString();

  return (
    <div className="tel-shell">
      <SiteHeader />

      <section className="intro">
        <div className="intro-copy">
          <h1>Günün haberleri</h1>
          <p className="kicker">
            {istanbulWeekday().toLocaleUpperCase("tr-TR")} · {istanbulDate()}
          </p>
        </div>
        <div className="intro-meta">
          <RefreshCountdown intervalSeconds={revalidate} generatedAt={generatedAt} />
          {digest.failedFeeds.length > 0 ? (
            <p className="lede">Ulaşılamayan: {digest.failedFeeds.join(", ")}.</p>
          ) : null}
        </div>
      </section>

      {digest.items.length > 0 ? (
        <NewsExplorer items={digest.items} />
      ) : (
        <p className="note">Kaynaklar şu an sessiz. Birazdan yenilenir.</p>
      )}

      <SiteFooter />
    </div>
  );
}
