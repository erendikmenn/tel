import type { DigestItem } from "@/lib/digest";

export function splitHome(items: DigestItem[]) {
  const lead = items.find((item) => item.image) ?? items[0];
  const unused = lead ? items.filter((item) => item.id !== lead.id) : items;

  return {
    lead,
    rail: unused.slice(0, 4),
    rest: unused.slice(4),
  };
}
