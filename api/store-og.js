// api/store-og.js
// Vercel Serverless Function: inyecta OG tags dinámicos por tienda para WhatsApp, Facebook, Telegram, etc.
// Se accede como: /api/store-og?storeId=oscar
// WhatsApp/Facebook leen los OG tags → humanos son redirigidos automáticamente al SPA

// ✅ SEGURO: Las credenciales se leen desde variables de entorno de Vercel
// Configúralas en: Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
const FIREBASE_PROJECT = process.env.VITE_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;

// Leer un campo string de la respuesta de la Firestore REST API
function getStr(fields, key, fallback = "") {
  return fields?.[key]?.stringValue || fallback;
}

// Escapar caracteres especiales para HTML (previene XSS)
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default async function handler(req, res) {
  // Solo aceptar GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { storeId, product } = req.query;

  // Validar que storeId sea alfanumérico (evitar path traversal / inyección)
  if (!storeId || !/^[a-z0-9_-]{1,50}$/i.test(storeId)) {
    return res.redirect(302, "/");
  }

  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["host"];
  const targetRedirect = product
    ? `/${storeId}?product=${encodeURIComponent(product)}`
    : `/${storeId}`;
  const storeUrl = `${protocol}://${host}${targetRedirect}`;

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
      const profileImg = getStr(f, "profileImage", "");
      const appLogo192 = f?.appLogos?.mapValue?.fields?.icon192?.stringValue || "";
      if (profileImg)      storeImage = profileImg;
      else if (appLogo192) storeImage = appLogo192;
    }

    if (product && typeof product === "string") {
      const prodRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/products/${product}?key=${FIREBASE_API_KEY}`
      );
      if (prodRes.ok) {
        const prodDoc = await prodRes.json();
        const pf = prodDoc.fields || {};
        const pName = getStr(pf, "name", "");
        const pDesc = getStr(pf, "description", "");
        const pImg = getStr(pf, "image", "") || (pf?.images?.arrayValue?.values?.[0]?.stringValue || "");
        if (pName) storeName = `${pName} | ${storeName}`;
        if (pDesc) storeDescription = pDesc;
        if (pImg) storeImage = pImg;
      }
    }
  } catch (err) {
    console.error("[store-og] Error al consultar Firestore:", err.message);
  }

  // ---------- SIEMPRE DEVOLVER HTML CON OG TAGS ----------
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
  <meta http-equiv="refresh" content="0;url=${targetRedirect}" />
</head>
<body>
  <p>Redirigiendo a <a href="${targetRedirect}">${safeTitle}</a>...</p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Cache en el edge por 5 min para no consultar Firestore en cada hit
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
  res.status(200).send(html);
}
