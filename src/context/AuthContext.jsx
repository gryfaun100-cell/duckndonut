// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const GUEST_KEY = 'duckrace_guest';
const TOKEN_KEY = 'duckrace_token';

function makeGuestName() {
  return 'Guest' + Math.floor(100000 + Math.random() * 900000);
}

/** Safely parse JSON from a Response — never throws */
async function safeJson(res) {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch (_) {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [guest,   setGuest]   = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore token → verify; restore guest from sessionStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const guestName   = sessionStorage.getItem(GUEST_KEY);

    if (storedToken) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${storedToken}` } })
        .then(async r => {
          if (!r.ok) throw new Error('auth failed');
          const d = await safeJson(r);
          if (d.user) { setUser(d.user); setToken(storedToken); }
          else throw new Error('no user');
        })
        .catch(() => { localStorage.removeItem(TOKEN_KEY); })
        .finally(() => setLoading(false));
    } else {
      if (guestName) setGuest({ name: guestName });
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    let res;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
    } catch (_) {
      throw new Error('Cannot connect to server. Is it running?');
    }
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.removeItem(GUEST_KEY);
    setToken(data.token);
    setUser(data.user);
    setGuest(null);
    return data.user;
  }, []);

  const register = useCallback(async (username, password) => {
    let res;
    try {
      res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
    } catch (_) {
      throw new Error('Cannot connect to server. Is it running?');
    }
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.removeItem(GUEST_KEY);
    setToken(data.token);
    setUser(data.user);
    setGuest(null);
    return data.user;
  }, []);

  const loginAsGuest = useCallback(() => {
    const name = makeGuestName();
    sessionStorage.setItem(GUEST_KEY, name);
    setGuest({ name });
    setUser(null);
    setToken(null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(GUEST_KEY);
    setUser(null);
    setToken(null);
    setGuest(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await safeJson(res); if (d.user) setUser(d.user); }
    } catch (_) {}
  }, [token]);

  const isGuest     = !user && !!guest;
  const isLoggedIn  = !!user;
  const displayName = user?.username || guest?.name || null;
  const isAdmin     = ['admin', 'superadmin'].includes(user?.role);

  return (
    <AuthContext.Provider value={{
      user, token, guest, loading,
      isGuest, isLoggedIn, displayName, isAdmin,
      login, register, loginAsGuest, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
