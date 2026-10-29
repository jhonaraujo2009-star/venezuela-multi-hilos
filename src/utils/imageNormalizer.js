import urlMap from "../../server_media/url_map.json";

const LOCAL_MEDIA_SERVER = import.meta.env.VITE_MEDIA_SERVER_URL || "https://armor-reduce-springs-brighton.trycloudflare.com";

export function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return url;

  // 1. Si la URL de Cloudinary está en nuestro mapa local exacto
  if (urlMap[url]) {
    return `${LOCAL_MEDIA_SERVER}/uploads/${urlMap[url]}`;
  }

  // 2. Si es de Cloudinary pero no vino con el path completo
  if (url.includes("res.cloudinary.com") || url.includes("cloudinary.com")) {
    const filename = url.split("/").pop().split("?")[0];
    return `${LOCAL_MEDIA_SERVER}/uploads/tienda_maquillaje/bisuterajhon/${filename}`;
  }

  return url;
}

export function normalizeImagesArray(images) {
  if (!Array.isArray(images)) return [];
  return images.map(img => normalizeImageUrl(img)).filter(Boolean);
}
