const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const db = require('../models/db');
const router = express.Router();

// Barcha admin marshrutlar requireAdmin bilan himoyalangan
router.use(requireAdmin);

// ── Statistika ─────────────────────────────────────────────────────────────
// GET /api/admin/stats
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT count(*) as c FROM users').get().c;
    const totalJobs = db.prepare('SELECT count(*) as c FROM jobs').get().c;
    const completedJobs = db.prepare("SELECT count(*) as c FROM jobs WHERE status = 'done'").get().c;
    const failedJobs = db.prepare("SELECT count(*) as c FROM jobs WHERE status = 'failed'").get().c;
    const totalIncome = db.prepare("SELECT COALESCE(SUM(amount_usd), 0) as s FROM transactions WHERE status = 'paid'").get().s;

    const freeTierEnabled = db.getSetting('free_tier_enabled', '1') === '1';
    const freeCreditsPerUser = parseInt(db.getSetting('free_credits_per_user', '2'), 10);
    const testMode = db.getSetting('lemonsqueezy_test_mode', '1') === '1';

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalJobs,
        completedJobs,
        failedJobs,
        totalIncome: Number(totalIncome).toFixed(2),
        freeTierEnabled,
        freeCreditsPerUser,
        testMode,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Tariflar (Plans) boshqaruvi ───────────────────────────────────────────
// GET /api/admin/plans
router.get('/plans', (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM plans ORDER BY sort_order ASC, created_at ASC').all();
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/plans (Yangi tarif qo'shish)
router.post('/plans', (req, res) => {
  try {
    const { id, name, description, price_usd, credits, lemonsqueezy_variant_id, badge, sort_order, is_active } = req.body;
    if (!id || !name || price_usd === undefined || credits === undefined) {
      return res.status(400).json({ success: false, error: 'id, name, price_usd va credits to\'ldirilishi shart' });
    }

    db.prepare(`
      INSERT INTO plans (id, name, description, price_usd, credits, lemonsqueezy_variant_id, badge, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id.trim().toLowerCase().replace(/\s+/g, '_'),
      name.trim(),
      description || '',
      parseFloat(price_usd),
      parseInt(credits, 10),
      lemonsqueezy_variant_id || '',
      badge || '',
      parseInt(sort_order || 0, 10),
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    );

    res.status(201).json({ success: true, message: 'Tarif muvaffaqiyatli yaratildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/plans/:id (Tarifni tahrirlash)
router.put('/plans/:id', (req, res) => {
  try {
    const { name, description, price_usd, credits, lemonsqueezy_variant_id, badge, sort_order, is_active } = req.body;
    
    db.prepare(`
      UPDATE plans SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price_usd = COALESCE(?, price_usd),
        credits = COALESCE(?, credits),
        lemonsqueezy_variant_id = COALESCE(?, lemonsqueezy_variant_id),
        badge = COALESCE(?, badge),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      description,
      price_usd !== undefined ? parseFloat(price_usd) : null,
      credits !== undefined ? parseInt(credits, 10) : null,
      lemonsqueezy_variant_id,
      badge,
      sort_order !== undefined ? parseInt(sort_order, 10) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      req.params.id
    );

    res.json({ success: true, message: 'Tarif muvaffaqiyatli yangilandi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/plans/:id (Tarifni o'chirish)
router.delete('/plans/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM plans WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Tarif o\'chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Sinov ruxsati (Allowed Emails) ─────────────────────────────────────────
// GET /api/admin/access — cheklov holati va ruxsat etilgan emaillar ro'yxati
router.get('/access', (req, res) => {
  try {
    const restricted = db.getSetting('access_restricted', '0') === '1';
    const emails = db.prepare('SELECT email, note, added_by, created_at FROM allowed_emails ORDER BY created_at DESC').all();
    res.json({ success: true, restricted, emails });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/access/toggle — cheklovni yoqish/o'chirish
router.post('/access/toggle', (req, res) => {
  try {
    const { restricted } = req.body;
    db.setSetting('access_restricted', restricted ? '1' : '0');
    res.json({ success: true, restricted: !!restricted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/access/emails — ro'yxatga email qo'shish
router.post('/access/emails', (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const note = req.body.note || '';
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'To\'g\'ri email kiriting' });
    }
    db.prepare(`
      INSERT INTO allowed_emails (email, note, added_by)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET note = excluded.note
    `).run(email, note, req.user?.email || 'admin');
    res.json({ success: true, message: 'Email ro\'yxatga qo\'shildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/access/emails/:email — ro'yxatdan o'chirish
router.delete('/access/emails/:email', (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).trim().toLowerCase();
    db.prepare('DELETE FROM allowed_emails WHERE email = ?').run(email);
    res.json({ success: true, message: 'Email ro\'yxatdan o\'chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Tizim sozlamalari (Settings) ───────────────────────────────────────────
// GET /api/admin/settings
router.get('/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsMap = {};
    settings.forEach((s) => { settingsMap[s.key] = s.value; });
    res.json({ success: true, settings: settingsMap, raw: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/settings (Sozlamalarni saqlash)
router.post('/settings', (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      db.setSetting(key, value);
    }
    res.json({ success: true, message: 'Sozlamalar saqlandi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Foydalanuvchilar (Users) ──────────────────────────────────────────────
// GET /api/admin/users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.email, u.name, u.avatar, u.role, u.credits, u.free_credits_claimed, u.created_at,
             (SELECT count(*) FROM jobs j WHERE j.user_id = u.id) as jobs_count
      FROM users u
      ORDER BY u.created_at DESC LIMIT 100
    `).all();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users/:id/credits (Kredit qo'shish/ayirish)
router.post('/users/:id/credits', (req, res) => {
  try {
    const { amount, action = 'add' } = req.body; // action: 'add', 'set'
    const delta = parseInt(amount, 10);
    if (isNaN(delta)) {
      return res.status(400).json({ success: false, error: 'Noto\'g\'ri miqdor' });
    }

    if (action === 'set') {
      db.prepare('UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(Math.max(0, delta), req.params.id);
    } else {
      db.prepare('UPDATE users SET credits = MAX(0, credits + ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(delta, req.params.id);
    }

    const updated = db.prepare('SELECT id, credits FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: 'Kredit yangilandi', user: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Videolar monitoringi (Jobs) ───────────────────────────────────────────
// GET /api/admin/jobs
router.get('/jobs', (req, res) => {
  try {
    const jobs = db.prepare(`
      SELECT j.*, u.name as user_name, u.email as user_email
      FROM jobs j
      LEFT JOIN users u ON j.user_id = u.id
      ORDER BY j.created_at DESC LIMIT 100
    `).all();
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── To'lovlar tarixi (Transactions) ───────────────────────────────────────
// GET /api/admin/transactions
router.get('/transactions', (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT t.*, u.name as user_name, u.email as user_email
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC LIMIT 100
    `).all();
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
