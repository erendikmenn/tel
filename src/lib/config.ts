export const APP_NAME = "Tel";

// Sunucunun bir kerelik çektiği ÜST KÜME. Kullanıcı ekranda bunun içinden seçer,
// bu yüzden fetch tavanı, ekranda seçilebilen en büyük değere eşittir.
export const FEED_ITEM_LIMIT = 40; // kaynak başına en fazla kalem
export const ITEM_MAX_AGE_HOURS = 48; // en eski kaç saat

// Ekrandaki varsayılanlar ve seçenekler (fetch tavanının altında).
export const DEFAULT_WINDOW_HOURS = 36;
export const DEFAULT_PER_SOURCE = 12;
export const WINDOW_OPTIONS = [1, 6, 12, 24, 36, 48];
/** 0 = kaynak başına sınır yok; ekranda "20+" olarak görünür. */
export const PER_SOURCE_UNLIMITED = 0;
export const PER_SOURCE_OPTIONS = [6, 12, 16, PER_SOURCE_UNLIMITED];

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
