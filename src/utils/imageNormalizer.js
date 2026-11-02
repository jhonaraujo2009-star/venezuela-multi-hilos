import { CLOUDINARY_CLOUD_NAME } from "../config/constants";

/**
 * Normaliza las URLs de imágenes para que apunten a la nueva cuenta de Cloudinary
 * y apliquen optimización automática (f_auto, q_auto) y redimensionamiento opcional
 * para ahorrar ancho de banda y memoria RAM en el navegador.
 *
 * @param {string} url URL de la imagen
 * @param {number} [maxWidth=1080] Ancho máximo opcional para optimizar decodificación en GPU
 */
export function normalizeImageUrl(url, maxWidth = 1080) {
  if (!url || typeof url !== "string") return url;

  // Si es una URL del Cloudinary anterior, la redirigimos a la nueva cuenta activa
  if (url.includes("res.cloudinary.com/dp3abweme/")) {
    url = url.replace("res.cloudinary.com/dp3abweme/", `res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/`);
  }

  // Asegurar optimización automática de calidad, formato (WebP/AVIF) y límite de ancho
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
    const transformParams = maxWidth ? `f_auto,q_auto,c_limit,w_${maxWidth}` : "f_auto,q_auto";
    if (!url.includes("f_auto") && !url.includes("q_auto")) {
      url = url.replace("/image/upload/", `/image/upload/${transformParams}/`);
    } else if (maxWidth && !url.includes("w_")) {
      url = url.replace(/\/image\/upload\/([^/]+)\//, `/image/upload/$1,c_limit,w_${maxWidth}/`);
    }
  }

  return url;
}

export function normalizeImagesArray(images, maxWidth = 1080) {
  if (!Array.isArray(images)) return [];
  return images.map(img => normalizeImageUrl(img, maxWidth)).filter(Boolean);
}
