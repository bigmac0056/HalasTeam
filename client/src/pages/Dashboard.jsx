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
import { useMusicPlayer } from '../context/MusicPlayerContext';

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
const DEFAULT_WEATHER_COORDS = { lat: 51.1694, lon: 71.4491 };
const WEATHER_REFRESH_MS = 5 * 60 * 1000;
const LAST_KNOWN_COORDS_KEY = 'smartsphere_last_known_coords';
const JUDGE_HINT_DISMISSED_KEY = 'smartsphere_judge_hint_dismissed';
const DEFAULT_AI_STATUS = {
  new: { count: 0, items: [] },
  applied: { count: 0, items: [] },
  effect: { successfulActions: 0, estimatedSavedKwhMonth: 0, estimatedSavedKztMonth: 0 }
};

const readStoredCoords = () => {
  try {
    const raw = localStorage.getItem(LAST_KNOWN_COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lat = Number(parsed?.lat);
    const lon = Number(parsed?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
};

const persistCoords = (lat, lon) => {
  try {
    localStorage.setItem(LAST_KNOWN_COORDS_KEY, JSON.stringify({ lat, lon, savedAt: new Date().toISOString() }));
  } catch {
    // Ignore storage errors.
  }
};

const createClientWeatherFallback = (city = 'Астана') => {
  const hour = new Date().getHours();
  const isDay = hour >= 7 && hour < 20;

  return {
    temperature: 20,
    windspeed: 0,
    weathercode: isDay ? 2 : 0,
    isDay,
    city,
    source: 'client-fallback',
    isFallback: true,
    fetchedAt: new Date().toISOString()
  };
};

const fetchWeatherDirectFromBrowser = async (lat, lon, city = 'Ваш регион') => {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,wind_speed_10m,weather_code,is_day',
    timezone: 'auto'
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Direct weather fetch failed: ${response.status}`);
  }

  const data = await response.json();
  const current = data?.current || data?.current_weather;
  const temperature = Number(current?.temperature_2m ?? current?.temperature);
  if (!Number.isFinite(temperature)) {
    throw new Error('Direct weather has no temperature');
  }

  const windspeed = Number(current?.wind_speed_10m ?? current?.windspeed);
  const weathercode = Number(current?.weather_code ?? current?.weathercode);
  const isDay = Number(current?.is_day) === 1;

  return {
    temperature,
    windspeed: Number.isFinite(windspeed) ? windspeed : 0,
    weathercode: Number.isFinite(weathercode) ? weathercode : 2,
    isDay,
    city,
    source: 'open-meteo-direct',
    isFallback: false,
    fetchedAt: new Date().toISOString()
  };
};

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('Все');
  const [homeMode, setHomeMode] = useState('Home');
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
  const [isAutoPilotUpdating, setIsAutoPilotUpdating] = useState(false);
  const [automationLog, setAutomationLog] = useState([]);
  const [logCategoryFilter, setLogCategoryFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [aiActions, setAiActions] = useState([]);
  const [aiStatus, setAiStatus] = useState(DEFAULT_AI_STATUS);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [apiHealth, setApiHealth] = useState({ status: 'unknown', checkedAt: null });
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [showJudgeHint, setShowJudgeHint] = useState(() => {
    try {
      return localStorage.getItem(JUDGE_HINT_DISMISSED_KEY) !== 'true';
    } catch {
      return true;
    }
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);

  // Add device form state
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [type, setType] = useState('');
  const [sensorType, setSensorType] = useState(''); // New state for sensor subtype
  const [source, setSource] = useState('');

  const navigate = useNavigate();
  const brightnessTimerRef = useRef({});
  const weatherCoordsRef = useRef(readStoredCoords() || DEFAULT_WEATHER_COORDS);
  const {
    playback,
    isBusy: isMusicPlaybackUpdating,
    play,
    pause,
    next,
    prev,
    seek,
    syncFromBackend
  } = useMusicPlayer();

  const markSynced = useCallback(() => {
    setLastSyncAt(new Date());
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await API.get('/devices');
      const devicesData = res.data?.devices;
      setDevices(Array.isArray(devicesData) ? devicesData.filter(Boolean) : []);
      markSynced();
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  }, [markSynced]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data?.notifications || []);
      markSynced();
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [markSynced]);

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

  const fetchAutomationLogs = useCallback(async () => {
    try {
      const res = await API.get('/automation/logs');
      setAutomationLog(Array.isArray(res.data?.logs) ? res.data.logs : []);
      markSynced();
    } catch (error) {
      console.error('Error fetching automation logs:', error);
    }
  }, [markSynced]);

  const checkApiHealth = async () => {
    try {
      await API.get('/health');
      setApiHealth({ status: 'online', checkedAt: new Date() });
    } catch (error) {
      console.error('API health check failed:', error);
      setApiHealth({ status: 'offline', checkedAt: new Date() });
    }
  };

  const fetchAiRecommendations = async () => {
    setIsAiLoading(true);
    try {
      const res = await API.get('/ai/recommendations');
      setAiRecommendations(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const fetchAiActions = async () => {
    try {
      const res = await API.get('/ai/actions', { params: { limit: 8 } });
      setAiActions(res.data?.actions || []);
    } catch (error) {
      console.error('Error fetching AI actions:', error);
    }
  };

  const fetchAiStatus = async () => {
    try {
      const res = await API.get('/ai/status', { params: { lookbackDays: 30 } });
      setAiStatus({
        new: res.data?.new || { count: 0, items: [] },
        applied: res.data?.applied || { count: 0, items: [] },
        effect: res.data?.effect || { successfulActions: 0, estimatedSavedKwhMonth: 0, estimatedSavedKztMonth: 0 }
      });
    } catch (error) {
      console.error('Error fetching AI status:', error);
      setAiStatus(DEFAULT_AI_STATUS);
    }
  };

  const applyAiRecommendation = async (id) => {
    try {
      await API.post(`/ai/recommendations/${id}/apply`);
      await Promise.all([fetchAiRecommendations(), fetchAiActions(), fetchAiStatus(), fetchDevices(), fetchAutomationLogs()]);
    } catch (error) {
      console.error('Error applying AI recommendation:', error);
    }
  };

  const dismissAiRecommendation = async (id) => {
    try {
      await API.post(`/ai/recommendations/${id}/dismiss`);
      await Promise.all([fetchAiRecommendations(), fetchAiStatus()]);
    } catch (error) {
      console.error('Error dismissing AI recommendation:', error);
    }
  };


  const toggleDevice = async (id) => {
    try {
      await API.post('/devices/toggle', { deviceId: id });
      fetchDevices();
      syncFromBackend();
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
      await Promise.all([fetchDevices(), syncFromBackend(), fetchAiRecommendations(), fetchAutomationLogs()]);
    } catch (error) {
      console.error('Error updating home mode:', error);
    }
  };

  const updateAutoPilot = async (enabled) => {
    setIsAutoPilotUpdating(true);
    try {
      const res = await API.post('/settings/autopilot', { enabled });
      setAutoPilotEnabled(Boolean(res.data?.enabled));
      await Promise.all([fetchAutomationLogs(), fetchAiRecommendations()]);
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

  const handleMusicPlayPause = useCallback(async () => {
    if (playback.isPlaying) {
      await pause();
      return;
    }
    await play();
  }, [pause, play, playback.isPlaying]);

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
          checkApiHealth(),
          syncFromBackend(),
          fetchAiRecommendations(),
          fetchAiActions(),
          fetchAiStatus()
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
    }, 10000);
    const healthInterval = setInterval(() => {
      checkApiHealth();
    }, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(healthInterval);
    };
  }, [navigate, syncFromBackend, fetchDevices, fetchNotifications, fetchAutomationLogs]);

  useEffect(() => {
    let isMounted = true;

    const loadWeather = async (lat, lon) => {
      try {
        const res = await API.get('/weather', {
          params: { lat, lon }
        });
        const weatherData = res.data || {};
        const hasTemperature = Number.isFinite(Number(weatherData.temperature ?? weatherData.temp));

        if (hasTemperature && !weatherData.isFallback) {
          if (isMounted) setWeather(weatherData);
          return;
        }

        const directWeather = await fetchWeatherDirectFromBrowser(lat, lon, weatherData.city || 'Ваш регион');
        if (isMounted) {
          setWeather({
            ...directWeather,
            city: weatherData.city || directWeather.city
          });
        }
      } catch (error) {
        console.error('Error loading weather:', error);
        try {
          const directWeather = await fetchWeatherDirectFromBrowser(lat, lon, 'Ваш регион');
          if (isMounted) setWeather(directWeather);
        } catch (directError) {
          console.error('Direct weather fallback failed:', directError);
          if (isMounted) {
            setWeather((prev) => prev || createClientWeatherFallback());
          }
        }
      }
    };

    const setCoordsAndLoadWeather = async (lat, lon) => {
      weatherCoordsRef.current = { lat, lon };
      persistCoords(lat, lon);
      await loadWeather(lat, lon);
    };

    const loadFallbackWeather = () => {
      const stored = readStoredCoords();
      const fallbackCoords = stored || DEFAULT_WEATHER_COORDS;
      setCoordsAndLoadWeather(fallbackCoords.lat, fallbackCoords.lon);
    };

    if (!navigator.geolocation) {
      loadFallbackWeather();
      const refreshTimer = setInterval(() => {
        const { lat, lon } = weatherCoordsRef.current;
        loadWeather(lat, lon);
      }, WEATHER_REFRESH_MS);
      return () => {
        isMounted = false;
        clearInterval(refreshTimer);
      };
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await setCoordsAndLoadWeather(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        console.warn('Geolocation disabled. Using fallback weather location.');
        loadFallbackWeather();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10 * 60 * 1000
      }
    );

    const refreshTimer = setInterval(() => {
      const { lat, lon } = weatherCoordsRef.current;
      loadWeather(lat, lon);
    }, WEATHER_REFRESH_MS);

    return () => {
      isMounted = false;
      clearInterval(refreshTimer);
    };
  }, []);

  const rooms = ['Все', ...new Set([...ROOM_OPTIONS, ...devices.map(d => d.room).filter(Boolean)])];
  const filteredDevices = selectedRoom === 'Все' ? devices : devices.filter(d => d.room === selectedRoom);
  const filteredLogs = automationLog.filter((log) => {
    if (logCategoryFilter === 'all') return true;
    if (log.category) return log.category === logCategoryFilter;
    const message = String(log.message || '').toLowerCase();
    if (logCategoryFilter === 'alert') return message.includes('тревога');
    if (logCategoryFilter === 'automation') return message.includes('автомат') || message.includes('режим') || message.includes('автопилот');
    return !message.includes('автомат') && !message.includes('режим') && !message.includes('автопилот') && !message.includes('тревога');
  });
  const dismissJudgeHint = () => {
    setShowJudgeHint(false);
    try {
      localStorage.setItem(JUDGE_HINT_DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const renderDeviceCard = (device) => {
    if (device.type === 'Speaker' || (device.type === 'Socket' && device.name.toLowerCase().includes('speaker'))) {
      return (
        <MusicCard
          key={device.id}
          name={device.name}
          room={device.room}
          status={device.status}
          currentTrackTitle={playback.currentTrack?.title || ''}
          isPlaying={playback.isPlaying}
          progressPercent={playback.progressPercent}
          currentTimeLabel={playback.currentTimeLabel}
          durationLabel={playback.durationLabel}
          playbackError={playback.error}
          onToggle={() => toggleDevice(device.id)}
          onDelete={() => requestDeleteDevice(device.id, device.name)}
          onPlayPause={handleMusicPlayPause}
          onNext={next}
          onPrev={prev}
          onSeek={seek}
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] transition-colors duration-500">
      <Header />

      <main className="max-w-[1500px] mx-auto px-8 py-10 pb-32">
        {isLoading && (
          <div className="mb-4 text-sm font-medium text-slate-500 animate-pulse">
            Обновление данных...
          </div>
        )}
        {showJudgeHint && (
          <div className="mb-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-900/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-1">Подсказка для демонстрации (1 минута)</p>
                <p className="text-xs text-indigo-700/80 dark:text-indigo-300/90">
                  1) Нажми <span className="font-semibold">Я ушел</span> → 2) покажи запись в Activity Log → 3) открой Энергопотребление и блок Советы ИИ.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissJudgeHint}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/80 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700"
              >
                Скрыть
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Main Dashboard Area */}
          <div className="flex-1 space-y-12">

            {/* Top Navigation / Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-3">
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
                  type="button"
                  onClick={() => updateHomeMode('Away')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors"
                  title='Быстрый режим: Ушел из дома'
                >
                  Я ушел
                </button>
                <button
                  type="button"
                  onClick={() => updateHomeMode('Night')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                  title='Быстрый режим: Ночь'
                >
                  Ночь
                </button>
                <button
                  type="button"
                  onClick={() => updateHomeMode('Away')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-colors"
                  title='Быстро отключить активные устройства'
                >
                  Выключить всё
                </button>
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
              recommendations={aiRecommendations}
              recommendationsLoading={isAiLoading}
              onRefreshRecommendations={fetchAiRecommendations}
              onApplyRecommendation={applyAiRecommendation}
              onDismissRecommendation={dismissAiRecommendation}
              actions={aiActions}
              aiStatus={aiStatus}
            />

            {/* Automation Logs Sidebar version */}
            <div className="bg-white dark:bg-card-dark rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-all h-fit">
              <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-icons-round text-primary">history</span>
                Activity Log
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { key: 'all', label: 'Все' },
                  { key: 'alert', label: 'Тревоги' },
                  { key: 'automation', label: 'Автоматика' },
                  { key: 'manual', label: 'Ручные' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLogCategoryFilter(item.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      logCategoryFilter === item.key
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                {filteredLogs.slice(0, 8).map((log, idx) => (
                  <div key={idx} className="flex gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 group-hover:scale-150 transition-transform ${
                      log.category === 'alert' ? 'bg-red-500'
                        : log.category === 'manual' ? 'bg-amber-500'
                          : 'bg-primary'
                    }`}></div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">
                        {new Date(log.timestamp || log.time).toLocaleTimeString('ru-RU')}
                      </p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{log.message}</p>
                    </div>
                  </div>
                ))}
                {filteredLogs.length === 0 && (
                  <p className="text-xs text-slate-400">Событий выбранного типа пока нет.</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-card-dark rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-all h-fit">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-icons-round text-primary">verified</span>
                Надежность системы
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500">Статус API</span>
                  <span className={`font-bold ${apiHealth.status === 'online' ? 'text-emerald-600' : apiHealth.status === 'offline' ? 'text-red-500' : 'text-slate-500'}`}>
                    {apiHealth.status === 'online' ? 'Онлайн' : apiHealth.status === 'offline' ? 'Оффлайн' : 'Проверка...'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500">Последняя синхронизация</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {lastSyncAt ? lastSyncAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500">Геолокация/погода</span>
                  <span className={`font-semibold ${(weather?.isFallback || weather?.source === 'client-fallback') ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {(weather?.isFallback || weather?.source === 'client-fallback') ? 'Fallback' : 'Точные данные'}
                  </span>
                </div>
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

    </div>
  );
}
