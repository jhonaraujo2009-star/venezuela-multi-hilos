// api/store-og.js
// Vercel Serverless Function: inyecta OG tags dinámicos por tienda para WhatsApp, Facebook, Telegram, etc.
// Se accede como: /api/store-og?storeId=oscar
// WhatsApp/Facebook leen los OG tags → humanos son redirigidos automáticamente al SPA

const FIREBASE_PROJECT = "tiendavenezuela-768d2";
const FIREBASE_API_KEY = "AIzaSyA-W2oLOdc_lhG8_oygYRjn2Uynhld74uU";

// Leer un campo string de la respuesta de la Firestore REST API
function getStr(fields, key, fallback = "") {
  return fields?.[key]?.stringValue || fallback;
}

// Escapar caracteres especiales para HTML
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default async function handler(req, res) {
  const { storeId } = req.query;

  // Si no hay storeId, redirigir a la página principal
  if (!storeId) {
    return res.redirect(302, "/");
  }

  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["host"];
  const storeUrl = `${protocol}://${host}/${storeId}`;

  // ---------- VALORES POR DEFECTO ----------
  let storeName = "Nuestra Tienda";
  let storeDescription = "Descubre nuestros productos exclusivos.";
  let storeImage = `${protocol}://${host}/vite.svg`;

  // ---------- CONSULTAR FIRESTORE REST API ----------
  try {
    const storeRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/stores/${storeId}?key=${FIREBASE_API_KEY}`
    );

    if (storeRes.ok) {
      const storeDoc = await storeRes.json();
      const f = storeDoc.fields || {};
      storeName        = getStr(f, "nombre",          storeName);
      storeDescription = getStr(f, "heroDescription", storeDescription);
      // profileImage guardado en el store por AdminInterface.jsx
      const profileImg = getStr(f, "profileImage", "");
      const appLogo192 = f?.appLogos?.mapValue?.fields?.icon192?.stringValue || "";
      if (profileImg)      storeImage = profileImg;
      else if (appLogo192) storeImage = appLogo192;
    }
  } catch (err) {
    console.error("[store-og] Error al consultar Firestore:", err.message);
  }

  // ---------- SIEMPRE DEVOLVER HTML CON OG TAGS ----------
  // Los bots (WhatsApp, Facebook) leen las meta tags
  // Los humanos son redirigidos al SPA tras 0 segundos vía meta refresh
  const safeTitle = escapeHtml(storeName);
  const safeDesc  = escapeHtml(storeDescription);
  const safeUrl   = escapeHtml(storeUrl);
  const safeImage = escapeHtml(storeImage);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle}</title>

  <!-- Open Graph (WhatsApp, Facebook, Telegram) -->
  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="Venezuela Multi Hilos" />
  <meta property="og:url"         content="${safeUrl}" />
  <meta property="og:title"       content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image"       content="${safeImage}" />
  <meta property="og:image:width"  content="800" />
  <meta property="og:image:height" content="800" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image"       content="${safeImage}" />

  <!-- Redirige a la tienda real automáticamente (humanos) -->
  <meta http-equiv="refresh" content="0;url=/${storeId}" />
</head>
<body>
  <p>Redirigiendo a <a href="/${storeId}">${safeTitle}</a>...</p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Cache en el edge por 5 min para no consultar Firestore en cada hit
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
  res.status(200).send(html);
}
