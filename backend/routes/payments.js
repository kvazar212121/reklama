const express = require('express');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const db = require('../models/db');
const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://reklam.hubservis.uz';

// Test (sandbox) rejimi yoqilganmi? Yoqilgan bo'lsa to'lovni simulyatsiya qilish mumkin.
const isTestMode = () => db.getSetting('lemonsqueezy_test_mode', '1') === '1';

// ── Faol tariflarni olish (Hamma uchun ochiq) ──────────────────────────────
// GET /api/payments/plans
router.get('/plans', (req, res) => {
  try {
    const plans = db.prepare(`
      SELECT id, name, description, price_usd, credits, badge, sort_order
      FROM plans
      WHERE is_active = 1
      ORDER BY sort_order ASC, price_usd ASC
    `).all();

    const freeTierEnabled = db.getSetting('free_tier_enabled', '1') === '1';
    const freeCredits = parseInt(db.getSetting('free_credits_per_user', '2'), 10);

    res.json({
      success: true,
      plans,
      freeTier: {
        enabled: freeTierEnabled,
        credits: freeCredits,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Lemon Squeezy Checkout yaratish ───────────────────────────────────────
// POST /api/payments/checkout
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND is_active = 1').get(planId);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Bunday tarif topilmadi' });
    }

    const testMode = isTestMode();
    const apiKey = db.getSetting('lemonsqueezy_api_key', '');
    const storeId = db.getSetting('lemonsqueezy_store_id', '');
    const configured = Boolean(apiKey && storeId && plan.lemonsqueezy_variant_id);

    // Agar haqiqiy to'lov qilinayotgan bo'lsa (yoki foydalanuvchi tizimga kirmagan bo'lsa),
    // kredit to'g'ri foydalanuvchiga biriktirilishi uchun autentifikatsiya talab qilinadi
    if (!req.user && (!testMode || configured)) {
      return res.status(401).json({
        success: false,
        requireLogin: true,
        error: 'To\'lov qilish va kreditlarni hisobingizga olish uchun avval tizimga kiring.',
      });
    }

    const userId = req.user ? req.user.id : 'guest_user';
    const userEmail = req.user ? req.user.email : '';
    const userName = req.user ? req.user.name : '';

    // ── Live (haqiqiy) rejim ────────────────────────────────────────────────
    // Test rejimi o'chirilgan bo'lsa, simulyatsiya YO'Q. Faqat haqiqiy checkout.
    if (!testMode) {
      if (!configured) {
        return res.status(503).json({
          success: false,
          error: 'To\'lov tizimi hali to\'liq sozlanmagan. Iltimos, keyinroq urinib ko\'ring.',
        });
      }
      const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          data: {
            type: 'checkouts',
            attributes: {
              checkout_data: {
                email: userEmail,
                name: userName,
                custom: {
                  user_id: userId,
                  plan_id: plan.id,
                  credits: String(plan.credits),
                },
              },
              product_options: {
                redirect_url: `${FRONTEND_URL}/?payment=success&plan=${plan.id}`,
              },
            },
            relationships: {
              store: { data: { type: 'stores', id: String(storeId) } },
              variant: { data: { type: 'variants', id: String(plan.lemonsqueezy_variant_id) } },
            },
          },
        }),
      });

      const data = await response.json();
      if (data?.data?.attributes?.url) {
        return res.json({ success: true, checkoutUrl: data.data.attributes.url, mode: 'live' });
      }

      console.error('Lemon Squeezy Checkout Error (live):', JSON.stringify(data));
      return res.status(502).json({
        success: false,
        error: 'To\'lov sahifasini yaratishda xatolik yuz berdi. Keyinroq urinib ko\'ring.',
      });
    }

    // ── Test (sandbox) rejimi ───────────────────────────────────────────────
    // Avval haqiqiy Lemon Squeezy test checkout'ini sinab ko'ramiz (kalitlar bo'lsa).
    if (configured) {
      const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          data: {
            type: 'checkouts',
            attributes: {
              checkout_data: {
                email: userEmail,
                name: userName,
                custom: {
                  user_id: userId,
                  plan_id: plan.id,
                  credits: String(plan.credits),
                },
              },
              product_options: {
                redirect_url: `${FRONTEND_URL}/?payment=success&plan=${plan.id}`,
              },
            },
            relationships: {
              store: { data: { type: 'stores', id: String(storeId) } },
              variant: { data: { type: 'variants', id: String(plan.lemonsqueezy_variant_id) } },
            },
          },
        }),
      });

      const data = await response.json();
      if (data?.data?.attributes?.url) {
        return res.json({ success: true, checkoutUrl: data.data.attributes.url, mode: 'test' });
      }
      console.error('Lemon Squeezy Checkout Error (test):', JSON.stringify(data));
    }

    // Simulyatsiya: faqat test rejimida (kalitlar hali kiritilmagan yoki API xato bergan)
    const transactionId = uuidv4();
    db.prepare(`
      INSERT INTO transactions (id, user_id, plan_id, amount_usd, credits_added, payment_provider, status, test_mode)
      VALUES (?, ?, ?, ?, ?, 'lemonsqueezy_test', 'pending', 1)
    `).run(transactionId, userId, plan.id, plan.price_usd, plan.credits);

    return res.json({
      success: true,
      testCheckout: true,
      transactionId,
      plan,
      mode: 'test',
      message: 'Lemon Squeezy test rejimi faol',
    });

  } catch (err) {
    console.error('Checkout xatosi:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Test rejimida to'lovni tasdiqlash (Simulyatsiya / Admin test) ─────────
// POST /api/payments/test-confirm
// XAVFSIZLIK: faqat test rejimida ishlaydi. Live rejimda butunlay o'chirilgan,
// aks holda har kim bepul kredit olib ketishi mumkin edi.
router.post('/test-confirm', optionalAuth, (req, res) => {
  try {
    if (!isTestMode()) {
      return res.status(403).json({
        success: false,
        error: 'Test rejimi o\'chirilgan. Bu amal faqat sandbox (test) rejimida mumkin.',
      });
    }

    const { transactionId } = req.body;
    const trans = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);

    if (!trans) {
      return res.status(404).json({ success: false, error: 'To\'lov topilmadi' });
    }

    // Faqat simulyatsiya tranzaksiyalarini tasdiqlash mumkin
    if (trans.payment_provider !== 'lemonsqueezy_test') {
      return res.status(400).json({ success: false, error: 'Bu tranzaksiyani qo\'lda tasdiqlash mumkin emas' });
    }

    // Faqat tranzaksiya egasi (yoki mehmon uchun guest_user) tasdiqlay oladi
    const requesterId = req.user ? req.user.id : 'guest_user';
    if (trans.user_id !== requesterId && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Ruxsat yo\'q' });
    }

    if (trans.status === 'paid') {
      return res.json({ success: true, message: 'Bu to\'lov allaqachon amalga oshirilgan' });
    }

    const applyPayment = db.transaction(() => {
      db.prepare('UPDATE users SET credits = credits + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(trans.credits_added, trans.user_id);
      db.prepare("UPDATE transactions SET status = 'paid' WHERE id = ?").run(transactionId);
    });
    applyPayment();

    const updatedUser = db.prepare('SELECT id, credits FROM users WHERE id = ?').get(trans.user_id);

    res.json({
      success: true,
      message: `Muvaffaqiyatli to'landi! ${trans.credits_added} ta video krediti qo'shildi.`,
      credits: updatedUser ? updatedUser.credits : 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Lemon Squeezy Webhook ──────────────────────────────────────────────────
// POST /api/payments/webhook/lemonsqueezy
router.post('/webhook/lemonsqueezy', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const secret = db.getSetting('lemonsqueezy_webhook_secret', '');
    const hmacHeader = req.headers['x-signature'];

    // Imzo kaliti sozlanmagan bo'lsa, imzosiz kredit berishdan ko'ra rad etgan xavfsizroq
    if (!secret) {
      console.error('Lemon Squeezy Webhook: webhook secret sozlanmagan');
      return res.status(500).send('Webhook secret not configured');
    }
    if (!hmacHeader) {
      console.error('Lemon Squeezy Webhook: imzo yo\'q');
      return res.status(401).send('Missing signature');
    }

    // Webhook xavfsizligini tekshirish
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
    const signature = Buffer.from(hmacHeader, 'utf8');

    if (digest.length !== signature.length || !crypto.timingSafeEqual(digest, signature)) {
      console.error('Lemon Squeezy Webhook: Noto\'g\'ri imzo');
      return res.status(401).send('Invalid signature');
    }

    const payload = JSON.parse(req.body.toString('utf8'));
    const eventName = payload?.meta?.event_name;
    const customData = payload?.meta?.custom_data;

    console.log(`[Lemon Squeezy Webhook] Event: ${eventName}`, customData);

    if (eventName === 'order_created') {
      const order = payload.data.attributes;
      const userId = customData?.user_id;
      const planId = customData?.plan_id;
      const credits = parseInt(customData?.credits || '0', 10);
      const totalAmount = parseFloat(order.total_usd || (order.total / 100)) || 0;
      const orderId = String(payload.data.id);

      // IDEMPOTENTLIK: Lemon Squeezy bir xil webhook'ni qayta yuborishi mumkin.
      // Bir buyurtma uchun kredit FAQAT bir marta beriladi.
      const already = db.prepare(
        "SELECT id FROM transactions WHERE provider_order_id = ? AND payment_provider = 'lemonsqueezy'"
      ).get(orderId);
      if (already) {
        console.log(`[Lemon Squeezy] Buyurtma ${orderId} allaqachon qayd etilgan, o'tkazib yuborildi`);
        return res.status(200).json({ received: true, duplicate: true });
      }

      if (userId && credits > 0) {
        const recordPayment = db.transaction(() => {
          db.prepare('UPDATE users SET credits = credits + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(credits, userId);
          db.prepare(`
            INSERT INTO transactions (id, user_id, plan_id, amount_usd, credits_added, payment_provider, provider_order_id, status, test_mode)
            VALUES (?, ?, ?, ?, ?, 'lemonsqueezy', ?, 'paid', ?)
          `).run(uuidv4(), userId, planId || 'custom', totalAmount, credits, orderId, order.test_mode ? 1 : 0);
        });
        recordPayment();

        console.log(`[Lemon Squeezy] User ${userId} ga ${credits} ta kredit berildi!`);
      } else {
        console.error('[Lemon Squeezy] Webhook: user_id yoki credits topilmadi', customData);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Foydalanuvchining to'lovlar tarixi (Shaxsiy kabinet uchun) ────────────
// GET /api/payments/my
router.get('/my', requireAuth, (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT t.id, t.amount_usd, t.credits_added, t.payment_provider, t.status, t.test_mode, t.created_at,
             p.name AS plan_name
      FROM transactions t
      LEFT JOIN plans p ON p.id = t.plan_id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 100
    `).all(req.user.id);

    const totalPaidUsd = transactions
      .filter((t) => t.status === 'paid')
      .reduce((sum, t) => sum + t.amount_usd, 0);

    res.json({ success: true, transactions, totalPaidUsd });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
