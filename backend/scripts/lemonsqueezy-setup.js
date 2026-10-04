#!/usr/bin/env node
/**
 * Lemon Squeezy -> AdForge (reklam.hubservis.uz) avtomatik sozlash skripti.
 *
 * Nima qiladi:
 *   1. API kalit bilan store(lar)ni aniqlaydi
 *   2. Mavjud product/variantlarni o'qiydi (narx/nom bo'yicha tariflarga bog'laydi)
 *   3. Webhook yaratadi yoki yangilaydi (imzo secret bilan)
 *   4. Hamma narsani DB `settings` va `plans` jadvallariga yozadi
 *
 * Ishlatish:
 *   node scripts/lemonsqueezy-setup.js --api-key=ls_xxx [--store-id=123] [--mode=test|live]
 *   node scripts/lemonsqueezy-setup.js --api-key=ls_xxx --dry-run
 *   node scripts/lemonsqueezy-setup.js --api-key=ls_xxx --map starter=111,pro=222,agency=333
 *   node scripts/lemonsqueezy-setup.js --list            # mavjud product/variantlar ro'yxati
 *
 * Eslatma: Lemon Squeezy API'si product/variant YARATISHNI qo'llamaydi.
 * Ularni https://app.lemonsqueezy.com dashboardida qo'lda yaratish kerak.
 */
const path = require('path');
const crypto = require('crypto');

process.chdir(path.resolve(__dirname, '..'));
const db = require('../models/db');

const API = 'https://api.lemonsqueezy.com/v1';
const WEBHOOK_URL = 'https://reklam.hubservis.uz/api/payments/webhook/lemonsqueezy';

function arg(name, def) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : def;
}
const flag = (name) => process.argv.includes(`--${name}`);

const DRY = flag('dry-run');
const LIST = flag('list');

async function ls(endpoint, method = 'GET', body) {
  const apiKey = arg('api-key') || process.env.LS_API_KEY || db.getSetting('lemonsqueezy_api_key', '');
  if (!apiKey) throw new Error("API kalit yo'q. --api-key=ls_xxx bering yoki DB sozlamasiga yozing.");
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    const detail = json?.errors?.map((e) => `${e.title}: ${e.detail}`).join('; ') || text;
    throw new Error(`LS API ${res.status} ${endpoint} -> ${detail}`);
  }
  return json;
}

function priceLabel(v) {
  const cents = v.attributes.price;
  return `$${(cents / 100).toFixed(2)}`;
}

