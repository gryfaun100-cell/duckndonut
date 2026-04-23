// server/index.js — Math Duck Race: Express + Socket.IO game server
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const {
  findUserByUsername, createUser, getUser, updateUserRole, setBanned,
  recordGame, addFriend, getAllUsers, getAllGames,
  ACHIEVEMENTS, calcLevel, expForNextLevel,
} = require('./db');

const {
  DIFFICULTY, generateQuestion, createPlayer, createRoom,
  getDifficultyConfig, tryDropPowerup,
} = require('./gameLogic');

const PORT       = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'duck-race-secret-2025';
const GAME_DURATION_MS = 3 * 60 * 1000; // 3-minute game timer

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });

app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', rooms: rooms.size }));

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.userId = jwt.verify(h.slice(7), JWT_SECRET).userId;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const u = getUser(req.userId);
    if (!u || !['admin','superadmin'].includes(u.role))
      return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

// ── REST: Auth ────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)        return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 3 || username.length > 20)
                                       return res.status(400).json({ error: 'Username must be 3–20 chars' });
    if (password.length < 4)           return res.status(400).json({ error: 'Password min 4 chars' });
    if (findUserByUsername(username))  return res.status(409).json({ error: 'Username taken' });

    const hash = await bcrypt.hash(password, 10);
    const user = createUser({ username, passwordHash: hash });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = findUserByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.banned) return res.status(403).json({ error: 'Your account has been banned. Contact an admin.' });
    if (!await bcrypt.compare(password, user.passwordHash))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const user = getUser(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('/auth/me error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ── REST: Profile & Friends ───────────────────────────────────────────────────
app.get('/api/users/:id/profile', (req, res) => {
  const user = getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ username: user.username, stats: user.stats, role: user.role,
             gameHistory: user.gameHistory?.slice(0,20) || [] });
});

app.post('/api/friends/add', requireAuth, (req, res) => {
  const { username } = req.body;
  const friend = findUserByUsername(username);
  if (!friend) return res.status(404).json({ error: 'User not found' });
  if (friend.id === req.userId) return res.status(400).json({ error: 'Cannot add yourself' });
  addFriend(req.userId, friend.id);
  res.json({ success: true, friend: { id: friend.id, username: friend.username, stats: friend.stats } });
});

app.get('/api/friends', requireAuth, (req, res) => {
  const user = getUser(req.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const friends = (user.friends || []).map(fid => {
    const f = getUser(fid);
    return f ? { id: f.id, username: f.username, stats: f.stats } : null;
  }).filter(Boolean);
  res.json({ friends });
});

// ── REST: Admin ───────────────────────────────────────────────────────────────
app.get('/api/admin/users',  requireAdmin, (_req, res) => res.json({ users: getAllUsers() }));
app.get('/api/admin/games',  requireAdmin, (_req, res) => res.json({ games: getAllGames() }));
app.patch('/api/admin/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['user','admin','superadmin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const updated = updateUserRole(req.params.id, role);
  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, user: safeUser(updated) });
});

app.patch('/api/admin/users/:id/ban', requireAdmin, (req, res) => {
  const target = getUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (req.params.id === req.userId) return res.status(400).json({ error: 'Cannot ban yourself' });
  const updated = setBanned(req.params.id, true);
  res.json({ success: true, user: safeUser(updated) });
});

app.patch('/api/admin/users/:id/unban', requireAdmin, (req, res) => {
  const target = getUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const updated = setBanned(req.params.id, false);
  res.json({ success: true, user: safeUser(updated) });
});

// ── REST: Achievements ───────────────────────────────────────────────────────
// Get all achievement definitions
app.get('/api/achievements', (_req, res) => {
  res.json({ achievements: ACHIEVEMENTS.map(({ condition: _, ...a }) => a) });
});

