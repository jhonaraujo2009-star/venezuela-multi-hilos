import { CLOUDINARY_CLOUD_NAME } from "../config/constants";

/**
 * Normaliza las URLs de imágenes para que apunten a la nueva cuenta de Cloudinary
 * y apliquen optimización automática (f_auto, q_auto) para ahorrar ancho de banda.
 */
export function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return url;

  // Si es una URL del Cloudinary anterior, la redirigimos a la nueva cuenta activa
  if (url.includes("res.cloudinary.com/dp3abweme/")) {
    url = url.replace("res.cloudinary.com/dp3abweme/", `res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/`);
  }

  // Asegurar optimización automática de calidad y formato (WebP/AVIF)
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
    if (!url.includes("f_auto") && !url.includes("q_auto")) {
      url = url.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
    }
  }

  return url;
}

export function normalizeImagesArray(images) {
  if (!Array.isArray(images)) return [];
  return images.map(img => normalizeImageUrl(img)).filter(Boolean);
}
