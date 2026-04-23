// server/gameLogic.js — math engine + room factory + power-up system

const DIFFICULTY = {
  EASY:   { label: 'EASY',   emoji: '🐣', points: 10, winAt: 100 },
  MEDIUM: { label: 'MEDIUM', emoji: '🦆', points: 15, winAt: 100 },
  HARD:   { label: 'HARD',   emoji: '🔥', points: 20, winAt: 100 },
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateQuestion(difficulty) {
  const ops = difficulty === 'HARD'
    ? ['+', '-', '×', '÷']
    : difficulty === 'MEDIUM' ? ['+', '-', '×'] : ['+', '-'];
  const op = ops[rand(0, ops.length - 1)];
  let a, b, answer, question;

  if (difficulty === 'HARD')        { a = rand(2, 15); b = rand(2, 15); }
  else if (difficulty === 'MEDIUM') { a = rand(2, 12); b = rand(2, 12); }
  else                              { a = rand(1, 10); b = rand(1, 10); }

  switch (op) {
    case '+': answer = a + b;   question = `${a} + ${b} = ?`; break;
    case '-': if (a < b) [a, b] = [b, a];
              answer = a - b;   question = `${a} - ${b} = ?`; break;
    case '×': answer = a * b;   question = `${a} × ${b} = ?`; break;
    case '÷': answer = a;       question = `${a * b} ÷ ${b} = ?`; break;
  }

  const wrongs = new Set();
  while (wrongs.size < 3) {
    const offset = rand(-5, 5);
    const w = answer + (offset === 0 ? rand(1, 4) : offset);
    if (w !== answer && w >= 0) wrongs.add(w);
  }
  return { question, answer, choices: shuffle([answer, ...wrongs]) };
}

// ── Player factory ────────────────────────────────────────────────────────────
function createPlayer(socketId, name, userId = null) {
  return {
    id:                socketId,
    userId,             // registered DB id (null = guest)
    name,
    score:             0,
    progress:          0,
    correct:           0,
    total:             0,
    frozen:            false,
    fireQuestionsLeft: 0,  // remaining Qs with 2× timer speed
    enhanceNext:       false, // next correct answer gives 2× pts
    heldPowerup:       null,  // 'freeze' | 'fire' | 'enhance' | null
  };
}

// ── Room factory ──────────────────────────────────────────────────────────────
function createRoom(code, hostId, hostName, hostUserId = null, maxPlayers = 2) {
  return {
    code,
    hostId,
    maxPlayers:      Math.min(Math.max(2, maxPlayers), 6),
    players:         [createPlayer(hostId, hostName, hostUserId)],
    state:           'waiting',   // waiting | countdown | playing | finished
    currentQuestions: {},
    winner:          null,
    rematchVotes:    new Set(),
    gameId:          Math.random().toString(36).slice(2, 10),
    gameTimerHandle: null,
  };
}

function getDifficultyConfig(score) {
  if (score >= 60) return 'HARD';
  if (score >= 30) return 'MEDIUM';
  return 'EASY';
}

// 10% chance to drop one of three power-ups
const POWERUP_TYPES = ['freeze', 'fire', 'enhance'];
function tryDropPowerup() {
  return Math.random() < 0.10
    ? POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]
    : null;
}

module.exports = {
  DIFFICULTY, generateQuestion, createPlayer, createRoom,
  getDifficultyConfig, tryDropPowerup,
};
