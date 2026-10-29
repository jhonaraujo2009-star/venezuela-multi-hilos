/**
 * Uploader Universal de Imágenes
 * Permite subir archivos directamente a tu servidor local alojado en tu PC
 * y mantiene Cloudinary como respaldo automático en caso de que tu servidor esté apagado.
 */

import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../config/constants";

// URL de tu servidor en tu PC (puede definirse en .env.local con VITE_MEDIA_SERVER_URL o usar default)
const LOCAL_MEDIA_SERVER = import.meta.env.VITE_MEDIA_SERVER_URL || "https://armor-reduce-springs-brighton.trycloudflare.com";

/**
 * Sube una imagen a tu servidor local en tu PC.
 * Si tu servidor no responde o no está disponible, hace fallback seguro a Cloudinary
 * para que NUNCA se detengan las ventas de tus clientes.
 *
 * @param {File} file Archivo binario de la imagen
 * @param {string} folder Carpeta destino (ej: 'tienda_maquillaje/oscar')
 * @returns {Promise<string>} URL pública HTTPS de la imagen guardada
 */
export async function uploadImage(file, folder = "general") {
  if (!file) throw new Error("No se proporcionó archivo.");

  // 1. Intentar subir primero a tu PC (Servidor Local)
  if (LOCAL_MEDIA_SERVER) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 segundos timeout

      const res = await fetch(`${LOCAL_MEDIA_SERVER}/api/upload`, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.secure_url || data.url) {
          console.log("✅ Imagen guardada en tu PC:", data.url);
          return data.secure_url || data.url;
        }
      }
    } catch (err) {
      console.warn("⚠️ Servidor local no disponible o tardó en responder. Usando respaldo de emergencia...", err);
    }
  }

  // 2. Respaldo de emergencia a Cloudinary (si tu PC se apagó)
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  if (folder) formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    throw new Error("No se pudo subir la imagen ni al servidor local ni al respaldo.");
  }

  const data = await res.json();
  return data.secure_url;
}
