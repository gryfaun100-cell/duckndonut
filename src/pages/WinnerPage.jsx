// src/pages/WinnerPage.jsx — Draw support + multi-player leaderboard
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

function Confetti() {
  const emojis = ['🎉','⭐','🎊','✨','🏆','🌟','🎈','🦆'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({length:22}).map((_,i)=>(
        <span key={i} className="absolute text-2xl select-none"
          style={{ left:`${Math.random()*88+4}%`, top:`${Math.random()*25}%`,
            animation:`confetti-fall ${1.2+Math.random()*1.8}s ease-in ${Math.random()*0.8}s forwards`,
            fontSize:`${0.9+Math.random()*0.8}rem` }}>
          {emojis[Math.floor(Math.random()*emojis.length)]}
        </span>
      ))}
    </div>
  );
}

const DUCK_COLORS = ['#FFD600','#90CAF9','#A5D6A7','#F48FB1','#CE93D8','#FFCC80'];

export default function WinnerPage() {
  const navigate = useNavigate();
  const myId     = sessionStorage.getItem('playerId');
  const [data,          setData]          = useState(null);
  const [rematchVotes,  setRematchVotes]  = useState(0);
  const [rematchNeeded, setRematchNeeded] = useState(2);
  const [waitingRematch,setWaitingRematch]= useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('gameOverData');
    if (raw) { try { setData(JSON.parse(raw)); } catch(_) {} }

    const onRematchVote = ({ votes, needed }) => { setRematchVotes(votes); setRematchNeeded(needed); };
    const onCountdown   = (val) => { if (val === 3) navigate('/game'); };
    const onGameState   = (state) => { if (state.state === 'countdown') navigate('/game'); };
    const onOpponentLeft= () => { alert('Opponent disconnected.'); navigate('/'); };

    socket.on('rematch_vote',  onRematchVote);
    socket.on('countdown',     onCountdown);
    socket.on('game_state',    onGameState);
    socket.on('opponent_left', onOpponentLeft);
    return () => {
      socket.off('rematch_vote', onRematchVote); socket.off('countdown', onCountdown);
      socket.off('game_state', onGameState); socket.off('opponent_left', onOpponentLeft);
    };
  }, [navigate]);

  function handleRematch() { setWaitingRematch(true); socket.emit('request_rematch'); }
  function handleHome()    { sessionStorage.clear(); navigate('/'); }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background:'linear-gradient(160deg,#87CEEB,#0288d1)' }}>
        <div className="text-white text-2xl font-bold" style={{ fontFamily:'Nunito,sans-serif' }}>Loading...</div>
      </div>
    );
  }

  const { winner, isDraw, players = [], reason } = data;
  const sorted   = [...players].sort((a,b) => b.score - a.score);
  const isIWon   = winner?.id === myId;
  const iDrew    = isDraw;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background:'linear-gradient(160deg,#87CEEB 0%,#4fc3f7 40%,#0288d1 100%)' }}>

      {!iDrew && isIWon && <Confetti />}

      <div className="absolute inset-0 pointer-events-none"
        style={{ background:'radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.18) 100%)' }} />

      <div className="relative card-glass w-full max-w-lg mx-4 py-8 px-6 text-center z-10" style={{ overflow:'hidden' }}>

        {/* Trophy / Draw icon */}
        <div className="text-7xl mb-3" style={{ animation:'trophy-bounce 1.5s ease-in-out infinite' }}>
          {iDrew ? '🤝' : isIWon ? '🏆' : '🥈'}
        </div>

        <h1 style={{ fontFamily:'Fredoka One,cursive', fontSize:'2.8rem', color:'#1a1a1a', marginBottom:4 }}>
          {iDrew ? "It's a Draw!" : `${winner?.name} Wins!`}
        </h1>
        <p style={{ color:'#666', fontFamily:'Nunito,sans-serif', marginBottom:20 }}>
          {iDrew
            ? '⚖️ Perfectly balanced — well played both sides!'
            : isIWon
            ? 'Quack-tastic! You crushed it! 🎉'
            : 'Better luck next time! Keep swimming 🦆'}
          {reason === 'timeout' && ' (Time\'s up!)'}
        </p>

        {/* Leaderboard */}
        <div className="flex flex-col gap-2 mb-5 text-left">
          {sorted.map((p, i) => {
            const isWinner = !isDraw && p.id === winner?.id;
            const isMeCard = p.id === myId;
            const color    = DUCK_COLORS[players.findIndex(pl=>pl.id===p.id) % DUCK_COLORS.length];
            const medal    = ['🥇','🥈','🥉'][i] || `${i+1}.`;
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-xl p-3 border-2"
                style={{ background: isWinner?'#fffde7': isMeCard?'#e3f2fd':'#f8fafc',
                  borderColor: isWinner?'#FFD600': isMeCard?'#90caf9':'#e2e8f0' }}>
                <span className="text-2xl">{medal}</span>
                <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background:color }} />
                <div className="flex-1">
                  <div className="font-bold text-gray-800 text-sm" style={{ fontFamily:'Nunito,sans-serif' }}>
                    {p.name} {isMeCard && <span className="text-xs text-blue-400">(You)</span>}
                  </div>
                  <div className="text-xs text-gray-400">✅ {p.correct}/{p.total} correct</div>
                </div>
                <div className="font-bold text-lg" style={{ fontFamily:'Fredoka One,cursive', color: isWinner?'#FF8C00':'#64b5f6' }}>
                  {p.score}pt
                </div>
                {isWinner && <span>👑</span>}
              </div>
            );
          })}
        </div>

        {/* Celebration row */}
        <div className="flex justify-center gap-2 text-2xl mb-5">
          {['🎊','🥳','⭐','🎉','🦆'].map((e,i)=>(
            <span key={i} style={{ animation:`bob ${1+i*0.2}s ease-in-out infinite` }}>{e}</span>
          ))}
        </div>

        {waitingRematch && (
          <p className="text-sm text-gray-500 mb-2" style={{ fontFamily:'Nunito,sans-serif' }}>
            ⏳ Waiting... ({rematchVotes}/{rematchNeeded} ready)
          </p>
        )}

        <div className="flex gap-3">
          <button id="rematch-btn" onClick={handleRematch} disabled={waitingRematch}
            className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-95"
            style={{ background: waitingRematch?'#9ca3af':'linear-gradient(135deg,#43a047,#2e7d32)',
              boxShadow: waitingRematch?'none':'0 4px 16px rgba(67,160,71,0.4)', fontFamily:'Nunito,sans-serif' }}>
            🔄 Rematch
          </button>
          <button id="home-btn" onClick={handleHome}
            className="flex-1 py-3 rounded-xl font-bold text-gray-700 text-sm transition-all active:scale-95 hover:bg-gray-100 border-2 border-gray-200"
            style={{ fontFamily:'Nunito,sans-serif' }}>
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
}
