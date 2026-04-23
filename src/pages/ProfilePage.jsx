// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';

const RESULT_CFG = {
  win:  { emoji:'🏆', label:'Win',  bg:'#dcfce7', color:'#16a34a', border:'#86efac' },
  loss: { emoji:'💔', label:'Loss', bg:'#fee2e2', color:'#dc2626', border:'#fca5a5' },
  draw: { emoji:'🤝', label:'Draw', bg:'#fff7ed', color:'#ea580c', border:'#fdba74' },
};

function calcLevel(exp) { return Math.max(1, Math.floor((exp || 0) / 250) + 1); }
function expForNext(level) { return level * 250; }

/* ── Sub-components ── */
function StatBubble({ emoji, value, label, color }) {
  return (
    <div style={{ textAlign:'center', padding:'14px 10px', background:'#f8fafc', borderRadius:16, border:'1.5px solid #e2e8f0' }}>
      <div style={{ fontSize:22, marginBottom:4 }}>{emoji}</div>
      <div style={{ fontFamily:'Fredoka One,cursive', fontSize:26, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#9ca3af', marginTop:3 }}>{label}</div>
    </div>
  );
}

function AchievementCard({ ach }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'14px 16px', borderRadius:16,
      background: ach.earned ? '#fffde7' : '#f8fafc',
      border:`1.5px solid ${ach.earned ? '#FFD600' : '#e2e8f0'}`,
      opacity: ach.earned ? 1 : 0.55,
      transition:'all .2s',
      position:'relative', overflow:'hidden',
    }}>
      <span style={{ fontSize:30, flexShrink:0, filter: ach.earned ? 'none' : 'grayscale(1)' }}>{ach.emoji}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'Nunito,sans-serif', fontWeight:800, fontSize:13, color:ach.earned?'#1e293b':'#9ca3af', lineHeight:1.2 }}>{ach.name}</div>
        <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#9ca3af', marginTop:2 }}>{ach.desc}</div>
        <div style={{ display:'flex', gap:8, marginTop:6 }}>
          <span style={{ fontFamily:'Nunito,sans-serif', fontSize:11, fontWeight:700, color:'#f59e0b' }}>🪙 +{ach.coins}</span>
          {ach.exp > 0 && <span style={{ fontFamily:'Nunito,sans-serif', fontSize:11, fontWeight:700, color:'#6366f1' }}>⭐ +{ach.exp} EXP</span>}
        </div>
      </div>
      {ach.earned && (
        <div style={{ position:'absolute', top:8, right:10, fontFamily:'Nunito,sans-serif', fontSize:10, fontWeight:700, color:'#d97706', background:'#fffde7', padding:'2px 8px', borderRadius:999, border:'1px solid #fde68a' }}>
          ✅ Earned
        </div>
      )}
    </div>
  );
}

