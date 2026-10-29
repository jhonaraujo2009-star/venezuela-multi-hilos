/**
 * Normalizador Global de Imágenes
 * Permite que las imágenes nuevas salgan de tu servidor local
 * y que las URLs existentes de Cloudinary sigan cargando normalmente
 * sin romperse.
 */

export function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  return url;
}

export function normalizeImagesArray(images) {
  if (!Array.isArray(images)) return [];
  return images.map(img => normalizeImageUrl(img)).filter(Boolean);
}
