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

// Carpeta raíz de subidas en tu disco local
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Habilitar CORS para que tu app React pueda subir y leer imágenes
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Servir la carpeta uploads como estáticos públicos con caché
app.use("/uploads", express.static(UPLOADS_DIR, {
  maxAge: "7d",
  setHeaders: (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  }
}));

// Configuración de Multer para almacenamiento en disco con estructura por carpetas
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
  limits: { fileSize: 25 * 1024 * 1024 }, // Hasta 25MB por imagen
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten archivos de imagen."));
    }
    cb(null, true);
  }
});

// Endpoint de verificación de salud
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), server: "Local Media Server" });
});

// Endpoint para subir imagen individual
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó ningún archivo." });
    }

    const folder = req.body.folder ? req.body.folder.replace(/[^a-zA-Z0-9_\-\/]/g, "") : "general";
    const relPath = `${folder}/${req.file.filename}`.replace(/\/+/g, "/");

    // Construcción de la URL: toma el dominio público del encabezado host o variable de entorno
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const fullUrl = `${protocol}://${host}/uploads/${relPath}`;

    return res.json({
      success: true,
      url: fullUrl,
      secure_url: fullUrl, // Compatibilidad con Cloudinary
      relative_path: `/uploads/${relPath}`,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error("Error al procesar subida:", error);
    res.status(500).json({ error: "Error interno al guardar la imagen." });
  }
});

// Endpoint para subir múltiples imágenes a la vez
app.post("/api/upload-multiple", upload.array("files", 12), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron archivos." });
    }

    const folder = req.body.folder ? req.body.folder.replace(/[^a-zA-Z0-9_\-\/]/g, "") : "general";
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;

    const urls = req.files.map((file) => {
      const relPath = `${folder}/${file.filename}`.replace(/\/+/g, "/");
      const fullUrl = `${protocol}://${host}/uploads/${relPath}`;
      return {
        url: fullUrl,
        secure_url: fullUrl,
        relative_path: `/uploads/${relPath}`,
        filename: file.filename,
        size: file.size
      };
    });

    return res.json({ success: true, count: urls.length, files: urls });
  } catch (error) {
    console.error("Error al procesar subida múltiple:", error);
    res.status(500).json({ error: "Error interno al guardar imágenes." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor local de medios activo en http://localhost:${PORT}`);
  console.log(`📁 Carpeta de almacenamiento local: ${UPLOADS_DIR}`);
});
