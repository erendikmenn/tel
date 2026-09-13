export type Feed = {
  id: string;
  name: string;
  url: string;
};

export const FEEDS: Feed[] = [
  { id: "bbc-tr", name: "BBC Türkçe", url: "https://feeds.bbci.co.uk/turkce/rss.xml" },
  { id: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "guardian-world", name: "The Guardian", url: "https://www.theguardian.com/world/rss" },
  { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { id: "npr", name: "NPR", url: "https://feeds.npr.org/1001/rss.xml" },
];
