// src/pages/GamePage.jsx — Fixed: inline styles, stable socket effect, request_game_state on mount
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

/* ── Sound ── */
function playTone(freq, dur=0.15, type='sine') {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = type;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+dur);
    osc.start(); osc.stop(ctx.currentTime+dur);
  } catch(_) {}
}
function playCorrect(){ playTone(523,.1); setTimeout(()=>playTone(659,.1),100); setTimeout(()=>playTone(784,.2),200); }
function playWrong()  { playTone(200,.2,'sawtooth'); setTimeout(()=>playTone(150,.25,'sawtooth'),150); }
function playFreeze() { playTone(900,.1,'square');   setTimeout(()=>playTone(700,.15,'square'),100); }
function playFire()   { playTone(300,.05,'sawtooth');setTimeout(()=>playTone(500,.05,'sawtooth'),60);setTimeout(()=>playTone(700,.1,'sawtooth'),120); }
function playEnhance(){ playTone(660,.1); setTimeout(()=>playTone(880,.15),100); setTimeout(()=>playTone(1100,.2),200); }

/* ── Duck SVG ── */
function DuckSVG({ color='#FFD600', size=52 }) {
  const wingColor = color==='#FFD600'?'#e6b800':color==='#90CAF9'?'#5b9bd5':'#7c4dff';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="65" rx="32" ry="22" fill={color}/>
      <circle  cx="72" cy="45" r="18"  fill={color}/>
      <circle  cx="79" cy="40" r="4"   fill="#1a1a1a"/>
      <circle  cx="80" cy="39" r="1.5" fill="white"/>
      <ellipse cx="90" cy="47" rx="10" ry="5" fill="#FF8C00"/>
      <ellipse cx="42" cy="62" rx="18" ry="10" fill={wingColor} transform="rotate(-10 42 62)"/>
    </svg>
  );
}

const DUCK_COLORS = ['#FFD600','#90CAF9','#A5D6A7','#F48FB1','#CE93D8','#FFCC80'];

/* ── Game Timer ── */
function GameTimer({ startTime }) {
  const [secs, setSecs] = useState(180);
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.max(0, 180 - Math.floor((Date.now()-startTime)/1000))), 500);
    return () => clearInterval(id);
  }, [startTime]);
  const m=Math.floor(secs/60), s=secs%60;
  const urgent = secs<=30;
  return (
    <div style={{ fontFamily:'Fredoka One,cursive', fontSize:20, color:urgent?'#ff1744':'#fff',
      animation:urgent?'frozen-shake 0.5s ease-in-out infinite':undefined }}>
      ⏱ {m}:{String(s).padStart(2,'0')}
    </div>
  );
}

