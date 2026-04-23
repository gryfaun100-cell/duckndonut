// src/App.jsx — Router with auth protection
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar       from './components/Navbar';
import AuthPage     from './pages/AuthPage';
import LandingPage  from './pages/LandingPage';
import LobbyPage    from './pages/LobbyPage';
import GamePage     from './pages/GamePage';
import WinnerPage   from './pages/WinnerPage';
import ProfilePage  from './pages/ProfilePage';
import AdminPage    from './pages/AdminPage';
import './App.css';

// Route that requires any identity (logged in OR guest)
function RequireIdentity({ children }) {
  const { isLoggedIn, isGuest, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background:'linear-gradient(160deg,#87CEEB,#0288d1)' }}>
      <div className="text-white text-3xl" style={{ animation:'bob 1.5s ease-in-out infinite' }}>🦆</div>
    </div>
  );
  if (!isLoggedIn && !isGuest) return <Navigate to="/auth" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isAdmin, isLoggedIn, loading } = useAuth();
  if (loading) return null;
  if (!isLoggedIn || !isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background:'linear-gradient(160deg,#87CEEB,#0288d1)' }}>
      <div>
        <div className="text-6xl text-center" style={{ animation:'bob 1.5s ease-in-out infinite' }}>🦆</div>
        <div className="text-white font-bold text-center mt-2" style={{ fontFamily:'Fredoka One,cursive' }}>Loading...</div>
      </div>
    </div>
  );

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<RequireIdentity><LandingPage /></RequireIdentity>} />
        <Route path="/lobby"   element={<RequireIdentity><LobbyPage   /></RequireIdentity>} />
        <Route path="/game"    element={<RequireIdentity><GamePage    /></RequireIdentity>} />
        <Route path="/winner"  element={<RequireIdentity><WinnerPage  /></RequireIdentity>} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin"   element={<RequireAdmin><AdminPage /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
