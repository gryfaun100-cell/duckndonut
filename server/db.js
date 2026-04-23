// server/db.js — JSON flat-file database
const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'db.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const init = { users: [], games: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
    return init;
  }
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return { users: [], games: [] }; }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── EXP / Level helpers ───────────────────────────────────────────────────────
// EXP needed to REACH a given level: level * 250
// e.g. Level 2 = 250 exp, Level 5 = 1250, Level 10 = 2500
function calcLevel(exp) {
  return Math.max(1, Math.floor((exp || 0) / 250) + 1);
}
function expForNextLevel(level) {
  return level * 250;
}

// ── Achievement definitions ───────────────────────────────────────────────────
const ACHIEVEMENTS = [
  // First-time milestones
  { id: 'first_game',   emoji: '🐣', name: 'First Race!',     desc: 'Play your very first game',     coins: 25,   exp: 50,   condition: u => (u.stats?.totalGames || 0) >= 1 },
  { id: 'first_win',    emoji: '🏆', name: 'Winner!',          desc: 'Win your first race',           coins: 50,   exp: 100,  condition: u => (u.stats?.wins || 0) >= 1 },
  { id: 'first_draw',   emoji: '🤝', name: 'Neck and Neck',    desc: 'Finish a game as a draw',       coins: 20,   exp: 40,   condition: u => (u.stats?.draws || 0) >= 1 },
  // Game count
  { id: 'games_10',     emoji: '🎮', name: 'Regular Racer',    desc: 'Play 10 games',                 coins: 100,  exp: 200,  condition: u => (u.stats?.totalGames || 0) >= 10 },
  { id: 'games_50',     emoji: '🦆', name: 'Duck Veteran',     desc: 'Play 50 games',                 coins: 350,  exp: 600,  condition: u => (u.stats?.totalGames || 0) >= 50 },
  { id: 'games_100',    emoji: '💯', name: 'Centurion',        desc: 'Play 100 games',                coins: 1000, exp: 1500, condition: u => (u.stats?.totalGames || 0) >= 100 },
  // Win count
  { id: 'wins_5',       emoji: '🔥', name: 'On a Roll',        desc: 'Win 5 races',                   coins: 75,   exp: 150,  condition: u => (u.stats?.wins || 0) >= 5 },
  { id: 'wins_10',      emoji: '🥇', name: 'Duck Champion',    desc: 'Win 10 races',                  coins: 175,  exp: 350,  condition: u => (u.stats?.wins || 0) >= 10 },
  { id: 'wins_25',      emoji: '⭐', name: 'Star Player',      desc: 'Win 25 races',                  coins: 400,  exp: 750,  condition: u => (u.stats?.wins || 0) >= 25 },
  { id: 'wins_50',      emoji: '⚡', name: 'Unstoppable',      desc: 'Win 50 races',                  coins: 800,  exp: 1500, condition: u => (u.stats?.wins || 0) >= 50 },
  // Level milestones
  { id: 'level_5',      emoji: '🌟', name: 'Duckling',         desc: 'Reach level 5',                 coins: 150,  exp: 0,    condition: u => calcLevel(u.exp) >= 5 },
  { id: 'level_10',     emoji: '💫', name: 'Duck Racer',       desc: 'Reach level 10',                coins: 300,  exp: 0,    condition: u => calcLevel(u.exp) >= 10 },
  { id: 'level_20',     emoji: '🚀', name: 'Speed Duck',       desc: 'Reach level 20',                coins: 750,  exp: 0,    condition: u => calcLevel(u.exp) >= 20 },
  { id: 'level_50',     emoji: '👑', name: 'Legend',           desc: 'Reach level 50',                coins: 2000, exp: 0,    condition: u => calcLevel(u.exp) >= 50 },
  // Special
  { id: 'rich',         emoji: '💰', name: 'Rich Duck',        desc: 'Accumulate 1,000 coins',        coins: 200,  exp: 100,  condition: u => (u.coins || 0) >= 1000 },
  { id: 'power_lover',  emoji: '⚡', name: 'Power Hungry',     desc: 'Use a power-up for first time', coins: 30,   exp: 50,   condition: u => (u.stats?.powerupsUsed || 0) >= 1 },
];

// Check and award achievements, returns newly earned ones
function checkAchievements(userObj) {
  if (!Array.isArray(userObj.achievements)) userObj.achievements = [];
  const earned = userObj.achievements.map(a => a.id);
  const newlyEarned = [];

  for (const ach of ACHIEVEMENTS) {
    if (earned.includes(ach.id)) continue;
    try {
      if (ach.condition(userObj)) {
        userObj.achievements.push({
          id:       ach.id,
          earnedAt: new Date().toISOString(),
        });
        userObj.coins = (userObj.coins || 0) + ach.coins;
        userObj.exp   = (userObj.exp   || 0) + ach.exp;
        newlyEarned.push(ach.id);
      }
    } catch (_) {}
  }
  return newlyEarned;
}

