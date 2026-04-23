// src/pages/LandingPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import socket from '../socket';
import TutorialModal from '../components/TutorialModal';

/* ── Cloud ───────────────────────────────────────────────────────────────── */
function Cloud({ top, left, right, bottom, scale = 1, opacity = 0.7, delay = '0s' }) {
  const pos = {};
  if (top    !== undefined) pos.top    = top;
  if (bottom !== undefined) pos.bottom = bottom;
  if (left   !== undefined) pos.left   = left;
  if (right  !== undefined) pos.right  = right;
  return (
    <div style={{
      position: 'absolute', pointerEvents: 'none', opacity,
      animation: `float-slow ${9 + Math.random() * 5}s ease-in-out ${delay} infinite`,
      transform: `scale(${scale})`,
      ...pos,
    }}>
      <div style={{ position: 'relative', width: 140, height: 56 }}>
        <div style={{ position: 'absolute', background: '#fff', borderRadius: '50%', width: 100, height: 40, top: 14, left: 14 }} />
        <div style={{ position: 'absolute', background: '#fff', borderRadius: '50%', width: 65, height: 52, top: 0,  left: 28 }} />
        <div style={{ position: 'absolute', background: '#fff', borderRadius: '50%', width: 75, height: 34, top: 20, left: 55 }} />
      </div>
    </div>
  );
}

function playTone(freq, dur = 0.12) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = 'sine';
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch (_) {}
}

/* ── Feature pill ────────────────────────────────────────────────────────── */
function Pill({ emoji, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 16px', borderRadius: 999,
      background: 'rgba(255,255,255,0.18)',
      backdropFilter: 'blur(6px)',
      color: '#fff',
      fontFamily: 'Nunito, sans-serif',
      fontWeight: 700, fontSize: 14,
      border: '1px solid rgba(255,255,255,0.22)',
      whiteSpace: 'nowrap',
    }}>
      <span>{emoji}</span><span>{label}</span>
    </div>
  );
}

/* ── Action card ─────────────────────────────────────────────────────────── */
function ActionCard({ id, emoji, title, desc, btnLabel, btnColor, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      id={id}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        width: '100%',
        padding: '48px 40px',
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 28,
        boxShadow: hov
          ? '0 20px 60px rgba(0,0,0,0.22)'
          : '0 8px 32px rgba(0,0,0,0.14)',
        border: '2px solid rgba(255,255,255,0.9)',
        cursor: 'pointer',
        transform: hov ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'all .22s cubic-bezier(.34,1.56,.64,1)',
        gap: 0,
      }}
    >
      <span style={{ fontSize: 72, display: 'block', marginBottom: 18, animation: 'bob 2s ease-in-out infinite' }}>
        {emoji}
      </span>
      <h2 style={{
        fontFamily: 'Fredoka One, cursive',
        fontSize: 32, marginBottom: 12,
        color: title === 'Create Room' ? '#2e7d32' : '#01579b',
      }}>
        {title}
      </h2>
      <p style={{
        fontFamily: 'Nunito, sans-serif',
        fontSize: 16, lineHeight: 1.6,
        color: '#555', marginBottom: 28,
        maxWidth: 300,
      }}>
        {desc}
      </p>
      <div style={{
        width: '100%', padding: '14px 24px',
        borderRadius: 16,
        background: btnColor,
        color: '#fff',
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 800, fontSize: 17,
        boxShadow: `0 6px 18px ${title === 'Create Room' ? 'rgba(67,160,71,.4)' : 'rgba(2,136,209,.4)'}`,
      }}>
        {btnLabel}
      </div>
    </button>
  );
}

