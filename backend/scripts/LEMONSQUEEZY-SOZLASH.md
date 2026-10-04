# Lemon Squeezy to'lov tizimini yoqish (AdForge AI)

Sayt: https://reklam.hubservis.uz
Mahsulot: AdForge AI (AI reklama video generatori)

Kod tomoni **allaqachon tayyor**. Faqat Lemon Squeezy hisobidan kalitlarni
ulash qolgan. Bu qo'llanma 2 qismdan iborat: dashboard, keyin server.

---

## QISM 1. Lemon Squeezy dashboardida (https://app.lemonsqueezy.com)

### 1.1. Store
- Hisob yarating / kiring.
- Agar store hali yo'q bo'lsa: Settings -> Stores -> yangi store oching.
- Store nomi va domenini to'ldiring. Bu saytda ko'rinadi.

### 1.2. Uchta mahsulot (product) yarating
Har biri **bir martalik to'lov** (one-time / "Single payment") bo'lsin,
subscription EMAS.

| Product nomi | Narx | Izoh |
|---|---|---|
| AdForge Starter | $9.99 | 5 ta video |
| AdForge Pro | $29.99 | 20 ta video |
| AdForge Agency | $69.99 | 60 ta video |

Dastlab **TEST MODE** yoqilgan holda yarating (dashboard tepasidagi almashtirgich).
Har bir mahsulot ichida kamida bitta **variant** bo'ladi (standart variant yetarli).

MUHIM: Lemon Squeezy API orqali mahsulot YARATIB bo'lmaydi, faqat qo'lda
dashboard orqali. Shu sababli bu qadam majburiy.

### 1.3. API kalit
- Settings -> API -> **Create API key**.
- Kalitni nusxalab oling (bir marta ko'rsatiladi). Test mode uchun alohida,
  Live uchun alohida kalit yaratiladi.

---

## QISM 2. Serverda

```bash
ssh gvazar@92.5.51.110
cd ~/reklama/backend
```

### 2.1. Avval sinab ko'ring (hech narsa o'zgarmaydi)

```bash
node scripts/lemonsqueezy-setup.js --api-key=ls_XXXXXXXX --dry-run
```

Bu: store'ni topadi, product/variantlarni narx bo'yicha tariflarga bog'laydi,
webhook'ni tekshiradi. Faqat ko'rsatadi, DB'ga yozmaydi.

### 2.2. Haqiqiy sozlash

```bash
node scripts/lemonsqueezy-setup.js --api-key=ls_XXXXXXXX
```

Skript quyidagilarni qiladi (hammasi avtomatik):
1. Store ID ni topadi
2. Variant ID larni tariflarga bog'laydi (narx bo'yicha)
3. Webhook yaratadi: `https://reklam.hubservis.uz/api/payments/webhook/lemonsqueezy`
   (event: `order_created`, o'zi imzo-secret generatsiya qiladi)
4. Hammasini DB `settings` va `plans` jadvallariga saqlaydi

Agar variantlarni qo'lda bog'lash kerak bo'lsa:

```bash
node scripts/lemonsqueezy-setup.js --api-key=ls_XXX --map starter=111,pro=222,agency=333
```

### 2.3. Test qilib ko'ring

Saytda "Tanlash va To'lash" tugmasini bosing. Lemon Squeezy test to'lov
sahifasi ochilishi kerak. Test karta:

```
Karta:  4242 4242 4242 4242
Sana:   istalgan kelajak sana (masalan 12/34)
CVC:    istalgan 3 raqam
```

To'lovdan keyin kredit avtomatik qo'shiladi (webhook orqali).

---

## QISM 3. Live (haqiqiy pul) rejimga o'tish

1. Dashboardda **Live mode** ga o'tib, mahsulotlarni (yoki ularning live
   nusxalarini) yarating va **live API key** oling.
2. Serverda:
   ```bash
   node scripts/lemonsqueezy-setup.js --api-key=ls_LIVE_XXX --mode=live
   ```
3. Admin panel -> Lemon Squeezy tab -> **Test rejimi** ni o'chiring
   (yoki `node -e` bilan `lemonsqueezy_test_mode = 0` qo'ying).

Live rejimda tizim xavfsiz: soxta checkout va bepul kredit berilmaydi.

---

## Narx mantiqiy asosi (tekshirilgan)

1 video tannarxi taxminan **$0.10** (DeepSeek ~$0.07 + server). Lemon Squeezy
har sotuvdan 5% + $0.50 oladi. Shuning uchun:

- 1 video narxi **$1.00 dan past bo'lmasin**
- Buyurtma minimal qiymati **$5 dan past bo'lmasin** (aks holda $0.50 komissiya
  narxning katta qismini yeydi)
- 60 soniyalik video uchun **2 kredit** olish tavsiya etiladi (CPU 4 barobar ko'p)

Hozirgi tariflar ($2.00 / $1.50 / $1.17 har video) foydali: marja 85-87%.

---

## Muammolar

**Admin panel sozlamalari:** Admin -> Lemon Squeezy tab. U yerda API key,
Store ID, Webhook Secret, Test mode ni qo'lda ham kiritish mumkin.

**Backend loglar:**
```bash
tail -f ~/reklama/logs/backend.log
```

**Servisni qayta ishga tushirish:**
```bash
sudo systemctl restart adforge-backend
```

**Webhook URL va secret:** dashboardda Settings -> Webhooks. URL:
`https://reklam.hubservis.uz/api/payments/webhook/lemonsqueezy`

**Zaxira fayllar:** `routes/payments.js.bak-*` va `models/db.js.bak-*` (2026-10-02,
xavfsizlik tuzatishlaridan oldingi holat).
