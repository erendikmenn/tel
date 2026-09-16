import { normalizeText } from "./text";

/**
 * Kural tabanlı konu taksonomisi. Anahtar kelimeler TR + EN yazılır ve
 * yüklenirken normalizeText ile sadeleştirilir (aksan/İ katlanır).
 *
 * Eşleştirme yalnızca BAŞLIKTA yapılır: özetler (özellikle Guardian) başka
 * haberlerin teaser metnini taşıdığı için sınıflandırmaya gürültü sokuyordu.
 *
 * Kelime işaretleri:
 * - "=kelime"  → yalnızca tam eşleşme ("=var" → VAR, "various" değil)
 * - "?kelime"  → zayıf kelime (1 puan); işaretsizler güçlü (2 puan)
 * - boşluklular öbek olarak aranır ("yapay zeka", "interest rate")
 * - 4 harften kısası otomatik tam eşleşir ("zam" → "zaman" yakalanmaz)
 *
 * Bir konu ancak toplam puan >= 2 ise atanır; tek zayıf kelime yetmez.
 */
export type Topic = {
  id: string;
  label: string;
  keywords: string[];
};

export const TOPIC_ALL = "diger";

export const TOPICS: Topic[] = [
  {
    id: "savas",
    label: "Savaş & Çatışma",
    keywords: [
      "savaş", "savaşı", "savaşın", "çatışma", "çatışmalar", "saldırı", "saldırılar", "saldırısı",
      "ateşkes", "cephe", "füze", "füzeler", "dron", "iha", "bombalama", "bombardıman", "bomba",
      "işgal", "silah", "silahlar", "mühimmat", "kuşatma", "katliam", "soykırım", "terörist",
      "militan", "militanlar", "direniş", "hamas", "hizbullah", "husi", "husiler", "el kaide",
      "işid", "daeş", "taliban", "cunta", "airstrike", "airstrikes", "air strike", "ceasefire",
      "truce", "front line", "missile", "missiles", "drone", "drones", "bombing", "bombardment",
      "invasion", "artillery", "weapon", "weapons", "munitions", "siege", "massacre", "genocide",
      "terrorist", "terrorism", "militant", "militants", "shelling", "warship", "drone strike",
      "houthi", "houthis", "hezbollah", "pentagon",
      "?askeri", "?asker", "?ordu", "?tank", "?tanks", "?topçu", "?savunma", "?terör", "?war",
      "?wars", "?conflict", "?conflicts", "?military", "?army", "?defence", "?defense", "?navy",
      "?battle", "?battlefield", "?casualties", "?wounded", "?bomb", "?bombs", "?insurgent",
      "?gazze", "?gaza", "?filistin", "?palestine", "?palestinian", "?israil", "?israel",
      "?israeli", "?ukrayna", "?ukraine", "?ukrainian", "?suriye", "?syria", "?lübnan",
      "?lebanon", "?irak", "?tahran", "?nato",
    ],
  },
  {
    id: "siyaset",
    label: "Siyaset",
    keywords: [
      "seçim", "seçimler", "seçimleri", "oylama", "muhalefet", "milletvekili", "anayasa",
      "referandum", "darbe", "kabine", "büyükelçi", "dışişleri", "içişleri", "election",
      "elections", "diplomacy", "diplomatic", "sanction", "sanctions", "referendum", "coup",
      "resign", "resigned", "resignation", "impeachment", "white house", "kremlin", "capitol",
      "parliament", "congress", "presidential", "prime minister", "siyaset", "siyasi",
      "?hükümet", "?başbakan", "?cumhurbaşkanı", "?cumhurbaşkanlığı", "?bakan", "?bakanlık",
      "?meclis", "?parlamento", "?oy", "?aday", "?adaylar", "?kampanya", "?=parti", "?partisi",
      "?partiler", "?yasa", "?yasası", "?kanun", "?reform", "?belediye", "?belediyesi", "?vali",
      "?zirve", "?yaptırım", "?yaptırımlar", "?kongre", "?senato", "?vize", "?politika",
      "?politikalar", "?istifa", "?atama", "?seçmen", "?göç", "?sığınma", "?government",
      "?minister", "?ministry", "?president", "?vote", "?votes", "?voting", "?voter", "?voters",
      "?campaign", "?senate", "?senator", "?lawmaker", "?lawmakers", "?bill", "?policy",
      "?policies", "?summit", "?opposition", "?coalition", "?visa", "?immigration", "?embassy",
      "?ambassador", "?nominee", "?=eu", "?=un", "?=bm", "?=ab", "?=uk",
    ],
  },
  {
    id: "ekonomi",
    label: "Ekonomi",
    keywords: [
      "enflasyon", "faiz", "faizler", "faizi", "işsizlik", "istihdam", "iflas", "gümrük",
      "bütçe", "inflation", "interest rate", "interest rates", "federal reserve",
      "central bank", "=fed", "unemployment", "bankruptcy", "gdp", "layoffs", "tariff",
      "tariffs", "pension", "ekonomi", "ekonomik", "ekonomisi",
      "?vergi", "?vergiler", "?ücret", "?maaş", "?zam", "?piyasa", "?piyasalar", "?borsa",
      "?hisse", "?dolar", "?döviz", "?ihracat", "?ithalat", "?ticaret", "?yatırım",
      "?yatırımcı", "?şirket", "?bank", "?banks", "?banking", "?kredi", "?borç", "?büyüme",
      "?üretim", "?sanayi", "?petrol", "?doğalgaz", "?fatura", "?maliyet", "?tarife", "?emekli",
      "?emeklilik", "?economy", "?economic", "?economics", "?budget", "?tax", "?taxes", "?wage",
      "?wages", "?salary", "?market", "?markets", "?stock", "?stocks", "?shares", "?shareholder",
      "?dollar", "?currency", "?export", "?import", "?investment", "?investor",
      "?investors", "?company", "?companies", "?credit", "?debt", "?manufacturing",
      "?industry", "?oil", "?gas", "?pipeline", "?profit", "?profits", "?revenue", "?earnings",
      "trade war", "trade deal", "economic growth",
      "?=euro", "?=euros",
    ],
  },
  {
    id: "teknoloji",
    label: "Teknoloji & Yapay Zeka",
    keywords: [
      "=ai", "yapay zeka", "artificial intelligence", "machine learning", "openai", "chatgpt",
      "anthropic", "nvidia", "llm", "chatbot", "datacenter", "data center", "semiconductor",
      "algoritma", "algoritmalar", "yazılım", "robotik", "siber", "veri merkezi",
      "?teknoloji", "?teknolojik", "?yapay", "?zeka", "?donanım", "?veri", "?robot", "?otomasyon",
      "?dijital", "?hack", "?hacklendi", "?çip", "?yonga", "?telefon", "?akıllı telefon",
      "?uygulama", "?sosyal medya", "?platform", "?internet", "?bilgisayar", "?technology",
      "?tech", "?algorithm", "?algorithms", "?software", "?hardware", "?automation", "?digital",
      "?cyber", "?cyberattack", "?hacked", "?hacker", "?hackers", "?chip", "?chips",
      "?smartphone", "?app", "?apps", "?social media", "?computer", "?computing", "?google",
      "?microsoft",
    ],
  },
  {
    id: "saglik",
    label: "Sağlık",
    keywords: [
      "kanser", "diyabet", "obezite", "migren", "depresyon", "doğurganlık", "kısırlık",
      "ruh sağlığı", "yoğun bakım", "sağlık", "sağlığı", "salgın", "aşı", "aşısı", "tedavi",
      "tedavisi", "ameliyat", "vaccine", "vaccination", "outbreak", "epidemic", "pandemic",
      "cancer", "migraine", "mental health", "birth control", "fertility", "obesity", "diabetes",
      "=cdc", "=fda",
      "?hastane", "?hastaneler", "?doktor", "?doktorlar", "?hasta", "?hastalar", "?hastalık",
      "?hastalıklar", "?virüs", "?ilaç", "?ilaçlar", "?kalp", "?tıp", "?tıbbi", "?cerrahi",
      "?doğum", "?hamilelik", "?beslenme", "?diyet", "?sigara", "?alkol", "?health",
      "?healthcare", "?hospital", "?hospitals", "?doctor", "?doctors", "?patient", "?patients",
      "?disease", "?diseases", "?virus", "?drug", "?drugs", "?medication", "?treatment", "?heart",
      "?medical", "?medicine", "?surgery", "?surgeon", "?pregnancy", "?nutrition", "?smoking",
      "?alcohol",
    ],
  },
  {
    id: "bilim",
    label: "Bilim & Çevre",
    keywords: [
      "iklim", "iklim değişikliği", "kuraklık", "deprem", "kasırga", "biyolojik çeşitlilik",
      "nesli tükenmek", "orman yangını", "arkeoloji", "meteoroloji", "climate",
      "climate change", "biodiversity", "endangered", "earthquake", "hurricane", "drought",
      "wildfire", "wildfires", "nasa", "bilim", "bilimsel", "bilim insanı",
      "?çevre", "?kirlilik", "?atık", "?geri dönüşüm", "?orman", "?yangın", "?sel", "?fırtına",
      "?türler", "?okyanus", "?deniz", "?sıcaklık", "?karbon", "?emisyon", "?enerji", "?güneş",
      "?nükleer", "?fizik", "?kimya", "?fosil", "?dinozor", "?keşif", "?uzay", "?gezegen",
      "?uydu", "?science", "?scientific", "?scientists", "?space",
      "?planet", "?satellite", "?environment", "?environmental", "?pollution", "?waste",
      "?recycling", "?forest", "?forests", "?flood", "?floods", "?storm", "?species", "?ocean",
      "?temperature", "?carbon", "?emissions", "?energy", "?solar", "?nuclear", "?physics",
      "?chemistry", "?archaeology", "?fossil", "?dinosaur", "?weather", "?wildlife", "?el nino",
    ],
  },
  {
    id: "spor",
    label: "Spor",
    keywords: [
      "futbol", "futbolcu", "basketbol", "olimpiyat", "atletizm", "yüzme", "tenis", "formula",
      "milli takım", "madalya", "şampiyon", "şampiyona", "şampiyonluk", "turnuva",
      "teknik direktör", "penaltı", "derbi", "kaleci", "yarı final", "asian games", "football",
      "soccer", "basketball", "olympics", "olympic", "athletics", "swimming", "tennis",
      "championship", "tournament", "champion", "champions", "semifinal", "=fifa", "=uefa",
      "=nba", "=nfl", "cricket", "rugby", "=golf", "boxing", "=f1", "?messi", "?ronaldo",
      "?real madrid", "?barcelona", "?premier league", "?champions league", "?world cup",
      "?spor", "?maç", "?gol", "?goller", "?lig", "?kupa", "?takım", "?takımlar", "?hakem",
      "?rekor", "?antrenör", "?match", "?matches", "?goal", "?goals", "?league", "?cup",
      "?team", "?teams", "?player", "?players", "?coach", "?penalty", "?referee", "?derby",
      "?medal", "?scorer",
    ],
  },
  {
    id: "kultur",
    label: "Kültür & Eğlence",
    keywords: [
      "müzik", "müzisyen", "şarkı", "şarkıcı", "albüm", "konser", "sinema", "tiyatro",
      "sergi", "müze", "festival", "moda", "magazin", "kültür", "sanatçı", "sanatçılar",
      "culture", "cultural", "music", "musician", "song", "album", "concert", "movie",
      "cinema", "theatre", "theater", "exhibition", "museum", "festival", "fashion",
      "hollywood", "netflix", "=emmy", "=emmys", "=oscar", "=grammy", "=actor", "=actress",
      "=art", "=arts", "=artist", "=artists", "=tv", "=novel", "=book", "=books", "=film",
      "=author", "=award", "=awards",
    ],
  },
  {
    id: "toplum",
    label: "Toplum & Adalet",
    keywords: [
      "tutuklandı", "tutuklama", "tutuklu", "gözaltı", "soruşturma", "cinayet", "ayrımcılık",
      "ırkçılık", "mülteci", "mülteciler", "yolsuzluk", "taciz", "tecavüz", "femisid",
      "insan hakları", "eğitim", "üniversite", "sendika", "protesto", "protestolar", "adalet",
      "mahkeme", "mahkemesi", "yargı", "hakim", "savcı", "arrest", "arrested", "detention",
      "detained", "prison", "prisoner", "murder", "human rights", "discrimination", "racism",
      "refugee", "refugees", "femicide", "amnesty", "trade union", "labor union",
      "?suç", "?suçlu", "?polis", "?ceza", "?hapis", "?dava", "?davası", "?haklar", "?göçmen",
      "?göçmenler", "?kadın", "?kadınlar", "?çocuk", "?çocuklar", "?okul", "?okullar",
      "?öğrenci", "?öğrenciler", "?şiddet", "?dernek", "?aile", "?court", "?courts", "?trial",
      "?judge", "?judges", "?prosecutor", "?investigation", "?sentence", "?sentenced", "?crime",
      "?criminal", "?police", "?officer", "?rights", "?children", "?child", "?women", "?woman",
      "?school", "?schools", "?university", "?universities", "?student", "?students", "?social",
      "?society", "?justice", "?protest", "?protests", "?violence", "?abuse", "?harassment",
      "?immigrant", "?immigrants", "?religion", "?corruption", "?education",
    ],
  },
];

