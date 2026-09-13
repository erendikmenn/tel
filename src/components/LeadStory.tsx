import { istanbulStamp } from "@/lib/config";
import type { DigestItem } from "@/lib/digest";

export function LeadStory({ item }: { item: DigestItem }) {
  const stamp = istanbulStamp(item.isoDate);

  return (
    <article className="tel-lead-main">
      <a href={item.link} rel="noreferrer" className="tel-lead-story">
        {item.image ? (
          <div className="tel-lead-photo">
            {/* RSS görselleri birçok alandan gelir; next/image domain listesi tutmuyoruz. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt="" />
          </div>
        ) : null}
        <div className="tel-lead-copy">
          <p className="masthead-meta">
            {item.source}
            {stamp ? ` · ${stamp}` : ""}
          </p>
          <h2>{item.title}</h2>
          {item.summary ? <p className="tel-lead-dek">{item.summary}</p> : null}
        </div>
      </a>
    </article>
  );
}
