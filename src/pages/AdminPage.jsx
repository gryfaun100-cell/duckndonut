// src/pages/AdminPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';

/* ── small helpers ── */
function StatCard({ emoji, value, label, color, bg }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.97)', borderRadius: 20,
      boxShadow: '0 6px 24px rgba(0,0,0,0.1)',
      padding: '22px 18px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      borderTop: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 32 }}>{emoji}</div>
      <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 32, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function RoleBadge({ role }) {
  const cfg = {
    superadmin: { bg: '#ede9fe', color: '#6d28d9', label: '👑 Superadmin' },
    admin:      { bg: '#dbeafe', color: '#1e40af', label: '🛡️ Admin' },
    user:       { bg: '#dcfce7', color: '#166534', label: '🐥 Player' },
  };
  const c = cfg[role] || cfg.user;
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px', borderRadius: 999,
      background: c.bg, color: c.color,
      fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 12,
    }}>
      {c.label}
    </span>
  );
}

function StatusBadge({ banned }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px', borderRadius: 999,
      background: banned ? '#fee2e2' : '#dcfce7',
      color: banned ? '#dc2626' : '#16a34a',
      fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 12,
    }}>
      {banned ? '🚫 Banned' : '✅ Active'}
    </span>
  );
}

/* ── Main component ── */
export default function AdminPage() {
  const { user, token, isAdmin, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [tab,      setTab]      = useState('users');
  const [users,    setUsers]    = useState([]);
  const [games,    setGames]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [toast,    setToast]    = useState('');
  const [selected, setSelected] = useState(null);
  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) { navigate('/'); return; }
    fetchData();
  }, [isLoggedIn, isAdmin, navigate]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function fetchData() {
    setLoading(true);
    const h = { Authorization: `Bearer ${token}` };
    const [ur, gr] = await Promise.all([
      fetch(apiUrl('/api/admin/users'), { headers: h }),
      fetch(apiUrl('/api/admin/games'), { headers: h }),
    ]);
    if (ur.ok) { const d = await ur.json(); setUsers(d.users || []); }
    if (gr.ok) { const d = await gr.json(); setGames(d.games || []); }
    setLoading(false);
  }

  async function changeRole(uid, role) {
    const res = await fetch(apiUrl(`/api/admin/users/${uid}/role`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role }),
    });
    if (res.ok) { showToast('✅ Role updated!'); fetchData(); }
  }

  async function toggleBan(u) {
    const ep = u.banned ? 'unban' : 'ban';
    const res = await fetch(apiUrl(`/api/admin/users/${u.id}/${ep}`), {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast(u.banned ? `✅ ${u.username} unbanned` : `🚫 ${u.username} banned`);
      setSelected(null);
      fetchData();
    }
  }

  const filtered = useMemo(() =>
    users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
  , [users, search]);

  const bannedCount = users.filter(u => u.banned).length;
  const totalWins   = users.reduce((s, u) => s + (u.stats?.wins || 0), 0);

  /* ── Shared card style ── */
  const card = {
    background: 'rgba(255,255,255,0.97)',
    borderRadius: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    overflow: 'hidden',
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg,#87CEEB 0%,#4fc3f7 45%,#0288d1 100%)',
      padding: '32px 20px 48px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 8, animation: 'bob 2s ease-in-out infinite', display: 'inline-block' }}>🛡️</div>
          <h1 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 42, color: '#fff', textShadow: '0 4px 18px rgba(0,0,0,0.22)', lineHeight: 1.1 }}>
            Admin Panel
          </h1>
          <p style={{ fontFamily: 'Nunito, sans-serif', color: 'rgba(255,255,255,0.75)', marginTop: 4, fontSize: 15 }}>
            Signed in as <strong style={{ color: '#FFD600' }}>{user?.username}</strong>
            <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: '2px 10px', fontSize: 12 }}>
              {user?.role}
            </span>
          </p>
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, padding: '12px 28px', borderRadius: 16,
            background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)',
            color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14,
            animation: 'slide-up .3s ease-out',
            boxShadow: '0 8px 28px rgba(0,0,0,0.3)',
          }}>
            {toast}
          </div>
        )}

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }} className="admin-stats-grid">
          <StatCard emoji="👥" value={users.length}  label="Players"     color="#0288d1" />
          <StatCard emoji="🎮" value={games.length}  label="Games"       color="#43a047" />
          <StatCard emoji="🏆" value={totalWins}     label="Total Wins"  color="#FF8C00" />
          <StatCard emoji="🚫" value={bannedCount}   label="Banned"      color="#e53935" />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'users', label: `👥 Players (${users.length})` },
            { key: 'games', label: `🎮 Games (${games.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 22px', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14,
              background: tab === t.key ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.22)',
              color: tab === t.key ? '#0288d1' : '#fff',
              boxShadow: tab === t.key ? '0 4px 16px rgba(0,0,0,0.12)' : 'none',
              transition: 'all .18s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'Nunito, sans-serif', fontSize: 18, padding: '60px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12, animation: 'bob 1.5s ease-in-out infinite' }}>🦆</div>
            Loading…
          </div>
        ) : tab === 'users' ? (

          /* ── Users tab ── */
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

            {/* Table card */}
            <div style={{ flex: 1, ...card }}>
              {/* Search */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#9ca3af', fontSize: 18 }}>🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search players…"
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#374151',
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14 }}>✕</button>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Nunito, sans-serif' }}>
                  <thead>
                    <tr style={{ background: '#f0f9ff' }}>
                      {['Player', 'Role', 'W / L / D', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{
                          padding: '12px 16px', textAlign: 'left',
                          fontWeight: 700, fontSize: 11, color: '#6b7280',
                          textTransform: 'uppercase', letterSpacing: 1,
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => {
                      const isSelected = selected?.id === u.id;
                      return (
                        <tr
                          key={u.id}
                          onClick={() => setSelected(isSelected ? null : u)}
                          style={{
                            borderTop: '1px solid #f3f4f6',
                            background: isSelected ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa',
                            cursor: 'pointer',
                            transition: 'background .12s',
                          }}
                        >
                          {/* Avatar + name */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 15,
                                background: u.banned ? '#fee2e2' : 'linear-gradient(135deg,#FFD600,#FF8C00)',
                                color: u.banned ? '#dc2626' : '#1a1a1a',
                              }}>
                                {u.banned ? '🚫' : u.username[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', lineHeight: 1.2 }}>{u.username}</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.stats?.totalGames || 0} games</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}><RoleBadge role={u.role} /></td>
                          <td style={{ padding: '14px 16px', fontSize: 13 }}>
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>{u.stats?.wins || 0}</span>
                            <span style={{ color: '#9ca3af', margin: '0 4px' }}>/</span>
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>{u.stats?.losses || 0}</span>
                            <span style={{ color: '#9ca3af', margin: '0 4px' }}>/</span>
                            <span style={{ color: '#ea580c', fontWeight: 700 }}>{u.stats?.draws || 0}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}><StatusBadge banned={u.banned} /></td>
                          <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              {/* Ban/Unban */}
                              {u.id !== user?.id && (
                                <button onClick={() => toggleBan(u)} style={{
                                  padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 12,
                                  background: u.banned ? '#dcfce7' : '#fee2e2',
                                  color: u.banned ? '#16a34a' : '#dc2626',
                                  transition: 'all .15s',
                                }}>
                                  {u.banned ? '✅ Unban' : '🚫 Ban'}
                                </button>
                              )}
                              {/* Role select — superadmin only */}
                              {isSuperAdmin && u.id !== user?.id && (
                                <select value={u.role} onChange={e => changeRole(u.id, e.target.value)} style={{
                                  padding: '6px 10px', borderRadius: 10,
                                  border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                  fontFamily: 'Nunito, sans-serif', fontSize: 12,
                                  cursor: 'pointer', color: '#374151', outline: 'none',
                                }}>
                                  <option value="user">user</option>
                                  <option value="admin">admin</option>
                                  <option value="superadmin">superadmin</option>
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filtered.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontFamily: 'Nunito, sans-serif' }}>
                    No players found{search ? ` matching "${search}"` : ''}.
                  </div>
                )}
              </div>
            </div>

            {/* Detail panel */}
            {selected && (
              <div style={{
                width: 280, flexShrink: 0, ...card,
                padding: '24px 22px',
                animation: 'slide-up .25s ease-out',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h3 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 18, color: '#0288d1', margin: 0 }}>Detail</h3>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>✕</button>
                </div>

                {/* Avatar */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{
                    width: 68, height: 68, borderRadius: '50%', margin: '0 auto 10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Fredoka One, cursive', fontSize: 28,
                    background: selected.banned ? '#fee2e2' : 'linear-gradient(135deg,#FFD600,#FF8C00)',
                    color: selected.banned ? '#dc2626' : '#1a1a1a',
                  }}>
                    {selected.banned ? '🚫' : selected.username[0].toUpperCase()}
                  </div>
                  <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 20, color: '#1e293b' }}>{selected.username}</div>
                  <div style={{ marginTop: 4 }}><RoleBadge role={selected.role} /></div>
                  {selected.banned && (
                    <div style={{ marginTop: 6 }}><StatusBadge banned /></div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                  {[['🏆', selected.stats?.wins||0, '#16a34a'], ['💔', selected.stats?.losses||0, '#dc2626'], ['🤝', selected.stats?.draws||0, '#ea580c']].map(([e, v, c], i) => (
                    <div key={i} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 12, padding: '10px 6px' }}>
                      <div>{e}</div>
                      <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 20, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'Nunito, sans-serif', textAlign: 'center', marginBottom: 14 }}>
                  {selected.stats?.totalGames || 0} games · Joined {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : 'Unknown'}
                </div>

                {/* Recent history */}
                {selected.gameHistory?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Recent Games</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                      {selected.gameHistory.slice(0, 8).map((g, i) => {
                        const e = { win: '🏆', loss: '💔', draw: '🤝' }[g.result];
                        const c = { win: '#16a34a', loss: '#dc2626', draw: '#ea580c' }[g.result];
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: '#f8fafc', fontSize: 12, fontFamily: 'Nunito, sans-serif' }}>
                            <span>{e}</span>
                            <span style={{ fontWeight: 800, color: c, textTransform: 'uppercase' }}>{g.result}</span>
                            <span style={{ color: '#9ca3af', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {g.opponents?.join(', ')}</span>
                            <span style={{ fontWeight: 700, color: '#374151' }}>{g.score}pt</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ban/Unban button */}
                {selected.id !== user?.id && (
                  <button onClick={() => toggleBan(selected)} style={{
                    width: '100%', padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                    fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14,
                    background: selected.banned
                      ? 'linear-gradient(135deg,#43a047,#2e7d32)'
                      : 'linear-gradient(135deg,#e53935,#b71c1c)',
                    color: '#fff',
                    boxShadow: `0 4px 14px ${selected.banned ? 'rgba(67,160,71,.35)' : 'rgba(229,57,53,.35)'}`,
                  }}>
                    {selected.banned ? '✅ Unban Player' : '🚫 Ban Player'}
                  </button>
                )}
              </div>
            )}
          </div>

        ) : (

          /* ── Games tab ── */
          <div style={card}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Nunito, sans-serif' }}>
                <thead>
                  <tr style={{ background: '#f0f9ff' }}>
                    {['Date', 'Players & Scores', 'Winner', 'Result'].map(h => (
                      <th key={h} style={{
                        padding: '12px 18px', textAlign: 'left',
                        fontWeight: 700, fontSize: 11, color: '#6b7280',
                        textTransform: 'uppercase', letterSpacing: 1,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...games].reverse().map((g, i) => (
                    <tr key={g.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '14px 18px', fontSize: 13, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {new Date(g.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {g.players?.map((p, j) => (
                            <span key={j} style={{
                              padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                              background: '#eff6ff', color: '#1e40af',
                            }}>
                              {p.name} · {p.score}pt
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, fontSize: 14, color: '#374151' }}>
                        {g.isDraw ? <span style={{ color: '#9ca3af' }}>—</span> : (g.players?.find(p => p.id === g.winnerId)?.name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Guest</span>)}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                          background: g.isDraw ? '#fff7ed' : '#dcfce7',
                          color: g.isDraw ? '#ea580c' : '#16a34a',
                          fontWeight: 800, fontSize: 12,
                        }}>
                          {g.isDraw ? '🤝 Draw' : '🏆 Win'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {games.length === 0 && (
                <div style={{ textAlign: 'center', padding: '50px', color: '#9ca3af', fontFamily: 'Nunito, sans-serif' }}>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>🎮</div>
                  No games recorded yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .admin-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </div>
  );
}
