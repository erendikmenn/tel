export type Feed = {
  id: string;
  name: string;
  url: string;
  /** Bu feed'den en fazla kaç kalem alınsın (toplayıcı/sorgu feed'leri için). */
  limit?: number;
  /** Feed'in tamamı bu konuya aitse: her kaleme bu etiket eklenir. */
  topic?: string;
};

// Sıra önemli: aynı başlık iki kaynakta geçerse İLK görülen kalır (dedupe),
// bu yüzden toplayıcı feed'ler (Google News) en sonda durur.
export const FEEDS: Feed[] = [
  // Dünya haberleri
  { id: "bbc-tr", name: "BBC Türkçe", url: "https://feeds.bbci.co.uk/turkce/rss.xml" },
  { id: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "guardian-world", name: "The Guardian", url: "https://www.theguardian.com/world/rss" },
  { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { id: "npr", name: "NPR", url: "https://feeds.npr.org/1001/rss.xml" },

  // Yapay zekâ: laboratuvarların kendi blogları
  { id: "openai", name: "OpenAI", url: "https://openai.com/news/rss.xml", topic: "teknoloji" },
  { id: "deepmind", name: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", topic: "teknoloji" },
  { id: "google-research", name: "Google Research", url: "https://research.google/blog/rss/", topic: "teknoloji" },
  { id: "huggingface", name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", topic: "teknoloji" },
  { id: "nvidia", name: "NVIDIA", url: "https://blogs.nvidia.com/feed/", topic: "teknoloji" },

  // Yapay zekâ medyası
  { id: "techcrunch-ai", name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", topic: "teknoloji" },
  { id: "verge-ai", name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", topic: "teknoloji" },
  { id: "wired-ai", name: "Wired AI", url: "https://www.wired.com/feed/tag/ai/latest/rss", topic: "teknoloji" },
  { id: "decoder", name: "The Decoder", url: "https://the-decoder.com/feed/", topic: "teknoloji" },

  // Anthropic'in resmî RSS'i yok (hepsi 404); haberleri Google News sorgusuyla gelir.
  { id: "gnews-anthropic", name: "Anthropic (Google News)", url: "https://news.google.com/rss/search?q=Anthropic&hl=en-US&gl=US&ceid=US:en", limit: 12, topic: "teknoloji" },
];
