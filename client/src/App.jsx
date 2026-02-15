import { useEffect, useState } from 'react';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Energy from './pages/Energy';
import Automation from './pages/Automation';
import Register from './pages/Register';
import OAuthCallback from './pages/OAuthCallback';
import InfoPage from './pages/InfoPage';
import Music from './pages/Music';
import GlobalMusicBar from './components/GlobalMusicBar';
import { MusicPlayerProvider } from './context/MusicPlayerContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const getAuthState = () => Boolean(localStorage.getItem('token'));

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(getAuthState);

  useEffect(() => {
    const syncAuth = () => setIsAuthenticated(getAuthState());
    window.addEventListener('storage', syncAuth);
    window.addEventListener('auth-changed', syncAuth);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('auth-changed', syncAuth);
    };
  }, []);

  return (
    <Router>
      <MusicPlayerProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
          />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/info/:slug" element={<InfoPage />} />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
          />
          <Route
            path="/energy"
            element={isAuthenticated ? <Energy /> : <Navigate to="/login" />}
          />
          <Route
            path="/automation"
            element={isAuthenticated ? <Automation /> : <Navigate to="/login" />}
          />
          <Route
            path="/music"
            element={isAuthenticated ? <Music /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <GlobalMusicBar />
      </MusicPlayerProvider>
    </Router>
  );
}

export default App;
