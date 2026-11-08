// ✅ SEGURO: El email del Super Admin se lee desde variables de entorno
// Configúralo en .env.local (desarrollo) o en Vercel Environment Variables (producción)
// NUNCA debe estar hardcodeado en el código fuente que está en GitHub público

export const SUPER_ADMIN_EMAIL = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || "").trim();

// Helper centralizado para verificar identidad de Super Admin de forma segura (soporta espacios o múltiples correos separados por coma)
export function isSuperAdmin(emailOrUser) {
  if (!SUPER_ADMIN_EMAIL || !emailOrUser) return false;
  const rawEmail = typeof emailOrUser === "string" ? emailOrUser : emailOrUser?.email;
  if (!rawEmail) return false;
  const normalizedTarget = rawEmail.trim().toLowerCase();
  if (!normalizedTarget) return false;

  const allowedEmails = SUPER_ADMIN_EMAIL.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(normalizedTarget);
}

// Cloudinary (upload preset público — esto SÍ puede estar aquí, es público por diseño)
export const CLOUDINARY_CLOUD_NAME = "cxgqjlnq";
export const CLOUDINARY_UPLOAD_PRESET = "tienda_preset";
