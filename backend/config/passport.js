const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');

const clientID = process.env.GOOGLE_CLIENT_ID || 'missing_google_client_id';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'missing_google_client_secret';
const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'https://reklam.hubservis.uz/auth/google/callback';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

passport.use(new GoogleStrategy({
  clientID,
  clientSecret,
  callbackURL,
  proxy: true,
  passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id;
    const email    = profile.emails?.[0]?.value || '';
    const name     = profile.displayName || profile.name?.givenName || 'Foydalanuvchi';
    const avatar   = profile.photos?.[0]?.value || '';

    // Find or create user
    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);

    const isDesignatedAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    if (!user) {
      // IP manzil va qurilma ma'lumotlarini aniqlash
      const rawIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || req.ip || '';
      const clientIp = rawIp.split(',')[0].trim().replace(/^.*:/, '');
      const userAgent = req.headers['user-agent'] || '';
      const deviceFp = req.cookies?.adforge_fp || req.headers['x-device-fingerprint'] || '';

      const freeTierEnabled = db.getSetting('free_tier_enabled', '1') === '1';

      // ── IP & QURILMA HIMOYASI: Bir shaxsga faqat 1 ta bepul video ──
      let alreadyClaimed = false;
      if (clientIp && clientIp !== '127.0.0.1' && clientIp !== 'localhost') {
        const ipClaim = db.prepare('SELECT id FROM free_tier_claims WHERE ip_address = ?').get(clientIp);
        if (ipClaim) alreadyClaimed = true;
      }
      if (!alreadyClaimed && deviceFp) {
        const fpClaim = db.prepare('SELECT id FROM free_tier_claims WHERE device_fingerprint = ?').get(deviceFp);
        if (fpClaim) alreadyClaimed = true;
      }

      // Agar oldin ushbu IP/qurilmadan olinmagan bo'lsa: 1 ta bepul kredit
      const initialCredits = (freeTierEnabled && !alreadyClaimed) ? 1 : 0;
      const freeClaimed = 1;

      const userCount = db.prepare('SELECT count(*) as c FROM users WHERE id != ?').get('guest_user').c;
      const role = (isDesignatedAdmin || userCount === 0) ? 'admin' : 'user';
      const id = uuidv4();

      db.prepare(`
        INSERT INTO users (id, google_id, email, name, avatar, role, credits, free_credits_claimed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, googleId, email, name, avatar, role, initialCredits, freeClaimed);

      // Agar bepul kredit berilgan bo'lsa, qayd qilib qo'yish
      if (initialCredits > 0) {
        db.prepare(`
          INSERT INTO free_tier_claims (id, user_id, ip_address, device_fingerprint, user_agent)
          VALUES (?, ?, ?, ?, ?)
        `).run(uuidv4(), id, clientIp, deviceFp, userAgent);
        req.session.welcomeBonus = true;
      }

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else {
      // Update user info
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