async function main() {
  const storesRes = await ls('/stores');
  const stores = storesRes.data || [];
  if (!stores.length) throw new Error("Hech qanday store topilmadi. Lemon Squeezy dashboardida store yaratilganini tekshiring.");
  const wantStore = arg('store-id');
  const store = wantStore
    ? stores.find((s) => String(s.id) === String(wantStore))
    : stores[0];
  if (!store) throw new Error(`Store ID ${wantStore} topilmadi. Mavjudlar: ${stores.map((s) => s.id).join(', ')}`);

  const storeId = String(store.id);
  console.log(`\n🏬 Store: #${storeId} ${store.attributes.name}  (${store.attributes.domain || 'no-domain'})  mode=${store.attributes.test_mode ? 'TEST' : 'LIVE'}`);

  const [productsRes, variantsRes] = await Promise.all([
    ls(`/products?filter[store_id]=${storeId}&page[size]=100`),
    ls(`/variants?filter[store_id]=${storeId}&page[size]=100`),
  ]);
  const products = productsRes.data || [];
  const variants = variantsRes.data || [];
  const productById = Object.fromEntries(products.map((p) => [String(p.id), p]));

  console.log(`\n📦 Productlar: ${products.length}, variantlar: ${variants.length}`);
  for (const v of variants) {
    const pid = String(v.attributes.product_id);
    const pname = productById[pid]?.attributes?.name || `product#${pid}`;
    console.log(`   variant #${v.id}  ${priceLabel(v).padStart(8)}  |  ${pname}  ->  ${v.attributes.name}  (${v.attributes.status})`);
  }

  if (LIST) { console.log('\n(--list rejimi: hech narsa o\'zgartirilmadi)\n'); return; }

  // ── Tariflarni variantlarga bog'lash ─────────────────────────────────────
  const plans = db.prepare('SELECT * FROM plans ORDER BY sort_order').all();
  const mapArg = arg('map');
  const manual = {};
  if (mapArg) for (const pair of mapArg.split(',')) { const [k, v] = pair.split('='); manual[k.trim()] = v.trim(); }

  const norm = (s) => (s || '').toLowerCase();
  const aliases = {
    starter: ['starter', 'boshlang', 'start', 'basic'],
    pro: ['pro', 'professional', 'profess'],
    agency: ['agency', 'agentlik', 'biznes', 'business'],
  };

  const assignments = {};
  for (const plan of plans) {
    if (manual[plan.id]) { assignments[plan.id] = String(manual[plan.id]); continue; }
    const cents = Math.round(plan.price_usd * 100);
    let match = variants.find((v) => v.attributes.price === cents && v.attributes.status !== 'draft');
    if (!match) {
      const keys = aliases[plan.id] || [plan.id];
      match = variants.find((v) => {
        const pname = norm(productById[String(v.attributes.product_id)]?.attributes?.name);
        const vname = norm(v.attributes.name);
        return keys.some((k) => pname.includes(k) || vname.includes(k));
      });
    }
    if (match) assignments[plan.id] = String(match.id);
  }

  console.log('\n🔗 Tarif -> Variant bog\'lanishi:');
  for (const plan of plans) {
    const vid = assignments[plan.id];
    const v = variants.find((x) => String(x.id) === vid);
    console.log(`   ${plan.id.padEnd(8)} ($${plan.price_usd}) -> ${vid ? `variant #${vid} (${v ? priceLabel(v) : '?'})` : '❌ TOPILMADI'}`);
  }

  const missing = plans.filter((p) => !assignments[p.id]).map((p) => p.id);
  if (missing.length) {
    console.log(`\n⚠️  Quyidagi tariflar uchun variant topilmadi: ${missing.join(', ')}`);
    console.log('    Dashboardda product/variant yaratib, keyin qayta ishga tushiring yoki --map orqali qo\'lda bering.');
  }

  // ── Webhook ──────────────────────────────────────────────────────────────
  const secret = arg('webhook-secret') || crypto.randomBytes(32).toString('hex');
  const storeMode = store.attributes.test_mode ? '1' : '0';
  const mode = arg('mode') || storeMode;

  const hooksRes = await ls(`/webhooks?filter[store_id]=${storeId}&page[size]=100`);
  const hooks = hooksRes.data || [];
  let hook = hooks.find((h) => h.attributes.url === WEBHOOK_URL);
  let webhookAction;

  if (DRY) {
    webhookAction = hook ? `yangilanadi (#${hook.id})` : 'yangi yaratiladi';
  } else if (hook) {
    await ls(`/webhooks/${hook.id}`, 'PATCH', {
      data: { type: 'webhooks', id: String(hook.id), attributes: { url: WEBHOOK_URL, events: ['order_created'], secret } },
    });
    webhookAction = `yangilandi (#${hook.id})`;
  } else {
    const created = await ls('/webhooks', 'POST', {
      data: {
        type: 'webhooks',
        attributes: { url: WEBHOOK_URL, events: ['order_created'], secret, test_mode: mode === '1' },
        relationships: { store: { data: { type: 'stores', id: storeId } } },
      },
    });
    hook = created.data;
    webhookAction = `yaratildi (#${hook.id})`;
  }

  console.log(`\n🪝 Webhook: ${webhookAction} -> ${WEBHOOK_URL}`);
  console.log(`   events: order_created | mode: ${mode === '1' ? 'TEST' : 'LIVE'}`);

  // ── Saqlash ──────────────────────────────────────────────────────────────
  if (DRY) { console.log('\n🧪 --dry-run: DB ga hech narsa yozilmadi.\n'); return; }

  db.setSetting('lemonsqueezy_api_key', arg('api-key') || process.env.LS_API_KEY || db.getSetting('lemonsqueezy_api_key', ''));
  db.setSetting('lemonsqueezy_store_id', storeId);
  db.setSetting('lemonsqueezy_webhook_secret', secret);
  db.setSetting('lemonsqueezy_test_mode', mode);

  const upd = db.prepare('UPDATE plans SET lemonsqueezy_variant_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  for (const [planId, vid] of Object.entries(assignments)) upd.run(vid, planId);

  console.log('\n✅ Saqlandi:');
  console.log(`   store_id=${storeId}  mode=${mode}  webhook_secret=<${secret.length} belgi>`);
  for (const plan of plans) console.log(`   plans.${plan.id}.lemonsqueezy_variant_id = ${assignments[plan.id] || ''}`);
  console.log('\n🎉 Tayyor! Endi https://reklam.hubservis.uz da "Tanlash va To\'lash" ni sinab ko\'ring.\n');
}

main().catch((err) => { console.error('\n❌ Xatolik:', err.message, '\n'); process.exit(1); });
