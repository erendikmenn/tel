import { LeadStory } from "@/components/LeadStory";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { StoryList } from "@/components/StoryList";
import { StoryRail } from "@/components/StoryRail";
import { istanbulDate, istanbulWeekday } from "@/lib/config";
import { buildDigest } from "@/lib/digest";
import { splitHome } from "@/lib/home";
import "./home-desk.css";

export const revalidate = 1800;

export default async function Home() {
  const digest = await buildDigest();
  const { lead, rail, rest } = splitHome(digest.items);

  return (
    <div className="tel-shell">
      <SiteHeader />

      <section className="intro">
        <div>
          <h1>Günün haberleri</h1>
          <p className="kicker">
            {istanbulWeekday().toLocaleUpperCase("tr-TR")} · {istanbulDate()}
          </p>
        </div>
        <p className="lede">
          En yeni üstte. {digest.items.length} haber
          {digest.failedFeeds.length > 0
            ? ` · ulaşılamayan: ${digest.failedFeeds.join(", ")}`
            : ""}
          .
        </p>
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
