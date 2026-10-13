import { usableImage } from "./image";
import { decodeEntities } from "./text";

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
  const fromEnclosure =
    enclosure?.url && (!enclosure.type || enclosure.type.startsWith("image/")) ? enclosure.url : undefined;

  const contents = Array.isArray(item.mediaContent)
    ? item.mediaContent
    : item.mediaContent
      ? [item.mediaContent]
      : [];
  const ranked = contents
    .map((node) => ({ url: mediaUrl(node), width: Number(node.$?.width || 0) }))
    .filter((node): node is { url: string; width: number } => Boolean(node.url))
    .sort((a, b) => b.width - a.width)
    .map((node) => node.url);

  const html = item.content || item["content:encoded"] || "";
  // src HTML'de kaçışlı: The Verge `?quality=90&#038;strip=all` yazıyor; çözülmezse
  // tarayıcı `#038;…`'ü parça sayar ve sorgu `?quality=90&`'te kesilir.
  const src = html.match(/<img[^>]+src=["']([^"']+)/i)?.[1];
  const fromHtml = src && decodeEntities(src);

  // Öncelik: enclosure → media:thumbnail → en geniş media:content → gövdedeki <img>.
  // Açılmayan aday (kapalı sunucu, bkz. usableImage) atlanır, sıradakine geçilir.
  for (const url of [fromEnclosure, mediaUrl(item.mediaThumbnail), ...ranked, fromHtml]) {
    const image = usableImage(url);
    if (image) return image;
  }
  return undefined;
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
