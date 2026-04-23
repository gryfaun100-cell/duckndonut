// src/components/Navbar.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { displayName, isGuest, isLoggedIn, isAdmin, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  if (location.pathname === '/auth') return null;

  const isAt = (p) => location.pathname === p;

  function go(path) { navigate(path); setOpen(false); }
  function handleLogout() { logout(); navigate('/auth'); }

  /* ── single link chip ── */
  function Link({ to, emoji, label }) {
    const active = isAt(to);
    return (
      <button
        onClick={() => go(to)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 12,
          fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 15,
          background: active ? 'rgba(255,255,255,0.22)' : 'transparent',
          color: active ? '#FFD600' : 'rgba(255,255,255,0.88)',
          border: active ? '1.5px solid rgba(255,255,255,0.28)' : '1.5px solid transparent',
          cursor: 'pointer', transition: 'all .18s',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 17 }}>{emoji}</span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <nav className="navbar sticky top-0 z-50 w-full">
      {/* ── main row ── */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>

        {/* Logo */}
        <button
          onClick={() => go('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            flexShrink: 0, padding: '4px 0',
          }}
        >
          <span style={{ fontSize: 30, animation: 'bob 2s ease-in-out infinite' }}>🦆</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: 'Fredoka One, cursive', fontSize: 20,
              color: '#fff', letterSpacing: 1, lineHeight: 1.15,
            }}>
              Math Duck Race
            </div>
            <div style={{
              fontFamily: 'Nunito, sans-serif', fontSize: 11,
              color: 'rgba(255,255,255,0.55)', lineHeight: 1,
            }}>
              Solve · Race · Win
            </div>
          </div>
        </button>

        {/* Centre nav — desktop only */}
        <div style={{
          flex: 1, display: 'flex', justifyContent: 'center',
          gap: 4, alignItems: 'center',
        }} className="hidden md:flex">
          <Link to="/"        emoji="🏠" label="Home" />
          {isLoggedIn && <Link to="/profile" emoji="👤" label="Profile" />}
          {isAdmin    && <Link to="/admin"   emoji="🛡️" label="Admin" />}
        </div>

        {/* Right: user area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>

          {displayName ? (
            <>
              {/* Avatar chip — desktop */}
              <div className="hidden sm:flex" style={{
                alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.13)',
                border: '1.5px solid rgba(255,255,255,0.22)',
                borderRadius: 14, padding: '7px 14px',
              }}>
                {/* Avatar circle */}
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 15,
                  flexShrink: 0,
                  background: isGuest
                    ? 'rgba(255,255,255,0.28)'
                    : 'linear-gradient(135deg,#FFD600,#FF8C00)',
                  color: isGuest ? '#fff' : '#1a1a1a',
                }}>
                  {displayName[0].toUpperCase()}
                </div>
                {/* Name + role */}
                <div>
                  <div style={{
                    fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                    fontSize: 14, color: '#fff', lineHeight: 1.2,
                    maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {displayName}
                  </div>
                  <div style={{
                    fontFamily: 'Nunito, sans-serif', fontSize: 11,
                    color: 'rgba(255,255,255,0.55)', lineHeight: 1.1,
                  }}>
                    {isGuest ? '👻 Guest · temp' : isAdmin ? '🛡️ Admin' : '🐥 Player'}
                  </div>
                </div>
              </div>

              {/* Action button */}
              <button
                onClick={handleLogout}
                style={{
                  padding: '9px 18px', borderRadius: 12,
                  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', transition: 'all .18s',
                  background: isGuest
                    ? 'linear-gradient(135deg,#FFD600,#FF8C00)'
                    : 'rgba(255,255,255,0.14)',
                  color: isGuest ? '#1a1a1a' : 'rgba(255,255,255,0.9)',
                  border: '1.5px solid rgba(255,255,255,0.24)',
                  whiteSpace: 'nowrap',
                }}
              >
                {isGuest ? '🔑 Sign In' : '🚪 Logout'}
              </button>
            </>
          ) : (
            <button
              onClick={() => go('/auth')}
              style={{
                padding: '9px 22px', borderRadius: 12,
                fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15,
                background: 'linear-gradient(135deg,#FFD600,#FF8C00)',
                color: '#1a1a1a', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255,214,0,.35)',
              }}
            >
              🔑 Sign In
            </button>
          )}

          {/* Mobile burger */}
          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(255,255,255,0.14)',
              border: '1.5px solid rgba(255,255,255,0.22)',
              color: '#fff', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {open && (
        <div className="md:hidden" style={{
          borderTop: '1px solid rgba(255,255,255,0.12)',
          padding: '10px 20px 14px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <Link to="/"        emoji="🏠" label="Home" />
          {isLoggedIn && <Link to="/profile" emoji="👤" label="Profile" />}
          {isAdmin    && <Link to="/admin"   emoji="🛡️" label="Admin" />}
          {displayName && (
            <div style={{
              marginTop: 8, paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: isGuest ? 'rgba(255,255,255,0.25)' : 'linear-gradient(135deg,#FFD600,#FF8C00)',
                color: isGuest ? '#fff' : '#1a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 13, fontFamily: 'Nunito, sans-serif',
              }}>
                {displayName[0].toUpperCase()}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
                {displayName} {isGuest && <span style={{ color: '#FFD600', fontSize: 12 }}>(Guest)</span>}
              </span>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