// ── User helpers ──────────────────────────────────────────────────────────────
function getUser(id) {
  return loadDB().users.find(u => u.id === id) || null;
}

function findUserByUsername(username) {
  return loadDB().users.find(
    u => u.username.toLowerCase() === username.toLowerCase()
  ) || null;
}

function createUser({ username, passwordHash }) {
  const db      = loadDB();
  const isFirst = db.users.length === 0;
  const user = {
    id:           uuidv4(),
    username,
    passwordHash,
    role:         isFirst ? 'superadmin' : 'user',
    banned:       false,
    createdAt:    new Date().toISOString(),
    coins:        100,  // starter coins
    exp:          0,
    achievements: [],
    stats:        { wins: 0, losses: 0, draws: 0, totalGames: 0, powerupsUsed: 0 },
    friends:      [],
    gameHistory:  [],
  };
  db.users.push(user);
  saveDB(db);
  return user;
}

function setBanned(id, banned) {
  const db  = loadDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  db.users[idx].banned = !!banned;
  saveDB(db);
  return db.users[idx];
}

function updateUserRole(id, role) {
  const db  = loadDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  db.users[idx].role = role;
  saveDB(db);
  return db.users[idx];
}

// ── Friends ───────────────────────────────────────────────────────────────────
function addFriend(userId, friendId) {
  const db  = loadDB();
  const idx = db.users.findIndex(u => u.id === userId);
  if (idx === -1) return false;
  if (!Array.isArray(db.users[idx].friends)) db.users[idx].friends = [];
  if (!db.users[idx].friends.includes(friendId)) {
    db.users[idx].friends.push(friendId);
    saveDB(db);
  }
  return true;
}

// ── Game recording (with EXP + coins + achievements) ─────────────────────────
const EXP_TABLE   = { win: 120, loss: 25, draw: 60 };
const COINS_TABLE = { win: 30,  loss: 8,  draw: 15  };

function recordGame({ gameId, players, winnerId, isDraw }) {
  const db = loadDB();
  db.games.push({
    id:       gameId,
    date:     new Date().toISOString(),
    players:  players.map(p => ({ id: p.userId || null, name: p.name, score: p.score })),
    winnerId: isDraw ? null : (winnerId || null),
    isDraw:   !!isDraw,
  });

  const newAchievements = {}; // userId → [achIds]

  for (const p of players) {
    if (!p.userId) continue;
    const idx = db.users.findIndex(u => u.id === p.userId);
    if (idx === -1) continue;
    const u = db.users[idx];

    const result = isDraw ? 'draw' : (p.userId === winnerId ? 'win' : 'loss');

    // Stats
    u.stats = u.stats || {};
    u.stats.totalGames = (u.stats.totalGames || 0) + 1;
    if (result === 'win')       u.stats.wins   = (u.stats.wins   || 0) + 1;
    else if (result === 'loss') u.stats.losses = (u.stats.losses || 0) + 1;
    else                        u.stats.draws  = (u.stats.draws  || 0) + 1;

    // EXP & coins
    u.exp   = (u.exp   || 0) + EXP_TABLE[result];
    u.coins = (u.coins || 0) + COINS_TABLE[result];

    // Game history
    if (!Array.isArray(u.gameHistory)) u.gameHistory = [];
    u.gameHistory.unshift({
      gameId,
      date:      new Date().toISOString(),
      result,
      score:     p.score,
      opponents: players.filter(x => x.userId !== p.userId).map(x => x.name),
      expEarned:   EXP_TABLE[result],
      coinsEarned: COINS_TABLE[result],
    });
    if (u.gameHistory.length > 50) u.gameHistory = u.gameHistory.slice(0, 50);

    // Check achievements
    const newly = checkAchievements(u);
    if (newly.length > 0) newAchievements[p.userId] = newly;

    db.users[idx] = u;
  }

  saveDB(db);
  return newAchievements;
}

// ── Admin helpers ─────────────────────────────────────────────────────────────
function getAllUsers() {
  return loadDB().users.map(({ passwordHash: _, ...u }) => u);
}
function getAllGames() { return loadDB().games; }

module.exports = {
  getUser, findUserByUsername, createUser, updateUserRole,
  setBanned, addFriend, recordGame, getAllUsers, getAllGames,
  ACHIEVEMENTS, calcLevel, expForNextLevel,
};
