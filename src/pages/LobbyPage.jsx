// src/pages/LobbyPage.jsx — Game Lobby with tips, player slots, host controls
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import socket from '../socket';

const DUCK_EMOJIS  = ['🐥','🦆','🐣','🦅','🦉','🦜'];
const DUCK_COLORS  = [
  { bg:'#fffde7', border:'#FFD600', text:'#f57f17' },
  { bg:'#e3f2fd', border:'#90caf9', text:'#1e40af' },
  { bg:'#fce4ec', border:'#f48fb1', text:'#880e4f' },
  { bg:'#e8f5e9', border:'#a5d6a7', text:'#1b5e20' },
  { bg:'#ede7f6', border:'#ce93d8', text:'#4a148c' },
  { bg:'#fff3e0', border:'#ffcc80', text:'#e65100' },
];

const TIPS = [
  { emoji: '🧮', tip: 'Correct answers move your duck forward. Wrong ones cost you 2 points!' },
  { emoji: '❄️', tip: 'Freeze power-up stops an opponent from answering for 3 seconds.' },
  { emoji: '🔥', tip: 'Fire power-up makes your opponent\'s timer run twice as fast!' },
  { emoji: '⚡', tip: 'Enhance doubles the points of your NEXT correct answer. Save it for Hard mode!' },
  { emoji: '🏁', tip: 'First player to reach 100 points wins instantly — no need to wait for time.' },
  { emoji: '🧠', tip: 'Difficulty scales up automatically as your score rises: Easy → Medium → Hard.' },
  { emoji: '💰', tip: 'Win games to earn coins and EXP. Level up to unlock new features!' },
  { emoji: '🏆', tip: 'Earn achievements by hitting milestones — they reward bonus coins and EXP.' },
  { emoji: '⏱️', tip: 'The game ends after 3 minutes. Highest score wins, exact tie = Draw.' },
  { emoji: '💡', tip: 'Power-ups drop with a 10% chance on each correct answer. Stay sharp!' },
  { emoji: '📊', tip: 'Register an account to track your win/loss/draw stats and game history.' },
  { emoji: '👥', tip: 'You can play with 2–6 players in the same room. Host starts the game!' },
];

function TipCard({ tip }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '16px 20px',
      background: 'rgba(255,255,255,0.18)',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.25)',
      backdropFilter: 'blur(6px)',
      animation: 'fade-in .4s ease-out',
    }}>
      <span style={{ fontSize: 28, flexShrink: 0 }}>{tip.emoji}</span>
      <p style={{
        fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 600,
        color: 'rgba(255,255,255,0.92)', margin: 0, lineHeight: 1.55,
      }}>
        {tip.tip}
      </p>
    </div>
  );
}

