import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: "cxgqjlnq",
  api_key: "329921649389491",
  api_secret: "YDgvrv0-oBubTjVyhEzesJ6Ljmc",
  secure: true
});

const urlMap = JSON.parse(fs.readFileSync("server_media/url_map.json", "utf8"));

function getPublicIdFromCloudinaryUrl(url) {
  const parts = url.split("/image/upload/");
  if (parts.length < 2) return null;
  let afterUpload = parts[1];
  afterUpload = afterUpload.replace(/^v\d+\//, "");
  afterUpload = afterUpload.split("?")[0];
  const ext = path.extname(afterUpload);
  return afterUpload.slice(0, afterUpload.length - ext.length);
}

async function migrateAll() {
  const entries = Object.entries(urlMap);
  console.log(`Iniciando migración de ${entries.length} imágenes hacia la nueva cuenta 'cxgqjlnq'...`);

  let successCount = 0;
  let errorCount = 0;
  const processedPublicIds = new Set();

  for (let i = 0; i < entries.length; i++) {
    const [origUrl, localRelPath] = entries[i];
    const publicId = getPublicIdFromCloudinaryUrl(origUrl);
    if (!publicId) {
      console.warn(`[${i + 1}/${entries.length}] No se pudo extraer publicId de: ${origUrl}`);
      errorCount++;
      continue;
    }

    if (processedPublicIds.has(publicId)) {
      console.log(`[${i + 1}/${entries.length}] Ya procesado anteriormente: ${publicId}`);
      successCount++;
      continue;
    }

    const fullLocalPath = path.resolve("server_media/uploads", localRelPath);
    if (!fs.existsSync(fullLocalPath)) {
      console.error(`[${i + 1}/${entries.length}] Archivo no encontrado en disco: ${fullLocalPath}`);
      errorCount++;
      continue;
    }

    try {
      await cloudinary.uploader.upload(fullLocalPath, {
        public_id: publicId,
        overwrite: true,
        resource_type: "image"
      });
      processedPublicIds.add(publicId);
      successCount++;
      console.log(`✅ [${i + 1}/${entries.length}] Subido: ${publicId}`);
    } catch (err) {
      console.error(`❌ [${i + 1}/${entries.length}] Error subiendo ${publicId}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n🎉 MIGRACIÓN COMPLETADA:`);
  console.log(`- Exitosas: ${successCount}`);
  console.log(`- Fallidas: ${errorCount}`);
}

migrateAll();
