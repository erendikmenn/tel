import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { APP_NAME, istanbulDate, istanbulStamp, istanbulWeekday } from "@/lib/config";
import { buildDigest } from "@/lib/digest";
import {
  PAPER_FEATURE_SUMMARY,
  PAPER_LEAD_SUMMARY,
  buildPaper,
  clipSummary,
} from "@/lib/paper";
import "./paper.css";

export const revalidate = 1800;

export const metadata = {
  title: "Tel · Günün baskısı",
  description: "Yapay zekâ haberlerinden kural motoruyla dizilen günlük gazete sayfası.",
};

export default async function GazetePage() {
  const digest = await buildDigest();
  const paper = buildPaper(digest.items);
  const generated = istanbulStamp(new Date().toISOString());
  const leadStamp = istanbulStamp(paper.lead?.isoDate);

  return (
    <div className="paper-wrap">
      <div className="paper-actions no-print">
        <Link className="paper-button" href="/">
          ← Anasayfa
        </Link>
        <PrintButton />
      </div>

      {paper.lead ? (
        <article className="paper">
          <header className="paper-masthead">
            <h1 className="paper-title">{APP_NAME}</h1>
            <p className="paper-byline">by erenailab</p>
          </header>

          <hr className="paper-rule" />

          <div className="paper-dateline">
            <span>
              {istanbulWeekday()} · {istanbulDate()}
            </span>
            <span>Yapay zekâ baskısı · Sayı {paper.edition}</span>
          </div>

          <section className="paper-lead">
            {paper.lead.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="paper-lead-photo" src={paper.lead.image} alt="" />
            ) : null}
            <h2>{paper.lead.title}</h2>
            {clipSummary(paper.lead.summary, PAPER_LEAD_SUMMARY) ? (
              <p className="paper-standfirst">
                {clipSummary(paper.lead.summary, PAPER_LEAD_SUMMARY)}
              </p>
            ) : null}
            <p className="paper-meta">
              {paper.lead.source}
              {leadStamp ? " · " + leadStamp : ""}
            </p>
          </section>

          {paper.features.length > 0 ? (
            <section className="paper-features">
              {paper.features.map((item) => (
                <article className="paper-feature" key={item.id}>
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" />
                  ) : null}
                  <h3>{item.title}</h3>
                  {clipSummary(item.summary, PAPER_FEATURE_SUMMARY) ? (
                    <p>{clipSummary(item.summary, PAPER_FEATURE_SUMMARY)}</p>
                  ) : null}
                  <p className="paper-meta">{item.source}</p>
                </article>
              ))}
            </section>
          ) : null}

          {paper.briefs.length > 0 ? (
            <section className="paper-briefs">
              <h4>Kısa kısa</h4>
              <div className="paper-brief-list">
                {paper.briefs.map((item) => (
                  <p className="paper-brief" key={item.id}>
                    <strong>{item.title}</strong>
                    <span className="paper-meta"> {item.source}</span>
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          <footer className="paper-footer">
            <span>Kaynaklar: {paper.sources.join(" · ")}</span>
            <span>
              {APP_NAME} · erenailab · {generated} · {paper.pool} aday haberden dizildi
            </span>
          </footer>
        </article>
      ) : (
        <p className="note">Bugün baskıya girecek yapay zekâ haberi yok.</p>
      )}
    </div>
  );
}
