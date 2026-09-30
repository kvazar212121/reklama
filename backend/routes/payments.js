const express = require('express');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const db = require('../models/db');
const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://reklam.hubservis.uz';

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
router.post('/checkout', optionalAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND is_active = 1').get(planId);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Bunday tarif topilmadi' });
    }

    const userId = req.user ? req.user.id : 'guest_user';
    const userEmail = req.user ? req.user.email : '';
    const userName = req.user ? req.user.name : '';

    const apiKey = db.getSetting('lemonsqueezy_api_key', '');
    const storeId = db.getSetting('lemonsqueezy_store_id', '');
    const isTestMode = db.getSetting('lemonsqueezy_test_mode', '1') === '1';

    // Agar Lemon Squeezy API kalitlari to'ldirilgan va variant ID mavjud bo'lsa
    if (apiKey && storeId && plan.lemonsqueezy_variant_id) {
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
              store: {
                data: {
                  type: 'stores',
                  id: String(storeId),
                },
              },
              variant: {
                data: {
                  type: 'variants',
                  id: String(plan.lemonsqueezy_variant_id),
                },
              },
            },
          },
        }),
      });

      const data = await response.json();
      if (data?.data?.attributes?.url) {
        return res.json({
          success: true,
          checkoutUrl: data.data.attributes.url,
          mode: isTestMode ? 'test' : 'live',
        });
      } else {
        console.error('Lemon Squeezy Checkout Error:', data);
        // Fallback: agar API xatolik bersa test simulyatsiyasi
      }
    }

    // TEST / DEMO REJIMI (Agar Lemon Squeezy kalitlari hali kiritilmagan bo'lsa yoki test rejimida bo'lsa)
    const transactionId = uuidv4();
    db.prepare(`
      INSERT INTO transactions (id, user_id, plan_id, amount_usd, credits_added, payment_provider, status, test_mode)
      VALUES (?, ?, ?, ?, ?, 'lemonsqueezy_test', 'pending', 1)
    `).run(transactionId, userId, plan.id, plan.price_usd, plan.credits);

    // Test rejimida to'g'ridan-to'g'ri to'lovni tasdiqlash uchun link yoki test sahifa
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
router.post('/test-confirm', optionalAuth, (req, res) => {
  try {
    const { transactionId } = req.body;
    const trans = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);

    if (!trans) {
      return res.status(404).json({ success: false, error: 'To\'lov topilmadi' });
    }

    if (trans.status === 'paid') {
      return res.json({ success: true, message: 'Bu to\'lov allaqachon amalga oshirilgan' });
    }

    // Foydalanuvchiga kredit qo'shish
    db.prepare('UPDATE users SET credits = credits + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(trans.credits_added, trans.user_id);

    // Tranzaksiyani 'paid' ga o'tkazish
    db.prepare("UPDATE transactions SET status = 'paid' WHERE id = ?").run(transactionId);

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

    // Webhook xavfsizligini tekshirish (agar secret sozlangan bo'lsa)
    if (secret && hmacHeader) {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
      const signature = Buffer.from(hmacHeader, 'utf8');

      if (digest.length !== signature.length || !crypto.timingSafeEqual(digest, signature)) {
        console.error('Lemon Squeezy Webhook: Noto\'g\'ri imzo');
        return res.status(401).send('Invalid signature');
      }
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

      if (userId && credits > 0) {
        // Kredit qo'shish
        db.prepare('UPDATE users SET credits = credits + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(credits, userId);

        // Tranzaksiyani qayd qilish
        db.prepare(`
          INSERT INTO transactions (id, user_id, plan_id, amount_usd, credits_added, payment_provider, provider_order_id, status, test_mode)
          VALUES (?, ?, ?, ?, ?, 'lemonsqueezy', ?, 'paid', ?)
        `).run(uuidv4(), userId, planId || 'custom', totalAmount, credits, orderId, order.test_mode ? 1 : 0);

        console.log(`[Lemon Squeezy] User ${userId} ga ${credits} ta kredit berildi!`);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
