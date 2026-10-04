/**
 * AdForge AI — Avtomatik Fayl Tozalash Xizmati (Video TTL Cleanup)
 * 
 * Server diskini to'lib qolishdan asrash uchun belgilangan vaqt (standart: 15 kun)
 * o'tgandan so'ng eski MP4 videolarni va yuklangan rasmlarni avtomatik o'chiradi.
 */

const fs   = require('fs');
const path = require('path');
const db   = require('../models/db');

const OUTPUT_DIR = path.resolve(__dirname, '../output');
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');

/**
 * Eski fayllarni tozalash funksiyasi
 */
const cleanupOldFiles = () => {
  try {
    // TTL soatlarda (standart: 15 kun = 360 soat)
    const ttlHours = parseInt(db.getSetting('video_ttl_hours', '360'), 10);
    const maxAgeMs = ttlHours * 60 * 60 * 1000;
    const now = Date.now();

    let cleanedVideos = 0;
    let cleanedUploads = 0;

    // 1. Output (videolar) papkasini tozalash
    if (fs.existsSync(OUTPUT_DIR)) {
      const files = fs.readdirSync(OUTPUT_DIR);
      for (const file of files) {
        if (!file.endsWith('.mp4')) continue;
        const filePath = path.join(OUTPUT_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(filePath);
            cleanedVideos++;
            // Bazadagi holatni expired qilish
            const jobId = path.basename(file, '.mp4');
            db.prepare("UPDATE jobs SET status = 'expired', error = 'Video saqlash muddati (15 kun) tugadi' WHERE id = ?").run(jobId);
          }
        } catch (_) {}
      }
    }

    // 2. Uploads (rasmlar) papkasini tozalash
    if (fs.existsSync(UPLOAD_DIR)) {
      const files = fs.readdirSync(UPLOAD_DIR);
      for (const file of files) {
        const filePath = path.join(UPLOAD_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(filePath);
            cleanedUploads++;
          }
        } catch (_) {}
      }
    }

    if (cleanedVideos > 0 || cleanedUploads > 0) {
      console.log(`[Auto Cleanup] ${cleanedVideos} ta eski video va ${cleanedUploads} ta eski rasm o'chirildi (TTL: ${ttlHours}h)`);
    }
  } catch (err) {
    console.error('[Auto Cleanup] Xatolik:', err.message);
  }
};

/**
 * Xizmatni har 30 daqiqada ishga tushirish
 */
const startCleanupCron = () => {
  console.log('[Auto Cleanup] Video TTL tozalash xizmati ishga tushirildi (Tekshiruv: har 30 daqiqada)');
  cleanupOldFiles(); // Server boshlanganda bitta tozalash
  setInterval(cleanupOldFiles, 30 * 60 * 1000); // Har 30 daqiqada
};

module.exports = { startCleanupCron, cleanupOldFiles };
