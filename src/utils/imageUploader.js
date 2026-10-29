import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../config/constants";

/**
 * Comprime una imagen en el navegador antes de subirla.
 * Reduce fotos pesadas de celulares (3MB - 10MB) a un peso pluma (~150KB - 250KB)
 * en formato WebP de alta fidelidad, ahorrando hasta un 95% de los créditos de Cloudinary.
 */
async function compressImage(file, maxWidth = 1200, quality = 0.82) {
  if (!file || !file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
                type: "image/webp",
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Sube una imagen optimizada directamente a Cloudinary.
 * @param {File} file Archivo binario de la imagen
 * @param {string} folder Carpeta destino (ej: 'tienda_maquillaje/bisuterajhon')
 * @returns {Promise<string>} URL pública HTTPS de la imagen
 */
export async function uploadImage(file, folder = "general") {
  if (!file) throw new Error("No se proporcionó archivo.");

  // 1. Optimización y compresión previa en el navegador
  const optimizedFile = await compressImage(file);

  // 2. Envío directo a Cloudinary mediante upload preset unsigned
  const formData = new FormData();
  formData.append("file", optimizedFile);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  if (folder) {
    formData.append("folder", folder);
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Error al subir imagen a Cloudinary (${res.status})`);
  }

  const data = await res.json();
  return data.secure_url;
}
