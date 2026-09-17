import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { APP_NAME, istanbulDate, istanbulStamp, istanbulWeekday } from "@/lib/config";
import {
  PAPER_LEAD_SUMMARY,
  PAPER_SECTIONS,
  PAPER_STORY_SUMMARY,
  clipSummary,
  firstSentence,
  type Paper,
  type PaperSectionId,
} from "@/lib/paper";
import "@/app/gazete/paper.css";

/** Bölümün sayfa adresi ("ai" kök adreste kalır). */
export function paperHref(section: PaperSectionId) {
  return section === "ai" ? "/gazete" : "/gazete/" + section;
}

/** Bölümün PDF adresi. */
export function paperPdfHref(section: PaperSectionId) {
  return section === "ai" ? "/gazete/pdf" : "/gazete/" + section + "/pdf";
}

/** Gazete sayfası: bölüm ne olursa olsun aynı dizgi. */
export function PaperSheet({ paper }: { paper: Paper }) {
  const leadStamp = istanbulStamp(paper.lead?.isoDate);
  const deck = firstSentence(paper.lead?.summary);
  const body = clipSummary(paper.lead?.summary, PAPER_LEAD_SUMMARY);
  const showBody = Boolean(body && body !== deck);
  const briefPerColumn = Math.ceil(paper.briefs.length / 3) || 0;
  const briefColumns = [0, 1, 2].map((index) =>
    paper.briefs.slice(index * briefPerColumn, (index + 1) * briefPerColumn),
  );

  return (
    <div className="paper-wrap">
      <div className="paper-actions no-print">
        <Link className="paper-button" href="/">
          ← Anasayfa
        </Link>
        <nav className="paper-sections">
          {PAPER_SECTIONS.map((section) => (
            <Link
              key={section.id}
              className={
                "paper-button" + (section.id === paper.section.id ? " paper-button-on" : "")
              }
              href={paperHref(section.id)}
            >
              {section.short}
            </Link>
          ))}
        </nav>
        <a className="paper-button paper-button-primary" href={paperPdfHref(paper.section.id)}>
          PDF indir
        </a>
        <PrintButton />
      </div>

      {paper.lead ? (
        <article className="paper">
          {paper.strip.length > 0 ? (
            <section className="paper-strip">
              {paper.strip.map((item) => (
                <div className="paper-strip-item" key={item.id}>
                  <p className="paper-kicker">{item.source}</p>
                  <h3>{item.title}</h3>
                </div>
              ))}
            </section>
          ) : null}

          <header className="paper-masthead">
            <h1 className="paper-title">{APP_NAME}</h1>
            <p className="paper-tagline">{paper.section.label} · by erenailab</p>
          </header>

          <div className="paper-dateline">
            <span>
              {istanbulWeekday()} · {istanbulDate()}
            </span>
            <span>Sayı {paper.edition}</span>
            <span>{paper.pool} aday haberden dizildi</span>
          </div>

          <section className="paper-banner">
            <h2 className="paper-banner-title">{paper.lead.title}</h2>
            {deck ? <p className="paper-deck">{deck}</p> : null}
            <div className="paper-banner-grid">
              <div className="paper-flanker paper-flanker-left">
                {paper.flankers[0] ? (
                  <>
                    <p className="paper-kicker">{paper.flankers[0].source}</p>
                    <h3>{paper.flankers[0].title}</h3>
                    <p className="paper-text">
                      {clipSummary(paper.flankers[0].summary, PAPER_STORY_SUMMARY)}
                    </p>
                  </>
                ) : null}
              </div>

              {paper.lead.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="paper-banner-photo" src={paper.lead.image} alt="" />
              ) : null}

              <div className="paper-flanker paper-flanker-right">
                {paper.flankers[1] ? (
                  <>
                    <p className="paper-kicker">{paper.flankers[1].source}</p>
                    <h3>{paper.flankers[1].title}</h3>
                    <p className="paper-text">
                      {clipSummary(paper.flankers[1].summary, PAPER_STORY_SUMMARY)}
                    </p>
                  </>
                ) : null}
              </div>
            </div>

            {showBody ? (
              <div className="paper-lead-body">
                <p>{body}</p>
              </div>
            ) : null}
            <p className="paper-meta paper-credit">
              {paper.lead.source}
              {leadStamp ? " · " + leadStamp : ""}
            </p>
          </section>

          <div className="paper-mid">
            <section className="paper-stories">
              {paper.stories.map((item) => (
                <article className="paper-story" key={item.id}>
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" />
                  ) : null}
                  <p className="paper-kicker">{item.source}</p>
                  <h3>{item.title}</h3>
                  <p className="paper-text">{clipSummary(item.summary, PAPER_STORY_SUMMARY)}</p>
                </article>
              ))}
            </section>

            {paper.sidebar.length > 0 ? (
              <aside className="paper-sidebar">
                <h4>Öne çıkanlar</h4>
                {paper.sidebar.map((item) => (
                  <p className="paper-sidebar-item" key={item.id}>
                    <strong>{item.title}</strong>
                    <span className="paper-meta"> {item.source}</span>
                  </p>
                ))}
              </aside>
            ) : null}
          </div>

          {paper.briefs.length > 0 ? (
            <section className="paper-briefs">
              <h4>Kısa kısa</h4>
              <div className="paper-brief-list">
                {briefColumns.map((column, index) => (
                  <div className="paper-brief-col" key={index}>
                    {column.map((item) => (
                      <p className="paper-brief" key={item.id}>
                        <span className="paper-kicker">{item.source}</span>
                        <strong>{item.title}</strong>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <p className="paper-credit-mark">@erenailab</p>
          <div className="paper-endrule" aria-hidden="true" />
        </article>
      ) : (
        <p className="note">Bu bölümde bugün baskıya girecek haber yok.</p>
      )}
    </div>
  );
}