export default function LobbyPage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const roomCode    = sessionStorage.getItem('roomCode')    || '';
  const playerName  = sessionStorage.getItem('playerName')  || '';
  const myId        = sessionStorage.getItem('playerId')     || '';

  const [copied,       setCopied]       = useState(false);
  const [countdown,    setCountdown]    = useState(null);
  const [players,      setPlayers]      = useState([{ id: myId, name: playerName }]);
  const [maxPlayers,   setMaxPlayers]   = useState(2);
  const [hostId,       setHostId]       = useState('');
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [tipIdx,       setTipIdx]       = useState(() => Math.floor(Math.random() * TIPS.length));
  const [tipKey,       setTipKey]       = useState(0);

  const isHost  = myId === hostId || players[0]?.id === myId;
  const canStart = isHost && players.length >= 2 && maxPlayers > 2;
  const slotsLeft = maxPlayers - players.length;

  // Rotate tips every 6 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setTipIdx(i => (i + 1) % TIPS.length);
      setTipKey(k => k + 1);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!roomCode) { navigate('/'); return; }

    const onPlayerJoined = ({ players: ps, maxPlayers: mp, hostId: hid }) => {
      setPlayers(ps);
      if (mp)  setMaxPlayers(mp);
      if (hid) setHostId(hid);
    };
    const onGameState = (state) => {
      if (state.players)    setPlayers(state.players);
      if (state.maxPlayers) setMaxPlayers(state.maxPlayers);
      if (state.hostId)     setHostId(state.hostId);
    };
    const onCountdown    = (val) => {
      setCountdown(val);
      if (val === 'GO!') setTimeout(() => navigate('/game'), 600);
    };
    const onOpponentLeft = () => setOpponentLeft(true);

    socket.on('player_joined',  onPlayerJoined);
    socket.on('game_state',     onGameState);
    socket.on('countdown',      onCountdown);
    socket.on('opponent_left',  onOpponentLeft);
    return () => {
      socket.off('player_joined',  onPlayerJoined);
      socket.off('game_state',     onGameState);
      socket.off('countdown',      onCountdown);
      socket.off('opponent_left',  onOpponentLeft);
    };
  }, [roomCode, navigate]);

  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleHostStart() {
    setStartLoading(true);
    socket.emit('host_start');
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg,#87CEEB 0%,#4fc3f7 45%,#0288d1 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 16px 48px',
    }}>

      {/* ── Countdown overlay ── */}
      {countdown !== null && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div key={countdown} style={{
            fontFamily: 'Fredoka One, cursive',
            fontSize: countdown === 'GO!' ? '5rem' : '9rem',
            color: countdown === 'GO!' ? '#FFD600' : '#fff',
            textShadow: '0 0 60px rgba(255,255,255,0.5)',
            animation: 'countdown-pop .5s cubic-bezier(.34,1.56,.64,1)',
            userSelect: 'none',
          }}>
            {countdown}
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 680 }}>

        {/* ── Page title ── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{
            fontFamily: 'Fredoka One, cursive', fontSize: 40,
            color: '#fff', textShadow: '0 4px 18px rgba(0,0,0,0.22)',
            lineHeight: 1.1, marginBottom: 4,
          }}>
            🐥 Game Lobby
          </h1>
          <p style={{
            fontFamily: 'Nunito, sans-serif', fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
          }}>
            {slotsLeft > 0 ? `Waiting for ${slotsLeft} more player${slotsLeft > 1 ? 's' : ''}…` : 'All players ready!'}
          </p>
        </div>

        {/* ── Disconnected notice ── */}
        {opponentLeft && (
          <div style={{
            background: 'rgba(255,255,255,0.97)', borderRadius: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            padding: '40px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>😢</div>
            <h2 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 24, color: '#374151', marginBottom: 12 }}>
              A player disconnected
            </h2>
            <p style={{ fontFamily: 'Nunito, sans-serif', color: '#9ca3af', marginBottom: 20, fontSize: 14 }}>
              The room is no longer valid. Return home and create a new room.
            </p>
            <button onClick={() => navigate('/')} style={{
              padding: '13px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15,
              background: 'linear-gradient(135deg,#0288d1,#01579b)', color: '#fff',
              boxShadow: '0 4px 16px rgba(2,136,209,.35)',
            }}>
              ← Back to Home
            </button>
          </div>
        )}

        {!opponentLeft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* ── Room code card ── */}
            <div style={{
              background: 'rgba(255,255,255,0.97)', borderRadius: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              padding: '28px 32px',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
                  Share this Room Code
                </div>
                {/* Big room code */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
                  {roomCode.split('').map((ch, i) => (
                    <div key={i} style={{
                      width: 54, height: 62,
                      background: 'linear-gradient(160deg,#e3f2fd,#bbdefb)',
                      borderRadius: 14,
                      border: '2px solid #90caf9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Fredoka One, cursive', fontSize: 30,
                      color: '#01579b',
                      boxShadow: '0 4px 12px rgba(2,136,209,.15)',
                    }}>
                      {ch}
                    </div>
                  ))}
                </div>

                <button id="copy-code-btn" onClick={copyCode} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '9px 20px', borderRadius: 12,
                  background: copied ? '#dcfce7' : '#f0f9ff',
                  border: `1.5px solid ${copied ? '#86efac' : '#bae6fd'}`,
                  fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13,
                  color: copied ? '#16a34a' : '#0284c7', cursor: 'pointer',
                  transition: 'all .18s',
                }}>
                  <span>{copied ? '✅' : '📋'}</span>
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* ── Player slots ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Players
                  </span>
                  <span style={{
                    fontFamily: 'Fredoka One, cursive', fontSize: 18,
                    color: players.length >= 2 ? '#16a34a' : '#0288d1',
                  }}>
                    {players.length} / {maxPlayers}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Array.from({ length: maxPlayers }).map((_, i) => {
                    const p   = players[i];
                    const cfg = DUCK_COLORS[i % DUCK_COLORS.length];
                    const me  = p?.id === myId;
                    const host = p?.id === players[0]?.id;
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 18px', borderRadius: 16,
                        background: p ? (me ? cfg.bg : '#f8fafc') : '#f1f5f9',
                        border: `2px solid ${p ? (me ? cfg.border : '#e2e8f0') : '#e2e8f0'}`,
                        transition: 'all .2s',
                        animation: p && !me ? 'fade-in .4s ease-out' : 'none',
                      }}>
                        <span style={{ fontSize: 28, flexShrink: 0 }}>
                          {p ? DUCK_EMOJIS[i % DUCK_EMOJIS.length] : '···'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {p ? (
                            <div style={{
                              fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                              fontSize: 15, color: '#1e293b',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {p.name}
                            </div>
                          ) : (
                            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#9ca3af', fontStyle: 'italic' }}>
                              Waiting for player…
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {host && p && (
                            <span style={{
                              padding: '3px 10px', borderRadius: 999,
                              background: '#fffde7', color: '#92400e',
                              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 11,
                              border: '1px solid #fde68a',
                            }}>
                              👑 Host
                            </span>
                          )}
                          {me && !host && (
                            <span style={{
                              padding: '3px 10px', borderRadius: 999,
                              background: '#eff6ff', color: '#1d4ed8',
                              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 11,
                              border: '1px solid #bfdbfe',
                            }}>
                              You
                            </span>
                          )}
                          {me && host && (
                            <span style={{
                              padding: '3px 10px', borderRadius: 999,
                              background: '#eff6ff', color: '#1d4ed8',
                              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 11,
                              border: '1px solid #bfdbfe',
                            }}>
                              You
                            </span>
                          )}
                          {!p && (
                            <span style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: '#d1d5db', display: 'inline-block',
                              animation: 'ripple 1.5s ease-out infinite',
                            }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Start / wait status ── */}
              {maxPlayers === 2 && players.length < 2 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '12px', borderRadius: 14,
                  background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'ripple 1.5s ease-out infinite' }} />
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, color: '#15803d' }}>
                    Waiting for Player 2…
                  </span>
                </div>
              )}

              {maxPlayers > 2 && isHost && (
                <button
                  id="host-start-btn"
                  onClick={handleHostStart}
                  disabled={players.length < 2 || startLoading}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: players.length < 2 ? 'not-allowed' : 'pointer',
                    fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16,
                    background: players.length < 2
                      ? '#e2e8f0'
                      : 'linear-gradient(135deg,#43a047,#2e7d32)',
                    color: players.length < 2 ? '#94a3b8' : '#fff',
                    boxShadow: players.length >= 2 ? '0 6px 18px rgba(67,160,71,.4)' : 'none',
                    opacity: startLoading ? .7 : 1,
                    transition: 'all .18s',
                  }}>
                  {startLoading
                    ? '⏳ Starting…'
                    : players.length < 2
                      ? '⏳ Need at least 2 players'
                      : `🚀 Start Game (${players.length}/${maxPlayers} players)`}
                </button>
              )}

              {maxPlayers > 2 && !isHost && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '12px', borderRadius: 14,
                  background: '#fffbeb', border: '1.5px solid #fde68a',
                }}>
                  <span style={{ animation: 'bob 2s ease-in-out infinite', display: 'inline-block' }}>⏳</span>
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, color: '#92400e' }}>
                    Waiting for the host to start…
                  </span>
                </div>
              )}
            </div>

            {/* ── User quick-stats chip (if logged in) ── */}
            {user && (
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '14px 22px',
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#FFD600,#FF8C00)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Fredoka One, cursive', fontSize: 18, color: '#1a1a1a',
                }}>
                  {user.username[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 16, color: '#fff' }}>{user.username}</div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                    Lv.{Math.floor((user.exp || 0) / 250) + 1} · {user.stats?.wins || 0}W · {user.coins || 0} 🪙
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[['🏆', user.stats?.wins||0, 'Wins'],['💔', user.stats?.losses||0, 'Losses'],['🤝', user.stats?.draws||0, 'Draws']].map(([e,v,l]) => (
                    <div key={l} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 18, color: '#fff' }}>{v}</div>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tips card ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                💡 Did You Know?
              </div>
              <TipCard key={tipKey} tip={TIPS[tipIdx]} />
              {/* Dot indicators */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                {TIPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setTipIdx(i); setTipKey(k => k + 1); }}
                    style={{
                      width: i === tipIdx ? 20 : 8, height: 8, borderRadius: 999,
                      background: i === tipIdx ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                      border: 'none', cursor: 'pointer', transition: 'all .3s', padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ── Hint for guests ── */}
            {!user && (
              <div style={{
                background: 'rgba(255,255,255,0.12)', borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '14px 20px', textAlign: 'center',
              }}>
                <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                  🐥 Playing as guest — <strong style={{ color: '#FFD600' }}>Register</strong> to earn coins, EXP, achievements & track your stats!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
