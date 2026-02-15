import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import API from '../api/api';

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('Все');
  const [homeMode, setHomeMode] = useState('Home');
  const [automationLog, setAutomationLog] = useState([]);

  // Add device form state
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [type, setType] = useState('');
  const [source, setSource] = useState('');

  const navigate = useNavigate();



  const addDevice = async (e) => {
    e.preventDefault();
    if (!name || !room || !type || !source) return;

    try {
      await API.post('/devices/add', { name, room, type, source });
      setName('');
      setRoom('');
      setType('');
      setSource('');
      setShowAddDevice(false);
      fetchDevices();
    } catch (error) {
      console.error('Error adding device:', error);
      alert('Не удалось добавить устройство');
    }
  };

  const toggleDevice = async (id) => {
    try {
      await API.post('/devices/toggle', { deviceId: id });
      fetchDevices();
    } catch (error) {
      console.error('Error toggling device:', error);
    }
  };

  const handleDeleteDevice = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить это устройство?')) {
      try {
        await API.delete(`/devices/${id}`);
        fetchDevices();
      } catch (error) {
        console.error('Error deleting device:', error);
        alert('Не удалось удалить устройство');
      }
    }
  };

  // Brightness control with debouncing
  const brightnessTimerRef = useRef({});

  const handleBrightness = (deviceId, value) => {
    // Optimistic UI update
    setDevices(prev => prev.map(d =>
      d.id === deviceId ? { ...d, brightness: value } : d
    ));

    // Debounce API call
    if (brightnessTimerRef.current[deviceId]) {
      clearTimeout(brightnessTimerRef.current[deviceId]);
    }
    brightnessTimerRef.current[deviceId] = setTimeout(async () => {
      try {
        await API.put(`/devices/${deviceId}/brightness`, { brightness: value });
      } catch (error) {
        console.error('Error setting brightness:', error);
      }
    }, 300);
  };

  const fetchDevices = async () => {
    try {
      const res = await API.get('/devices');
      setDevices(res.data.devices);
    } catch (error) {
      console.error('Error fetching devices:', error);
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

  const fetchAutomationLogs = async () => {
    try {
      const res = await API.get('/automation/logs');
      setAutomationLog(res.data.logs);
    } catch (error) {
      console.error('Error fetching automation logs:', error);
    }
  };

  const updateHomeMode = async (mode) => {
    try {
      const res = await API.post('/settings/mode', { mode });
      setHomeMode(mode);
      // Reset weather auto so it can re-run for new mode
      weatherAutoRanRef.current = '';
      // Log turned off devices if any
      if (res.data.turnedOff && res.data.turnedOff.length > 0) {
        addLog(`🏠 ${res.data.message}`);
      } else {
        addLog(`🏠 Режим изменен на ${mode === 'Home' ? 'Дома' : mode === 'Away' ? 'Ушел' : mode === 'Night' ? 'Ночь' : 'Отпуск'}`);
      }
      // Re-fetch devices to reflect changes
      fetchDevices();
    } catch (error) {
      console.error('Error updating home mode:', error);
    }
  };

  const addLog = async (message) => {
    try {
      const res = await API.post('/automation/logs', { message });
      // Use server response to ensure we have the correct timestamp/format
      // But to avoid flicker/refetch, we can just append if successful
      const newLog = res.data.log;
      // Server returns { id, ...data, timestamp }
      // Dashboard expects { time: timestamp, message }? 
      // Check existing logs format. 
      // State.js: { id, userId, message, timestamp }
      // Dashboard.jsx previous: { time: timestamp, message }
      // We should unify. 
      // Let's assume Dashboard now consumes { timestamp, message } from server GET.
      // The timestamp formatting was previously: new Date().toLocaleTimeString('ru-RU');
      // Server gives ISO string. We should format it in render.

      // For now, let's keep it simple:
      setAutomationLog(prev => [{
        timestamp: newLog.timestamp,
        message: newLog.message
      }, ...prev].slice(0, 5));

    } catch (error) {
      console.error('Error adding log:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const loadData = async () => {
      await fetchDevices();
      await fetchHomeMode();
      await fetchAutomationLogs();
    };
    loadData();
  }, [navigate]);

  // Periodic automation rule execution — every 30 seconds + immediate first run
  useEffect(() => {
    const executeRules = async () => {
      try {
        const temp = weather?.temperature;
        const res = await API.post('/automation/execute', { temperature: temp });
        if (res.data.executed && res.data.executed.length > 0) {
          fetchDevices();
          fetchAutomationLogs();
        }
      } catch (error) {
        // Silent — automation check is background work
      }
    };

    // Run immediately, then every 30 seconds
    executeRules();
    const interval = setInterval(executeRules, 30000);

    return () => clearInterval(interval);
  }, [weather]);


  // Weather fetching
  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        setWeatherError(null);
        const res = await API.get(`/weather?lat=${lat}&lon=${lon}`);
        setWeather(res.data);
      } catch (error) {
        console.error('Error fetching weather:', error);
        setWeatherError('Не удалось получить данные о погоде');
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(latitude, longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setWeatherError('Доступ к геолокации запрещен. Пожалуйста, включите геолокацию.');
        }
      );
    } else {
      setTimeout(() => setWeatherError('Геолокация не поддерживается вашим браузером'), 0);
    }
  }, []);



  const getWeatherRecommendation = () => {
    if (!weather) return null;

    const temp = weather.temperature;

    if (temp < 5) {
      return { icon: '🥶', text: 'Одевайтесь теплее! Снаружи мороз', color: 'blue' };
    } else if (temp < 15) {
      return { icon: '🧥', text: 'Наденьте куртку, прохладно', color: 'cyan' };
    } else if (temp < 25) {
      return { icon: '😊', text: 'Отличная погода! Наслаждайтесь днём', color: 'green' };
    } else if (temp < 30) {
      return { icon: '💧', text: 'Пейте воду, становится жарко', color: 'yellow' };
    } else {
      return { icon: '🔥', text: 'Жарко! Пейте больше воды', color: 'red' };
    }
  };

  const getWeatherIcon = (code) => {
    // Open-Meteo weather codes
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '🌨️';
    if (code <= 99) return '⛈️';
    return '🌤️';
  };

  const deviceTypes = [
    { label: 'Свет', value: 'Light', icon: 'lightbulb' },
    { label: 'Розетка', value: 'Socket', icon: 'power' },
    { label: 'Обогреватель', value: 'Heater', icon: 'local_fire_department' },
    { label: 'Кондиционер', value: 'AC', icon: 'ac_unit' },
    { label: 'Камера', value: 'Camera', icon: 'videocam' },
    { label: 'Датчик', value: 'Sensor', icon: 'sensors' },
    { label: 'Штора', value: 'Curtain', icon: 'blinds' },
    { label: 'Термостат', value: 'Thermostat', icon: 'thermostat' }
  ];

  const getDeviceIcon = (type) => {
    const device = deviceTypes.find(d => d.value === type);
    // Fallback for English types if they exist in DB
    if (!device) {
      if (type === 'Light') return 'lightbulb';
      if (type === 'Socket') return 'power';
      if (type === 'Heater') return 'local_fire_department';
      if (type === 'AC') return 'ac_unit';
      if (type === 'Camera') return 'videocam';
      if (type === 'Sensor') return 'sensors';
      if (type === 'Curtain') return 'blinds';
      if (type === 'Thermostat') return 'thermostat';
    }
    return device ? device.icon : 'device_hub';
  };

  const rooms = ['Все', ...new Set(devices.map(d => d.room))];
  const filteredDevices = selectedRoom === 'Все'
    ? devices
    : devices.filter(d => d.room === selectedRoom);

  const recommendation = getWeatherRecommendation();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300">
      {/* Header Navigation */}
      <Header />

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-8 py-8">
        {/* Overview Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Добро пожаловать домой</h1>
              <p className="text-text-muted-light dark:text-text-muted-dark mt-1">
                {new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => setShowAddDevice(true)}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2"
            >
              <span className="material-icons-round">add</span>
              Добавить устройство
            </button>
          </div>

          {/* System Status & Weather Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* System Status Card */}
            <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="material-icons-round text-green-600 dark:text-green-400 text-2xl">check_circle</span>
                </div>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-bold">ОНЛАЙН</span>
              </div>
              <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-1">Статус системы</h3>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Все системы работают</p>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-muted-light dark:text-text-muted-dark">Активные устройства</span>
                  <span className="font-bold text-text-light dark:text-text-dark">{devices.filter(d => d.status).length}/{devices.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-text-muted-light dark:text-text-muted-dark text-sm">Режим дома</span>
                  <div className="flex gap-2">
                    {['Home', 'Away', 'Night', 'Vacation'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => updateHomeMode(mode)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${homeMode === mode
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                      >
                        {mode === 'Home' ? 'Дома' : mode === 'Away' ? 'Ушел' : mode === 'Night' ? 'Ночь' : 'Отпуск'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Weather Card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-indigo-900 dark:to-slate-900 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-20 text-9xl">
                {weather && getWeatherIcon(weather.weathercode)}
              </div>
              <div className="relative z-10">
                {weather ? (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-blue-100 text-sm font-medium mb-1">Погода</p>
                        <h2 className="text-5xl font-bold">{weather.temperature}°C</h2>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-100 text-sm">Ветер</p>
                        <p className="text-2xl font-bold">{weather.windspeed} км/ч</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-6">
                      <div className="flex items-center gap-2">
                        <span className="material-icons-round">thermostat</span>
                        <span className="text-sm">Температура</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-icons-round">air</span>
                        <span className="text-sm">Ветер</span>
                      </div>
                    </div>
                  </>
                ) : weatherError ? (
                  <div className="text-center py-8">
                    <span className="material-icons-round text-5xl mb-2 opacity-50">cloud_off</span>
                    <p className="text-blue-100">{weatherError}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                    >
                      Повторить
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <span className="material-icons-round text-5xl mb-2 opacity-50 animate-pulse">cloud</span>
                    <p className="text-blue-100">Загрузка погоды...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recommendation & Automation Log */}
          {(recommendation || automationLog.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Weather Recommendation */}
              {recommendation && (
                <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{recommendation.icon}</div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-muted-light dark:text-text-muted-dark mb-1">Совет</h3>
                      <p className="text-lg font-bold text-text-light dark:text-text-dark">{recommendation.text}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Automation Log */}
              {automationLog.length > 0 && (
                <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-text-muted-light dark:text-text-muted-dark mb-3">Журнал автоматизации</h3>
                  <div className="space-y-2">
                    {automationLog.map((log, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-text-muted-light dark:text-text-muted-dark">
                          {new Date(log.timestamp || log.time).toLocaleTimeString('ru-RU')}
                        </span>
                        <span className="text-text-light dark:text-text-dark">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Room Filter */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {rooms.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRoom(r)}
              className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${selectedRoom === r
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'bg-white dark:bg-card-dark text-text-light dark:text-text-dark border border-slate-200 dark:border-slate-700 hover:border-primary'
                }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Devices Grid */}
        <section>
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-6">Ваши устройства</h2>
          {filteredDevices.length === 0 ? (
            <div className="bg-white dark:bg-card-dark rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <span className="material-icons-round text-6xl text-slate-300 dark:text-slate-700 mb-4">devices</span>
              <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">Устройства не найдены</h3>
              <p className="text-text-muted-light dark:text-text-muted-dark mb-6">
                {selectedRoom === 'Все' ? 'Добавьте первое устройство, чтобы начать' : `Нет устройств в "${selectedRoom}"`}
              </p>
              <button
                onClick={() => setShowAddDevice(true)}
                className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-semibold transition-all inline-flex items-center gap-2"
              >
                <span className="material-icons-round">add</span>
                Добавить устройство
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDevices.map((device) => (
                <div
                  key={device.id}
                  className={`relative group bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border transition-all hover-lift ${device.status
                    ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                    : 'border-slate-200 dark:border-slate-800'
                    }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${device.status
                      ? 'bg-primary/20 text-primary'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300'
                      }`}>
                      <span className="material-icons-round text-2xl">{getDeviceIcon(device.type)}</span>
                    </div>
                    <button
                      onClick={() => toggleDevice(device.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${device.status ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${device.status ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-1">{device.name}</h3>
                  <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">{device.room}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{device.source}</p>

                  {/* Brightness Slider for Lights */}
                  {device.type === 'Light' && device.status && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-icons-round text-amber-400 text-sm">light_mode</span>
                        <span className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">
                          Яркость: {device.brightness ?? 100}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={device.brightness ?? 100}
                        onChange={(e) => handleBrightness(device.id, parseInt(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-slate-200 dark:bg-slate-700"
                      />
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${device.status ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-300'
                        }`}>
                        {device.status ? 'АКТИВНО' : 'НЕАКТИВНО'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{device.type}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device.id); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                          title="Удалить устройство"
                        >
                          <span className="material-icons-round text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card-dark rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Добавить устройство</h2>
              <button
                onClick={() => setShowAddDevice(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-icons-round text-text-light dark:text-text-dark">close</span>
              </button>
            </div>
            <form onSubmit={addDevice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Название</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Свет в гостиной"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-light dark:text-text-dark focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Комната</label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Гостиная"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-light dark:text-text-dark focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Тип устройства</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-light dark:text-text-dark focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  required
                >
                  <option value="">Выберите тип...</option>
                  {deviceTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Бренд / Источник</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Philips Hue"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-light dark:text-text-dark focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDevice(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold border border-slate-200 dark:border-slate-700 text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl font-semibold bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30 transition-all"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
