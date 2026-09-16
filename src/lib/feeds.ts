export type FeedGroup = "dunya" | "ai";

export type Feed = {
  id: string;
  name: string;
  url: string;
  /** Panelde toplu seçim için grup (bkz. FEED_GROUPS). */
  group: FeedGroup;
  /** Bu feed'den en fazla kaç kalem alınsın (toplayıcı/sorgu feed'leri için). */
  limit?: number;
  /** Feed'in tamamı bu konuya aitse: her kaleme bu etiket eklenir. */
  topic?: string;
};

/** Kaynak panelindeki toplu seçim grupları. */
export const FEED_GROUPS: { id: FeedGroup; label: string }[] = [
  { id: "dunya", label: "Dünya" },
  { id: "ai", label: "Yapay zekâ" },
];

// Sıra önemli: aynı başlık iki kaynakta geçerse İLK görülen kalır (dedupe),
// bu yüzden toplayıcı feed'ler (Google News) en sonda durur.
export const FEEDS: Feed[] = [
  // Dünya haberleri
  { id: "bbc-tr", name: "BBC Türkçe", url: "https://feeds.bbci.co.uk/turkce/rss.xml", group: "dunya" },
  { id: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", group: "dunya" },
  { id: "guardian-world", name: "The Guardian", url: "https://www.theguardian.com/world/rss", group: "dunya" },
  { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", group: "dunya" },
  { id: "npr", name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", group: "dunya" },

  // Yapay zekâ: laboratuvarların kendi blogları
  { id: "openai", name: "OpenAI", url: "https://openai.com/news/rss.xml", group: "ai", topic: "teknoloji" },
  { id: "deepmind", name: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", group: "ai", topic: "teknoloji" },
  { id: "google-research", name: "Google Research", url: "https://research.google/blog/rss/", group: "ai", topic: "teknoloji" },
  { id: "huggingface", name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", group: "ai", topic: "teknoloji" },
  { id: "nvidia", name: "NVIDIA", url: "https://blogs.nvidia.com/feed/", group: "ai", topic: "teknoloji" },

  // Yapay zekâ medyası
  { id: "techcrunch-ai", name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", group: "ai", topic: "teknoloji" },
  { id: "verge-ai", name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", group: "ai", topic: "teknoloji" },
  { id: "wired-ai", name: "Wired AI", url: "https://www.wired.com/feed/tag/ai/latest/rss", group: "ai", topic: "teknoloji" },
  { id: "decoder", name: "The Decoder", url: "https://the-decoder.com/feed/", group: "ai", topic: "teknoloji" },

  // Anthropic'in resmî RSS'i yok (hepsi 404); haberleri Google News sorgusuyla gelir.
  { id: "gnews-anthropic", name: "Anthropic (Google News)", url: "https://news.google.com/rss/search?q=Anthropic&hl=en-US&gl=US&ceid=US:en", group: "ai", limit: 12, topic: "teknoloji" },
];
