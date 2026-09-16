import { WINDOW_ALL } from "./config";
import type { DigestItem } from "./digest";
import { viewItems, type DigestView } from "./filter";

/**
 * Filtre panelindeki her seçeneğin yanında gösterilen canlı sonuç sayısı.
 *
 * Mantık (yönlü arama / facet): bir seçeneğin sayısı, KENDİ grubu hariç
 * ekrandaki diğer filtreler sabitken o seçenekle kaç haber geleceğidir.
 * Böylece grup içinde seçim değiştirmek o grubun sayılarını oynatmaz,
 * ama başka bir grubu değiştirdiğinde sayaçlar anında güncellenir.
 */
export type CountGroup = "source" | "category" | "hours" | "perSource";

export function countOptions<T extends string | number>(
  items: DigestItem[],
  view: DigestView,
  group: CountGroup,
  options: readonly T[],
): Map<T, number> {
  const base: DigestView = { ...view };

  // Grubun kendi seçimini temizle; diğerleri sabit kalsın.
  if (group === "source") base.source = [];
  if (group === "category") base.category = [];

  const counts = new Map<T, number>();
  for (const option of options) {
    const next: DigestView = { ...base };
    if (group === "source") next.source = [option as string];
    else if (group === "category") next.category = [option as string];
    else if (group === "hours") {
      next.sinceHours = option === WINDOW_ALL ? undefined : (option as number);
    } else {
      next.perSource = option as number;
    }
    counts.set(option, viewItems(items, next).length);
  }

  return counts;
}
