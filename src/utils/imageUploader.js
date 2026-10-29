/**
 * Uploader Universal 100% LOCAL
 * Desconectado totalmente de Cloudinary.
 * Guarda y sirve los archivos exclusivamente desde tu propia computadora.
 */

// URL del servidor local en tu PC (puede definirse en .env.local con VITE_MEDIA_SERVER_URL o usar default)
const LOCAL_MEDIA_SERVER = import.meta.env.VITE_MEDIA_SERVER_URL || "https://armor-reduce-springs-brighton.trycloudflare.com";

/**
 * Sube una imagen directamente a tu computadora.
 * @param {File} file Archivo binario de la imagen
 * @param {string} folder Carpeta destino (ej: 'tienda_maquillaje/oscar')
 * @returns {Promise<string>} URL pública HTTPS de la imagen guardada en tu disco duro
 */
export async function uploadImage(file, folder = "general") {
  if (!file) throw new Error("No se proporcionó archivo.");

  const formData = new FormData();
  // IMPORTANTE: "folder" debe añadirse ANTES de "file" para que Multer lo lea en destination()
  formData.append("folder", folder);
  formData.append("file", file);

  const res = await fetch(`${LOCAL_MEDIA_SERVER}/api/upload?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    throw new Error(`Error en el servidor local de tu PC (${res.status}). Asegúrate de tener INICIAR_SERVIDOR_IMAGENES.bat encendido.`);
  }

  const data = await res.json();
  if (data.secure_url || data.url) {
    console.log("✅ Imagen guardada localmente en tu disco duro:", data.url);
    return data.secure_url || data.url;
  }

  throw new Error("El servidor local no devolvió una URL válida.");
}
