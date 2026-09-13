import { istanbulStamp } from "@/lib/config";
import type { Digest } from "@/lib/digest";

export function StoryList({ digest }: { digest: Digest }) {
  if (digest.items.length === 0) {
    return <p className="note">Kaynaklar şu an sessiz. Birazdan yenilenir.</p>;
  }

  return (
    <div className="story-grid">
      {digest.items.map((item) => {
        const stamp = istanbulStamp(item.isoDate);
        return (
          <article key={item.id} className="story-card">
            <a href={item.link} rel="noreferrer" className="story-link">
              <div className="story-thumb">
                {item.image ? (
                  // RSS görselleri birçok alandan gelir; next/image domain listesi tutmuyoruz.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" />
                ) : null}
                {stamp ? (
                  <time className="story-time" dateTime={item.isoDate}>
                    {stamp}
                  </time>
                ) : null}
              </div>
              <p className="story-meta">{item.source}</p>
              <h3>{item.title}</h3>
              {item.summary ? <p className="summary">{item.summary}</p> : null}
            </a>
          </article>
        );
      })}
    </div>
  );
}
