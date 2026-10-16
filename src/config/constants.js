// ✅ SEGURO: El email del Super Admin se lee desde variables de entorno
// Configúralo en .env.local (desarrollo) o en Vercel Environment Variables (producción)
// NUNCA debe estar hardcodeado en el código fuente que está en GitHub público

export const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;

// Cloudinary (upload preset público — esto SÍ puede estar aquí, es público por diseño)
export const CLOUDINARY_CLOUD_NAME = "dp3abweme";
export const CLOUDINARY_UPLOAD_PRESET = "tienda_maquillaje";
