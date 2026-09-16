import { istanbulStamp } from "@/lib/config";
import type { DigestItem } from "@/lib/digest";

export function StoryRail({ items, readIds }: { items: DigestItem[]; readIds?: Set<string> }) {
  if (items.length === 0) return null;

  return (
    <aside className="tel-rail">
      {items.map((item) => {
        const stamp = istanbulStamp(item.isoDate);
        return (
          <a
            key={item.id}
            href={item.link}
            rel="noreferrer"
            className={"tel-rail-link" + (readIds?.has(item.id) ? " is-read" : "")}
          >
            <p className="tel-rail-meta">
              {item.source}
              {stamp ? ` · ${stamp}` : ""}
            </p>
            <h3
              className="tel-rail-title"
              style={{
                display: "block",
                height: 40,
                overflow: "hidden",
                lineHeight: "20px",
                fontSize: 15,
                letterSpacing: "normal",
                wordSpacing: "normal",
              }}
            >
              {item.title}
            </h3>
          </a>
        );
      })}
    </aside>
  );
}
