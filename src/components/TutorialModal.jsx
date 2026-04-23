// src/components/TutorialModal.jsx — How to Play tutorial
import { useState, useEffect } from 'react';

const SLIDES = [
  {
    emoji: '🦆',
    title: 'Welcome to Math Duck Race!',
    content: (
      <div className="space-y-3">
        <p>Race your rubber duck across the river by <strong>solving math problems</strong> faster than your opponents!</p>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#e3f2fd' }}>
          <span className="text-3xl">🐥</span>
          <div>
            <div className="font-bold text-gray-800">1–6 Players</div>
            <div className="text-gray-500 text-sm">Play with friends locally or on the same network</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#e8f5e9' }}>
          <span className="text-3xl">⏱️</span>
          <div>
            <div className="font-bold text-gray-800">3 Minutes per Match</div>
            <div className="text-gray-500 text-sm">Highest score wins when time runs out. Exact tie = Draw!</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    emoji: '🧮',
    title: 'How to Play',
    content: (
      <div className="space-y-3">
        <p>Answer the math question shown on screen by tapping one of the <strong>4 answer buttons</strong>.</p>
        <div className="grid grid-cols-2 gap-2 my-3">
          <div className="py-3 rounded-2xl text-center font-bold text-xl" style={{ background: '#dcfce7', border: '2px solid #16a34a', color: '#166534' }}>✅ Correct</div>
          <div className="py-3 rounded-2xl text-center font-bold text-xl" style={{ background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b' }}>❌ Wrong</div>
        </div>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2"><span>✅</span><span><strong>Correct answer</strong> — your duck moves forward!</span></li>
          <li className="flex items-start gap-2"><span>❌</span><span><strong>Wrong answer</strong> — your duck slips back 2 pts</span></li>
          <li className="flex items-start gap-2"><span>⏳</span><span><strong>Timer runs out</strong> — treated as a wrong answer</span></li>
          <li className="flex items-start gap-2"><span>🏁</span><span><strong>First to 100 pts</strong> wins instantly!</span></li>
        </ul>
      </div>
    ),
  },
  {
    emoji: '🧠',
    title: 'Difficulty Levels',
    content: (
      <div className="space-y-2">
        <p className="text-sm text-gray-500 mb-3">Difficulty scales automatically based on your score:</p>
        {[
          { emoji: '🐣', label: 'EASY', range: '0–29 pts', ops: 'Addition & Subtraction', time: '20s', pts: '+10 pts', color: '#e8f5e9', border: '#43a047', text: '#2e7d32' },
          { emoji: '🦆', label: 'MEDIUM', range: '30–59 pts', ops: '+, −, ×', time: '15s', pts: '+15 pts', color: '#fff8e1', border: '#fb8c00', text: '#e65100' },
          { emoji: '🔥', label: 'HARD', range: '60–100 pts', ops: '+, −, ×, ÷', time: '10s', pts: '+20 pts', color: '#fce4ec', border: '#e53935', text: '#b71c1c' },
        ].map(d => (
          <div key={d.label} className="flex items-center gap-3 p-3 rounded-xl border-2"
            style={{ background: d.color, borderColor: d.border }}>
            <span className="text-3xl">{d.emoji}</span>
            <div className="flex-1">
              <div className="font-bold text-sm" style={{ color: d.text }}>{d.label} — {d.range}</div>
              <div className="text-xs text-gray-500">{d.ops} · {d.time} timer · {d.pts} per correct</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    emoji: '⚡',
    title: 'Power-ups (10% chance!)',
    content: (
      <div className="space-y-2">
        <p className="text-sm text-gray-500 mb-3">Every correct answer has a <strong>10% chance</strong> to drop a power-up. Use it wisely!</p>
        {[
          { emoji: '❄️', name: 'Freeze', color: '#e0f7fa', border: '#00acc1', text: '#006064',
            desc: 'Freezes an opponent for 3 seconds — they cannot submit answers!' },
          { emoji: '🔥', name: 'Fire',   color: '#fbe9e7', border: '#f4511e', text: '#bf360c',
            desc: "Doubles your opponent's timer speed for their next 3 questions — pressure!" },
          { emoji: '⚡', name: 'Enhance',color: '#fffde7', border: '#fbc02d', text: '#f57f17',
            desc: 'Your next correct answer scores DOUBLE points — make it count!' },
        ].map(p => (
          <div key={p.name} className="flex gap-3 p-3 rounded-xl border-2" style={{ background: p.color, borderColor: p.border }}>
            <span className="text-3xl flex-shrink-0">{p.emoji}</span>
            <div>
              <div className="font-bold text-sm" style={{ color: p.text }}>{p.name}</div>
              <div className="text-xs text-gray-600">{p.desc}</div>
            </div>
          </div>
        ))}
        <p className="text-xs text-gray-400 mt-2">💡 You can only hold 1 power-up at a time — new ones replace old ones.</p>
      </div>
    ),
  },
  {
    emoji: '🏆',
    title: 'Rooms & Accounts',
    content: (
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex gap-3 p-3 rounded-xl" style={{ background: '#e8f5e9', border: '2px solid #43a047' }}>
            <span className="text-2xl">🏠</span>
            <div>
              <div className="font-bold text-sm text-green-800">Create Room</div>
              <div className="text-xs text-gray-600">Pick 2–6 max players. Share the 5-letter code with friends.</div>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-xl" style={{ background: '#e3f2fd', border: '2px solid #0288d1' }}>
            <span className="text-2xl">🚪</span>
            <div>
              <div className="font-bold text-sm text-blue-800">Join Room</div>
              <div className="text-xs text-gray-600">Enter the 5-letter room code from a friend to jump in.</div>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-xl" style={{ background: '#fff8e1', border: '2px solid #fbc02d' }}>
            <span className="text-2xl">📊</span>
            <div>
              <div className="font-bold text-sm text-yellow-800">Register an Account</div>
              <div className="text-xs text-gray-600">Save wins, losses & draws. Add friends. View your history.</div>
            </div>
          </div>
        </div>
        <p className="text-center font-bold text-green-700 text-base mt-2" style={{ fontFamily: 'Fredoka One, cursive' }}>
          You're ready to race! 🐥🏁
        </p>
      </div>
    ),
  },
];

export default function TutorialModal({ onClose }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card-glass w-full max-w-lg flex flex-col"
        style={{ maxHeight: '90vh', animation: 'slide-up 0.35s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-4xl" style={{ animation: 'bob 2s ease-in-out infinite' }}>{slide.emoji}</span>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Step {step + 1} of {SLIDES.length}
              </div>
              <h2 style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1.4rem', color: '#1a1a1a', lineHeight: 1.2 }}>
                {slide.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all text-xl"
          >
            ✕
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-3 px-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="rounded-full transition-all"
              style={{
                width: i === step ? 28 : 8,
                height: 8,
                background: i === step ? '#0288d1' : i < step ? '#90caf9' : '#e2e8f0',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div
          key={step}
          className="flex-1 overflow-y-auto px-6 py-4 text-gray-700"
          style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.95rem', lineHeight: 1.6, animation: 'fade-in 0.25s ease-out' }}
        >
          {slide.content}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-6 pb-6 pt-4 border-t border-gray-100 gap-3">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="px-5 py-2.5 rounded-xl font-bold text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition-all text-sm"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {step === 0 ? '✕ Skip' : '← Back'}
          </button>

          <button
            onClick={() => isLast ? onClose() : setStep(s => s + 1)}
            className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
            style={{
              background: isLast
                ? 'linear-gradient(135deg,#43a047,#2e7d32)'
                : 'linear-gradient(135deg,#0288d1,#01579b)',
              fontFamily: 'Nunito, sans-serif',
              boxShadow: `0 4px 16px ${isLast ? 'rgba(67,160,71,0.4)' : 'rgba(2,136,209,0.4)'}`,
            }}
          >
            {isLast ? '🚀 Start Playing!' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