/* ── Main ── */
export default function ProfilePage() {
  const { user, token, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [friends,      setFriends]      = useState([]);
  const [addName,      setAddName]      = useState('');
  const [addError,     setAddError]     = useState('');
  const [addSuccess,   setAddSuccess]   = useState('');
  const [loading,      setLoading]      = useState(false);
  const [tab,          setTab]          = useState('history');
  const [achievements, setAchievements] = useState([]);
  const [achMeta,      setAchMeta]      = useState({ coins:0, exp:0, level:1, expForNext:250 });

  useEffect(() => {
    if (!isLoggedIn) { navigate('/auth'); return; }
    fetchFriends();
    fetchAchievements();
  }, [isLoggedIn, navigate]);

  async function fetchFriends() {
    try {
      const res = await fetch(apiUrl('/api/friends'), { headers:{ Authorization:`Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setFriends(d.friends || []); }
    } catch (_) {}
  }

  async function fetchAchievements() {
    try {
      const res = await fetch(apiUrl('/api/achievements/me'), { headers:{ Authorization:`Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setAchievements(d.achievements || []);
        setAchMeta({ coins:d.coins, exp:d.exp, level:d.level, expForNext:d.expForNext });
      }
    } catch (_) {}
  }

  async function handleAddFriend(e) {
    e.preventDefault();
    setAddError(''); setAddSuccess(''); setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/friends/add'), {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ username: addName.trim() }),
      });
      const d = await res.json();
      if (res.ok) { setAddSuccess(`✅ Added ${d.friend.username}!`); setAddName(''); fetchFriends(); }
      else setAddError(d.error || 'Failed');
    } catch (_) { setAddError('Network error'); }
    setLoading(false);
  }

  if (!user) return null;

  const stats   = user.stats   || {};
  const history = user.gameHistory || [];
  const total   = stats.totalGames || 0;
  const level   = achMeta.level;
  const exp     = achMeta.exp;
  const expNext = achMeta.expForNext;
  const expPrev = (level - 1) * 250;
  const expPct  = Math.min(100, Math.round(((exp - expPrev) / (expNext - expPrev)) * 100));
  const winRate = total ? Math.round((stats.wins / total) * 100) : 0;
  const roleLabel = user.role==='superadmin'?'👑 Superadmin': user.role==='admin'?'🛡️ Admin':'🐥 Player';
  const roleColor = user.role==='superadmin'?'#7c3aed': user.role==='admin'?'#0288d1':'#43a047';
  const earnedCount = achievements.filter(a => a.earned).length;

  const TABS = [
    { key:'history',      label:`📋 History (${Math.min(history.length,20)})` },
    { key:'achievements', label:`🏆 Achievements (${earnedCount}/${achievements.length})` },
    { key:'friends',      label:`👥 Friends (${friends.length})` },
  ];

  return (
    <div style={{ minHeight:'100dvh', background:'linear-gradient(160deg,#87CEEB 0%,#4fc3f7 45%,#0288d1 100%)', padding:'28px 18px 48px' }}>
      <div style={{ maxWidth:900, margin:'0 auto', display:'flex', flexDirection:'column', gap:18 }}>

        {/* ── Profile Banner ── */}
        <div style={{ background:'rgba(255,255,255,0.97)', borderRadius:28, boxShadow:'0 8px 40px rgba(0,0,0,0.14)', padding:'32px 36px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:22, flexWrap:'wrap', marginBottom:20 }}>
            {/* Avatar */}
            <div style={{ width:82, height:82, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#FFD600,#FF8C00)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Fredoka One,cursive', fontSize:38, color:'#1a1a1a', boxShadow:'0 4px 18px rgba(255,214,0,.4)' }}>
              {user.username[0].toUpperCase()}
            </div>
            {/* Name */}
            <div style={{ flex:1 }}>
              <h1 style={{ fontFamily:'Fredoka One,cursive', fontSize:30, color:'#1a1a1a', marginBottom:6, lineHeight:1 }}>{user.username}</h1>
              <span style={{ display:'inline-block', background:roleColor, color:'#fff', borderRadius:999, padding:'4px 14px', fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:12 }}>{roleLabel}</span>
            </div>
            {/* Coins + level */}
            <div style={{ display:'flex', gap:12, flexShrink:0 }}>
              <div style={{ textAlign:'center', padding:'12px 18px', background:'linear-gradient(135deg,#fffbeb,#fef9c3)', borderRadius:18, border:'1.5px solid #fde68a' }}>
                <div style={{ fontSize:22 }}>🪙</div>
                <div style={{ fontFamily:'Fredoka One,cursive', fontSize:22, color:'#d97706' }}>{achMeta.coins}</div>
                <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#b45309', fontWeight:700 }}>Coins</div>
              </div>
              <div style={{ textAlign:'center', padding:'12px 18px', background:'linear-gradient(135deg,#ede9fe,#ddd6fe)', borderRadius:18, border:'1.5px solid #c4b5fd' }}>
                <div style={{ fontSize:22 }}>⭐</div>
                <div style={{ fontFamily:'Fredoka One,cursive', fontSize:22, color:'#6d28d9' }}>Lv.{level}</div>
                <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#7c3aed', fontWeight:700 }}>{exp} EXP</div>
              </div>
            </div>
          </div>

          {/* EXP bar */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:12, color:'#6d28d9' }}>Level {level} → {level+1}</span>
              <span style={{ fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:12, color:'#6d28d9' }}>{exp - expPrev} / {expNext - expPrev} EXP ({expPct}%)</span>
            </div>
            <div style={{ height:14, background:'#ede9fe', borderRadius:999, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:999, width:`${expPct}%`, background:'linear-gradient(90deg,#7c3aed,#a78bfa)', transition:'width 1.2s ease' }} />
            </div>
            <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#9ca3af', marginTop:4 }}>
              {expNext - exp} EXP to Level {level + 1}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            <StatBubble emoji="🏆" value={stats.wins||0}        label="Wins"       color="#16a34a" />
            <StatBubble emoji="💔" value={stats.losses||0}      label="Losses"     color="#dc2626" />
            <StatBubble emoji="🤝" value={stats.draws||0}       label="Draws"      color="#ea580c" />
            <StatBubble emoji="🎮" value={stats.totalGames||0}  label="Games"      color="#0288d1" />
          </div>

          {/* Win rate bar */}
          {total > 0 && (
            <div style={{ marginTop:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:12, color:'#555' }}>Win Rate</span>
                <span style={{ fontFamily:'Fredoka One,cursive', fontSize:14, color:'#43a047' }}>{winRate}%</span>
              </div>
              <div style={{ height:10, background:'#e2e8f0', borderRadius:999, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:999, width:`${winRate}%`, background:'linear-gradient(90deg,#43a047,#FFD600)', transition:'width 1.2s ease' }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:'10px 20px', borderRadius:14, border:'none', cursor:'pointer',
              fontFamily:'Nunito,sans-serif', fontWeight:800, fontSize:13,
              background: tab===t.key ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.22)',
              color: tab===t.key ? '#0288d1' : '#fff',
              boxShadow: tab===t.key ? '0 4px 14px rgba(0,0,0,0.1)' : 'none',
              transition:'all .18s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={{ background:'rgba(255,255,255,0.97)', borderRadius:24, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', padding:'28px 32px' }}>

          {/* HISTORY */}
          {tab === 'history' && (
            <>
              <h3 style={{ fontFamily:'Fredoka One,cursive', fontSize:22, color:'#43a047', marginBottom:18 }}>📋 Game History</h3>
              {history.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:'#9ca3af', fontFamily:'Nunito,sans-serif' }}>
                  <div style={{ fontSize:48, marginBottom:10 }}>🎮</div>
                  <div style={{ fontSize:16, fontWeight:700 }}>No games yet!</div>
                  <div style={{ fontSize:13, marginTop:4 }}>Create or join a room to start racing.</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {history.slice(0,20).map((g,i) => {
                    const cfg = RESULT_CFG[g.result] || RESULT_CFG.draw;
                    return (
                      <div key={g.gameId+i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderRadius:16, background:cfg.bg, border:`1.5px solid ${cfg.border}` }}>
                        <span style={{ fontSize:24, flexShrink:0 }}>{cfg.emoji}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:'Nunito,sans-serif', fontWeight:800, fontSize:13, color:cfg.color, textTransform:'uppercase', letterSpacing:1 }}>{cfg.label}</div>
                          <div style={{ fontFamily:'Nunito,sans-serif', fontSize:12, color:'#6b7280', marginTop:2 }}>vs {g.opponents?.join(', ')||'Unknown'}</div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontFamily:'Fredoka One,cursive', fontSize:18, color:'#1e293b' }}>{g.score} pts</div>
                          {g.expEarned && <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#7c3aed', fontWeight:700 }}>+{g.expEarned} EXP · +{g.coinsEarned}🪙</div>}
                          <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#9ca3af' }}>{new Date(g.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ACHIEVEMENTS */}
          {tab === 'achievements' && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <h3 style={{ fontFamily:'Fredoka One,cursive', fontSize:22, color:'#d97706', margin:0 }}>🏆 Achievements</h3>
                <span style={{ fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:13, color:'#9ca3af' }}>{earnedCount} / {achievements.length} earned</span>
              </div>
              {/* Progress bar */}
              <div style={{ marginBottom:20 }}>
                <div style={{ height:10, background:'#fef3c7', borderRadius:999, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:999, background:'linear-gradient(90deg,#f59e0b,#FFD600)', width:`${achievements.length ? Math.round(earnedCount/achievements.length*100) : 0}%`, transition:'width 1.2s ease' }} />
                </div>
                <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#9ca3af', marginTop:4, textAlign:'right' }}>
                  {achievements.length ? Math.round(earnedCount/achievements.length*100) : 0}% complete
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
                {achievements.map(a => <AchievementCard key={a.id} ach={a} />)}
              </div>
            </>
          )}

          {/* FRIENDS */}
          {tab === 'friends' && (
            <>
              <h3 style={{ fontFamily:'Fredoka One,cursive', fontSize:22, color:'#0288d1', marginBottom:18 }}>👥 Friends</h3>
              {/* Add friend */}
              <form onSubmit={handleAddFriend} style={{ display:'flex', gap:10, marginBottom:20 }}>
                <input value={addName} onChange={e=>{setAddName(e.target.value);setAddError('');setAddSuccess('');}}
                  placeholder="Add by username…"
                  style={{ flex:1, padding:'11px 16px', borderRadius:12, border:`2px solid ${addError?'#ef4444':'#e2e8f0'}`, fontFamily:'Nunito,sans-serif', fontSize:14, outline:'none', background:'#f8fafc' }} />
                <button type="submit" disabled={loading||!addName.trim()} style={{ padding:'11px 20px', borderRadius:12, border:'none', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:800, fontSize:14, background:'linear-gradient(135deg,#0288d1,#01579b)', color:'#fff', opacity:(loading||!addName.trim())?.6:1 }}>
                  {loading?'…':'+ Add'}
                </button>
              </form>
              {addError   && <p style={{ color:'#ef4444', fontSize:13, fontFamily:'Nunito,sans-serif', fontWeight:700, marginBottom:10 }}>{addError}</p>}
              {addSuccess && <p style={{ color:'#16a34a', fontSize:13, fontFamily:'Nunito,sans-serif', fontWeight:700, marginBottom:10 }}>{addSuccess}</p>}

              {friends.length === 0 ? (
                <div style={{ textAlign:'center', padding:'30px 0', color:'#9ca3af', fontFamily:'Nunito,sans-serif' }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>🐥</div>
                  <div>No friends yet — add someone by username!</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
                  {friends.map(f => (
                    <div key={f.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:16, background:'#f0f9ff', border:'1.5px solid #90caf9' }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#0288d1,#01579b)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'Nunito,sans-serif', fontWeight:900, fontSize:17, flexShrink:0 }}>{f.username[0].toUpperCase()}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'Nunito,sans-serif', fontWeight:800, fontSize:14, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.username}</div>
                        <div style={{ fontFamily:'Nunito,sans-serif', fontSize:12, color:'#9ca3af' }}>🏆{f.stats?.wins||0} · 💔{f.stats?.losses||0}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
