const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { execFile } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, optionalAuth, checkAccess } = require('../middleware/auth');
const { processNextJob } = require('../services/queue');
const db = require('../models/db');
const { VIDEO_STYLES } = require('../config/styles');
const { MUSIC_STYLES, VALID_MUSIC_STYLE_IDS } = require('../config/musicStyles');

const router = express.Router();

// ── 10 ta professional video stillari ─────────────────────────────────────
router.get('/styles', (req, res) => {
  res.json({ success: true, styles: VIDEO_STYLES });
});

// ── 10 ta musiqa uslubi (video dizayn stilidan mustaqil tanlanadi) ─────────
router.get('/music-styles', (req, res) => {
  res.json({ success: true, musicStyles: MUSIC_STYLES });
});

// ── Foydalanuvchiga qo'llaniladigan limitlar (frontend uchun) ─────────────
router.get('/limits', (req, res) => {
  res.json({
    success: true,
    limits: {
      maxImages: MAX_IMAGES,
      maxIdeaLength: MAX_IDEA_LENGTH,
      durations: ['s30', 's60'],
      freeCreditsPerUser: parseInt(db.getSetting('free_credits_per_user', '2'), 10),
      freeTierEnabled: db.getSetting('free_tier_enabled', '1') === '1',
    },
  });
});

// ── Multer: rasm yuklash sozlamalari ──────────────────────────────────────
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Faqat rasm fayllari qabul qilinadi (JPEG, PNG, WEBP)'), false);
  }
};

const MAX_IMAGES = 5;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB har bir fayl uchun
});

// jcode'ga (va DeepSeek vision API'siga) yuborilishidan oldin rasmni xavfsiz
// o'lchamga kichraytirish. Mijozlar ba'zan juda katta/cho'zilgan skrinshotlar
// (masalan 9050x2000) yuklaydi — bunday o'lchamlarni DeepSeek'ning vision
// endpoint'i "unsupported image" deb rad etadi va butun job muvaffaqiyatsiz
// tugaydi. Nisbat saqlangan holda eng katta tomoni 1600px'dan oshmasin.
const resizeImageInPlace = (filePath) => new Promise((resolve) => {
  const ext = path.extname(filePath);
  if (ext.toLowerCase() === '.gif') return resolve(); // animatsiyani buzmaslik uchun GIF o'tkazib yuboriladi
  const tmpPath = `${filePath}.resized${ext}`;
  execFile('ffmpeg', [
    '-y', '-i', filePath,
    '-vf', "scale='min(1600,iw)':'min(1600,ih)':force_original_aspect_ratio=decrease",
    '-update', '1',
    tmpPath,
  ], (err) => {
    if (!err && fs.existsSync(tmpPath)) {
      fs.renameSync(tmpPath, filePath);
    } else {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      console.error('[API] Rasmni kichraytirishda xatolik (asl fayl saqlanadi):', err?.message);
    }
    resolve();
  });
});

// Multer xatolarini (masalan ruxsat etilgandan ko'p rasm) aniq xabar bilan qaytarish
const uploadImages = (req, res, next) => {
  upload.array('images', MAX_IMAGES)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Har bir rasm hajmi 10 MB dan oshmasligi kerak' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, error: `Ko'pi bilan ${MAX_IMAGES} ta rasm yuklash mumkin` });
    }
    return res.status(400).json({ success: false, error: err.message || 'Rasm yuklashda xatolik' });
  });
};

const MAX_IDEA_LENGTH = 1200;

// ── Video yaratish so'rovi ─────────────────────────────────────────────────
// POST /api/videos/create
router.post('/create', optionalAuth, checkAccess, uploadImages, async (req, res) => {
  try {
    if (req.files && req.files.length > 0) {
      await Promise.all(req.files.map((f) => resizeImageInPlace(f.path)));
    }

    const { idea, mood = 'energetic', duration = 's30', model = 'deepseek/deepseek-chat', style = 'cyberpunk_neon', aspectRatio = '9:16', musicStyle = '' } = req.body;
    const aspect_ratio = req.body.aspect_ratio || aspectRatio || '9:16';

    if (musicStyle && !VALID_MUSIC_STYLE_IDS.includes(musicStyle)) {
      return res.status(400).json({ success: false, error: 'Noto\'g\'ri musiqa uslubi' });
    }

    if (!idea || !idea.trim()) {
      return res.status(400).json({ success: false, error: 'Reklama g\'oyasi kiritilishi shart' });
    }

    if (idea.trim().length > MAX_IDEA_LENGTH) {
      return res.status(400).json({ success: false, error: `Reklama g'oyasi matni ${MAX_IDEA_LENGTH} belgidan oshmasligi kerak` });
    }

    const validMoods = ['energetic', 'calm', 'happy', 'cinematic', 'corporate'];
    const validDurations = ['s30', 's60'];

    if (!validMoods.includes(mood)) {
      return res.status(400).json({ success: false, error: 'Noto\'g\'ri musiqa kayfiyati' });
    }

    if (!validDurations.includes(duration)) {
      return res.status(400).json({ success: false, error: 'Noto\'g\'ri video uzunligi' });
    }

    const userId = req.user ? req.user.id : 'guest_user';
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      db.prepare(`
        INSERT OR IGNORE INTO users (id, google_id, email, name, avatar, role, credits, free_credits_claimed)
        VALUES ('guest_user', 'guest_000', 'guest@reklam.hubservis.uz', 'Mehmon Foydalanuvchi', '', 'user', 2, 1)
      `).run();
      user = db.prepare('SELECT * FROM users WHERE id = ?').get('guest_user');
    }

    // ── KREDIT / TEKIN VERSIYA TEKSHIRUVI ──
    const freeTierEnabled = db.getSetting('free_tier_enabled', '1') === '1';
    const freeCreditsPerUser = parseInt(db.getSetting('free_credits_per_user', '2'), 10);

    // Agar foydalanuvchi hali bepul kreditlarini olmagan bo'lsa va tekin rejim yoqilgan bo'lsa
    if (user.free_credits_claimed === 0 && freeTierEnabled) {
      db.prepare('UPDATE users SET credits = credits + ?, free_credits_claimed = 1 WHERE id = ?')
        .run(freeCreditsPerUser, user.id);
      user.credits += freeCreditsPerUser;
    }

    // Admin bo'lsa yoki kreditlari bo'lsa ruxsat
    const isAdmin = user.role === 'admin';
    if (!isAdmin && user.credits <= 0) {
      return res.status(402).json({
        success: false,
        needPayment: true,
        error: 'Video yaratish uchun hisobingizda yetarli kredit yo\'q. Iltimos, tariflardan birini tanlang.',
      });
    }

    // Kreditni 1 taga kamaytirish (Admin bo'lmagan holda)
    if (!isAdmin) {
      db.prepare('UPDATE users SET credits = MAX(0, credits - 1), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(user.id);
    }

    const imagePaths = (req.files || []).map((f) => f.path);
    const imagePathsJson = imagePaths.length > 0 ? JSON.stringify(imagePaths) : null;

    // Job yaratish
    const jobId = uuidv4();
    db.prepare(`
      INSERT INTO jobs (id, user_id, idea, mood, duration, image_paths, status, progress, model, style, aspect_ratio, music_style)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?, ?)
    `).run(jobId, userId, idea.trim(), mood, duration, imagePathsJson, model, style, aspect_ratio, musicStyle || null);

    // Queueni tetiklash
    setTimeout(processNextJob, 100);

    console.log(`[API] New job created: ${jobId} by user: ${userId} (Remaining credits: ${isAdmin ? 'unlimited' : user.credits - 1})`);

    res.status(201).json({
      success: true,
      jobId,
      remainingCredits: isAdmin ? 'unlimited' : user.credits - 1,
      message: 'Video yaratish navbatga qo\'shildi',
    });

  } catch (err) {
    console.error('[API] Create video error:', err);
    res.status(500).json({ success: false, error: 'Server xatosi: ' + err.message });
  }
});