/* ── Main ── */
export default function GamePage() {
  const navigate = useNavigate();
  const myId     = sessionStorage.getItem('playerId')  || '';
  const roomCode = sessionStorage.getItem('roomCode')  || '';

  const [gameState,    setGameState]    = useState(null);
  const [question,     setQuestion]     = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [frozenUI,     setFrozenUI]     = useState(false);
  const [fireUI,       setFireUI]       = useState(false);
  const [startTime,    setStartTime]    = useState(null);
  const [timerKey,     setTimerKey]     = useState(0);
  const [timeLimit,    setTimeLimit]    = useState(20);
  const [powerupNotif, setPowerupNotif] = useState(null);
  const [duckAnims,    setDuckAnims]    = useState({});
  const timerRef    = useRef(null);
  const startRef    = useRef(null);
  const prevQRef    = useRef(null); // hold last question so we never show blank

  useEffect(() => { if (!myId || !roomCode) navigate('/'); }, [myId, roomCode, navigate]);

  /* ── Socket listeners — run ONCE on mount, never re-register ── */
  useEffect(() => {
    const setAnim = (id, anim, dur=700) => {
      setDuckAnims(p=>({...p,[id]:anim}));
      setTimeout(()=>setDuckAnims(p=>({...p,[id]:'bobbing'})), dur);
    };

    const onGameState = (state) => {
      setGameState(state);
      if (state.state==='playing' && !startRef.current) {
        startRef.current = Date.now();
        setStartTime(Date.now());
      }
      state.players?.forEach(p=>setDuckAnims(prev=>({[p.id]:'bobbing',...prev})));
    };
    const onQuestion = (q) => {
      prevQRef.current = q;       // always cache latest question
      setQuestion(q);
      setAnswerResult(null);
      setTimeLimit(q.timeLimit||20);
      setTimerKey(k=>k+1);
      setFrozenUI(false);
      setFireUI((q.timeLimit||20)<=10);
    };
    const onAnswerResult = ({correct,answer,pts}) => {
      setAnswerResult(prev=>({...prev,correct,correctAnswer:answer,pts}));
      if (correct){ playCorrect(); setAnim(myId,'correct',600); }
      else        { playWrong();   setAnim(myId,'sinking',700); }
    };
    const onFrozen       = () => { setFrozenUI(true);  playFreeze(); setAnim(myId,'frozen',3000); };
    const onUnfrozen     = () =>   setFrozenUI(false);
    const onFireActivated= ({questions}) => { setFireUI(true); playFire(); setAnim(myId,'fire-anim',questions*20000); };
    const onPowerupReceived = ({type}) => {
      setPowerupNotif(type); setTimeout(()=>setPowerupNotif(null),3000);
    };
    const onGameOver = (data) => {
      sessionStorage.setItem('gameOverData', JSON.stringify(data));
      setTimeout(()=>navigate('/winner'), 800);
    };
    const onOpponentLeft = () => { alert('A player disconnected!'); navigate('/'); };

    socket.on('game_state',        onGameState);
    socket.on('question',          onQuestion);
    socket.on('answer_result',     onAnswerResult);
    socket.on('frozen',            onFrozen);
    socket.on('unfrozen',          onUnfrozen);
    socket.on('fire_activated',    onFireActivated);
    socket.on('powerup_received',  onPowerupReceived);
    socket.on('game_over',         onGameOver);
    socket.on('opponent_left',     onOpponentLeft);

    // Request current game state from server (fixes race condition)
    socket.emit('request_game_state');

    return () => {
      socket.off('game_state',       onGameState);
      socket.off('question',         onQuestion);
      socket.off('answer_result',    onAnswerResult);
      socket.off('frozen',           onFrozen);
      socket.off('unfrozen',         onUnfrozen);
      socket.off('fire_activated',   onFireActivated);
      socket.off('powerup_received', onPowerupReceived);
      socket.off('game_over',        onGameOver);
      socket.off('opponent_left',    onOpponentLeft);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally run once

  /* ── Per-question countdown auto-submit ── */
  useEffect(() => {
    if (!question || frozenUI) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      socket.emit('submit_answer', { answer: '__timeout__' });
    }, (timeLimit+0.5)*1000);
    return () => clearTimeout(timerRef.current);
  }, [timerKey, question, timeLimit, frozenUI]);

  const handleAnswer = useCallback((choice) => {
    if (!question || answerResult || frozenUI) return;
    setAnswerResult({ chosen: choice, correct: null, correctAnswer: null });
    socket.emit('submit_answer', { answer: choice });
    clearTimeout(timerRef.current);
  }, [question, answerResult, frozenUI]);

  const handleUsePowerup = useCallback((targetId) => {
    const myPlayer = gameState?.players?.find(p=>p.id===myId);
    if (!myPlayer?.heldPowerup) return;
    const type = myPlayer.heldPowerup;
    socket.emit('use_powerup', { targetId });
    if (type==='freeze') playFreeze();
    else if (type==='fire') playFire();
    else playEnhance();
  }, [gameState, myId]);

  const myPlayer  = gameState?.players?.find(p=>p.id===myId);
  const opponents = gameState?.players?.filter(p=>p.id!==myId)||[];
  const DIFF_CFG  = { EASY:{label:'EASY',emoji:'🐣',color:'#43a047'}, MEDIUM:{label:'MEDIUM',emoji:'🦆',color:'#fb8c00'}, HARD:{label:'HARD',emoji:'🔥',color:'#e53935'} };
  const diff      = DIFF_CFG[question?.difficulty]||DIFF_CFG.EASY;

  /* ── Styles ── */
  const S = {
    page:  { minHeight:'100dvh', background:'linear-gradient(160deg,#87CEEB 0%,#4fc3f7 40%,#0288d1 100%)', display:'flex', flexDirection:'column', alignItems:'center', paddingBottom:28, fontFamily:'Nunito,sans-serif' },
    inner: { width:'100%', maxWidth:860, padding:'16px 16px 0' },
    card:  { background:'rgba(255,255,255,0.97)', borderRadius:24, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', padding:'24px' },
    btn:   { padding:'18px 8px', borderRadius:16, fontFamily:'Fredoka One,cursive', fontSize:22, cursor:'pointer', border:'none', transition:'transform .12s,box-shadow .12s', width:'100%' },
  };

  return (
    <div style={S.page}>

      {/* Power-up notification */}
      {powerupNotif && (
        <div style={{ position:'fixed', top:72, left:'50%', transform:'translateX(-50%)', zIndex:50,
          padding:'12px 24px', borderRadius:20, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)',
          color:'#fff', fontFamily:'Nunito,sans-serif', fontWeight:800, fontSize:15,
          animation:'slide-up .3s ease-out', boxShadow:'0 8px 24px rgba(0,0,0,0.3)' }}>
          {{freeze:'❄️ Freeze Power-up!', fire:'🔥 Fire Power-up!', enhance:'⚡ Enhance Power-up!'}[powerupNotif]}
        </div>
      )}

      <div style={S.inner}>

        {/* ── Top bar ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontFamily:'Fredoka One,cursive', fontSize:22, color:'#fff' }}>🐥 Race</div>
          {startTime && <GameTimer startTime={startTime} />}
          <div style={{ fontFamily:'Nunito,sans-serif', fontWeight:800, fontSize:13, color:'rgba(255,255,0,.8)', letterSpacing:3 }}>{roomCode}</div>
        </div>

        {/* ── Player score cards ── */}
        {gameState?.players && (
          <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap' }}>
            {gameState.players.map((p,i) => {
              const isMe = p.id===myId;
              const col  = DUCK_COLORS[i%DUCK_COLORS.length];
              return (
                <div key={p.id} style={{ flex:1, minWidth:140, borderRadius:18, padding:'10px 14px',
                  background:isMe?'#fffde7':'#f0f9ff',
                  border:`2px solid ${isMe?'#FFD600':'#90caf9'}`,
                  boxShadow:isMe?'0 4px 16px rgba(255,214,0,.25)':'0 2px 8px rgba(0,0,0,.06)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <div style={{ width:12, height:12, borderRadius:'50%', background:col, flexShrink:0 }}/>
                    <span style={{ fontWeight:800, fontSize:13, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                    {p.frozen && <span style={{ fontSize:12 }}>❄️</span>}
                    {p.fireQuestionsLeft>0 && <span style={{ fontSize:12 }}>🔥</span>}
                    {p.enhanceNext && <span style={{ fontSize:12 }}>⚡</span>}
                  </div>
                  <div style={{ height:8, background:'#e2e8f0', borderRadius:999, overflow:'hidden', marginBottom:4 }}>
                    <div style={{ height:'100%', borderRadius:999, width:`${p.progress||0}%`,
                      background:`linear-gradient(90deg,${col},${isMe?'#FF8C00':'#1565c0'})`,
                      transition:'width .6s cubic-bezier(.34,1.56,.64,1)' }}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#9ca3af' }}>
                    <span>⭐ {p.score||0} pts</span>
                    <span>✅ {p.correct||0}/{p.total||0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Difficulty badge ── */}
        <div style={{ textAlign:'center', marginBottom:10 }}>
          <span style={{ display:'inline-block', padding:'4px 18px', borderRadius:999, color:'#fff', fontWeight:800, fontSize:13, background:diff.color }}>
            {diff.emoji} {diff.label}
          </span>
        </div>

        {/* ── Power-up tray ── */}
        {myPlayer?.heldPowerup && (() => {
          const PU_CFG = {
            freeze: { emoji:'❄️', label:'Freeze', desc:'Freeze opponent 3s', color:'#4dd0e1', needsTarget:true },
            fire:   { emoji:'🔥', label:'Fire',   desc:'Speed up their timer', color:'#ff7043', needsTarget:true },
            enhance:{ emoji:'⚡', label:'Enhance', desc:'Next correct = 2× pts', color:'#ffd600', needsTarget:false },
          };
          const cfg = PU_CFG[myPlayer.heldPowerup];
          if (!cfg) return null;
          if (cfg.needsTarget && opponents.length>1) return (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:10 }}>
              <span style={{ color:'#fff', fontFamily:'Nunito,sans-serif', fontSize:13, fontWeight:700 }}>Use on:</span>
              {opponents.map(op=>(
                <button key={op.id} onClick={()=>handleUsePowerup(op.id)}
                  style={{ padding:'8px 18px', borderRadius:999, border:'none', cursor:'pointer', fontWeight:800, fontSize:13, color:'#fff', background:cfg.color, boxShadow:`0 4px 14px ${cfg.color}88` }}>
                  {cfg.emoji} {op.name}
                </button>
              ))}
            </div>
          );
          return (
            <div style={{ textAlign:'center', marginBottom:10 }}>
              <button onClick={()=>handleUsePowerup(opponents[0]?.id)}
                style={{ padding:'10px 24px', borderRadius:999, border:'none', cursor:'pointer', fontWeight:800, fontSize:14, color:'#fff', background:cfg.color, boxShadow:`0 4px 16px ${cfg.color}66` }}>
                {cfg.emoji} Use {cfg.label} — {cfg.desc}
              </button>
            </div>
          );
        })()}

        {/* ── River ── */}
        <div style={{ borderRadius:20, overflow:'hidden', marginBottom:14,
          height: (gameState?.players?.length||2)>2 ? 220 : 170,
          boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ position:'relative', height:'100%', display:'flex' }}>
            {/* START */}
            <div style={{ width:52, background:'linear-gradient(180deg,#43a047,#2e7d32)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ color:'#fff', fontWeight:800, fontSize:11, writingMode:'vertical-rl', fontFamily:'Nunito,sans-serif' }}>START</span>
            </div>
            {/* Water */}
            <div style={{ flex:1, position:'relative', background:'linear-gradient(180deg,#29b6f6,#0277bd)' }}>
              {[0,1,2,3,4].map(i=>(
                <div key={i} style={{ position:'absolute', top:`${20+i*15}%`, left:0, right:0, height:1, background:'rgba(255,255,255,0.18)' }}/>
              ))}
              {gameState?.players?.map((p,i)=>{
                const col  = DUCK_COLORS[i%DUCK_COLORS.length];
                const topP = i%2===0 ? '15%' : '55%';
                const leftP = `calc(${Math.max(2,Math.min((p.progress||0)*0.78,90))}%)`;
                return (
                  <div key={p.id} style={{ position:'absolute', left:leftP, top:topP, transform:'translateX(-50%)', transition:'left .7s cubic-bezier(.34,1.56,.64,1)', zIndex:10 }}>
                    <div style={{ filter:p.frozen?'hue-rotate(200deg) brightness(1.4)':'none' }}>
                      <DuckSVG color={col} size={50}/>
                    </div>
                    <div style={{ textAlign:'center', marginTop:2, padding:'2px 8px', borderRadius:999,
                      background:p.id===myId?'rgba(180,120,0,.9)':'rgba(30,80,180,.85)',
                      color:'#fff', fontSize:11, fontWeight:800, whiteSpace:'nowrap', maxWidth:72, overflow:'hidden', textOverflow:'ellipsis', fontFamily:'Nunito,sans-serif' }}>
                      {p.name}
                    </div>
                    {p.frozen && <div style={{ position:'absolute', top:-18, left:'50%', transform:'translateX(-50%)', fontSize:16 }}>❄️</div>}
                    {p.fireQuestionsLeft>0 && <div style={{ position:'absolute', top:-18, right:-4, fontSize:14 }}>🔥</div>}
                    {p.enhanceNext && <div style={{ position:'absolute', top:-18, left:-4, fontSize:14 }}>⚡</div>}
                  </div>
                );
              })}
            </div>
            {/* FINISH */}
            <div style={{ width:52, background:'linear-gradient(180deg,#43a047,#2e7d32)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:18 }}>🏁</span>
              <span style={{ color:'#fff', fontWeight:800, fontSize:11, writingMode:'vertical-rl', fontFamily:'Nunito,sans-serif' }}>FINISH</span>
            </div>
          </div>
        </div>

        {/* Question panel */}
        <div style={{ ...S.card, border: fireUI&&!frozenUI ? '2px solid #ff7043' : '2px solid transparent',
          boxShadow: fireUI&&!frozenUI ? '0 0 24px rgba(255,112,67,.4), 0 8px 32px rgba(0,0,0,.15)' : S.card.boxShadow }}>

          {/* Timer bar — only while awaiting answer */}
          {question && !answerResult && (
            <div style={{ height:10, background:'#f1f5f9', borderRadius:999, overflow:'hidden', marginBottom:18 }}>
              <div key={timerKey} style={{ height:'100%', borderRadius:999,
                background:'linear-gradient(90deg,#43a047,#FFD600,#e53935)',
                animation:`timer-shrink ${timeLimit}s linear forwards`, width:'100%' }}/>
            </div>
          )}

          {/* Frozen state */}
          {frozenUI ? (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontSize:52, marginBottom:8, display:'inline-block', animation:'frozen-shake .4s ease-in-out infinite' }}>❄️</div>
              <p style={{ fontWeight:800, color:'#0288d1', fontSize:20, fontFamily:'Nunito,sans-serif' }}>You're frozen! Wait…</p>
            </div>

          ) : (question || prevQRef.current) ? (() => {
            // Always show a question — use cached prev if current is null during gap
            const displayQ = question || prevQRef.current;
            const waitingNext = !question && !!answerResult;
            return (
              <>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <p style={{ fontFamily:'Fredoka One,cursive', fontSize:36, color:'#1e293b', letterSpacing:2, lineHeight:1.2 }}>
                    {displayQ.question}
                  </p>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {displayQ.choices.map((choice,i)=>{
                    let bg='#f8fafc', border='2px solid #e2e8f0', color='#1e293b';
                    if (answerResult) {
                      if (choice===answerResult.correctAnswer) { bg='#dcfce7'; border='2px solid #16a34a'; color='#166534'; }
                      else if (choice===answerResult.chosen&&!answerResult.correct) { bg='#fee2e2'; border='2px solid #dc2626'; color='#991b1b'; }
                    }
                    return (
                      <button key={i} id={`answer-btn-${i}`} onClick={()=>handleAnswer(choice)}
                        disabled={!!answerResult || waitingNext}
                        style={{ ...S.btn, background:bg, border, color,
                          opacity: (answerResult&&choice!==answerResult.correctAnswer&&choice!==answerResult.chosen) ? .45 : 1 }}>
                        {choice}
                      </button>
                    );
                  })}
                </div>
                {/* Feedback text */}
                {answerResult?.correct!==null && answerResult?.correct!==undefined && (
                  <div style={{ textAlign:'center', marginTop:16, fontWeight:800, fontSize:18, fontFamily:'Nunito,sans-serif',
                    color:answerResult.correct?'#16a34a':'#dc2626' }}>
                    {answerResult.correct ? `✅ Correct! +${answerResult.pts} pts 🚀` : `❌ Wrong! Answer: ${answerResult.correctAnswer}`}
                  </div>
                )}
                {/* Waiting for next question indicator */}
                {waitingNext && (
                  <div style={{ textAlign:'center', marginTop:10, color:'#9ca3af', fontFamily:'Nunito,sans-serif', fontSize:13, fontWeight:600 }}>
                    ⏳ Next question coming…
                  </div>
                )}
              </>
            );
          })() : (
            /* True initial loading — only shown before very first question */
            <div style={{ textAlign:'center', padding:'40px 0', color:'#9ca3af' }}>
              <div style={{ fontSize:48, marginBottom:12, display:'inline-block', animation:'bob 1.5s ease-in-out infinite' }}>🦆</div>
              <p style={{ fontFamily:'Nunito,sans-serif', fontSize:16, fontWeight:600 }}>Loading question…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
