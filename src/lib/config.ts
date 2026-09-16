export const APP_NAME = "Tel";

// Sunucunun bir kerelik çektiği ÜST KÜME. Yaş sınırı "ürün sınırı" değil, akıl sağlığı:
// feed'ler zaten en fazla birkaç günlük kalem veriyor ama arada 2+ yıllık bayat kalemler
// çıkabiliyor (ölçüldü: BBC Türkçe'de 884 günlük bir kalem). Gerçek seçim tarayıcıda.
export const MAX_AGE_HOURS = 720; // 30 gün: bundan eskisi bayat/hatalı sayılır
export const MAX_ITEMS = 300; // güvenlik tavanı (bugünkü gerçek ~125, hiçbir zaman bağlamaz)

// Ekrandaki varsayılanlar ve seçenekler. Ölçüm: feed'ler ~1 haftadan sonrasını vermiyor,
// 1 ay da aynı sonucu veriyor. Daha uzun pencereler ancak arşiv (0.3) gelince anlamlı olur.
export const DEFAULT_WINDOW_HOURS = 36;
export const DEFAULT_PER_SOURCE = 12;
export const WINDOW_OPTIONS = [1, 6, 12, 24, 36, 48, 168, 720];
/** 0 = kaynak başına sınır yok; ekranda "20+" olarak görünür. */
export const PER_SOURCE_UNLIMITED = 0;
export const PER_SOURCE_OPTIONS = [6, 12, 16, PER_SOURCE_UNLIMITED];

/** 168 → "1 hafta", 720 → "1 ay", 8760 → "1 yıl". */
export function windowLabel(hours: number) {
  if (hours % 8760 === 0) return hours / 8760 + " yıl";
  if (hours % 720 === 0) return hours / 720 + " ay";
  if (hours % 168 === 0) return hours / 168 + " hafta";
  return hours + " saat";
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
