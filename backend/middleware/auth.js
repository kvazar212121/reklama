/**
 * Auth & Admin middleware
 */
const db = require('../models/db');

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    requireLogin: true, requireLogin: true, requireLogin: true, requireLogin: true, requireLogin: true, error: 'Kirish talab etiladi. Iltimos, Google orqali kiring.',
  });
};

const optionalAuth = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    req.user = db.prepare("SELECT * FROM users WHERE id = 'guest_user'").get() || {
      id: 'guest_user',
      email: 'guest@reklam.hubservis.uz',
      name: 'Mehmon Foydalanuvchi',
      role: 'user',
      credits: 2,
    };
  }
  next();
};

// Faqat Google orqali kirgan, roli 'admin' bo'lgan haqiqiy hisoblarga ruxsat
// beradi (eski umumiy maxfiy-kod orqali kirish endi olib tashlandi).
const requireAdmin = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Ushbu amalni faqat administrator bajara oladi.',
  });
};

// Sinov bosqichi uchun: agar 'access_restricted' sozlamasi yoqilgan bo'lsa,
// faqat admin yoki 'allowed_emails' ro'yxatidagi Google hisoblari xizmatdan
// (video yaratishdan) foydalana oladi. Mehmon (guest) va ro'yxatdan
// o'tmagan hisoblar rad etiladi.
const checkAccess = (req, res, next) => {
  const restricted = db.getSetting('access_restricted', '0') === '1';
  if (!restricted) return next();

  if (req.user && req.user.role === 'admin') return next();

  const email = req.user?.email?.toLowerCase();
  const isGuest = !req.isAuthenticated || !req.isAuthenticated();

  if (!isGuest && email) {
    const allowed = db.prepare('SELECT 1 FROM allowed_emails WHERE email = ?').get(email);
    if (allowed) return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Hozircha xizmat faqat ruxsat etilgan sinov foydalanuvchilari uchun ochiq. Iltimos, administrator bilan bog\'laning.',
  });
};

module.exports = { requireAuth, optionalAuth, requireAdmin, checkAccess };
