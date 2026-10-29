import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Mapa rápido en memoria de archivos descargados por nombre base
// Esto permite que /uploads/nombre.jpg o /uploads/folder/nombre.jpg lo encuentre de inmediato
let fileIndex = new Map();

function rebuildIndex() {
  const newIndex = new Map();
  function scan(dir, relPath = "") {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      const rel = path.join(relPath, ent.name).replace(/\\/g, "/");
      if (ent.isDirectory()) {
        scan(full, rel);
      } else {
        newIndex.set(ent.name.toLowerCase(), full);
        newIndex.set(rel.toLowerCase(), full);
      }
    }
  }
  scan(UPLOADS_DIR);
  fileIndex = newIndex;
  console.log(`📦 Índice de archivos locales listo: ${fileIndex.size} referencias indexadas.`);
}
rebuildIndex();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Endpoint de salud
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    server: "Local Media Server",
    filesIndexed: fileIndex.size
  });
});

// Middleware inteligente para servir cualquier imagen solicitada
app.use("/uploads", (req, res, next) => {
  const reqSubPath = decodeURIComponent(req.path.replace(/^\//, ""));
  const directPath = path.join(UPLOADS_DIR, reqSubPath);

  // 1. Si existe en la ruta exacta solicitada
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=604800");
    return res.sendFile(directPath);
  }

  // 2. Si no, buscar por nombre de archivo en los zips extraídos (migración transparente)
  const filename = path.basename(reqSubPath).toLowerCase();
  const matchedPath = fileIndex.get(filename);
  if (matchedPath && fs.existsSync(matchedPath) && fs.statSync(matchedPath).isFile()) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=604800");
    return res.sendFile(matchedPath);
  }

  return res.status(404).send("Imagen no encontrada");
});

// Configuración de Multer para almacenamiento en disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder ? req.body.folder.replace(/[^a-zA-Z0-9_\-\/]/g, "") : "general";
    const targetDir = path.join(UPLOADS_DIR, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `${cleanBase}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten archivos de imagen."));
    }
    cb(null, true);
  }
});

// Endpoint para subir imagen
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó ningún archivo." });
    }

    const folder = req.body.folder ? req.body.folder.replace(/[^a-zA-Z0-9_\-\/]/g, "") : "general";
    const relPath = `${folder}/${req.file.filename}`.replace(/\/+/g, "/");

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const fullUrl = `${protocol}://${host}/uploads/${relPath}`;

    // Indexar nuevo archivo al vuelo
    fileIndex.set(req.file.filename.toLowerCase(), req.file.path);

    return res.json({
      success: true,
      url: fullUrl,
      secure_url: fullUrl,
      relative_path: `/uploads/${relPath}`,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error("Error al procesar subida:", error);
    res.status(500).json({ error: "Error interno al guardar la imagen." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor local de medios activo en http://localhost:${PORT}`);
  console.log(`📁 Carpeta de almacenamiento local: ${UPLOADS_DIR}`);
});