/**
 * Yayıncının kendi etiketleri (RSS <category>) başlıkla birlikte eşleştirilir.
 * Guardian "Business"/"Sport" gibi kelimeler anahtar listemizde yok; onlar için
 * küçük bir eşleme. Diğerleri (Technology, Environment, Health, Science, Politics,
 * Economics, Inflation, Human rights…) zaten anahtar kelimelerle yakalanıyor.
 */
const FEED_CATEGORY_TOPICS: Record<string, string> = {
  business: "ekonomi",
  sport: "spor",
  sports: "spor",
};

const FEED_HINT_SCORE = 2;
/** Feed'in tamamı tek konuya aitse (ör. OpenAI blogu) o konu daha güçlü eklenir. */
const FEED_TOPIC_SCORE = 4;

const MIN_KEYWORD_PREFIX = 4;
const STRONG_SCORE = 2;
const WEAK_SCORE = 1;
const MIN_TOPIC_SCORE = 1;

type Entry = { value: string; exact: boolean; phrase: boolean; score: number; raw: string };

function compileKeyword(raw: string): Entry {
  let text = raw;
  let weak = false;
  if (text.startsWith("?")) {
    weak = true;
    text = text.slice(1);
  }
  let forced = false;
  if (text.startsWith("=")) {
    forced = true;
    text = text.slice(1);
  }

  const value = normalizeText(text);
  return {
    value,
    exact: forced || value.length < MIN_KEYWORD_PREFIX,
    phrase: value.includes(" "),
    score: weak ? WEAK_SCORE : STRONG_SCORE,
    raw: text,
  };
}