// Get current user's achievement progress
app.get('/api/achievements/me', requireAuth, (req, res) => {
  const u = getUser(req.userId);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const earned = (u.achievements || []).map(a => a.id);
  const progress = ACHIEVEMENTS.map(({ condition: _, ...a }) => ({
    ...a,
    earned:   earned.includes(a.id),
    earnedAt: u.achievements?.find(x => x.id === a.id)?.earnedAt || null,
  }));
  res.json({
    achievements: progress,
    coins:        u.coins  || 0,
    exp:          u.exp    || 0,
    level:        calcLevel(u.exp),
    expForNext:   expForNextLevel(calcLevel(u.exp)),
  });
});

function safeUser(u) {
  const { passwordHash: _, ...safe } = u;
  return safe;
}

// ── In-memory game state ──────────────────────────────────────────────────────
const rooms      = new Map(); // code → room
const playerRoom = new Map(); // socketId → roomCode

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({length:5}, () => chars[Math.floor(Math.random()*chars.length)]).join(''); }
  while (rooms.has(code));
  return code;
}

function broadcastGameState(room) {
  io.to(room.code).emit('game_state', {
    players: room.players.map(p => ({
      id: p.id, name: p.name, score: p.score,
      progress: p.progress, correct: p.correct, total: p.total,
      frozen: p.frozen, heldPowerup: p.heldPowerup,
      fireQuestionsLeft: p.fireQuestionsLeft,
    })),
    state:    room.state,
    winner:   room.winner,
    maxPlayers: room.maxPlayers,
    hostId:   room.hostId,
  });
}

function sendQuestion(room, player) {
  const diff = getDifficultyConfig(player.score);
  const q    = generateQuestion(diff);
  room.currentQuestions[player.id] = q;

  // Fire power-up: timer runs 2× faster
  const baseTime = diff === 'HARD' ? 10 : diff === 'MEDIUM' ? 15 : 20;
  const timeLimit = player.fireQuestionsLeft > 0 ? Math.max(5, Math.floor(baseTime / 2)) : baseTime;

  io.to(player.id).emit('question', {
    question: q.question, choices: q.choices,
    difficulty: diff, timeLimit,
  });
}

async function startCountdown(room) {
  room.state = 'countdown';
  broadcastGameState(room);
  for (let i = 3; i >= 1; i--) {
    io.to(room.code).emit('countdown', i);
    await new Promise(r => setTimeout(r, 1000));
  }
  io.to(room.code).emit('countdown', 'GO!');
  await new Promise(r => setTimeout(r, 800));

  room.state     = 'playing';
  room.startedAt = Date.now();
  broadcastGameState(room);

  for (const player of room.players) sendQuestion(room, player);

  // 3-minute game timer
  room.gameTimerHandle = setTimeout(() => endGameByTimer(room), GAME_DURATION_MS);
}

function endGameByTimer(room) {
  if (room.state !== 'playing') return;
  room.state = 'finished';

  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const isDraw  = sorted.length >= 2 && sorted[0].score === sorted[1].score;
  const winner  = isDraw ? null : sorted[0];

  room.winner = winner ? { id: winner.id, name: winner.name } : null;
  broadcastGameState(room);
  io.to(room.code).emit('game_over', {
    winner: room.winner, isDraw,
    players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, correct: p.correct, total: p.total })),
    reason: 'timeout',
  });

  const winnerUserId = isDraw ? null : (winner?.userId || null);
  recordGame({ gameId: room.gameId, players: room.players, winnerId: winnerUserId, isDraw });
}

