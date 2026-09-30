const express = require('express');
const passport = require('../config/passport');
const db = require('../models/db');
const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://reklam.hubservis.uz';

// ── Google OAuth boshlash ──────────────────────────────────────────────────
// GET /auth/google
router.get('/google', (req, res, next) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes('your_google_client_id') || clientId === 'missing_google_client_id') {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Google OAuth Sozlanmagan</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 500px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          h2 { color: #f59e0b; margin-top: 0; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; }
          code { background: #0f172a; color: #38bdf8; padding: 3px 8px; border-radius: 6px; font-size: 14px; }
          .btn { display: inline-block; margin-top: 20px; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>⚠️ Google OAuth Kalitlari Kiritilmagan</h2>
          <p>Tizim Google orqali kirishga to'liq tayyorlangan. Faqat Google Cloud Consoledan olingan Client ID va Secret kalitlari serverdagi <code>backend/.env</code> fayliga kiritilishi kerak.</p>
          <a href="/" class="btn">Bosh sahifaga qaytish</a>
        </div>
      </body>
      </html>
    `);
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

// ── Google callback ────────────────────────────────────────────────────────
// GET /auth/google/callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND_URL}/?error=auth_failed`,
  }),
  (req, res) => {
    res.redirect(`${FRONTEND_URL}/?login=success`);
  }
);

// ── Joriy foydalanuvchi ma'lumotlari ──────────────────────────────────────
// GET /auth/me
router.get('/me', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.json({ authenticated: false, user: null });
  }
  // Refresh user data from DB
  const user = db.prepare('SELECT id, email, name, avatar, role, credits, free_credits_claimed, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.json({ authenticated: false, user: null });
  }
  res.json({
    authenticated: true,
    user,
  });
});

// ── Chiqish ───────────────────────────────────────────────────────────────
const handleLogout = (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    req.session.destroy(() => {
      res.clearCookie('adforge_session');
      if (req.method === 'GET') {
        res.redirect(`${FRONTEND_URL}/?logout=success`);
      } else {
        res.json({ success: true, message: 'Chiqish muvaffaqiyatli' });
      }
    });
  });
};

router.post('/logout', handleLogout);
router.get('/logout', handleLogout);

module.exports = router;
