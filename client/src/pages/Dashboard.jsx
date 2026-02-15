import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import Header from "../components/Header";

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);

  // Automation State
  const [autoMode, setAutoMode] = useState(false);
  const [homeMode, setHomeMode] = useState("home");
  const [automationLog, setAutomationLog] = useState([]);
  const [automationStatus, setAutomationStatus] = useState("");

  const navigate = useNavigate();
  const lastTemperature = useRef(null);
  const automationCheckInterval = useRef(null);

  // --- Constants & Helpers ---
  const deviceTypes = [
    { label: "Освещение", value: "Light", icon: "lightbulb" },
    { label: "Умная розетка", value: "Socket", icon: "power" },
    { label: "Обогреватель", value: "Heater", icon: "thermostat" },
    { label: "Кондиционер", value: "AC", icon: "ac_unit" },
    { label: "Камера", value: "Camera", icon: "videocam" },
    { label: "Датчик", value: "Sensor", icon: "sensors" },
    { label: "Шторы", value: "Curtain", icon: "curtains" },
    { label: "Термостат", value: "Thermostat", icon: "settings_remote" }
  ];

  const homeModes = [
    { value: "home", label: "Дома", icon: "home", color: "bg-blue-500", desc: "Все устройства работают в штатном режиме" },
    { value: "away", label: "Я ушёл", icon: "door_front", color: "bg-orange-500", desc: "Выключить всё кроме камер и датчиков" },
    { value: "night", label: "Ночь", icon: "bedtime", color: "bg-indigo-900", desc: "Выключить свет, оставить климат" },
    { value: "vacation", label: "Отпуск", icon: "flight", color: "bg-purple-600", desc: "Режим энергосбережения и охраны" }
  ];

  const getDeviceIcon = (type) => {
    const dt = deviceTypes.find(t => t.value === type);
    return dt ? dt.icon : "devices";
  };

  const getDeviceTypeLabel = (type) => {
    const dt = deviceTypes.find(t => t.value === type);
    return dt ? dt.label : type;
  };

  // --- API Functions ---
  const fetchData = async () => {
    try {
      const res = await API.get("/devices");
      setDevices(res.data.devices);
    } catch (error) {
      console.error("Ошибка при получении устройств:", error);
    }
  };

  const addDevice = async () => {
    if (!name || !room || !type || !source) return;

    await API.post("/devices/add", {
      name,
      room,
      type,
      source,
    });

    setName("");
    setRoom("");
    setType("");
    setSource("");
    fetchData();
  };

  const toggleDevice = async (id) => {
    await API.post("/devices/toggle", { deviceId: id });
    lastTemperature.current = null; // Reset temp memory to re-trigger automation if needed
    fetchData();
  };

  // --- Logic: Home Modes ---
  const handleHomeModeChange = async (newMode) => {
    setHomeMode(newMode);

    const res = await API.get("/devices");
    const currentDevices = res.data.devices;

    if (newMode === "away") {
      for (const device of currentDevices) {
        if (device.type.toLowerCase() !== "camera" && device.status) {
          await API.post("/devices/toggle", { deviceId: device.id });
        }
      }
      logAutomation(`Режим 'Я ушёл' активирован`);
    } else if (newMode === "night") {
      for (const device of currentDevices) {
        if (device.type.toLowerCase() === "light" && device.status) {
          await API.post("/devices/toggle", { deviceId: device.id });
        }
      }
      logAutomation(`Режим 'Ночь' активирован`);
    } else if (newMode === "vacation") {
      for (const device of currentDevices) {
        if (device.type.toLowerCase() === "camera") {
          if (!device.status) await API.post("/devices/toggle", { deviceId: device.id });
        } else if (device.status) {
          await API.post("/devices/toggle", { deviceId: device.id });
        }
      }
      logAutomation(`Режим 'Отпуск' активирован`);
    }

    fetchData();
  };

  // --- Logic: Automation Loop ---
  // Helper to log
  const logAutomation = (msg) => {
    setAutomationLog(prev => [`${msg} (${new Date().toLocaleTimeString()})`, ...prev].slice(0, 50));
  };

  const changeTestTemperature = (delta) => {
    if (weather) {
      setWeather({ ...weather, temperature: weather.temperature + delta });
      lastTemperature.current = null;
    }
  };

  // --- Effects ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Fetch data only after mount and token check
    const load = async () => {
      await fetchData();
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        setWeatherError(null);
        const res = await API.get(`/weather?lat=${lat}&lon=${lon}`);
        setWeather(res.data);
      } catch (error) {
        console.error("Ошибка погоды:", error);
        setWeatherError("Ошибка загрузки погоды");
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => setWeatherError("Геолокация недоступна")
      );
    } else {
      setTimeout(() => setWeatherError("Геолокация не поддерживается"), 0);
    }
  }, []);

  useEffect(() => {
    if (automationCheckInterval.current) {
      clearInterval(automationCheckInterval.current);
      automationCheckInterval.current = null;
    }
    lastTemperature.current = null;

    if (!autoMode || !weather) return;

    const runAutomation = async () => {
      try {
        // Note: using weather from closure. If weather changes, effect re-runs.
        if (lastTemperature.current === weather.temperature) {
          setAutomationStatus(`Проверка: ${weather.temperature}°C (без изм.)`);
          return;
        }

        setAutomationStatus(`Анализ при ${weather.temperature}°C...`);

        const res = await API.get("/devices");
        const currentDevices = res.data.devices;

        if (currentDevices.length === 0) {
          setAutomationStatus("Нет устройств");
          lastTemperature.current = weather.temperature;
          return;
        }

        const heater = currentDevices.find(d => d.type.toLowerCase() === "heater");
        const ac = currentDevices.find(d => d.type.toLowerCase() === "ac");

        // Heater Logic (< 15 On, > 18 Off)
        if (heater && weather.temperature < 15 && !heater.status) {
          setAutomationStatus(`Включаю обогреватель (< 15°C)`);
          await API.post("/devices/toggle", { deviceId: heater.id });
          logAutomation("Обогреватель включён автоматически");
          fetchData();
        } else if (heater && weather.temperature > 18 && heater.status) {
          setAutomationStatus(`Выключаю обогреватель (> 18°C)`);
          await API.post("/devices/toggle", { deviceId: heater.id });
          logAutomation("Обогреватель выключен автоматически");
          fetchData();
        }
        // AC Logic (> 25 On, < 23 Off)
        else if (ac && weather.temperature > 25 && !ac.status) {
          setAutomationStatus(`Включаю кондиционер (> 25°C)`);
          await API.post("/devices/toggle", { deviceId: ac.id });
          logAutomation("Кондиционер включён автоматически");
          fetchData();
        } else if (ac && weather.temperature < 23 && ac.status) {
          setAutomationStatus(`Выключаю кондиционер (< 23°C)`);
          await API.post("/devices/toggle", { deviceId: ac.id });
          logAutomation("Кондиционер выключен автоматически");
          fetchData();
        } else {
          setAutomationStatus(`Условия выполнены: ${weather.temperature}°C`);
        }

        lastTemperature.current = weather.temperature;

      } catch (error) {
        console.error("Auto error:", error);
        setAutomationStatus("Ошибка автоматизации");
      }
    };

    runAutomation();
    automationCheckInterval.current = setInterval(runAutomation, 5000);

    return () => {
      if (automationCheckInterval.current) clearInterval(automationCheckInterval.current);
    };
  }, [autoMode, weather]);

  // --- Render ---
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300">
      <Header />

      <main className="max-w-[1400px] mx-auto px-8 py-12">

        {/* Top Section: Hello & Weather */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="md:col-span-2">
            <h1 className="text-3xl font-bold text-text-main-light dark:text-text-main-dark mb-2">
              Панель управления
            </h1>
            <p className="text-text-muted-light dark:text-text-muted-dark mb-6">
              Управление устройствами и сценариями
            </p>

            {/* Home Modes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {homeModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => handleHomeModeChange(mode.value)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 group ${homeMode === mode.value
                    ? "bg-white dark:bg-card-dark border-primary shadow-lg scale-105"
                    : "bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-white dark:hover:bg-slate-700"
                    }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${mode.color} ${homeMode === mode.value ? 'shadow-glow' : 'opacity-80 group-hover:opacity-100'}`}>
                    <span className="material-icons-round">{mode.icon}</span>
                  </div>
                  <span className="font-medium text-sm text-text-main-light dark:text-text-main-dark">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Weather Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-icons-round text-9xl">cloud</span>
            </div>

            <div className="relative z-10">
              <h3 className="text-blue-100 dark:text-slate-400 font-medium mb-4">Погода за окном</h3>
              {weather ? (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl font-bold">{Math.round(weather.temperature)}°</span>
                    <div className="text-sm opacity-90">
                      <p>Влажность: {weather.humidity}%</p>
                      <p>Ветер: {weather.windspeed} м/с</p>
                    </div>
                  </div>

                  {/* Test Controls */}
                  {autoMode && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <p className="text-xs mb-2 opacity-80">Тест датчика:</p>
                      <div className="flex gap-2">
                        {[-5, 5].map(val => (
                          <button
                            key={val}
                            onClick={() => changeTestTemperature(val)}
                            className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
                          >
                            {val > 0 ? '+' : ''}{val}°
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 opacity-80">
                  {weatherError ? (
                    <span className="text-sm">{weatherError}</span>
                  ) : (
                    <>
                      <span className="animate-spin material-icons-round">refresh</span>
                      <span>Загрузка...</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Automation Status Banner */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${autoMode ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
              <span className="material-icons-round text-2xl">auto_fix_high</span>
            </div>
            <div>
              <h3 className="font-bold text-text-main-light dark:text-text-main-dark">Автопилот климата</h3>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                {autoMode
                  ? (automationStatus || "Система активна и мониторит условия")
                  : "Автоматическое управление отключено"}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={autoMode} onChange={e => setAutoMode(e.target.checked)} />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">Включить</span>
          </label>
        </div>

        {/* Devices Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-6 flex items-center gap-2">
            <span className="material-icons-round text-primary">grid_view</span>
            Устройства
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Add Device Card */}
            <div className="bg-slate-50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group cursor-pointer min-h-[200px]" onClick={() => document.getElementById('add-device-form').scrollIntoView({ behavior: 'smooth' })}>
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-blue-100 group-hover:text-primary transition-colors flex items-center justify-center mb-3">
                <span className="material-icons-round text-2xl">add</span>
              </div>
              <span className="font-medium text-text-muted-light dark:text-text-muted-dark group-hover:text-primary transition-colors">Добавить устройство</span>
            </div>

            {/* Device Cards */}
            {devices.map(device => (
              <div key={device.id} className={`relative bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border transition-all ${device.status ? 'border-primary shadow-md' : 'border-slate-100 dark:border-slate-800'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${device.status ? 'bg-primary text-white shadow-glow' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                    <span className="material-icons-round">{getDeviceIcon(device.type)}</span>
                  </div>
                  <button onClick={() => toggleDevice(device.id)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${device.status ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                    <span className="material-icons-round text-sm">power_settings_new</span>
                  </button>
                </div>

                <h3 className="font-bold text-lg text-text-main-light dark:text-text-main-dark mb-1">{device.name}</h3>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">{device.room}</p>

                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className={`px-2 py-1 rounded-md ${device.status ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {device.status ? 'Включено' : 'Выключено'}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500">
                    {getDeviceTypeLabel(device.type)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Device Form Section */}
        <div id="add-device-form" className="bg-white dark:bg-card-dark rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
          <h3 className="font-bold text-lg mb-6 text-text-main-light dark:text-text-main-dark">Новое устройство</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              placeholder="Название"
              value={name} onChange={e => setName(e.target.value)}
              className="md:col-span-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary outline-none"
            />
            <input
              placeholder="Комната"
              value={room} onChange={e => setRoom(e.target.value)}
              className="md:col-span-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary outline-none"
            />
            <select
              value={type} onChange={e => setType(e.target.value)}
              className="md:col-span-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Тип...</option>
              {deviceTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              placeholder="ID Источника"
              value={source} onChange={e => setSource(e.target.value)}
              className="md:col-span-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary outline-none"
            />
            <button
              onClick={addDevice}
              className="md:col-span-1 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
            >
              Добавить
            </button>
          </div>
        </div>

        {/* Automation Log */}
        {automationLog.length > 0 && (
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider mb-4">История событий</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {automationLog.map((log, i) => (
                <div key={i} className="text-sm flex items-center gap-3 p-2 bg-white dark:bg-card-dark rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-text-main-light dark:text-text-main-dark">{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
