export type Feed = {
  id: string;
  name: string;
  url: string;
  lang: "tr" | "en";
};

export const FEEDS: Feed[] = [
  {
    id: "bbc-tr",
    name: "BBC Türkçe",
    url: "https://feeds.bbci.co.uk/turkce/rss.xml",
    lang: "tr",
  },
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    lang: "en",
  },
  {
    id: "guardian-world",
    name: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
    lang: "en",
  },
  {
    id: "aljazeera",
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    lang: "en",
  },
  {
    id: "npr",
    name: "NPR",
    url: "https://feeds.npr.org/1001/rss.xml",
    lang: "en",
  },
];
