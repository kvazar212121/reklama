import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminPage.css';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, loginWithGoogle, logout } = useAuth();

  const isAuthenticated = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('plans'); // 'overview', 'plans', 'freeTier', 'lemonsqueezy', 'access', 'users', 'jobs'
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [jobsList, setJobsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Sinov ruxsati (Allowed Emails)
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailNote, setNewEmailNote] = useState('');

  // Yangi/tahrirlanadigan plan uchun forma holati
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    id: '',
    name: '',
    description: '',
    price_usd: '',
    credits: '',
    lemonsqueezy_variant_id: '',
    badge: '',
    is_active: 1,
  });

  const getHeaders = () => ({
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, plansRes, settingsRes, usersRes, jobsRes, accessRes] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include' }),
        fetch('/api/admin/plans', { credentials: 'include' }),
        fetch('/api/admin/settings', { credentials: 'include' }),
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/jobs', { credentials: 'include' }),
        fetch('/api/admin/access', { credentials: 'include' }),
      ]);

      if (statsRes.ok) setStats((await statsRes.json()).stats);
      if (plansRes.ok) setPlans((await plansRes.json()).plans);
      if (settingsRes.ok) setSettings((await settingsRes.json()).settings);
      if (usersRes.ok) setUsersList((await usersRes.json()).users);
      if (jobsRes.ok) setJobsList((await jobsRes.json()).jobs);
      if (accessRes.ok) {
        const data = await accessRes.json();
        setAccessRestricted(data.restricted);
        setAllowedEmails(data.emails);
      }
    } catch (err) {
      console.error('Data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sinov ruxsatini yoqish/o'chirish
  const handleToggleAccess = async (restricted) => {
    try {
      const res = await fetch('/api/admin/access/toggle', {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ restricted }),
      });
      if (res.ok) setAccessRestricted(restricted);
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Ro'yxatga email qo'shish
  const handleAddAllowedEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      const res = await fetch('/api/admin/access/emails', {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ email: newEmail.trim(), note: newEmailNote.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewEmail('');
        setNewEmailNote('');
        loadAllData();
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Ro'yxatdan email o'chirish
  const handleRemoveAllowedEmail = async (email) => {
    if (!window.confirm(`${email} ni ro'yxatdan o'chirmoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/admin/access/emails/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) loadAllData();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Plan saqlash
  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      const method = editingPlan ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(planForm),
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('Tarif muvaffaqiyatli saqlandi!');
        setEditingPlan(null);
        setPlanForm({ id: '', name: '', description: '', price_usd: '', credits: '', lemonsqueezy_variant_id: '', badge: '', is_active: 1 });
        loadAllData();
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Plan o'chirish
  const handleDeletePlan = async (id) => {
    if (!window.confirm(`Haqiqatan ham ushbu tarifni o'chirmoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
      });
      if (res.ok) loadAllData();
    } catch (err) {
      alert('O\'chirishda xatolik: ' + err.message);
    }
  };

  // Sozlamalarni saqlash
  const handleSaveSettings = async (updates) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({ ...prev, ...updates }));
        setSaveStatus('Sozlamalar yangilandi!');
        setTimeout(() => setSaveStatus(''), 3000);
        loadAllData();
      }
    } catch (err) {
      alert('Saqlashda xatolik: ' + err.message);
    }
  };

  // Userga kredit berish
  const handleAddCredits = async (userId, amount) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ amount, action: 'add' }),
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      alert('Kredit qo\'shishda xatolik: ' + err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="admin-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Yuklanmoqda...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '36px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <h2 style={{ marginBottom: '8px' }}>Admin Panelga Kirish</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            {user
              ? 'Ushbu hisobda administrator huquqi yo\'q.'
              : 'Boshqaruv paneliga faqat administrator sifatida belgilangan Google hisob orqali kirish mumkin.'}
          </p>

          {!user && (
            <button onClick={loginWithGoogle} className="btn-primary" style={{ width: '100%' }}>
              Google orqali kirish
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            style={{ marginTop: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}
          >
            ← Bosh sahifaga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>⚙️ AdForge AI Admin Panel</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Tariflar, tekin versiya va to'lov tizimlarini boshqarish markazi
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-action" onClick={() => navigate('/')}>
            🌐 Saytga qaytish
          </button>
          <button
            className="btn-action"
            style={{ color: '#ef4444' }}
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Chiqish
          </button>
        </div>
      </div>

      {saveStatus && (
        <div style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '12px 20px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600' }}>
          ✓ {saveStatus}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Foydalanuvchilar</span>
            <span className="stat-val">{stats.totalUsers}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Yaratilgan Videolar</span>
            <span className="stat-val">{stats.totalJobs}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Jami Tushum ($)</span>
            <span className="stat-val" style={{ color: '#22c55e' }}>${stats.totalIncome}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Tekin Versiya</span>
            <span className="stat-val" style={{ fontSize: '1.4rem', color: stats.freeTierEnabled ? '#22c55e' : '#ef4444' }}>
              {stats.freeTierEnabled ? `Yoqilgan (${stats.freeCreditsPerUser} ta bepul)` : 'O\'chirilgan'}
            </span>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => setActiveTab('plans')}>
          💳 Tariflar & Narxlar (Nechta video necha pul)
        </button>
        <button className={`admin-tab ${activeTab === 'freeTier' ? 'active' : ''}`} onClick={() => setActiveTab('freeTier')}>
          🎁 Tekin Versiya Sozlamalari
        </button>
        <button className={`admin-tab ${activeTab === 'deepseek' ? 'active' : ''}`} onClick={() => setActiveTab('deepseek')}>
          🤖 DeepSeek AI Sozlamalari
        </button>
        <button className={`admin-tab ${activeTab === 'lemonsqueezy' ? 'active' : ''}`} onClick={() => setActiveTab('lemonsqueezy')}>
          🍋 Lemon Squeezy To'lov (Visa/Mastercard)
        </button>
        <button className={`admin-tab ${activeTab === 'access' ? 'active' : ''}`} onClick={() => setActiveTab('access')}>
          🔑 Sinov Ruxsati (Testerlar)
        </button>
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          👥 Foydalanuvchilar & Balanslar
        </button>
        <button className={`admin-tab ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>
          🎬 Videolar Monitoringi
        </button>
      </div>

      {/* TAB 1: TARIFLAR (PLANS) */}
      {activeTab === 'plans' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.4rem' }}>Tariflar (Nechta videoni necha pulga yasab beramiz)</h2>
            <button
              className="btn-primary"
              onClick={() => {
                setEditingPlan(null);
                setPlanForm({ id: '', name: '', description: '', price_usd: '', credits: '', lemonsqueezy_variant_id: '', badge: '', is_active: 1 });
              }}
            >
              + Yangi Tarif Qo'shish
            </button>
          </div>

          {/* Plan Form Modal/Card */}
          <div className="card" style={{ marginBottom: '28px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>{editingPlan ? 'Tarifni Tahrirlash' : 'Yangi Tarif Qo\'shish'}</h3>
            <form onSubmit={handleSavePlan} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Tarif ID (unikal kod)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="starter / pro / custom"
                  value={planForm.id}
                  disabled={!!editingPlan}
                  onChange={(e) => setPlanForm({ ...planForm, id: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Tarif Nomi</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masalan: Boshlang'ich"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Videolar soni (Kredit)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="5"
                  value={planForm.credits}
                  onChange={(e) => setPlanForm({ ...planForm, credits: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Narxi (USD $)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="9.99"
                  value={planForm.price_usd}
                  onChange={(e) => setPlanForm({ ...planForm, price_usd: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Lemon Squeezy Variant ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masalan: 123456"
                  value={planForm.lemonsqueezy_variant_id}
                  onChange={(e) => setPlanForm({ ...planForm, lemonsqueezy_variant_id: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Belgi (Badge)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ommabop / Tavsiya etilgan"
                  value={planForm.badge}
                  onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Qisqacha Tavsif</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Kichik biznes uchun qulay start"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn-primary">
                  💾 {editingPlan ? 'O\'zgarishlarni Saqlash' : 'Tarifni Qo\'shish'}
                </button>
                {editingPlan && (
                  <button type="button" className="btn-action" onClick={() => setEditingPlan(null)}>
                    Bekor qilish
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Plans Table */}
          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nomi</th>
                  <th>Videolar Soni</th>
                  <th>Narxi</th>
                  <th>Bitta video narxi</th>
                  <th>Lemon Squeezy Variant</th>
                  <th>Holati</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      {p.badge && <span className="badge-tag badge-info" style={{ marginLeft: '8px' }}>{p.badge}</span>}
                    </td>
                    <td>
                      <span className="badge-tag badge-success">{p.credits} ta video</span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '16px' }}>${p.price_usd}</strong>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      ${(p.price_usd / (p.credits || 1)).toFixed(2)} / video
                    </td>
                    <td>
                      <code>{p.lemonsqueezy_variant_id || 'Ulanmagan (Test rejimi)'}</code>
                    </td>
                    <td>
                      <span className={`badge-tag ${p.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {p.is_active ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-action"
                          onClick={() => {
                            setEditingPlan(p);
                            setPlanForm(p);
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                        >
                          ✏️ Tahrirlash
                        </button>
                        <button className="btn-action" style={{ color: '#ef4444' }} onClick={() => handleDeletePlan(p.id)}>
                          🗑️ O'chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TEKIN VERSIYA (FREE TIER) */}
      {activeTab === 'freeTier' && (
        <div className="card" style={{ padding: '32px', maxWidth: '700px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>🎁 Tekin Versiya Boshqaruvi</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            Yangi foydalanuvchilar xizmatni sinab ko'rishlari uchun bepul video berishni yoqishingiz yoki o'chirishingiz mumkin.
          </p>

          <div className="settings-form">
            <div className="toggle-row">
              <div>
                <strong>Tekin versiyani yoqish (Free Trial)</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
                  Yoqilgan bo'lsa yangi ro'yxatdan o'tgan foydalanuvchilarga bepul videolar beriladi.
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.free_tier_enabled === '1'}
                  onChange={(e) => handleSaveSettings({ free_tier_enabled: e.target.checked ? '1' : '0' })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="form-row">
              <label>Har bir yangi foydalanuvchiga beriladigan bepul videolar soni:</label>
              <input
                type="number"
                min="0"
                max="50"
                className="form-input"
                style={{ maxWidth: '200px' }}
                value={settings.free_credits_per_user || '2'}
                onChange={(e) => handleSaveSettings({ free_credits_per_user: e.target.value })}
              />
              <small>Hozirda har bir yangi kirgan foydalanuvchi {settings.free_credits_per_user || 2} ta videoni bepul yaratishi mumkin.</small>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '16px' }}>
              <strong>💡 Testlash bo'yicha maslahat:</strong>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                O'zingiz bepul sinab ko'rishingiz uchun 'Foydalanuvchilar' bo'limiga o'tib, profilingizga xohlagancha bepul kreditlar qo'shishingiz yoki admin sifatida cheksiz videolardan foydalanishingiz mumkin.
              </p>
            </div>
          </div>
        </div>
      )}

      
      {/* TAB: DEEPSEEK AI SOZLAMALARI */}
      {activeTab === 'deepseek' && (
        <div className="card" style={{ padding: '32px', maxWidth: '750px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '28px' }}>🤖</span>
            <h2 style={{ fontSize: '1.4rem' }}>DeepSeek AI Dvigateli Sozlamalari</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            Reklama videolari animatsiyasini avtomatik yaratish uchun DeepSeek API kalitini boshqaring.
          </p>

          <div className="settings-form">
            <div className="form-row">
              <label>DeepSeek API Key:</label>
              <input
                type="password"
                className="form-input"
                placeholder="sk-..."
                value={settings.deepseek_api_key || ''}
                onChange={(e) => setSettings({ ...settings, deepseek_api_key: e.target.value })}
              />
              <small>https://platform.deepseek.com orqali olingan API kaliti</small>
            </div>

            <div className="form-row">
              <label>Asosiy DeepSeek Modeli:</label>
              <select
                className="form-input"
                value={settings.deepseek_model || 'deepseek/deepseek-chat'}
                onChange={(e) => setSettings({ ...settings, deepseek_model: e.target.value })}
              >
                <option value="deepseek/deepseek-chat">DeepSeek-V3 Chat (deepseek/deepseek-chat) — Tavsiya etilgan</option>
                <option value="deepseek/deepseek-reasoner">DeepSeek-R1 Reasoner (deepseek/deepseek-reasoner) — Mantiqiy</option>
                <option value="deepseek/deepseek-flash">DeepSeek-Flash (deepseek/deepseek-flash) — Tezkor</option>
              </select>
            </div>

            <div className="form-row">
              <label>DeepSeek API Base URL:</label>
              <input
                type="text"
                className="form-input"
                value={settings.deepseek_base_url || 'https://api.deepseek.com'}
                onChange={(e) => setSettings({ ...settings, deepseek_base_url: e.target.value })}
              />
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => handleSaveSettings({
                deepseek_api_key: settings.deepseek_api_key || '',
                deepseek_model: settings.deepseek_model || 'deepseek/deepseek-chat',
                deepseek_base_url: settings.deepseek_base_url || 'https://api.deepseek.com',
              })}
            >
              💾 DeepSeek Sozlamalarini Saqlash
            </button>
          </div>
        </div>
      )}
  
      {/* TAB 3: LEMON SQUEEZY TO'LOV */}
      {activeTab === 'lemonsqueezy' && (
        <div className="card" style={{ padding: '32px', maxWidth: '750px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '28px' }}>🍋</span>
            <h2 style={{ fontSize: '1.4rem' }}>Lemon Squeezy (Visa / Mastercard) Sozlamalari</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            Xalqaro Visa, Mastercard, Apple Pay to'lovlarini qabul qilish uchun Lemon Squeezy dashboardidan kalitlarni kiriting.
          </p>

          <div className="settings-form">
            {/* Test Mode Toggle */}
            <div className="toggle-row">
              <div>
                <strong>Test Rejimi (Sandbox Mode)</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
                  Yoqilgan bo'lsa test kartalari orqali to'lov sinovdan o'tkaziladi. Haqiqiy to'lovlar uchun buni o'chiring.
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.lemonsqueezy_test_mode === '1'}
                  onChange={(e) => handleSaveSettings({ lemonsqueezy_test_mode: e.target.checked ? '1' : '0' })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Store ID */}
            <div className="form-row">
              <label>Lemon Squeezy Store ID:</label>
              <input
                type="text"
                className="form-input"
                placeholder="Masalan: 12345"
                value={settings.lemonsqueezy_store_id || ''}
                onChange={(e) => setSettings({ ...settings, lemonsqueezy_store_id: e.target.value })}
              />
              <small>Dashboard &gt; Settings &gt; Stores bo'limidan olinadi.</small>
            </div>

            {/* API Key */}
            <div className="form-row">
              <label>Lemon Squeezy API Key:</label>
              <input
                type="password"
                className="form-input"
                placeholder="eyJhbGciOi..."
                value={settings.lemonsqueezy_api_key || ''}
                onChange={(e) => setSettings({ ...settings, lemonsqueezy_api_key: e.target.value })}
              />
              <small>Dashboard &gt; Settings &gt; API keys bo'limidan yaratiladi.</small>
            </div>

            {/* Webhook Secret */}
            <div className="form-row">
              <label>Lemon Squeezy Webhook Secret (Signing secret):</label>
              <input
                type="password"
                className="form-input"
                placeholder="Maxfiy webhook imzosi"
                value={settings.lemonsqueezy_webhook_secret || ''}
                onChange={(e) => setSettings({ ...settings, lemonsqueezy_webhook_secret: e.target.value })}
              />
            </div>

            {/* Webhook URL display */}
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Lemon Squeezy Webhook URL (buni dashboardga qo'shing):</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  value="https://reklam.hubservis.uz/api/payments/webhook/lemonsqueezy"
                />
                <button
                  type="button"
                  className="btn-action"
                  onClick={() => {
                    navigator.clipboard.writeText('https://reklam.hubservis.uz/api/payments/webhook/lemonsqueezy');
                    alert('Webhook URL nusxalandi!');
                  }}
                >
                  Nusxalash
                </button>
              </div>
              <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)' }}>
                Tadbirlar (Events): <code>order_created</code>, <code>subscription_created</code>
              </small>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => handleSaveSettings({
                lemonsqueezy_store_id: settings.lemonsqueezy_store_id || '',
                lemonsqueezy_api_key: settings.lemonsqueezy_api_key || '',
                lemonsqueezy_webhook_secret: settings.lemonsqueezy_webhook_secret || '',
              })}
            >
              💾 Lemon Squeezy Sozlamalarini Saqlash
            </button>
          </div>
        </div>
      )}

      {/* TAB: SINOV RUXSATI (ALLOWED EMAILS) */}
      {activeTab === 'access' && (
        <div className="card" style={{ padding: '32px', maxWidth: '750px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '28px' }}>🔑</span>
            <h2 style={{ fontSize: '1.4rem' }}>Sinov Bosqichi — Ruxsat Etilgan Foydalanuvchilar</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            Yoqilgan bo'lsa, faqat quyidagi ro'yxatdagi (yoki administrator) Google hisoblari video yarata oladi.
            Boshqa barcha mehmon va ro'yxatdan o'tmagan foydalanuvchilar uchun video yaratish vaqtincha yopiladi.
          </p>

          <div className="settings-form">
            <div className="toggle-row">
              <div>
                <strong>Kirishni cheklash (faqat ro'yxatdagilar)</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
                  {accessRestricted
                    ? 'Hozir YOQILGAN — xizmat ommaga yopiq, faqat ruxsat etilganlar foydalana oladi.'
                    : 'Hozir O\'CHIRILGAN — xizmat hammaga ochiq.'}
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={accessRestricted}
                  onChange={(e) => handleToggleAccess(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <form onSubmit={handleAddAllowedEmail} style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              <input
                type="email"
                className="form-input"
                placeholder="test@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{ flex: '1 1 220px' }}
                required
              />
              <input
                type="text"
                className="form-input"
                placeholder="Izoh (ixtiyoriy, masalan: do'stim Aziz)"
                value={newEmailNote}
                onChange={(e) => setNewEmailNote(e.target.value)}
                style={{ flex: '1 1 220px' }}
              />
              <button type="submit" className="btn-primary">+ Qo'shish</button>
            </form>
          </div>

          <div className="admin-table-card" style={{ marginTop: '24px' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Izoh</th>
                  <th>Qo'shilgan</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {allowedEmails.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      Hozircha ro'yxat bo'sh — faqat administrator kira oladi.
                    </td>
                  </tr>
                ) : (
                  allowedEmails.map((e) => (
                    <tr key={e.email}>
                      <td>{e.email}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{e.note || '—'}</td>
                      <td>{new Date(e.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn-action" style={{ color: '#ef4444' }} onClick={() => handleRemoveAllowedEmail(e.email)}>
                          🗑️ O'chirish
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: USERS & BALANCES */}
      {activeTab === 'users' && (
        <div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>👥 Foydalanuvchilar va Balanslar</h2>
          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Foydalanuvchi</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Qolgan Kreditlar</th>
                  <th>Yaratgan Videolari</th>
                  <th>Testlash / Kredit Boshqaruvi</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge-tag ${u.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '16px', color: u.credits > 0 ? '#22c55e' : '#ef4444' }}>
                        {u.role === 'admin' ? 'Cheksiz (Admin)' : `${u.credits} ta video`}
                      </strong>
                    </td>
                    <td>{u.jobs_count || 0} ta</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-action" onClick={() => handleAddCredits(u.id, 5)}>
                          +5 video
                        </button>
                        <button className="btn-action" onClick={() => handleAddCredits(u.id, 20)}>
                          +20 video
                        </button>
                        <button className="btn-action" style={{ color: '#ef4444' }} onClick={() => handleAddCredits(u.id, -1)}>
                          -1
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: JOBS MONITORING */}
      {activeTab === 'jobs' && (
        <div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>🎬 Videolar Monitoringi</h2>
          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Foydalanuvchi</th>
                  <th>G'oya</th>
                  <th>Kayfiyat / Vaqt</th>
                  <th>Holati</th>
                  <th>Video</th>
                </tr>
              </thead>
              <tbody>
                {jobsList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      Hozircha yaratilgan videolar mavjud emas
                    </td>
                  </tr>
                ) : (
                  jobsList.map((j) => (
                    <tr key={j.id}>
                      <td><code>{j.id.slice(0, 8)}</code></td>
                      <td>{j.user_name || j.user_email || 'Mehmon'}</td>
                      <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {j.idea}
                      </td>
                      <td>{j.mood} / {j.duration}</td>
                      <td>
                        <span className={`badge-tag ${j.status === 'done' ? 'badge-success' : j.status === 'processing' ? 'badge-warning' : 'badge-danger'}`}>
                          {j.status} ({j.progress}%)
                        </span>
                      </td>
                      <td>
                        {j.status === 'done' && (
                          <a href={`/output/${j.id}.mp4`} target="_blank" rel="noreferrer" className="btn-action">
                            ▶ Ko'rish
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
