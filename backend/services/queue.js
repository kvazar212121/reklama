const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../models/db');

const MAX_WORKERS = parseInt(process.env.MAX_WORKERS || '3');
let activeWorkers = 0;

/**
 * Navbatdagi ishni olish va boshlash
 */
const processNextJob = () => {
  if (activeWorkers >= MAX_WORKERS) return;

  const job = db.prepare(`
    SELECT * FROM jobs WHERE status = 'pending'
    ORDER BY created_at ASC LIMIT 1
  `).get();

  if (!job) return;

  activeWorkers++;

  // Status: processing
  db.prepare(`
    UPDATE jobs SET status = 'processing', progress = 5, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(job.id);

  console.log(`[Worker] Starting job: ${job.id} | active: ${activeWorkers}/${MAX_WORKERS}`);

  runJob(job)
    .then((outputPath) => {
      db.prepare(`
        UPDATE jobs
        SET status = 'done', progress = 100, output_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(outputPath, job.id);
      console.log(`[Worker] ✅ Job done: ${job.id}`);
    })
    .catch((err) => {
      db.prepare(`
        UPDATE jobs
        SET status = 'failed', error = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(err.message, job.id);
      console.error(`[Worker] ❌ Job failed: ${job.id}`, err.message);
    })
    .finally(() => {
      activeWorkers--;
      // Keyingi ishni tekshir
      setTimeout(processNextJob, 500);
    });
};

/**
 * Asosiy ish bajaruvchi — jcode orqali video yaratadi
 */
const runJob = (job) => {
  return new Promise((resolve, reject) => {
    const outputDir = path.resolve(process.env.OUTPUT_DIR || './output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, `${job.id}.mp4`);

    // ── Job turiga qarab tegishli worker tanlanadi ──
    // 'overlay' — mijoz yuklagan gapli video ustiga animatsiya qo'shish (alohida pipeline)
    // 'generate' (default) — g'oyadan noldan video yaratish (asosiy pipeline)
    if (job.job_type === 'overlay') {
      const overlayScript = path.resolve(__dirname, './jcode_overlay_worker.js');
      const proc = spawn('node', [
        overlayScript,
        job.id,
        job.source_video_path || '',
        outputFile,
        job.overlay_intensity || 'medium',
        job.music_style || '',
        String(job.add_music == null ? 1 : job.add_music),
      ], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, PATH: `${process.env.PATH}:/home/devops/.local/bin` },
        detached: false,
      });

      let lastErrLine = '';
      proc.stdout.on('data', (d) => console.log(`[Overlay ${job.id}]`, d.toString().trim()));
      proc.stderr.on('data', (d) => {
        const text = d.toString().trim();
        console.error(`[Overlay ${job.id}] ERR:`, text);
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length) lastErrLine = lines[lines.length - 1];
      });

      const overlayTimeout = parseInt(process.env.JOB_TIMEOUT_MS || '3900000', 10);
      const gt = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Job timeout (${Math.round(overlayTimeout / 60000)} daqiqa)`));
      }, overlayTimeout);

      proc.on('close', (code) => {
        clearTimeout(gt);
        if (code === 0 && fs.existsSync(outputFile)) {
          resolve(outputFile);
        } else {
          const m = lastErrLine.match(/Xatolik:\s*(.+)$/);
          reject(new Error((m ? m[1] : lastErrLine) || `overlay worker exit ${code}`));
        }
      });
      proc.on('error', (err) => { clearTimeout(gt); reject(new Error(`Overlay worker spawn error: ${err.message}`)); });
      return; // overlay yo'li shu yerda tugaydi — pastdagi generate pipeline ishlamaydi
    }

    // ── 'kinetic' — ovoz/matndan animatsion matn (kinetic typography) ──
    if (job.job_type === 'kinetic') {
      const kineticScript = path.resolve(__dirname, './jcode_kinetic_worker.js');
      const proc = spawn('node', [
        kineticScript,
        job.id,
        job.source_video_path || '-',
        outputFile,
        job.style || 'bold_impact',        // dizayn uslubi style ustunida saqlanadi
        job.aspect_ratio || '9:16',
        job.music_style || '',
        String(job.add_music == null ? 1 : job.add_music),
        job.idea || '',                     // matn kontenti idea ustunida saqlanadi
      ], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, PATH: `${process.env.PATH}:/home/devops/.local/bin` },
        detached: false,
      });

      let lastErrLine = '';
      proc.stdout.on('data', (d) => console.log(`[Kinetic ${job.id}]`, d.toString().trim()));
      proc.stderr.on('data', (d) => {
        const text = d.toString().trim();
        console.error(`[Kinetic ${job.id}] ERR:`, text);
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length) lastErrLine = lines[lines.length - 1];
      });

      const kTimeout = parseInt(process.env.JOB_TIMEOUT_MS || '3900000', 10);
      const gt = setTimeout(() => { proc.kill('SIGTERM'); reject(new Error(`Job timeout (${Math.round(kTimeout / 60000)} daqiqa)`)); }, kTimeout);

      proc.on('close', (code) => {
        clearTimeout(gt);
        if (code === 0 && fs.existsSync(outputFile)) resolve(outputFile);
        else { const m = lastErrLine.match(/Xatolik:\s*(.+)$/); reject(new Error((m ? m[1] : lastErrLine) || `kinetic worker exit ${code}`)); }
      });
      proc.on('error', (err) => { clearTimeout(gt); reject(new Error(`Kinetic worker spawn error: ${err.message}`)); });
      return;
    }

    const workerScript = path.resolve(__dirname, './jcode_worker.js');

    // Progress bosqichlari — taxminiy vaqtlarga qarab
    const progressSteps = [
      { p: 10, delay: 2000  },   // boshlandi
      { p: 25, delay: 15000 },   // jcode HTML yaratmoqda
      { p: 50, delay: 40000 },   // HyperFrames render
      { p: 75, delay: 70000 },   // musiqa qo'shilmoqda
      { p: 90, delay: 90000 },   // yakunlanmoqda
    ];

    const timers = progressSteps.map(({ p, delay }) =>
      setTimeout(() => {
        try {
          db.prepare(
            'UPDATE jobs SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).run(p, job.id);
        } catch (_) {}
      }, delay)
    );

    // jcode_worker.js ni alohida Node.js prosessida ishga tushirish
    const proc = spawn('node', [
      workerScript,
      job.id,
      job.idea,
      job.mood   || 'energetic',
      job.duration || 's30',
      job.image_paths || '',
      outputFile,
      job.model || 'deepseek/deepseek-flash',
      job.style || 'cyberpunk_neon',
      job.aspect_ratio || '9:16',
      job.music_style || '',
    ], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:/home/gvazar/.local/bin`,
      },
      // Fon rejimda: stdout/stderr logga yo'naltiriladi
      detached: false,
    });

    let lastErrLine = '';
    proc.stdout.on('data', (d) => console.log(`[Job ${job.id}]`, d.toString().trim()));
    proc.stderr.on('data', (d) => {
      const text = d.toString().trim();
      console.error(`[Job ${job.id}] ERR:`, text);
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length) lastErrLine = lines[lines.length - 1];
    });

    proc.on('close', (code) => {
      timers.forEach(clearTimeout);

      if (code === 0 && fs.existsSync(outputFile)) {
        resolve(outputFile);
      } else {
        // Worker o'z xatosini stderr'ga "[Worker <id>] ❌ Xatolik: <sabab>" ko'rinishida yozadi —
        // shu sababni (masalan moderatsiya rad javobini) foydalanuvchiga ko'rsatish uchun ajratib olamiz.
        const reasonMatch = lastErrLine.match(/Xatolik:\s*(.+)$/);
        const reason = reasonMatch ? reasonMatch[1] : lastErrLine;
        reject(new Error(reason || `jcode_worker failed with exit code ${code}`));
      }
    });

    proc.on('error', (err) => {
      timers.forEach(clearTimeout);
      reject(new Error(`Worker spawn error: ${err.message}`));
    });

    // Global timeout — sandbox to'liq avtonom pipeline uzoqroq ishlashi mumkin
    // (JCODE_SANDBOX_TIMEOUT_MS) + moderatsiya/zaxira pipeline uchun qo'shimcha vaqt
    const JOB_TIMEOUT_MS = parseInt(process.env.JOB_TIMEOUT_MS || '3900000', 10); // 65 daqiqa
    const globalTimeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Job timeout (${Math.round(JOB_TIMEOUT_MS / 60000)} daqiqa)`));
    }, JOB_TIMEOUT_MS);

    proc.on('close', () => clearTimeout(globalTimeout));
  });
};

/**
 * Queue ni ishga tushirish — polling (har 5 soniyada)
 */
const startQueue = () => {
  console.log(`[Queue] Started | Max workers: ${MAX_WORKERS}`);
  processNextJob();
  setInterval(processNextJob, 5000);
};

module.exports = { startQueue, processNextJob };
