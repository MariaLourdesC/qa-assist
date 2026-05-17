const express      = require('express');
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const crypto       = require('crypto');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
router.use(authenticate);

// ── Storage config ────────────────────────────────────────────────────────

const UPLOAD_DIR = process.env.UPLOAD_DIR
  || path.join(__dirname, '..', '..', 'uploads');

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4',  'video/webm', 'video/quicktime'
]);

const EXT_MAP = {
  'image/jpeg':      '.jpg',
  'image/png':       '.png',
  'image/gif':       '.gif',
  'image/webp':      '.webp',
  'video/mp4':       '.mp4',
  'video/webm':      '.webm',
  'video/quicktime': '.mov'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Per-user folder so files are isolated
    const userDir = path.join(UPLOAD_DIR, String(req.user.id));
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = EXT_MAP[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const uuid = crypto.randomBytes(16).toString('hex');
    cb(null, `${uuid}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(Object.assign(new Error('Tipo de archivo no permitido'), { status: 415 }));
    }
    cb(null, true);
  }
});

// ── POST /api/uploads ─────────────────────────────────────────────────────

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  const isVideo = req.file.mimetype.startsWith('video/');
  const maxBytes = (isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024;

  if (req.file.size > maxBytes) {
    fs.unlink(req.file.path, () => {});
    return res.status(413).json({
      error: `Archivo demasiado grande (máx ${isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB} MB)`
    });
  }

  // Build URL that the frontend can use to display/download
  const relativePath = path.relative(UPLOAD_DIR, req.file.path)
    .replace(/\\/g, '/');

  res.status(201).json({
    url:      `/uploads/${relativePath}`,
    filename: req.file.filename,
    size:     req.file.size,
    type:     isVideo ? 'video' : 'image',
    mimetype: req.file.mimetype
  });
});

// ── DELETE /api/uploads/:userId/:filename ─────────────────────────────────

router.delete('/:filename', (req, res) => {
  // Only allow deleting own files
  const filePath = path.join(UPLOAD_DIR, String(req.user.id), req.params.filename);

  // Security: make sure resolved path is inside user's folder
  const userDir  = path.join(UPLOAD_DIR, String(req.user.id));
  if (!filePath.startsWith(userDir)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  fs.unlink(filePath, (err) => {
    if (err) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.json({ ok: true });
  });
});

module.exports = { router, UPLOAD_DIR };
