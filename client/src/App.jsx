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

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <MusicPlayerProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
