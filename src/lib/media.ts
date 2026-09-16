import { enlargeImage } from "./image";

export type MediaNode = {
  $?: { url?: string; type?: string; medium?: string; width?: string | number };
};

/** Görsel çıkarımı için gereken alanlar (rss-parser kalemi bunları taşır). */
export type ImageSource = {
  enclosure?: { url?: string; type?: string };
  mediaThumbnail?: MediaNode;
  mediaContent?: MediaNode | MediaNode[];
  content?: string;
  "content:encoded"?: string;
};

/**
 * RSS kaleminden görsel URL'i (ağ isteği yok).
 * Saf modül: yalnızca göreli import kullanır, böylece test derlemesinde de yüklenebilir.
 */
export function itemImage(item: ImageSource) {
  const enclosure = item.enclosure;
  if (enclosure?.url && (!enclosure.type || enclosure.type.startsWith("image/"))) {
    return enlargeImage(enclosure.url);
  }

  const thumb = mediaUrl(item.mediaThumbnail);
  if (thumb) return enlargeImage(thumb);

  const contents = Array.isArray(item.mediaContent)
    ? item.mediaContent
    : item.mediaContent
      ? [item.mediaContent]
      : [];
  const ranked = contents
    .map((node) => ({ url: mediaUrl(node), width: Number(node.$?.width || 0) }))
    .filter((node): node is { url: string; width: number } => Boolean(node.url))
    .sort((a, b) => b.width - a.width);
  if (ranked[0]) return enlargeImage(ranked[0].url);

  const html = item.content || item["content:encoded"] || "";
  return enlargeImage(html.match(/<img[^>]+src=["']([^"']+)/i)?.[1]);
}

function mediaUrl(node?: MediaNode) {
  const url = node?.$?.url;
  if (!url) return undefined;
  const type = node.$?.type ?? "";
  const medium = node.$?.medium ?? "";
  if (type && !type.startsWith("image/")) return undefined;
  if (medium && medium !== "image") return undefined;
  return url;
}
