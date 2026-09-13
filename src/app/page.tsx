import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { StoryList } from "@/components/StoryList";
import { istanbulDate, istanbulWeekday } from "@/lib/config";
import { buildDigest } from "@/lib/digest";

export const revalidate = 1800;

export default async function Home() {
  const digest = await buildDigest();

  return (
    <div className="shell">
      <SiteHeader />

      <section className="intro">
        <div>
          <h1>Günün kareleri</h1>
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

      <StoryList digest={digest} />

      <SiteFooter />
    </div>
  );
}
