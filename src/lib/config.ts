export const APP_NAME = "Tel";

// Sunucunun bir kerelik çektiği ÜST KÜME. Yaş sınırı "ürün sınırı" değil, akıl sağlığı:
// feed'ler zaten en fazla birkaç günlük kalem veriyor ama arada 2+ yıllık bayat kalemler
// çıkabiliyor (ölçüldü: BBC Türkçe'de 884 günlük bir kalem). Gerçek seçim tarayıcıda.
export const MAX_AGE_HOURS = 720; // 30 gün: bundan eskisi bayat/hatalı sayılır
export const MAX_ITEMS = 400; // güvenlik tavanı (ölçüldü: 15 feed ile ~380 kalem sığıyor)

// Ekrandaki varsayılanlar ve seçenekler. Ölçüm (16 Eyl 2026, 5 feed, kaynak başına 12):
//   1s:4  6s:50  12s:52  24s:57  36s:58  48s:58  Tümü:58
// Kaynak başına sınır bağlayıcı olduğu için 24 saatten sonrası AYNI listeyi veriyordu;
// bu yüzden 36 ve 48 seçenekleri kaldırıldı (kullanıcı "bir şey değişmiyor" dedi).
// Kaynak başına "20+" seçilince pencere yeniden anlam kazanıyor:
//   1s:4  6s:60  12s:85  24s:101  36s:111  48s:113  Tümü:125
// Daha uzun pencereler arşiv (0.3) işi.
export const DEFAULT_WINDOW_HOURS = 24;
export const DEFAULT_PER_SOURCE = 12;
/** 0 = zaman süzgeci yok; ekranda "Tümü" olarak görünür. */
export const WINDOW_ALL = 0;
export const WINDOW_OPTIONS = [1, 6, 12, 24, WINDOW_ALL];
/** 0 = kaynak başına sınır yok; ekranda "20+" olarak görünür. */
export const PER_SOURCE_UNLIMITED = 0;
export const PER_SOURCE_OPTIONS = [6, 12, 16, PER_SOURCE_UNLIMITED];

/** Sade etiket: "Tümü", "1 hafta", "6 saat". */
export function windowLabel(hours: number) {
  if (hours === WINDOW_ALL) return "Tümü";
  if (hours % 8760 === 0) return hours / 8760 + " yıl";
  if (hours % 720 === 0) return hours / 720 + " ay";
  if (hours % 168 === 0) return hours / 168 + " hafta";
  return hours + " saat";
}

/** Ekrandaki etiket: "Tümü" ya da "Son 6 saat". */
export function windowOptionLabel(hours: number) {
  return hours === WINDOW_ALL ? "Tümü" : "Son " + windowLabel(hours);
}

export function perSourceLabel(value: number) {
  return value === PER_SOURCE_UNLIMITED ? "20+ haber" : value + " haber";
}

export function istanbulDate(date = new Date()) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

export function istanbulWeekday(date = new Date()) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

export function istanbulStamp(iso?: string) {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
}