// ── Socket.IO ─────────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`[+] ${socket.id}`);

  // Optionally verify token on connect
  // const token = socket.handshake.auth?.token;

  // ── CREATE ROOM ─────────────────────────────────────────────────────────────
  socket.on('create_room', ({ name, userId, maxPlayers = 2 }) => {
    if (!name?.trim()) return socket.emit('error', { message: 'Name required' });
    const code = generateRoomCode();
    const room = createRoom(code, socket.id, name.trim(), userId || null, maxPlayers);
    rooms.set(code, room);
    playerRoom.set(socket.id, code);
    socket.join(code);
    socket.emit('room_created', { code, playerId: socket.id, playerIndex: 0 });
    console.log(`[Room] ${name} created ${code} (max ${room.maxPlayers})`);
  });

  // ── JOIN ROOM ────────────────────────────────────────────────────────────────
  socket.on('join_room', ({ name, code, userId }) => {
    const roomCode = code?.trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room)                    return socket.emit('error', { message: 'Room not found' });
    if (room.players.length >= room.maxPlayers)
                                  return socket.emit('error', { message: 'Room is full!' });
    if (room.state !== 'waiting') return socket.emit('error', { message: 'Game already started' });
    if (!name?.trim())            return socket.emit('error', { message: 'Name required' });

    room.players.push(createPlayer(socket.id, name.trim(), userId || null));
    playerRoom.set(socket.id, roomCode);
    socket.join(roomCode);

    const playerIndex = room.players.length - 1;
    socket.emit('room_joined', { code: roomCode, playerId: socket.id, playerIndex });
    io.to(roomCode).emit('player_joined', {
      players: room.players.map(p => ({ id: p.id, name: p.name })),
    });
    console.log(`[Room] ${name} joined ${roomCode} (${room.players.length}/${room.maxPlayers})`);

    // Auto-start only for 2-player rooms
    if (room.maxPlayers === 2 && room.players.length === 2) startCountdown(room);
  });

  // ── HOST START (3+ player rooms) ─────────────────────────────────────────────
  socket.on('host_start', () => {
    const code = playerRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || room.state !== 'waiting') return;
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only host can start' });
    if (room.players.length < 2)  return socket.emit('error', { message: 'Need at least 2 players' });
    startCountdown(room);
  });

  // ── SUBMIT ANSWER ────────────────────────────────────────────────────────────
  socket.on('submit_answer', ({ answer }) => {
    const code = playerRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room || room.state !== 'playing') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.frozen) return;
    const q = room.currentQuestions[player.id];
    if (!q) return;

    const isCorrect = answer === q.answer;
    const diff = getDifficultyConfig(player.score);
    let pts = DIFFICULTY[diff].points;
    player.total++;

    // Decrease fire counter (regardless of correct/wrong)
    if (player.fireQuestionsLeft > 0) player.fireQuestionsLeft--;

    if (isCorrect) {
      player.correct++;
      if (player.enhanceNext) { pts *= 2; player.enhanceNext = false; }
      player.score    = Math.min(player.score + pts, 100);
      player.progress = player.score;

      // Try to drop a power-up (10% chance)
      const drop = tryDropPowerup();
      if (drop) {
        player.heldPowerup = drop;
        socket.emit('powerup_received', { type: drop });
      }

      socket.emit('answer_result', { correct: true,  answer: q.answer, pts });
    } else {
      player.score    = Math.max(player.score - 2, 0);
      player.progress = player.score;
      socket.emit('answer_result', { correct: false, answer: q.answer, pts: 0 });
    }

    broadcastGameState(room);

    // Win check
    if (player.score >= 100) {
      clearTimeout(room.gameTimerHandle);
      room.state  = 'finished';
      room.winner = { id: player.id, name: player.name };
      broadcastGameState(room);
      io.to(code).emit('game_over', {
        winner: room.winner, isDraw: false,
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, correct: p.correct, total: p.total })),
        reason: 'score',
      });
      recordGame({ gameId: room.gameId, players: room.players, winnerId: player.userId, isDraw: false });
      return;
    }

    setTimeout(() => { if (room.state === 'playing') sendQuestion(room, player); }, 400);
  });

  // ── USE POWER-UP ─────────────────────────────────────────────────────────────
  socket.on('use_powerup', ({ targetId }) => {
    const code = playerRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room || room.state !== 'playing') return;

    const caster = room.players.find(p => p.id === socket.id);
    if (!caster || !caster.heldPowerup) return;

    const type = caster.heldPowerup;
    caster.heldPowerup = null;

    if (type === 'enhance') {
      // Self-buff: next correct answer = double points
      caster.enhanceNext = true;
      socket.emit('powerup_activated', { type: 'enhance', self: true });
      broadcastGameState(room);
      return;
    }

    // Freeze or Fire — target an opponent
    const target = targetId
      ? room.players.find(p => p.id === targetId)
      : room.players.find(p => p.id !== socket.id);
    if (!target) return;

    if (type === 'freeze') {
      target.frozen = true;
      io.to(target.id).emit('frozen', { duration: 3000 });
      broadcastGameState(room);
      setTimeout(() => {
        target.frozen = false;
        io.to(target.id).emit('unfrozen');
        broadcastGameState(room);
      }, 3000);
    } else if (type === 'fire') {
      target.fireQuestionsLeft = 3;
      io.to(target.id).emit('fire_activated', { questions: 3 });
      // Resend question immediately with shorter timer
      const q = room.currentQuestions[target.id];
      if (q) {
        const diff = getDifficultyConfig(target.score);
        const baseTime = diff === 'HARD' ? 10 : diff === 'MEDIUM' ? 15 : 20;
        io.to(target.id).emit('question', {
          question: q.question, choices: q.choices,
          difficulty: diff, timeLimit: Math.max(5, Math.floor(baseTime / 2)),
        });
      }
      broadcastGameState(room);
    }

    io.to(code).emit('powerup_used', { caster: caster.name, type, target: target.name });
  });

  // ── REQUEST CURRENT GAME STATE (GamePage re-requests on mount) ────────────
  socket.on('request_game_state', () => {
    const code = playerRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room) return;
    // Re-send game state to this socket
    socket.emit('game_state', {
      players: room.players.map(p => ({
        id: p.id, name: p.name, score: p.score,
        progress: p.progress, correct: p.correct, total: p.total,
        frozen: p.frozen, heldPowerup: p.heldPowerup,
        fireQuestionsLeft: p.fireQuestionsLeft,
      })),
      state:      room.state,
      winner:     room.winner,
      maxPlayers: room.maxPlayers,
      hostId:     room.hostId,
    });
    // Re-send question if game is playing — always use EXISTING question
    if (room.state === 'playing') {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        const existing = room.currentQuestions[player.id];
        if (existing) {
          const diff = getDifficultyConfig(player.score);
          const baseTime = diff === 'HARD' ? 10 : diff === 'MEDIUM' ? 15 : 20;
          const timeLimit = player.fireQuestionsLeft > 0
            ? Math.max(5, Math.floor(baseTime/2)) : baseTime;
          socket.emit('question', {
            question:   existing.question,
            choices:    existing.choices,
            difficulty: diff,
            timeLimit,
          });
        } else {
          // No question stored yet — send first one
          sendQuestion(room, player);
        }
      }
    }
  });

  // ── REMATCH ──────────────────────────────────────────────────────────────────
  socket.on('request_rematch', () => {
    const code = playerRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room) return;
    room.rematchVotes.add(socket.id);
    io.to(code).emit('rematch_vote', { votes: room.rematchVotes.size, needed: room.players.length });
    if (room.rematchVotes.size >= room.players.length) {
      for (const p of room.players) {
        Object.assign(p, { score:0, progress:0, correct:0, total:0, frozen:false,
                           fireQuestionsLeft:0, enhanceNext:false, heldPowerup:null });
      }
      room.winner = null;
      room.currentQuestions = {};
      room.rematchVotes = new Set();
      room.gameId = Math.random().toString(36).slice(2, 10);
      startCountdown(room);
    }
  });

  // ── DISCONNECT ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const code = playerRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (room) {
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) {
        clearTimeout(room.gameTimerHandle);
        rooms.delete(code);
      } else {
        if (room.state === 'playing') {
          clearTimeout(room.gameTimerHandle);
          room.state = 'waiting';
        }
        io.to(code).emit('opponent_left', { message: 'A player disconnected.' });
        broadcastGameState(room);
      }
    }
    playerRoom.delete(socket.id);
    console.log(`[-] ${socket.id}`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🦆 Math Duck Race server on port ${PORT}`);
  console.log(`   http://localhost:${PORT}\n`);
});
