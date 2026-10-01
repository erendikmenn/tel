import type { DigestItem } from "./digest";
import { normalizeText } from "./text";

/**
 * Aynı olayı anlatan haberleri bulur: Tel aynı haberi birkaç kaynaktan alıyor
 * ve gazete sayfası onları ayrı haber gibi diziyordu (1 Ekim 2026: Lagarde'ın
 * yapay zekâ uyarısı üç kez, Christa Pike'ın infazı BBC Türkçe + BBC World'den
 * iki kez). Model yok: kelime örtüşmesi + nadirlik ağırlığı, deterministik.
 *
 * Başlık + özetin ilk cümlesi köklere ayrılır (TR ekleri yüzünden ilk 6 harf;
 * "borsa" ile "borsaları" gibi biri ötekinin başıysa aynı kök sayılır). Kökler
 * havuzdaki nadirliğiyle (idf) ağırlanır, başlık kökleri iki kat sayılır. İki
 * haber şu durumlarda aynı olaydır:
 * - benzerlik (kosinüs) >= SAME_STORY_MIN, ya da
 * - dilleri farklıysa (TR ↔ EN, kelimeler örtüşmez): başlıklarda en az iki
 *   ortak nadir özel ad ("Christa Pike") ve zayıf bir benzerlik.
 * Yönleri zıt piyasa başlıkları ("yükselişle" ↔ "düşüşle") hiç birleşmez.
 *
 * Eşikler 1 Ekim 2026 canlı havuzunda (400 haber) ve fixture'da ölçüldü:
 * aynı olay çiftleri 0,40'ın üstünde (Fransa'daki okul protestoları 0,42),
 * BoE'nin ve Lagarde'ın ayrı yapay zekâ uyarıları 0,28-0,36.
 */
export const SAME_STORY_MIN = 0.4;
/** Farklı dilde iki başlık için benzerlik tabanı (ölçüldü: aynı olay 0,16+, farklı 0,12). */
const CROSS_LANGUAGE_MIN = 0.15;
/** Özel ad "nadir" sayılır: havuzda en fazla bu kadar haberde geçiyorsa (400'de %3). */
const NAME_MAX_DF = 12;
const ROOT_LENGTH = 6;
/** Kökün başı da sözlükteyse ona katlanır; ama en az bu kadar harf ("fon" ≠ "fonksiyon"). */
const MIN_PREFIX = 4;

const STOPWORDS = new Set(
  [
    // TR
    "ve", "ile", "bir", "bu", "su", "icin", "gibi", "da", "de", "mi", "mu", "ne", "neden", "nasil",
    "ki", "en", "cok", "daha", "olarak", "ise", "ama", "veya", "ya", "yeni", "son", "ilk", "iki",
    "uc", "var", "yok", "oldu", "olan", "sonra", "once", "kadar", "karsi", "gore", "iste", "her",
    "tum", "hangi", "kim", "nedir", "o", "sey", "diye", "dedi", "acikladi", "ilgili", "yonelik",
    "uzere", "bunun", "olmak", "etti", "eden", "ettigi", "oldugunu", "belirtti",
    // EN
    "the", "an", "of", "in", "on", "at", "to", "for", "from", "by", "with", "and", "or", "but",
    "as", "is", "are", "was", "were", "be", "been", "has", "have", "had", "it", "its", "this",
    "that", "these", "those", "what", "which", "who", "how", "why", "when", "where", "after",
    "before", "over", "into", "about", "up", "down", "out", "new", "says", "said", "say", "will",
    "can", "could", "would", "may", "might", "not", "no", "more", "most", "than", "then", "there",
    "their", "they", "he", "she", "his", "her", "we", "you", "your", "our", "us", "amid", "just",
    "get", "gets", "continue", "reading", "watch", "live", "latest",
  ].map(normalizeText),
);

/** Sıfat → ülke kökü: "French schools" ile "unrest in France" aynı yeri anlatıyor. */
const SAME_ROOT: Record<string, string> = {
  french: "france",
  chines: "china",
  britis: "uk",
  britai: "uk",
  turkis: "turkey",
  turkiy: "turkey",
  spanis: "spain",
  italia: "italy",
  japane: "japan",
};

/**
 * Piyasa yönü: aynı kalıptaki "Borsa günü yükselişle kapattı" ile "Avrupa
 * borsaları günü düşüşle kapattı" 0,54 benzer çıkıyordu (ölçüldü). Kelime
 * başları; 3 harf ve altı tam eşleşir ("dip" → "diplomasi" yakalanmaz).
 */
const UP_WORDS = ["yuksel", "artis", "artti", "toparl", "zirve", "rise", "rose", "gain", "jump", "surge", "rall", "climb", "higher"];
const DOWN_WORDS = [
  "dusus", "dustu", "duser", "dusuk", "gerile", "kayb", "azal", "dip", "fall", "fell", "drop", "slid",
  "slip", "declin", "plung", "tumbl", "lower", "sink", "sank",
];

/** Türkçe metin: yalnızca Türkçede olan harfler ya da sık bağlaçlar (Thaçi'deki "ç" yetmez). */
const TURKISH = /[ğışĞİŞ]|(^|\s)(ve|bir|için|ile|olarak)(\s|$)/;

type Roots = Map<string, boolean>; // kök → başlıkta büyük harfle mi yazılmış (özel ad)

type Profile = {
  title: Roots;
  lead: Roots;
  turkish: boolean;
  /** 1 = yükseliş, 2 = düşüş, 3 = ikisi de, 0 = yok. */
  direction: number;
  vector: Map<string, number>;
  norm: number;
};

