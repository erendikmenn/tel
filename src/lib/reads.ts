import type { DigestItem } from "./digest";

/** Okunan haber kimliği -> okunma zamanı (ms). Tarayıcıda tutulur, sunucuya gitmez. */
export type ReadMap = Record<string, number>;

export const READ_STORAGE_KEY = "tel:okunan";

/** Bu süreden eski okuma kayıtları düşer (liste şişmesin). */
const MAX_AGE_MS = 120 * 24 * 3600_000;
const MAX_ENTRIES = 8000;

export function isRead(reads: ReadMap, id: string) {
  return reads[id] != null;
}

export function countUnread(reads: ReadMap, items: { id: string }[]) {
  let total = 0;
  for (const item of items) if (!isRead(reads, item.id)) total += 1;
  return total;
}

/** Eski ve taşan kayıtları atar; haritayı sınırlı tutar. */
export function pruneReads(reads: ReadMap, now = Date.now()): ReadMap {
  const entries = Object.entries(reads).filter(([, at]) => now - at <= MAX_AGE_MS);
  if (entries.length <= MAX_ENTRIES) return Object.fromEntries(entries);
  entries.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(entries.slice(0, MAX_ENTRIES));
}

export function markRead(reads: ReadMap, ids: string[], now = Date.now()): ReadMap {
  if (ids.length === 0) return reads;
  const next: ReadMap = { ...reads };
  for (const id of ids) next[id] = now;
  return pruneReads(next, now);
}

export function clearReads(): ReadMap {
  return {};
}

export function countRead(reads: ReadMap) {
  return Object.keys(reads).length;
}

/** "Sadece yeni": okunmamışları geçirir. */
export function filterUnread(reads: ReadMap, items: DigestItem[]): DigestItem[] {
  return items.filter((item) => !isRead(reads, item.id));
}

/** Test edilebilir olsun diye depo dışarıdan verilir (tarayıcıda window.localStorage). */
export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

export function loadReads(storage: StorageLike | null, now = Date.now()): ReadMap {
  if (!storage) return {};
  try {
    const raw = storage.getItem(READ_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const out: ReadMap = {};
    for (const [id, at] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof at === "number" && Number.isFinite(at)) out[id] = at;
    }
    return pruneReads(out, now);
  } catch {
    return {};
  }
}

export function saveReads(storage: StorageLike | null, reads: ReadMap) {
  if (!storage) return;
  try {
    storage.setItem(READ_STORAGE_KEY, JSON.stringify(reads));
  } catch {
    // kota dolu ya da depo kapalı: okuma durumu kaydedilemedi, sorun değil
  }
}