const MATCHERS = TOPICS.map((topic) => ({
  id: topic.id,
  entries: topic.keywords.map(compileKeyword).filter((entry) => entry.value.length > 0),
}));

function matchesEntry(entry: Entry, words: string[], padded: string) {
  if (entry.phrase) return padded.includes(" " + entry.value + " ");
  return words.some((word) => word === entry.value || (!entry.exact && word.startsWith(entry.value)));
}

type Classifiable = {
  title: string;
  summary?: string;
  source: string;
  /** RSS <category> değerleri (yayıncının kendi etiketleri). */
  feedCategories?: string[];
  /** Feed'in tamamı tek konuya aitse (ör. yapay zekâ blogları). */
  feedTopics?: string[];
};

export type TopicScore = { id: string; score: number; matched: string[] };

/** Teşhis/test için: her konunun puanı ve tutan kelimeleri. */
export function explain(item: Classifiable): TopicScore[] {
  // Yayıncı etiketleri başlıkla birlikte eşleşir; kontrollü sözlük oldukları için
  // özetlerdeki gibi gürültü taşımazlar.
  const feedCategories = item.feedCategories ?? [];
  const text = normalizeText([item.title, ...feedCategories].join(" "));
  if (!text) return [];
  const words = text.split(" ").filter(Boolean);
  const padded = " " + text + " ";

  const rows = MATCHERS.map((matcher) => {
    const hits = matcher.entries.filter((entry) => matchesEntry(entry, words, padded));
    return {
      id: matcher.id,
      score: hits.reduce((sum, entry) => sum + entry.score, 0),
      matched: hits.map((entry) => entry.raw),
    };
  });

  const applyHint = (topicId: string, score: number, label: string) => {
    const row = rows.find((entry) => entry.id === topicId);
    if (row) {
      row.score += score;
      row.matched.push(label);
    } else {
      rows.push({ id: topicId, score, matched: [label] });
    }
  };

  for (const raw of feedCategories) {
    const topicId = FEED_CATEGORY_TOPICS[normalizeText(raw)];
    if (topicId) applyHint(topicId, FEED_HINT_SCORE, "feed:" + raw);
  }

  for (const topicId of item.feedTopics ?? []) {
    if (TOPICS.some((topic) => topic.id === topicId)) {
      applyHint(topicId, FEED_TOPIC_SCORE, "feed-konu:" + topicId);
    }
  }

  return rows
    .filter((row) => row.score >= MIN_TOPIC_SCORE)
    .sort((a, b) => b.score - a.score);
}

/**
 * Bir habere konu etiketleri atar (puana göre, en fazla 2).
 * Hiçbir kural tutmazsa boş dizi döner; "Diğer" filtresi bunu yakalar.
 */
export function classify(item: Classifiable): string[] {
  return explain(item)
    .slice(0, 2)
    .map((row) => row.id);
}

export function topicLabel(id: string) {
  if (id === TOPIC_ALL) return "Diğer";
  return TOPICS.find((topic) => topic.id === id)?.label ?? id;
}
