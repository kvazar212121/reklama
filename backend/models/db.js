const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.resolve(__dirname, '../data/adforge.db');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

// Concurrency sozlamalari
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ===== ASOSIY SCHEMA =====
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                   TEXT PRIMARY KEY,
    google_id            TEXT UNIQUE NOT NULL,
    email                TEXT UNIQUE NOT NULL,
    name                 TEXT NOT NULL,
    avatar               TEXT,
    role                 TEXT DEFAULT 'user',
    credits              INTEGER DEFAULT 0,
    free_credits_claimed INTEGER DEFAULT 0,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    idea        TEXT NOT NULL,
    mood        TEXT NOT NULL DEFAULT 'energetic',
    duration    TEXT NOT NULL DEFAULT 's30',
    image_path  TEXT,
    output_path TEXT,
    error       TEXT,
    progress    INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS plans (
    id                     TEXT PRIMARY KEY,
    name                   TEXT NOT NULL,
    description            TEXT,
    price_usd              REAL NOT NULL,
    credits                INTEGER NOT NULL,
    lemonsqueezy_variant_id TEXT DEFAULT '',
    is_active              INTEGER DEFAULT 1,
    badge                  TEXT DEFAULT '',
    sort_order             INTEGER DEFAULT 0,
    created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL,
    plan_id           TEXT,
    amount_usd        REAL NOT NULL,
    credits_added     INTEGER NOT NULL,
    payment_provider  TEXT DEFAULT 'lemonsqueezy',
    provider_order_id TEXT,
    status            TEXT DEFAULT 'pending',
    test_mode         INTEGER DEFAULT 1,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_trans_user_id ON transactions(user_id);

  -- Sinov bosqichida xizmatdan foydalanishga ruxsat berilgan emaillar ro'yxati
  CREATE TABLE IF NOT EXISTS allowed_emails (
    email      TEXT PRIMARY KEY,
    note       TEXT,
    added_by   TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Bepul 1 ta video krediti olingan IP va qurilmalar ro'yxati (takroriy suiste'mol qilishdan himoya)
  CREATE TABLE IF NOT EXISTS free_tier_claims (
    id                 TEXT PRIMARY KEY,
    user_id            TEXT NOT NULL,
    ip_address         TEXT NOT NULL,
    device_fingerprint TEXT,
    user_agent         TEXT,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_claims_ip ON free_tier_claims(ip_address);
  CREATE INDEX IF NOT EXISTS idx_claims_fp ON free_tier_claims(device_fingerprint);
`);

// Mavjud users jadvaliga yangi ustunlar qo'shish (agar mavjud bo'lmasa)
const addColumnIfNotExists = (table, colDef) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
  } catch (err) {
    // Agar ustun mavjud bo'lsa xatoni e'tiborsiz qoldiramiz
  }
};

addColumnIfNotExists('users', "role TEXT DEFAULT 'user'");
addColumnIfNotExists('users', 'credits INTEGER DEFAULT 0');
addColumnIfNotExists('users', 'free_credits_claimed INTEGER DEFAULT 0');
addColumnIfNotExists('jobs', "model TEXT DEFAULT 'deepseek/deepseek-chat'");
addColumnIfNotExists('jobs', "style TEXT DEFAULT 'cyberpunk_neon'");
addColumnIfNotExists('jobs', 'image_paths TEXT'); // JSON massiv — bir nechta rasm/logo yo'llari
addColumnIfNotExists('jobs', "aspect_ratio TEXT DEFAULT '9:16'");
addColumnIfNotExists('jobs', 'music_style TEXT'); // Mijoz aniq tanlagan musiqa uslubi (10 xil); bo'sh bo'lsa dizayn stiliga avtomatik mos uslub ishlatiladi

// ── Talking-Head Overlay (gapli video ustiga animatsiya) uchun ustunlar ──
addColumnIfNotExists('jobs', "job_type TEXT DEFAULT 'generate'"); // 'generate' | 'overlay'
addColumnIfNotExists('jobs', 'source_video_path TEXT');           // overlay: mijoz yuklagan gapli video
addColumnIfNotExists('jobs', "overlay_intensity TEXT DEFAULT 'medium'"); // light | medium | heavy
addColumnIfNotExists('jobs', 'add_music INTEGER DEFAULT 1');      // overlay: fon musiqa qo'shilsinmi

// Boshlang'ich tizim sozlamalari (Settings)
const defaultSettings = [
  { key: 'deepseek_api_key', value: '', description: 'DeepSeek API kaliti (bo\'sh bo\'lsa .env dagi DEEPSEEK_API_KEY ishlatiladi)' },
  { key: 'deepseek_model', value: 'deepseek/deepseek-chat', description: 'Standart DeepSeek AI modeli (deepseek-chat, deepseek-coder, deepseek-reasoner)' },
  { key: 'deepseek_base_url', value: 'https://api.deepseek.com', description: 'DeepSeek API bazaviy URL' },
  { key: 'free_tier_enabled', value: '1', description: 'Tekin versiya (bepul sinov) yoqilgan/o\'chirilgan (1 yoki 0)' },
  { key: 'free_credits_per_user', value: '1', description: 'Har bir yangi foydalanuvchiga beriladigan bepul videolar soni (1 ta 30s video)' },
  { key: 'lemonsqueezy_api_key', value: '', description: 'Lemon Squeezy API kaliti' },
  { key: 'lemonsqueezy_store_id', value: '', description: 'Lemon Squeezy Store ID' },
  { key: 'lemonsqueezy_webhook_secret', value: '', description: 'Lemon Squeezy Webhook imzo kaliti' },
  { key: 'lemonsqueezy_test_mode', value: '1', description: 'Lemon Squeezy Test rejimi (1=test/sandbox, 0=haqiqiy/live)' },
  { key: 'access_restricted', value: '1', description: 'Sinov bosqichi: yoqilgan bo\'lsa faqat allowed_emails ro\'yxatidagi (yoki admin) foydalanuvchilar video yarata oladi' },
  { key: 'video_ttl_hours', value: '360', description: 'Video va yuklangan rasmlarni serverda necha soat saqlash (standart: 360 soat = 15 kun)' },
];

const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value, description)
  VALUES (?, ?, ?)
`);

for (const s of defaultSettings) {
  insertSetting.run(s.key, s.value, s.description);
}

// Boshlang'ich tariflar (Plans)
const defaultPlans = [
  {
    id: 'starter',
    name: 'Boshlang\'ich (Starter)',
    description: 'Kichik biznes va shaxsiy loyihalar uchun qulay start',
    price_usd: 9.99,
    credits: 5,
    lemonsqueezy_variant_id: '',
    is_active: 1,
    badge: 'Ommabop',
    sort_order: 1,
  },
  {
    id: 'pro',
    name: 'Professional (Pro)',
    description: 'Faol reklama beruvchilar va do\'konlar uchun',
    price_usd: 29.99,
    credits: 20,
    lemonsqueezy_variant_id: '',
    is_active: 1,
    badge: 'Eng tavsiya etilgan',
    sort_order: 2,
  },
  {
    id: 'agency',
    name: 'Biznes & Agentlik (Agency)',
    description: 'Marketing agentliklari va katta hajmli brendlar uchun',
    price_usd: 69.99,
    credits: 60,
    lemonsqueezy_variant_id: '',
    is_active: 1,
    badge: 'Katta tejov',
    sort_order: 3,
  },
];

const insertPlan = db.prepare(`
  INSERT OR IGNORE INTO plans (id, name, description, price_usd, credits, lemonsqueezy_variant_id, is_active, badge, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const p of defaultPlans) {
  insertPlan.run(p.id, p.name, p.description, p.price_usd, p.credits, p.lemonsqueezy_variant_id, p.is_active, p.badge, p.sort_order);
}

// Mehmon foydalanuvchini kiritish / yangilash
db.prepare(`
  INSERT OR IGNORE INTO users (id, google_id, email, name, avatar, role, credits, free_credits_claimed)
  VALUES ('guest_user', 'guest_000', 'guest@reklam.hubservis.uz', 'Mehmon Foydalanuvchi', '', 'user', 2, 1)
`).run();

// Yordamchi metodlar
db.getSetting = (key, defaultValue = '') => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
};

db.setSetting = (key, value) => {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, String(value));
};

module.exports = db;
