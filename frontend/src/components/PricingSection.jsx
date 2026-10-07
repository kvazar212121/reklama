import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Gift, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './PricingSection.css';

export default function PricingSection() {
  const { t } = useTranslation();
  const { user, refreshUser, loginWithGoogle } = useAuth();
  const [plans, setPlans] = useState([]);
  const [freeTier, setFreeTier] = useState({ enabled: true, credits: 2 });
  const [loading, setLoading] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState(null);

  useEffect(() => {
    fetch('/api/payments/plans')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPlans(data.plans);
          if (data.freeTier) setFreeTier(data.freeTier);
        }
      })
      .catch((err) => console.error('Plans yuklashda xatolik:', err));
  }, []);

  const handleCheckout = async (plan) => {
    if (!user) {
      if (confirm("To'lov qilish va videolarni hisobingizga biriktirish uchun avval Google orqali kiring.\n\nHozir kirasizmi?")) {
        loginWithGoogle ? loginWithGoogle() : (window.location.href = '/auth/google');
      }
      return;
    }

    setLoading(true);
    setCheckoutStatus(null);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.checkoutUrl) {
          // Lemon Squeezy to'lov sahifasiga yo'naltirish (Visa / Mastercard)
          window.location.href = data.checkoutUrl;
        } else if (data.testCheckout) {
          // Test rejimi: simulyatsiya oynasi
          setCheckoutStatus({
            plan,
            transactionId: data.transactionId,
            message: data.message,
          });
        }
      } else if (data.requireLogin) {
        if (confirm(`${data.error || 'To\'lov qilish uchun tizimga kiring'}\n\nHozir kirasizmi?`)) {
          loginWithGoogle ? loginWithGoogle() : (window.location.href = '/auth/google');
        }
      } else {
        alert(data.error || 'To\'lov tizimida xatolik');
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTestPayment = async () => {
    if (!checkoutStatus?.transactionId) return;
    try {
      const res = await fetch('/api/payments/test-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transactionId: checkoutStatus.transactionId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setCheckoutStatus(null);
        refreshUser?.();
      } else {
        alert(data.error || 'Xatolik');
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  return (
    <section className="pricing-section section" id="pricing">
      <div className="container">
        <div className="pricing-header">
          <div className="badge" style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={14} strokeWidth={2.4} color="#f2c84b" />
            <span>Qulay va Shaffof Narxlar</span>
          </div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '12px' }}>
            Nechta video kerak bo'lsa, shuni tanlang
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Hech qanday oylik majburiyat yo'q. Faqat o'zingizga kerakli miqdordagi videolarni sotib oling va xohlagan vaqtingizda ishlating.
          </p>
          {freeTier.enabled && (
            <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '8px 18px', borderRadius: '9999px', fontSize: '13px', fontWeight: '600' }}>
              <Gift size={16} strokeWidth={2.2} />
              <span>Yangi foydalanuvchilar uchun 1 ta video (30 soniyali animatsiya) mutlaqo bepul!</span>
            </div>
          )}
        </div>

        <div className="pricing-grid">
          {plans.map((p, idx) => {
            const isFeatured = p.badge?.includes('tavsiya') || idx === 1;
            const pricePerVideo = (p.price_usd / (p.credits || 1)).toFixed(2);
            return (
              <div key={p.id} className={`pricing-card ${isFeatured ? 'featured' : ''}`}>
                {p.badge && <span className="pricing-badge">{p.badge}</span>}
                <h3 className="pricing-title">{p.name}</h3>
                <p className="pricing-desc">{p.description}</p>

                <div className="pricing-price-box">
                  <span className="pricing-currency">$</span>
                  <span className="pricing-price">{p.price_usd}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>bir martalik</span>
                </div>

                <ul className="pricing-features">
                  <li className="pricing-feature">
                    <span className="pricing-feature-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} strokeWidth={2.8} />
                    </span>
                    <strong>{p.credits} ta professional AI video</strong>
                  </li>
                  <li className="pricing-feature">
                    <span className="pricing-feature-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} strokeWidth={2.8} />
                    </span>
                    <span>1080p Full HD sifat va 60fps</span>
                  </li>
                  <li className="pricing-feature">
                    <span className="pricing-feature-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} strokeWidth={2.8} />
                    </span>
                    <span>Bitta video narxi: <strong>${pricePerVideo}</strong></span>
                  </li>
                  <li className="pricing-feature">
                    <span className="pricing-feature-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} strokeWidth={2.8} />
                    </span>
                    <span>Musiqa va animatsiyalar to'liq kiritilgan</span>
                  </li>
                  <li className="pricing-feature">
                    <span className="pricing-feature-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} strokeWidth={2.8} />
                    </span>
                    <span>Muddatsiz saqlanadi</span>
                  </li>
                </ul>

                <button
                  className="btn-primary"
                  style={{ width: '100%', marginTop: 'auto' }}
                  disabled={loading}
                  onClick={() => handleCheckout(p)}
                >
                  {loading ? 'Kutilmoqda...' : 'Tanlash va To\'lash'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Payment Methods */}
        <div className="payment-methods-icons">
          <span>Qabul qilinadigan to'lov turlari:</span>
          <span className="payment-card-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <CreditCard size={13} strokeWidth={2.4} />
            <span>Visa</span>
          </span>
          <span className="payment-card-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <CreditCard size={13} strokeWidth={2.4} />
            <span>Mastercard</span>
          </span>
          <span className="payment-card-badge">Apple Pay</span>
          <span className="payment-card-badge">Lemon Squeezy</span>
        </div>

        {/* Test Payment Modal */}
        {checkoutStatus && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}>
            <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '32px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <CreditCard size={44} strokeWidth={2} color="#f2c84b" />
              </div>
              <h3>To'lovni Sinovdan O'tkazish</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '8px 0 20px' }}>
                Hozirda tizim <strong>Lemon Squeezy Test (Sandbox)</strong> rejimida ishlamoqda.
              </p>

              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tarif:</span>
                  <strong>{checkoutStatus.plan.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Videolar soni:</span>
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>+{checkoutStatus.plan.credits} ta video</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>To'lov summasi:</span>
                  <strong style={{ fontSize: '18px' }}>${checkoutStatus.plan.price_usd}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn-primary" onClick={handleConfirmTestPayment} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Check size={16} strokeWidth={2.8} />
                  <span>Visa / Mastercard To'lovini Tasdiqlash (Test)</span>
                </button>
                <button className="btn-action" onClick={() => setCheckoutStatus(null)}>
                  Bekor qilish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