/* ── Panel wrapper ───────────────────────────────────────────────────────── */
function Panel({ children }) {
  return (
    <div style={{
      width: '100%', maxWidth: 520, margin: '0 auto',
      background: 'rgba(255,255,255,0.97)',
      borderRadius: 28,
      boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
      padding: '48px 48px',
      animation: 'slide-up .3s ease-out',
    }}>
      {children}
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const { displayName, user, isGuest } = useAuth();

  const [mode,        setMode]        = useState(null);
  const [joinCode,    setJoinCode]    = useState('');
  const [maxPlayers,  setMaxPlayers]  = useState(2);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showTutorial,setShowTutorial]= useState(false);

  useEffect(() => {
    if (!localStorage.getItem('tutorial_seen') && isGuest) {
      setTimeout(() => setShowTutorial(true), 700);
    }
  }, [isGuest]);

  useEffect(() => {
    function onCreated({ code, playerId, playerIndex }) {
      sessionStorage.setItem('playerName',  displayName);
      sessionStorage.setItem('roomCode',    code);
      sessionStorage.setItem('playerId',    playerId);
      sessionStorage.setItem('playerIndex', playerIndex);
      sessionStorage.setItem('userId',      user?.id || '');
      navigate('/lobby');
    }
    function onJoined({ code, playerId, playerIndex }) {
      sessionStorage.setItem('playerName',  displayName);
      sessionStorage.setItem('roomCode',    code);
      sessionStorage.setItem('playerId',    playerId);
      sessionStorage.setItem('playerIndex', playerIndex);
      sessionStorage.setItem('userId',      user?.id || '');
      navigate('/lobby');
    }
    function onError({ message }) { setError(message); setLoading(false); }

    socket.on('room_created', onCreated);
    socket.on('room_joined',  onJoined);
    socket.on('error',        onError);
    return () => {
      socket.off('room_created', onCreated);
      socket.off('room_joined',  onJoined);
      socket.off('error',        onError);
    };
  }, [displayName, user, navigate]);

  function handleCreate() {
    setError(''); setLoading(true); playTone(440, 0.1);
    socket.emit('create_room', { name: displayName, userId: user?.id || null, maxPlayers });
  }
  function handleJoin() {
    if (!joinCode.trim()) { setError('Please enter a room code'); return; }
    setError(''); setLoading(true); playTone(440, 0.1);
    socket.emit('join_room', { name: displayName, code: joinCode.trim().toUpperCase(), userId: user?.id || null });
  }

  return (
    <div style={{
      position: 'relative', minHeight: '100dvh', overflowX: 'hidden',
      background: 'linear-gradient(160deg,#87CEEB 0%,#4fc3f7 45%,#0288d1 100%)',
    }}>
      {showTutorial && (
        <TutorialModal onClose={() => { setShowTutorial(false); localStorage.setItem('tutorial_seen','1'); }} />
      )}

      {/* Clouds */}
      <Cloud top="5%"    left="2%"   opacity={0.7}  delay="0s" />
      <Cloud top="10%"   right="3%"  opacity={0.55} delay="2s" scale={0.85} />
      <Cloud bottom="18%" left="1%"  opacity={0.45} delay="1s" scale={0.75} />
      <Cloud bottom="8%"  right="6%" opacity={0.5}  delay="3s" scale={0.9} />

      {/* ── Page content ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 1000,
        margin: '0 auto',
        padding: '40px 32px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
      }}>

        {/* ── HERO ── */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 16 }}>
            <span style={{ fontSize: 80, animation: 'bob 2s ease-in-out infinite', display: 'block' }}>🐥</span>
            <div>
              <h1 style={{
                fontFamily: 'Fredoka One, cursive',
                fontSize: 'clamp(2.8rem, 7vw, 5rem)',
                color: '#fff',
                textShadow: '0 4px 24px rgba(0,0,0,0.22)',
                letterSpacing: 3, lineHeight: 1.05,
              }}>
                Math Duck Race
              </h1>
              <p style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
                color: 'rgba(255,255,255,0.88)',
                marginTop: 6,
              }}>
                Solve math. Race ducks. Crush your friends. 🏁
              </p>
            </div>
            <span style={{ fontSize: 80, animation: 'bob 2.2s ease-in-out infinite .3s', display: 'block' }}>🦆</span>
          </div>

          {/* Welcome pill */}
          {displayName && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 999,
              background: 'rgba(255,255,255,0.22)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.28)',
              color: '#fff', fontFamily: 'Nunito, sans-serif',
              fontWeight: 800, fontSize: 16, marginBottom: 16,
            }}>
              👋 Welcome, <span style={{ color: '#FFD600' }}>{displayName}</span>
              {isGuest && (
                <span style={{
                  background: 'rgba(255,255,255,0.22)',
                  borderRadius: 999, padding: '2px 10px',
                  fontSize: 12, fontWeight: 700,
                }}>Guest</span>
              )}
              !
            </div>
          )}

          {/* Pills row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
            <button
              onClick={() => setShowTutorial(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 999,
                background: 'rgba(255,255,255,0.95)',
                color: '#0288d1', border: 'none', cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14,
                boxShadow: '0 4px 14px rgba(0,0,0,0.14)',
                transition: 'transform .15s',
              }}
            >
              📖 How to Play
            </button>
            <Pill emoji="⚡" label="Up to 6 Players" />
            <Pill emoji="🧠" label="Adaptive Difficulty" />
            <Pill emoji="❄️🔥⚡" label="Power-ups" />
            <Pill emoji="🏆" label="Track Stats" />
          </div>
        </div>

        {/* ── ACTION CARDS ── */}
        {mode === null && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
            width: '100%',
          }}>
            <ActionCard
              id="create-room-btn"
              emoji="🏠"
              title="Create Room"
              desc="Start a new game and invite up to 5 friends using a room code."
              btnLabel="+ Create Game"
              btnColor="linear-gradient(135deg,#43a047,#2e7d32)"
              onClick={() => { setMode('create'); playTone(440, 0.1); }}
            />
            <ActionCard
              id="join-room-btn"
              emoji="🚪"
              title="Join Room"
              desc="Have a room code? Jump straight into your friend's game!"
              btnLabel="→ Join Game"
              btnColor="linear-gradient(135deg,#0288d1,#01579b)"
              onClick={() => { setMode('join'); playTone(330, 0.08); }}
            />
          </div>
        )}

        {/* ── CREATE PANEL ── */}
        {mode === 'create' && (
          <Panel>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>🏠</div>
              <h2 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 30, color: '#2e7d32', marginBottom: 6 }}>
                Create a Room
              </h2>
              <p style={{ fontFamily: 'Nunito, sans-serif', color: '#888', fontSize: 15 }}>
                Choose max players, then share your room code.
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#555', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, textAlign: 'center' }}>
                Max Players
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[2, 3, 4, 5, 6].map(n => (
                  <button key={n} onClick={() => setMaxPlayers(n)}
                    style={{
                      flex: 1, padding: '12px 0',
                      borderRadius: 14, border: 'none', cursor: 'pointer',
                      fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 16,
                      background: maxPlayers === n
                        ? 'linear-gradient(135deg,#43a047,#2e7d32)'
                        : '#f0f4f8',
                      color: maxPlayers === n ? '#fff' : '#666',
                      boxShadow: maxPlayers === n ? '0 4px 14px rgba(67,160,71,.35)' : 'none',
                      transition: 'all .18s',
                    }}>
                    {n}P
                  </button>
                ))}
              </div>
              {maxPlayers > 2 && (
                <p style={{ fontFamily: 'Nunito, sans-serif', color: '#aaa', fontSize: 13, textAlign: 'center', marginTop: 10 }}>
                  💡 You (host) start the game manually for {maxPlayers}-player rooms.
                </p>
              )}
            </div>

            {error && (
              <div style={{ textAlign: 'center', color: '#e53935', fontFamily: 'Nunito, sans-serif', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setMode(null); setError(''); }}
                style={{
                  flex: 1, padding: '14px', borderRadius: 16,
                  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16,
                  background: '#f0f4f8', color: '#555',
                  border: '2px solid #e2e8f0', cursor: 'pointer',
                }}>
                ← Back
              </button>
              <button
                id="confirm-create-btn"
                onClick={handleCreate}
                disabled={loading}
                style={{
                  flex: 2, padding: '14px', borderRadius: 16,
                  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16,
                  background: 'linear-gradient(135deg,#43a047,#2e7d32)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(67,160,71,.4)',
                  opacity: loading ? .7 : 1,
                }}>
                {loading ? '⏳ Creating…' : '+ Create Room'}
              </button>
            </div>
          </Panel>
        )}

        {/* ── JOIN PANEL ── */}
        {mode === 'join' && (
          <Panel>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>🚪</div>
              <h2 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 30, color: '#01579b', marginBottom: 6 }}>
                Join a Room
              </h2>
              <p style={{ fontFamily: 'Nunito, sans-serif', color: '#888', fontSize: 15 }}>
                Enter the 5-letter code your friend shared.
              </p>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#555', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, textAlign: 'center' }}>
                Room Code
              </div>
              <input
                id="room-code-input"
                type="text"
                value={joinCode}
                maxLength={5}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="XXXXX"
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  borderRadius: 18,
                  border: `2px solid ${error ? '#ef4444' : '#90caf9'}`,
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 900, fontSize: 36,
                  textAlign: 'center',
                  letterSpacing: '0.45em',
                  color: '#1e293b',
                  background: '#f8fafc',
                  outline: 'none',
                  textTransform: 'uppercase',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{ textAlign: 'center', color: '#e53935', fontFamily: 'Nunito, sans-serif', fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => { setMode(null); setJoinCode(''); setError(''); }}
                style={{
                  flex: 1, padding: '14px', borderRadius: 16,
                  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16,
                  background: '#f0f4f8', color: '#555',
                  border: '2px solid #e2e8f0', cursor: 'pointer',
                }}>
                ← Back
              </button>
              <button
                id="join-submit-btn"
                onClick={handleJoin}
                disabled={loading}
                style={{
                  flex: 2, padding: '14px', borderRadius: 16,
                  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16,
                  background: 'linear-gradient(135deg,#0288d1,#01579b)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(2,136,209,.4)',
                  opacity: loading ? .7 : 1,
                }}>
                {loading ? '⏳ Joining…' : '→ Join Game'}
              </button>
            </div>
          </Panel>
        )}

        {/* Bottom hint */}
        <p style={{
          fontFamily: 'Nunito, sans-serif', fontSize: 13,
          color: 'rgba(255,255,255,0.5)', textAlign: 'center',
        }}>
          💡 Same WiFi network = LAN play &nbsp;·&nbsp; Register to track wins &amp; friends
        </p>
      </div>
    </div>
  );
}
