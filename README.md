# 🐥 Math Duck Race

A real-time multiplayer math racing game built with **React + Node.js + Socket.IO**.

Race your duck to the finish line by answering math questions faster than your opponents!

---

## ✨ Features

- 🎮 **Real-time multiplayer** — 2–6 players per room via Socket.IO
- 🧮 **Adaptive difficulty** — Easy → Medium → Hard as your score rises
- ⚡ **Power-ups** — Freeze, Fire, and Enhance with 10% drop chance
- 🪙 **Coins & EXP system** — Earn currency and level up your duck
- 🏆 **16 Achievements** — Milestone rewards for games, wins, and levels
- 👥 **User accounts** — Register, add friends, view game history
- 👑 **Admin dashboard** — User management, ban/unban, role assignment
- 🐥 **Guest mode** — Play instantly without registering

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/DuckNDonut.git
cd DuckNDonut

# 2. Install frontend dependencies
npm install

# 3. Install server dependencies
cd server && npm install && cd ..
```

### Running Locally

Open **two terminals**:

**Terminal 1 — Backend (port 3001)**
```bash
node server/index.js
```

**Terminal 2 — Frontend (port 5173)**
```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, React Router |
| Styling | Vanilla CSS + Inline styles |
| Backend | Node.js, Express |
| Realtime | Socket.IO |
| Auth | JWT + bcryptjs |
| Database | JSON flat-file (`server/db.json`) |

## 📁 Project Structure

```
DuckNDonut/
├── src/
│   ├── pages/          # Landing, Game, Lobby, Profile, Admin, Auth, Winner
│   ├── components/     # Navbar, TutorialModal
│   ├── context/        # AuthContext (global user state)
│   └── socket.js       # Socket.IO client singleton
├── server/
│   ├── index.js        # Express + Socket.IO server
│   ├── db.js           # JSON database helpers
│   └── gameLogic.js    # Question generation, power-up logic
└── public/             # Static assets
```

## 🎮 How to Play

1. Register or play as a guest
2. Create or join a room with a 5-letter code
3. Answer math questions to move your duck forward
4. First to 100 points wins — or highest score after 3 minutes!

## 📄 License

MIT