// ── Job holati ─────────────────────────────────────────────────────────────
// GET /api/videos/status/:jobId
router.get('/status/:jobId', optionalAuth, (req, res) => {
  try {
    const job = db.prepare(`
      SELECT id, status, progress, idea, mood, duration, output_path, error, created_at, updated_at
      FROM jobs WHERE id = ?
    `).get(req.params.jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job topilmadi' });
    }

    let videoUrl = null;
    if (job.status === 'done' && job.output_path) {
      videoUrl = `/output/${path.basename(job.output_path)}`;
    }

    res.json({
      success: true,
      status: job.status,
      progress: job.progress,
      idea: job.idea,
      mood: job.mood,
      duration: job.duration,
      videoUrl,
      error: job.error,
    });
  } catch (err) {
    console.error('[API] Status error:', err);
    res.status(500).json({ success: false, error: 'Server xatosi' });
  }
});

// ── Foydalanuvchi videolari tarixi ────────────────────────────────────────
// GET /api/videos/my
router.get('/my', optionalAuth, (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'guest_user';
    const rows = db.prepare(`
      SELECT id, status, progress, idea, mood, duration, style, image_paths, output_path, error, created_at
      FROM jobs WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).all(userId);

    const jobs = rows.map((job) => {
      let imageCount = 0;
      if (job.image_paths) {
        try { imageCount = JSON.parse(job.image_paths).length; } catch (_) { imageCount = 0; }
      }
      return {
        id: job.id,
        status: job.status,
        progress: job.progress,
        idea: job.idea,
        mood: job.mood,
        duration: job.duration,
        style: job.style,
        imageCount,
        error: job.error,
        createdAt: job.created_at,
        videoUrl: job.status === 'done' && job.output_path ? `/output/${path.basename(job.output_path)}` : null,
      };
    });

    const user = db.prepare('SELECT credits, role, free_credits_claimed, created_at FROM users WHERE id = ?').get(userId);

    res.json({
      success: true,
      jobs,
      credits: user ? user.credits : 0,
      role: user ? user.role : 'user',
      memberSince: user ? user.created_at : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server xatosi' });
  }
});

// ── Tayyor video yuklab olish ──────────────────────────────────────────────
// GET /api/videos/download/:jobId
router.get('/download/:jobId', optionalAuth, (req, res) => {
  try {
    const job = db.prepare(`
      SELECT * FROM jobs WHERE id = ?
    `).get(req.params.jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job topilmadi' });
    }

    if (job.status !== 'done') {
      return res.status(400).json({ success: false, error: `Video hali tayyor emas. Holat: ${job.status}` });
    }

    if (!job.output_path || !fs.existsSync(job.output_path)) {
      return res.status(404).json({ success: false, error: 'Video fayl topilmadi' });
    }

    const filename = `reklam_${job.id.slice(0, 8)}.mp4`;
    res.download(job.output_path, filename);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server xatosi' });
  }
});

// ── Multer xatoliklari ─────────────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Fayl hajmi 10 MB dan oshmasligi kerak' });
    }
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
});

module.exports = router;
