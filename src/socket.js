// src/socket.js
// Singleton Socket.IO client.
// In development: connects via Vite proxy (same host, same port).
// In production (global deploy): set VITE_SERVER_URL env var to your backend URL.

import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
