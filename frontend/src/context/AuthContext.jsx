import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Lemon Squeezy to'lovidan qaytganda ko'rsatiladigan xabar
  const [paymentNotice, setPaymentNotice] = useState(null);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/auth/me', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Auth tekshirishda xatolik:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // URL parametrlarini tekshirish (masalan: ?login=success)
    const params = new URLSearchParams(window.location.search);
    let shouldCleanUrl = false;

    if (params.get('login') === 'success') {
      shouldCleanUrl = true;
    }

    // Lemon Squeezy to'lovidan qaytish: /?payment=success&plan=pro
    // Kredit webhook orqali beriladi, shuning uchun bir necha marta qayta tekshiramiz
    if (params.get('payment') === 'success') {
      setPaymentNotice({ status: 'success', plan: params.get('plan') || '' });
      shouldCleanUrl = true;
      setTimeout(() => fetchCurrentUser(), 3000);
      setTimeout(() => fetchCurrentUser(), 8000);
    }

    if (shouldCleanUrl) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchCurrentUser();
  }, []);

  const loginWithGoogle = () => {
    window.location.href = '/auth/google';
  };

  const logout = async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const clearPaymentNotice = () => setPaymentNotice(null);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      loginWithGoogle,
      logout,
      refreshUser: fetchCurrentUser,
      paymentNotice,
      clearPaymentNotice,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
