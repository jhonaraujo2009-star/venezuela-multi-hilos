import { CLOUDINARY_CLOUD_NAME } from "../config/constants";

/**
 * Normaliza las URLs de imágenes para que apunten a la nueva cuenta de Cloudinary
 * y apliquen optimización automática (f_auto, q_auto) y redimensionamiento opcional
 * para ahorrar ancho de banda y memoria RAM en el navegador.
 *
 * @param {string} url URL de la imagen
 * @param {number} [maxWidth=800] Ancho máximo opcional para optimizar decodificación en GPU
 */
export function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return url;

  // Si es una URL del Cloudinary anterior, la redirigimos a la nueva cuenta activa
  if (url.includes("res.cloudinary.com/dp3abweme/")) {
    url = url.replace("res.cloudinary.com/dp3abweme/", `res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/`);
  }

  // Asegurar optimización automática unificada (WebP/AVIF, calidad inteligente y ancho óptimo 800px)
  // Usar una única firma de URL permite reutilizar al 100% la caché del navegador entre catálogo, modal y recomendados
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
    const transformParams = "f_auto,q_auto,c_limit,w_800";
    url = url.replace(/\/image\/upload\/(?:f_auto[^/]*\/)?/, `/image/upload/${transformParams}/`);
  }

  return url;
}

export function normalizeImagesArray(images) {
  if (!Array.isArray(images)) return [];
  return images.map(img => normalizeImageUrl(img)).filter(Boolean);
}
