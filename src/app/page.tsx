import { LeadStory } from "@/components/LeadStory";
import { RefreshCountdown } from "@/components/RefreshCountdown";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { StoryList } from "@/components/StoryList";
import { StoryRail } from "@/components/StoryRail";
import { istanbulDate, istanbulWeekday } from "@/lib/config";
import { buildDigest } from "@/lib/digest";
import { splitHome } from "@/lib/home";
import "./pack.css";

// Tek doğruluk kaynağı: intro'daki geri sayım da bu değeri kullanır.
// Next.js bu değeri derleme anında okuyabilmek için düz bir sabit ister.
export const revalidate = 1800;

export default async function Home() {
  const digest = await buildDigest();
  const { lead, rail, rest } = splitHome(digest.items);
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

      {lead ? (
        <section className="tel-lead">
          <LeadStory item={lead} />
          <StoryRail items={rail} />
        </section>
      ) : (
        <p className="note">Kaynaklar şu an sessiz. Birazdan yenilenir.</p>
      )}

      {rest.length > 0 ? (
        <section className="block">
          <h2>Son haberler</h2>
          <StoryList items={rest} />
        </section>
      ) : null}

      <SiteFooter />
    </div>
  );
}
