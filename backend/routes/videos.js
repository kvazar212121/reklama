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

// ── Multer: gapli VIDEO yuklash (Talking-Head overlay uchun, alohida) ─────
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    cb(null, `src_${uuidv4()}${ext}`);
  },
});
const videoFilter = (req, file, cb) => {
  const allowed = [
    'video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/x-msvideo',
    // Kinetic typography uchun audio fayllar ham qabul qilinadi
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-m4a',
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Faqat video yoki audio fayllar qabul qilinadi'), false);
};
const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB gapli video uchun
}).single('video');

const uploadSourceVideo = (req, res, next) => {
  uploadVideo(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Video hajmi 200 MB dan oshmasligi kerak' });
    }
    return res.status(400).json({ success: false, error: err.message || 'Video yuklashda xatolik' });
  });
};

// ── TALKING-HEAD OVERLAY: gapli video ustiga animatsiya (ALOHIDA pipeline) ──
// POST /api/videos/overlay
router.post('/overlay', requireAuth, checkAccess, uploadSourceVideo, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Iltimos, gapirib turgan videongizni yuklang' });
    }

    const intensity = ['light', 'medium', 'heavy'].includes(req.body.intensity) ? req.body.intensity : 'medium';
    const addMusic = (req.body.addMusic === '0' || req.body.addMusic === 'false') ? 0 : 1;
    const musicStyle = (req.body.musicStyle && VALID_MUSIC_STYLE_IDS.includes(req.body.musicStyle)) ? req.body.musicStyle : null;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, requireLogin: true, error: 'Foydalanuvchi topilmadi. Iltimos, Google orqali kiring.' });
    }

    // Overlay ham 1 ta kredit sarflaydi (admin cheksiz)
    const isAdmin = user.role === 'admin';
    if (!isAdmin && user.credits < 1) {
      // Yuklangan videoni tozalab, to'lov so'raymiz
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.status(402).json({
        success: false, needPayment: true,
        error: 'Video ustiga animatsiya qo\'shish uchun hisobingizda kredit yo\'q. Tariflardan birini tanlang.',
      });
    }
    if (!isAdmin) {
      db.prepare('UPDATE users SET credits = MAX(0, credits - 1), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    }

    const jobId = uuidv4();
    db.prepare(`
      INSERT INTO jobs (id, user_id, idea, mood, duration, status, progress, job_type, source_video_path, overlay_intensity, add_music, music_style)
      VALUES (?, ?, ?, 'energetic', 's30', 'pending', 0, 'overlay', ?, ?, ?, ?)
    `).run(jobId, user.id, 'Talking-head video overlay', req.file.path, intensity, addMusic, musicStyle);

    setTimeout(processNextJob, 100);
    console.log(`[API] New OVERLAY job: ${jobId} by ${user.id} | intensity=${intensity} music=${addMusic}`);

    res.status(201).json({
      success: true, jobId,
      remainingCredits: isAdmin ? 'unlimited' : user.credits - 1,
      message: 'Video ustiga animatsiya qo\'shish navbatga qo\'shildi',
    });
  } catch (err) {
    console.error('[API] Overlay error:', err);
    res.status(500).json({ success: false, error: 'Server xatosi: ' + err.message });
  }
});

// ── KINETIC TYPOGRAPHY: ovoz/matndan animatsion matn (ALOHIDA pipeline) ──
// POST /api/videos/kinetic
// Kirish: video/audio fayl (ovoz) YOKI matn (text). Dizayn uslubi tanlanadi.
const VALID_DESIGNS = ['bold_impact','minimal_clean','neon_cyber','gradient_pop','editorial','handwritten'];
router.post('/kinetic', requireAuth, checkAccess, uploadSourceVideo, async (req, res) => {
  try {
    const text = (req.body.text || '').trim();
    const hasFile = Boolean(req.file);
    if (!hasFile && !text) {
      return res.status(400).json({ success: false, error: 'Iltimos, ovozli fayl yuklang yoki matn kiriting' });
    }
    if (text && text.length > 3000) {
      return res.status(400).json({ success: false, error: 'Matn 3000 belgidan oshmasligi kerak' });
    }

    const design = VALID_DESIGNS.includes(req.body.design) ? req.body.design : 'bold_impact';
    const aspectRatio = ['9:16','16:9','1:1','4:5'].includes(req.body.aspectRatio) ? req.body.aspectRatio : '9:16';
    const addMusic = (req.body.addMusic === '0' || req.body.addMusic === 'false') ? 0 : 1;
    const musicStyle = (req.body.musicStyle && VALID_MUSIC_STYLE_IDS.includes(req.body.musicStyle)) ? req.body.musicStyle : null;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
      return res.status(401).json({ success: false, requireLogin: true, error: 'Foydalanuvchi topilmadi. Iltimos, Google orqali kiring.' });
    }

    const isAdmin = user.role === 'admin';
    if (!isAdmin && user.credits < 1) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
      return res.status(402).json({ success: false, needPayment: true, error: 'Animatsion matn video uchun hisobingizda kredit yo\'q. Tariflardan birini tanlang.' });
    }
    if (!isAdmin) {
      db.prepare('UPDATE users SET credits = MAX(0, credits - 1), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    }

    const jobId = uuidv4();
    // idea ustunida matn, style ustunida dizayn uslubi saqlanadi
    db.prepare(`
      INSERT INTO jobs (id, user_id, idea, mood, duration, status, progress, job_type, source_video_path, style, aspect_ratio, overlay_intensity, add_music, music_style)
      VALUES (?, ?, ?, 'energetic', 's30', 'pending', 0, 'kinetic', ?, ?, ?, 'medium', ?, ?)
    `).run(jobId, user.id, text || 'Audio kinetic typography', hasFile ? req.file.path : null, design, aspectRatio, addMusic, musicStyle);

    setTimeout(processNextJob, 100);
    console.log(`[API] New KINETIC job: ${jobId} by ${user.id} | design=${design} source=${hasFile ? 'audio' : 'text'}`);

    res.status(201).json({
      success: true, jobId,
      remainingCredits: isAdmin ? 'unlimited' : user.credits - 1,
      message: 'Animatsion matn video navbatga qo\'shildi',
    });
  } catch (err) {
    console.error('[API] Kinetic error:', err);
    res.status(500).json({ success: false, error: 'Server xatosi: ' + err.message });
  }
});


