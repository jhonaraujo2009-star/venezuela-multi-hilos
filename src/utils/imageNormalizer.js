/**
 * Normalizador Global de Imágenes
 * Redirige automáticamente cualquier URL histórica de Cloudinary
 * hacia tu servidor local en tu PC, buscando el archivo descargado.
 */

const LOCAL_MEDIA_SERVER = import.meta.env.VITE_MEDIA_SERVER_URL || "https://armor-reduce-springs-brighton.trycloudflare.com";

export function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("res.cloudinary.com") || url.includes("cloudinary.com")) {
    const filename = url.split("/").pop().split("?")[0];
    return `${LOCAL_MEDIA_SERVER}/uploads/${filename}`;
  }
  return url;
}

export function normalizeImagesArray(images) {
  if (!Array.isArray(images)) return [];
  return images.map(img => normalizeImageUrl(img)).filter(Boolean);
}