/** Özetin ilk cümlesi (en fazla 240 harf): özetin devamı çoğu zaman başka konulara geçiyor. */
function leadSentence(summary?: string) {
  if (!summary) return "";
  const match = summary.match(/^(.{20,}?[.!?])\s/);
  return (match ? match[1] : summary).slice(0, 240);
}

function toRoot(word: string) {
  // İngilizce çoğul eki ("schools" → "school"); "ss" ile biteni bozmaz.
  const singular = word.length >= 4 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
  const root = singular.slice(0, ROOT_LENGTH);
  return SAME_ROOT[root] ?? root;
}

function roots(text: string): Roots {
  const out: Roots = new Map();
  // Kesme işaretli TR ekleri atılır: "Pike'ın" → "Pike", "Lagarde'dan" → "Lagarde".
  const clean = text.replace(/(\p{L})['’](\p{Ll}{1,6})(?!\p{L})/gu, "$1");
  for (const raw of clean.split(/\s+/)) {
    const proper = /^[^\p{L}\p{N}]*\p{Lu}/u.test(raw);
    for (const word of normalizeText(raw).split(" ")) {
      if (word.length < 2 || STOPWORDS.has(word)) continue;
      const root = toRoot(word);
      out.set(root, (out.get(root) ?? false) || (proper && !/^\d+$/.test(word)));
    }
  }
  return out;
}

function direction(title: string) {
  const words = normalizeText(title).split(" ");
  const has = (list: string[]) =>
    words.some((word) => list.some((head) => (head.length <= 3 ? word === head : word.startsWith(head))));
  return (has(UP_WORDS) ? 1 : 0) | (has(DOWN_WORDS) ? 2 : 0);
}

/** "borsaları" → "borsa" gibi: kökün başı sözlükte varsa en kısasına katlanır. */
function foldPrefixes(profiles: { title: Roots; lead: Roots }[]) {
  const vocabulary = new Set<string>();
  for (const profile of profiles) for (const map of [profile.title, profile.lead]) for (const root of map.keys()) vocabulary.add(root);
  const folded = new Map<string, string>();
  for (const root of vocabulary) {
    let target = root;
    for (let length = MIN_PREFIX; length < root.length; length += 1) {
      if (vocabulary.has(root.slice(0, length))) {
        target = root.slice(0, length);
        break;
      }
    }
    folded.set(root, target);
  }
  const fold = (map: Roots) => {
    const out: Roots = new Map();
    for (const [root, proper] of map) {
      const target = folded.get(root) ?? root;
      out.set(target, (out.get(target) ?? false) || proper);
    }
    return out;
  };
  for (const profile of profiles) {
    profile.title = fold(profile.title);
    profile.lead = fold(profile.lead);
  }
}

/**
 * Havuzdaki haberler için "aynı olay mı?" sorusunu yanıtlayan fonksiyon.
 * Nadirlik bütün havuz üzerinden hesaplanır; yalnızca havuzdaki haberler sorulabilir.
 */
export function storyMatcher(items: DigestItem[]) {
  const profiles = new Map<DigestItem, Profile>();
  for (const item of items) {
    profiles.set(item, {
      title: roots(item.title),
      lead: roots(leadSentence(item.summary)),
      turkish: TURKISH.test(item.title + " " + (item.summary ?? "")),
      direction: direction(item.title),
      vector: new Map(),
      norm: 0,
    });
  }
  foldPrefixes([...profiles.values()]);

  const df = new Map<string, number>();
  for (const profile of profiles.values()) {
    for (const root of new Set([...profile.title.keys(), ...profile.lead.keys()])) df.set(root, (df.get(root) ?? 0) + 1);
  }
  const idf = (root: string) => Math.log(items.length / (df.get(root) ?? 1));
  for (const profile of profiles.values()) {
    for (const root of profile.lead.keys()) profile.vector.set(root, idf(root));
    for (const root of profile.title.keys()) profile.vector.set(root, 2 * idf(root));
    profile.norm = Math.sqrt([...profile.vector.values()].reduce((sum, weight) => sum + weight * weight, 0));
  }

  return function sameStory(a: DigestItem, b: DigestItem) {
    const pa = profiles.get(a);
    const pb = profiles.get(b);
    if (!pa || !pb || a === b) return a === b;
    if ((pa.direction === 1 && pb.direction === 2) || (pa.direction === 2 && pb.direction === 1)) return false;

    let dot = 0;
    for (const [root, weight] of pa.vector) dot += weight * (pb.vector.get(root) ?? 0);
    const similarity = pa.norm && pb.norm ? dot / (pa.norm * pb.norm) : 0;
    if (similarity >= SAME_STORY_MIN) return true;
    if (pa.turkish === pb.turkish || similarity < CROSS_LANGUAGE_MIN) return false;

    const sharedNames = [...pa.title].filter(
      ([root, proper]) => proper && pb.title.get(root) === true && (df.get(root) ?? 0) <= NAME_MAX_DF,
    );
    return sharedNames.length >= 2;
  };
}

/** Sıralı listeden aynı olayın tekrarlarını atar; her olayın ilk (en yüksek puanlı) haberi kalır. */
export function dropRepeats(ranked: DigestItem[], sameStory: (a: DigestItem, b: DigestItem) => boolean) {
  const kept: DigestItem[] = [];
  for (const item of ranked) {
    if (!kept.some((other) => sameStory(other, item))) kept.push(item);
  }
  return kept;
}