// ── Video yaratish so'rovi ─────────────────────────────────────────────────
// POST /api/videos/create
router.post('/create', requireAuth, checkAccess, uploadImages, async (req, res) => {
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

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        requireLogin: true,
        error: 'Foydalanuvchi topilmadi. Iltimos, Google orqali kiring.',
      });
    }

    // ── KREDIT VA DAVOMIYLIK TEKSHIRUVI ──
    // 30 soniyalik video = 1 kredit
    // 60 soniyalik video = 2 kredit
    const creditsNeeded = duration === 's60' ? 2 : 1;
    const isAdmin = user.role === 'admin';

    if (!isAdmin && user.credits < creditsNeeded) {
      if (duration === 's60' && user.credits === 1) {
        return res.status(402).json({
          success: false,
          needPayment: true,
          error: "60 soniyali video yaratish uchun 2 ta kredit talab qilinadi. Sizda 1 ta kredit bor (30 soniya uchun). 30 soniyali videoni tanlang yoki tarif sotib oling.",
        });
      }
      return res.status(402).json({
        success: false,
        needPayment: true,
        error: 'Video yaratish uchun hisobingizda yetarli kredit yo\'q. Iltimos, tariflardan birini tanlang.',
      });
    }

    // Kreditni kamaytirish (Admin bo'lmagan holda)
    if (!isAdmin) {
      db.prepare('UPDATE users SET credits = MAX(0, credits - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(creditsNeeded, user.id);
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
    let actualStatus = job.status;
    let actualProgress = job.progress;

    // Video fayli diskda allaqachon tayyormi tekshirish:
    const candidatePath = job.output_path || path.resolve(__dirname, '../output', `${job.id}.mp4`);
    if (fs.existsSync(candidatePath)) {
      try {
        const stat = fs.statSync(candidatePath);
        if (stat.size > 50000) {
          videoUrl = `/output/${path.basename(candidatePath)}`;
          actualStatus = 'done';
          actualProgress = 100;
          if (job.status !== 'done' || !job.output_path) {
            db.prepare("UPDATE jobs SET status = 'done', progress = 100, output_path = ?, error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
              .run(candidatePath, job.id);
          }
        }
      } catch (_) {}
    } else if (job.status === 'done' && job.output_path) {
      videoUrl = `/output/${path.basename(job.output_path)}`;
    }

    res.json({
      success: true,
      status: actualStatus,
      progress: actualProgress,
      idea: job.idea,
      mood: job.mood,
      duration: job.duration,
      videoUrl,
      error: actualStatus === 'done' ? null : job.error,
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

      let videoUrl = null;
      let actualStatus = job.status;
      const candidatePath = job.output_path || path.resolve(__dirname, '../output', `${job.id}.mp4`);
      if (fs.existsSync(candidatePath)) {
        try {
          const stat = fs.statSync(candidatePath);
          if (stat.size > 50000) {
            videoUrl = `/output/${path.basename(candidatePath)}`;
            actualStatus = 'done';
            if (job.status !== 'done') {
              db.prepare("UPDATE jobs SET status = 'done', progress = 100, output_path = ?, error = NULL WHERE id = ?")
                .run(candidatePath, job.id);
            }
          }
        } catch (_) {}
      } else if (job.status === 'done' && job.output_path) {
        videoUrl = `/output/${path.basename(job.output_path)}`;
      }

      return {
        id: job.id,
        status: actualStatus,
        progress: actualStatus === 'done' ? 100 : job.progress,
        idea: job.idea,
        mood: job.mood,
        duration: job.duration,
        style: job.style,
        imageCount,
        error: actualStatus === 'done' ? null : job.error,
        createdAt: job.created_at,
        videoUrl,
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

    const candidatePath = job.output_path || path.resolve(__dirname, '../output', `${job.id}.mp4`);
    if (fs.existsSync(candidatePath)) {
      const filename = `airek_${job.id.slice(0, 8)}.mp4`;
      return res.download(candidatePath, filename);
    }

    if (job.status !== 'done') {
      return res.status(400).json({ success: false, error: `Video hali tayyor emas. Holat: ${job.status}` });
    }
    return res.status(404).json({ success: false, error: 'Video fayl topilmadi' });
  } catch (err) {
    console.error('[API] Download error:', err);
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
