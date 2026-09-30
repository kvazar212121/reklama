const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');

const clientID = process.env.GOOGLE_CLIENT_ID || 'missing_google_client_id';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'missing_google_client_secret';
const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'https://reklam.hubservis.uz/auth/google/callback';

// .env dagi ADMIN_EMAILS (vergul bilan ajratilgan) — shu emaillar Google orqali
// kirganda avtomatik ravishda 'admin' roliga ega bo'ladi.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

passport.use(new GoogleStrategy({
  clientID,
  clientSecret,
  callbackURL,
  proxy: true,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id;
    const email    = profile.emails?.[0]?.value || '';
    const name     = profile.displayName || profile.name?.givenName || 'Foydalanuvchi';
    const avatar   = profile.photos?.[0]?.value || '';

    // Find or create user
    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);

    const isDesignatedAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    if (!user) {
      // Tekin versiya yoqilgan bo'lsa yangi foydalanuvchiga bepul kreditlar berish
      const freeTierEnabled = db.getSetting('free_tier_enabled', '1') === '1';
      const initialCredits = freeTierEnabled ? parseInt(db.getSetting('free_credits_per_user', '2'), 10) : 0;
      const freeClaimed = freeTierEnabled ? 1 : 0;

      // ADMIN_EMAILS ro'yxatidagi email bo'lsa yoki birinchi (real) foydalanuvchi bo'lsa, admin qilinadi
      const userCount = db.prepare('SELECT count(*) as c FROM users WHERE id != ?').get('guest_user').c;
      const role = (isDesignatedAdmin || userCount === 0) ? 'admin' : 'user';
      const id = uuidv4();

      db.prepare(`
        INSERT INTO users (id, google_id, email, name, avatar, role, credits, free_credits_claimed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, googleId, email, name, avatar, role, initialCredits, freeClaimed);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else {
      // Update user info — ADMIN_EMAILS ro'yxatidagi bo'lsa, har kirishda admin roli qayta tasdiqlanadi
      db.prepare(`
        UPDATE users SET name = ?, avatar = ?, role = CASE WHEN ? THEN 'admin' ELSE role END, updated_at = CURRENT_TIMESTAMP
        WHERE google_id = ?
      `).run(name, avatar, isDesignatedAdmin ? 1 : 0, googleId);
      user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
