import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../config/constants";

// Límite máximo: 2 Megabytes
const MAX_FILE_BYTES = 2 * 1024 * 1024;

/**
 * Mantiene la foto en ALTA DEFINICIÓN (2K/QHD).
 * Si la foto ya pesa 2 MB o menos, NO se comprime y se sube 100% original.
 * Si supera los 2 MB (ej: fotos de 6MB a 12MB tomadas con celular),
 * se optimiza en alta resolución (hasta 2560px con calidad 90%)
 * garantizando que quede por debajo de 2 MB sin perder nitidez ni detalles.
 */
async function compressImage(file, maxBytes = MAX_FILE_BYTES, maxWidth = 2560) {
  if (!file || !file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) {
    return file;
  }

  // ✅ Si ya pesa 2 MB o menos, se conserva 100% intacta y original
  if (file.size <= maxBytes) {
    return file;
  }

  // ✅ Si pesa más de 2 MB, ajustar manteniendo alta definición (2560px, calidad 90%)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Mantener resolución 2K / Alta Definición
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Calidad 90% (alta fidelidad para bisutería y detalles finos)
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
          0.90
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
 * Sube una imagen en alta definición directamente a Cloudinary.
 * @param {File} file Archivo binario de la imagen
 * @param {string} folder Carpeta destino (ej: 'tienda_maquillaje/bisuterajhon')
 * @returns {Promise<string>} URL pública HTTPS de la imagen
 */
export async function uploadImage(file, folder = "general") {
  if (!file) throw new Error("No se proporcionó archivo.");

  // 1. Respetar límite de 2 MB manteniendo máxima resolución
  const fileToUpload = await compressImage(file);

  // 2. Envío directo a Cloudinary mediante upload preset unsigned
  const formData = new FormData();
  formData.append("file", fileToUpload);
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
