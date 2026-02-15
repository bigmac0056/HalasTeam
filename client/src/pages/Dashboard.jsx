import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import API from '../api/api';

// Premium Components
import HeroCard from '../components/Dashboard/HeroCard';
import SmartSphereAI from '../components/SmartSphereAI';
import MusicCard from '../components/Dashboard/MusicCard';
import HVACCard from '../components/Dashboard/HVACCard';
import CameraCard from '../components/Dashboard/CameraCard';
import SensorCard from '../components/Dashboard/SensorCard';

const modeToScenario = {
  Home: 'Прибытие домой',
  Night: 'Ночной режим',
  Away: 'Ушел из дома',
  Vacation: 'Отпуск'
};

const scenarioToMode = {
  'Прибытие домой': 'Home',
  'Ночной режим': 'Night',
  'Ушел из дома': 'Away',
  'Отпуск': 'Vacation'
};

const ROOM_OPTIONS = ['Зал', 'Спальня', 'Кухня', 'Туалет', 'Коридор'];

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('Все');
  const [homeMode, setHomeMode] = useState('Home');
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
  const [isAutoPilotUpdating, setIsAutoPilotUpdating] = useState(false);
  const [automationLog, setAutomationLog] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [musicPlayback, setMusicPlayback] = useState({
    isPlaying: false,
    currentTrack: null,
    currentTrackId: null,
    playlistId: null
  });
  const [isMusicPlaybackUpdating, setIsMusicPlaybackUpdating] = useState(false);

  // Add device form state
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [type, setType] = useState('');
  const [sensorType, setSensorType] = useState(''); // New state for sensor subtype
  const [source, setSource] = useState('');

  const navigate = useNavigate();
  const brightnessTimerRef = useRef({});
  const dashboardAudioRef = useRef(null);

  const fetchDevices = async () => {
    try {
      const res = await API.get('/devices');
      const devicesData = res.data?.devices;
      setDevices(Array.isArray(devicesData) ? devicesData.filter(Boolean) : []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data?.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchHomeMode = async () => {
    try {
      const res = await API.get('/settings/mode');
      setHomeMode(res.data.mode);
    } catch (error) {
      console.error('Error fetching home mode:', error);
    }
  };

  const fetchAutopilotState = async () => {
    try {
      const res = await API.get('/settings/autopilot');
      setAutoPilotEnabled(Boolean(res.data?.enabled));
    } catch (error) {
      console.error('Error fetching autopilot state:', error);
      setAutoPilotEnabled(false);
    }
  };

  const fetchAutomationLogs = async () => {
    try {
      const res = await API.get('/automation/logs');
      setAutomationLog(res.data.logs);
    } catch (error) {
      console.error('Error fetching automation logs:', error);
    }
  };

  const fetchMusicPlayback = useCallback(async () => {
    try {
      const res = await API.get('/music/playback/state');
      const data = res.data || {};
      setMusicPlayback({
        isPlaying: Boolean(data.isPlaying),
        currentTrack: data.currentTrack || null,
        currentTrackId: data.currentTrackId || data.currentTrack?.id || null,
        playlistId: data.playlistId || null
      });
    } catch (error) {
      console.error('Error fetching music playback state:', error);
    }
  }, []);

  const toggleDevice = async (id) => {
    try {
      await API.post('/devices/toggle', { deviceId: id });
      fetchDevices();
    } catch (error) {
      console.error('Error toggling device:', error);
    }
  };

  const requestDeleteDevice = (id, deviceName) => {
    setDeviceToDelete({ id, name: deviceName });
    setShowDeleteModal(true);
  };

  const confirmDeleteDevice = async () => {
    if (!deviceToDelete?.id) return;
    try {
      await API.delete(`/devices/${deviceToDelete.id}`);
      fetchDevices();
      fetchNotifications();
      setShowDeleteModal(false);
      setDeviceToDelete(null);
    } catch (error) {
      console.error('Error deleting device:', error);
    }
  };

  const handleBrightness = (deviceId, value) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, brightness: value } : d));
    if (brightnessTimerRef.current[deviceId]) clearTimeout(brightnessTimerRef.current[deviceId]);
    brightnessTimerRef.current[deviceId] = setTimeout(async () => {
      try { await API.put(`/devices/${deviceId}/brightness`, { brightness: value }); }
      catch (error) { console.error('Error setting brightness:', error); }
    }, 300);
  };

  const updateHomeMode = async (mode) => {
    try {
      await API.post('/settings/mode', { mode });
      setHomeMode(mode);
      fetchDevices();
    } catch (error) {
      console.error('Error updating home mode:', error);
    }
  };

  const updateAutoPilot = async (enabled) => {
    setIsAutoPilotUpdating(true);
    try {
      const res = await API.post('/settings/autopilot', { enabled });
      setAutoPilotEnabled(Boolean(res.data?.enabled));
      fetchAutomationLogs();
    } catch (error) {
      console.error('Error updating autopilot state:', error);
    } finally {
      setIsAutoPilotUpdating(false);
    }
  };

  const addDevice = async (e) => {
    e.preventDefault();
    try {
      await API.post('/devices/add', { name, room, type, source, sensorType: type === 'Sensor' ? sensorType : undefined });
      setName(''); setRoom(''); setType(''); setSource(''); setSensorType('');
      setShowAddDevice(false);
      fetchDevices();
    } catch (error) {
      console.error('Error adding device:', error);
    }
  };

  const runMusicPlaybackAction = useCallback(async (action) => {
    setIsMusicPlaybackUpdating(true);
    try {
      const res = await action();
      const data = res.data || {};
      setMusicPlayback({
        isPlaying: Boolean(data.isPlaying),
        currentTrack: data.currentTrack || null,
        currentTrackId: data.currentTrackId || data.currentTrack?.id || null,
        playlistId: data.playlistId || null
      });
    } catch (error) {
      console.error('Error updating music playback:', error);
    } finally {
      setIsMusicPlaybackUpdating(false);
    }
  }, []);

  const handleMusicPlayPause = useCallback(async () => {
    if (musicPlayback.isPlaying) {
      await runMusicPlaybackAction(() => API.post('/music/playback/pause'));
      return;
    }
    await runMusicPlaybackAction(() => API.post('/music/playback/play'));
  }, [musicPlayback.isPlaying, runMusicPlaybackAction]);

  const handleMusicNext = useCallback(async () => {
    await runMusicPlaybackAction(() => API.post('/music/playback/next'));
  }, [runMusicPlaybackAction]);

  const handleMusicPrev = useCallback(async () => {
    await runMusicPlaybackAction(() => API.post('/music/playback/prev'));
  }, [runMusicPlaybackAction]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    const initDashboard = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchDevices(),
          fetchHomeMode(),
          fetchAutopilotState(),
          fetchAutomationLogs(),
          fetchNotifications(),
          fetchMusicPlayback()
        ]);
      } catch (error) {
        console.error("Dashboard init error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initDashboard();

    const interval = setInterval(() => {
      fetchDevices();
      fetchNotifications();
      fetchMusicPlayback();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchMusicPlayback, navigate]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await API.get(`/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
            setWeather(res.data);
          } catch (e) {
            console.error('Error loading weather:', e);
          }
        },
        () => {
          console.warn('Geolocation disabled');
        }
      );
    }
  }, []);

  useEffect(() => {
    const audio = dashboardAudioRef.current;
    if (!audio) return;

    const trackUrl = musicPlayback.currentTrack?.fileUrl;
    if (!trackUrl) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    if (audio.src !== trackUrl) {
      audio.src = trackUrl;
    }

    if (musicPlayback.isPlaying) {
      audio.play().catch((error) => {
        console.error('Dashboard audio play error:', error);
      });
    } else {
      audio.pause();
    }
  }, [musicPlayback.currentTrack?.id, musicPlayback.currentTrack?.fileUrl, musicPlayback.isPlaying]);

  const rooms = ['Все', ...new Set([...ROOM_OPTIONS, ...devices.map(d => d.room).filter(Boolean)])];
  const filteredDevices = selectedRoom === 'Все' ? devices : devices.filter(d => d.room === selectedRoom);

  const renderDeviceCard = (device) => {
    if (device.type === 'Speaker' || (device.type === 'Socket' && device.name.toLowerCase().includes('speaker'))) {
      return (
        <MusicCard
          key={device.id}
          name={device.name}
          room={device.room}
          status={device.status}
          currentTrackTitle={musicPlayback.currentTrack?.title || ''}
          isPlaying={musicPlayback.isPlaying}
          onToggle={() => toggleDevice(device.id)}
          onDelete={() => requestDeleteDevice(device.id, device.name)}
          onPlayPause={handleMusicPlayPause}
          onNext={handleMusicNext}
          onPrev={handleMusicPrev}
          controlsDisabled={isMusicPlaybackUpdating}
        />
      );
    }
    if (device.type === 'AC' || device.type === 'Heater') {
      return (
        <HVACCard
          key={device.id}
          name={device.name}
          room={device.room}
          status={device.status}
          onToggle={() => toggleDevice(device.id)}
          onDelete={() => requestDeleteDevice(device.id, device.name)}
        />
      );
    }
    if (device.type === 'Camera') {
      return (
        <CameraCard
          key={device.id}
          name={device.name}
          room={device.room}
          status={device.status}
          onToggle={() => toggleDevice(device.id)}
          onDelete={() => requestDeleteDevice(device.id, device.name)}
        />
      );
    }
    if (device.type === 'Sensor') {
      return (
        <SensorCard
          key={device.id}
          device={device}
          onUpdate={fetchDevices}
          onDelete={() => requestDeleteDevice(device.id, device.name)}
        />
      );
    }

    // Default Generic Card for Light/Socket/etc.
    return (
      <div
        key={device.id}
        className={`relative group bg-white dark:bg-card-dark rounded-3xl p-6 border transition-all hover-lift ${device.status ? 'border-primary/30 bg-primary/5 dark:bg-primary/10' : 'border-slate-100 dark:border-slate-800'}`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${device.status ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
            <span className="material-icons-round text-2xl">
              {device.type === 'Light' ? 'lightbulb' : device.type === 'Socket' ? 'power' : 'device_hub'}
            </span>
          </div>
          <div className="flex items-center gap-2">
              <button
              type="button"
              onClick={() => requestDeleteDevice(device.id, device.name)}
              className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors"
              title="Удалить устройство"
            >
              <span className="material-icons-round text-base">delete</span>
            </button>
            <button
              onClick={() => toggleDevice(device.id)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${device.status ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${device.status ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{device.name}</h3>
        <p className="text-xs text-slate-400 mb-4">{device.room}</p>

        {device.type === 'Light' && device.status && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <input
              type="range" min="1" max="100"
              value={device.brightness ?? 100}
              onChange={(e) => handleBrightness(device.id, parseInt(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-slate-200 dark:bg-slate-700"
            />
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium text-sm animate-pulse">Загрузка умного дома...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] transition-colors duration-500">
      <Header />

      <main className="max-w-[1500px] mx-auto px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Main Dashboard Area */}
          <div className="flex-1 space-y-12">

            {/* Top Navigation / Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex bg-white dark:bg-card-dark p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                {['Home', 'Away', 'Night', 'Vacation'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => updateHomeMode(mode)}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${homeMode === mode ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                  >
                    {mode === 'Home' ? 'Дома' : mode === 'Away' ? 'Ушел' : mode === 'Night' ? 'Ночь' : 'Отпуск'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddDevice(true)}
                className="bg-[#0f172a] hover:bg-slate-800 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="material-icons-round text-xl">add_circle</span>
                Добавить устройство
              </button>
            </div>

            {/* Hero Section */}
            <HeroCard weather={weather} devices={devices} notifications={notifications} />

            {/* Room Filter Footer style */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Active Devices</h2>
                <div className="flex gap-2">
                  {rooms.map(r => (
                    <button
                      key={r}
                      onClick={() => setSelectedRoom(r)}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border ${selectedRoom === r ? 'bg-primary/10 border-primary text-primary' : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-400'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Devices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
                {filteredDevices.map(renderDeviceCard)}
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <aside className="w-full lg:w-80 space-y-8">
            <SmartSphereAI
              autoPilot={autoPilotEnabled}
              onToggleAutoPilot={updateAutoPilot}
              isAutoPilotUpdating={isAutoPilotUpdating}
              scenario={modeToScenario[homeMode] || 'Прибытие домой'}
              onScenarioSelect={(scenario) => {
                const mode = scenarioToMode[scenario];
                if (mode) updateHomeMode(mode);
              }}
            />

            {/* Automation Logs Sidebar version */}
            <div className="bg-white dark:bg-card-dark rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-all h-fit">
              <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-icons-round text-primary">history</span>
                Activity Log
              </h3>
              <div className="space-y-4">
                {automationLog.slice(0, 5).map((log, idx) => (
                  <div key={idx} className="flex gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 group-hover:scale-150 transition-transform"></div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">
                        {new Date(log.timestamp || log.time).toLocaleTimeString('ru-RU')}
                      </p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

        </div>
      </main>

      {/* Add Device Modal - unchanged logic but styled slightly more premium */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-card-dark rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-white/10 animate-fade-in-up">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Новое устройство</h2>
            <form onSubmit={addDevice} className="space-y-6">
              <input type="text" placeholder="Название устройства" value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20" required />
              <select
                value={room}
                onChange={e => setRoom(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Выберите комнату</option>
                {ROOM_OPTIONS.map((roomName) => (
                  <option key={roomName} value={roomName}>
                    {roomName}
                  </option>
                ))}
              </select>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20" required>
                <option value="">Выберите тип</option>
                <option value="Light">Свет</option>
                <option value="Socket">Розетка</option>
                <option value="Heater">Обогреватель</option>
                <option value="AC">Кондиционер</option>
                <option value="Speaker">Колонка</option>
                <option value="Camera">Камера</option>
                <option value="Sensor">Датчик</option>
              </select>

              {type === 'Sensor' && (
                <select value={sensorType} onChange={e => setSensorType(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20" required>
                  <option value="">Выберите тип датчика</option>
                  <option value="temperature">Температура</option>
                  <option value="motion">Движение</option>
                  <option value="smoke">Дым</option>
                  <option value="waterLeak">Протечка воды</option>
                </select>
              )}
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddDevice(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:text-slate-600 transition-colors">Отмена</button>
                <button type="submit" className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20">Добавить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card-dark rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-4">
              <span className="material-icons-round text-2xl">warning</span>
            </div>
            <h3 className="text-xl font-bold text-center text-text-main-light dark:text-text-main-dark mb-2">Удалить устройство?</h3>
            <p className="text-center text-text-muted-light dark:text-text-muted-dark mb-6">
              Устройство <span className="font-semibold">"{deviceToDelete?.name || ''}"</span> будет удалено без возможности восстановления.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeviceToDelete(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-text-main-light dark:text-text-main-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteDevice}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all font-medium"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <audio
        ref={dashboardAudioRef}
        preload="metadata"
        onEnded={handleMusicNext}
      />
    </div>
  );
}
