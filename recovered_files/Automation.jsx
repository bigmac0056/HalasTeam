import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import API from '../api/api';

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('Все');
  const [autoMode, setAutoMode] = useState(false);
  const [automationLog, setAutomationLog] = useState([]);


  // Add device form state
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [type, setType] = useState('');
  const [source, setSource] = useState('');

  const navigate = useNavigate();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };



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

  const fetchDevices = async () => {
    try {
      const res = await API.get('/devices');
      setDevices(res.data.devices);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setAutomationLog(prev => [{ time: timestamp, message }, ...prev].slice(0, 5));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchDevices();
  }, [navigate]);



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
      setWeatherError('Геолокация не поддерживается вашим браузером');
    }
  }, []);

  // Automation logic
  useEffect(() => {
    if (!autoMode || !weather || devices.length === 0) return;

    const heater = devices.find(d => d.type === 'Heater');
    const ac = devices.find(d => d.type === 'AC');
    const temp = weather.temperature;

    const runAutomation = async () => {
      // Cold weather - turn on heater, turn off AC
      if (temp < 15) {
        if (heater && !heater.status) {
          await API.post('/devices/toggle', { deviceId: heater.id });
          await API.post('/devices/toggle', { deviceId: heater.id });
          addLog(`🔥 Обогреватель ВКЛ (${temp}°C)`);
          await API.post('/notifications', { text: `Обогреватель включен (${temp}°C)`, type: 'warning', icon: 'local_fire_department' });
          fetchDevices();
          fetchNotifications();
        }
        if (ac && ac.status) {
          await API.post('/devices/toggle', { deviceId: ac.id });
          await API.post('/devices/toggle', { deviceId: ac.id });
          addLog(`❄️ Кондиционер ВЫКЛ (${temp}°C)`);
          await API.post('/notifications', { text: `Кондиционер выключен (${temp}°C)`, type: 'info', icon: 'ac_unit' });
          fetchDevices();
          fetchNotifications();
        }
      }
      // Hot weather - turn on AC, turn off heater
      else if (temp > 25) {
        if (ac && !ac.status) {
          await API.post('/devices/toggle', { deviceId: ac.id });
          await API.post('/devices/toggle', { deviceId: ac.id });
          addLog(`❄️ Кондиционер ВКЛ (${temp}°C)`);
          await API.post('/notifications', { text: `Кондиционер включен (${temp}°C)`, type: 'info', icon: 'ac_unit' });
          fetchDevices();
          fetchNotifications();
        }
        if (heater && heater.status) {
          await API.post('/devices/toggle', { deviceId: heater.id });
          await API.post('/devices/toggle', { deviceId: heater.id });
          addLog(`🔥 Обогреватель ВЫКЛ (${temp}°C)`);
          await API.post('/notifications', { text: `Обогреватель выключен (${temp}°C)`, type: 'info', icon: 'local_fire_department' });
          fetchDevices();
          fetchNotifications();
        }
      }
      // Comfortable temperature - turn off both
      else {
        if (heater && heater.status) {
          await API.post('/devices/toggle', { deviceId: heater.id });
          addLog(`🔥 Обогреватель ВЫКЛ (комфортно ${temp}°C)`);
          fetchDevices();
        }
        if (ac && ac.status) {
          await API.post('/devices/toggle', { deviceId: ac.id });
          addLog(`❄️ Кондиционер ВЫКЛ (комфортно ${temp}°C)`);
          fetchDevices();
        }
      }
    };

    runAutomation();
  }, [autoMode, weather, devices]);

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
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300">
        {/* Header Navigation */}
        <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

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
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-text-muted-light dark:text-text-muted-dark">Автоматизация</span>
                    <button
                      onClick={() => setAutoMode(!autoMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoMode ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Weather Card */}
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
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
                          <span className="text-text-muted-light dark:text-text-muted-dark">{log.time}</span>
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
                    className={`bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border transition-all hover-lift ${device.status
                      ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                      : 'border-slate-200 dark:border-slate-800'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${device.status
                        ? 'bg-primary/20 text-primary'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
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
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${device.status ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-600'
                          }`}>
                          {device.status ? 'АКТИВНО' : 'НЕАКТИВНО'}
                        </span>
                        <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{device.type}</span>
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
    </div>
  );
}
