// src/pages/AuthPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Cloud({ top, bottom, left, right, opacity = 0.65, delay = '0s' }) {
  const pos = {};
  if (top    !== undefined) pos.top    = top;
  if (bottom !== undefined) pos.bottom = bottom;
  if (left   !== undefined) pos.left   = left;
  if (right  !== undefined) pos.right  = right;
  return (
    <div style={{ position: 'absolute', pointerEvents: 'none', opacity, animation: `float-slow 11s ease-in-out ${delay} infinite`, ...pos }}>
      <div style={{ position: 'relative', width: 120, height: 48 }}>
        <div style={{ position: 'absolute', background: '#fff', borderRadius: '50%', width: 85, height: 36, top: 12, left: 10 }} />
        <div style={{ position: 'absolute', background: '#fff', borderRadius: '50%', width: 56, height: 46, top: 0, left: 22 }} />
        <div style={{ position: 'absolute', background: '#fff', borderRadius: '50%', width: 66, height: 28, top: 18, left: 46 }} />
      </div>
    </div>
  );
}

export default function AuthPage() {
  const { login, register, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const [tab,      setTab]      = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) { setError('All fields required'); return; }
    if (tab === 'register' && password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      if (tab === 'login') await login(username.trim(), password);
      else                 await register(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  function handleGuest() { loginAsGuest(); navigate('/'); }

  /* shared input style */
  const inputStyle = (hasError) => ({
    width: '100%', boxSizing: 'border-box',
    padding: '14px 18px',
    borderRadius: 14,
    border: `2px solid ${hasError ? '#ef4444' : '#e2e8f0'}`,
    fontFamily: 'Nunito, sans-serif', fontSize: 15, color: '#1e293b',
    background: '#f8fafc', outline: 'none',
    transition: 'border-color .18s',
  });

  return (
    <div style={{
      position: 'relative', minHeight: '100dvh',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      background: 'linear-gradient(160deg,#87CEEB 0%,#4fc3f7 45%,#0288d1 100%)',
      overflowX: 'hidden',
      padding: '40px 20px 40px',
    }}>
      <Cloud top="5%"    left="3%"   opacity={0.65} delay="0s" />
      <Cloud top="10%"   right="4%"  opacity={0.50} delay="2s" />
      <Cloud bottom="15%" left="2%"  opacity={0.40} delay="1.5s" />

      <div style={{ width: '100%', maxWidth: 440, animation: 'slide-up .45s ease-out' }}>

        {/* ── Logo area ── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 68, animation: 'bob 2s ease-in-out infinite', display: 'block', marginBottom: 10 }}>🦆</div>
          <h1 style={{
            fontFamily: 'Fredoka One, cursive', fontSize: 48,
            color: '#fff', textShadow: '0 4px 18px rgba(0,0,0,0.22)',
            letterSpacing: 2, lineHeight: 1.1, marginBottom: 8,
          }}>
            Math Duck Race
          </h1>
          <p style={{ fontFamily: 'Nunito, sans-serif', color: 'rgba(255,255,255,0.82)', fontSize: 16 }}>
            Solve math. Race ducks. Win glory. 🏁
          </p>
        </div>

        {/* ── Card ── */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 28,
          boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
          padding: '36px 40px',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', borderRadius: 14, overflow: 'hidden',
            border: '2px solid #e2e8f0', marginBottom: 28,
          }}>
            {['login', 'register'].map(t => (
              <button key={t}
                onClick={() => { setTab(t); setError(''); }}
                style={{
                  flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15,
                  background: tab === t
                    ? 'linear-gradient(135deg,#0288d1,#01579b)'
                    : 'transparent',
                  color: tab === t ? '#fff' : '#888',
                  transition: 'all .18s',
                }}>
                {t === 'login' ? '🔑 Login' : '✨ Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>
                Username
              </label>
              <input
                id="auth-username"
                type="text" value={username} maxLength={20}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="Your username…"
                style={inputStyle(!!error)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>
                Password
              </label>
              <input
                id="auth-password"
                type="password" value={password} maxLength={40}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                style={inputStyle(!!error)}
              />
            </div>

            {tab === 'register' && (
              <div>
                <label style={{ display: 'block', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>
                  Confirm Password
                </label>
                <input
                  id="auth-confirm"
                  type="password" value={confirm} maxLength={40}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  style={inputStyle(!!error)}
                />
              </div>
            )}

            {error && (
              <div style={{ textAlign: 'center', color: '#e53935', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14 }}>
                {error}
              </div>
            )}

            <button
              id="auth-submit"
              type="submit"
              disabled={loading}
              style={{
                padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16,
                background: 'linear-gradient(135deg,#0288d1,#01579b)',
                color: '#fff',
                boxShadow: '0 6px 18px rgba(2,136,209,.4)',
                opacity: loading ? .7 : 1,
                marginTop: 4,
              }}
            >
              {loading ? '⏳ Please wait…' : tab === 'login' ? '→ Login' : '✨ Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 12, color: '#aaa', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          {/* Guest button */}
          <button
            id="guest-btn"
            onClick={handleGuest}
            style={{
              width: '100%', padding: '15px', borderRadius: 16,
              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16,
              background: '#fff', color: '#555',
              border: '2px dashed #cbd5e1', cursor: 'pointer',
              transition: 'all .18s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}
          >
            <span>🐣 Play as Guest</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#aaa' }}>
              Auto-assigned name · No save · Vanishes on close
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
