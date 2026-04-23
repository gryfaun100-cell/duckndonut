// src/api.js — centralised API base URL
// In dev: Vite proxy handles /api → localhost:3001
// In production: set VITE_API_URL=https://your-backend.railway.app in Vercel env vars
const API_URL = import.meta.env.VITE_API_URL || '';

export function apiUrl(path) {
  return `${API_URL}${path}`;
}
