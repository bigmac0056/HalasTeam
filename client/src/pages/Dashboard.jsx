import { useEffect, useState, useRef } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";


export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [autoMode, setAutoMode] = useState(false);
  const [homeMode, setHomeMode] = useState("home");
  const [automationLog, setAutomationLog] = useState([]);
  const [automationStatus, setAutomationStatus] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const navigate = useNavigate();
  const lastTemperature = useRef(null);
  const automationCheckInterval = useRef(null);

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
    const fetchData = async () => {
      try {
        const res = await API.get("/devices");
        setDevices(res.data.devices);
      } catch (error) {
        console.error("Ошибка при получении устройств:", error);
      }
    };
    fetchData();
  };

  const toggleDevice = async (id) => {
    await API.post("/devices/toggle", { deviceId: id });
    lastTemperature.current = null;
    const fetchData = async () => {
      try {
        const res = await API.get("/devices");
        setDevices(res.data.devices);
      } catch (error) {
        console.error("Ошибка при получении устройств:", error);
      }
    };
    fetchData();
  };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Функция для тестового изменения температуры
  const changeTestTemperature = (delta) => {
    if (weather) {
      setWeather({
        ...weather,
        temperature: weather.temperature + delta
      });
      lastTemperature.current = null;
    }
  };

  // Функция для переключения режима дома
  const handleHomeModeChange = async (newMode) => {
    setHomeMode(newMode);
    
    // Получаем актуальные устройства
    const res = await API.get("/devices");
    const currentDevices = res.data.devices;

    if (newMode === "away") {
      // Выключаем все устройства кроме Camera
      for (const device of currentDevices) {
        if (device.type.toLowerCase() !== "camera" && device.status) {
          await API.post("/devices/toggle", { deviceId: device.id });
        }
      }
      setAutomationLog(prev => [
        ...prev,
        `Режим 'Я ушёл' активирован (${new Date().toLocaleTimeString()})`
      ]);
    } else if (newMode === "night") {
      // Выключаем все Light, оставляем Heater и AC включенными
      for (const device of currentDevices) {
        if (device.type.toLowerCase() === "light" && device.status) {
          await API.post("/devices/toggle", { deviceId: device.id });
        }
      }
      setAutomationLog(prev => [
        ...prev,
        `Режим 'Ночь' активирован (${new Date().toLocaleTimeString()})`
      ]);
    } else if (newMode === "vacation") {
      // Выключаем всё, включаем только Camera
      for (const device of currentDevices) {
        if (device.type.toLowerCase() === "camera") {
          if (!device.status) {
            await API.post("/devices/toggle", { deviceId: device.id });
          }
        } else if (device.status) {
          await API.post("/devices/toggle", { deviceId: device.id });
        }
      }
      setAutomationLog(prev => [
        ...prev,
        `Режим 'Отпуск' активирован (${new Date().toLocaleTimeString()})`
      ]);
    }

    // Обновляем список устройств
    const updatedRes = await API.get("/devices");
    setDevices(updatedRes.data.devices);
  };

  const deviceTypes = [
    { label: "Освещение", value: "Light" },
    { label: "Умная розетка", value: "Socket" },
    { label: "Обогреватель", value: "Heater" },
    { label: "Кондиционер", value: "AC" },
    { label: "Камера", value: "Camera" },
    { label: "Датчик", value: "Sensor" },
    { label: "Шторы", value: "Curtain" },
    { label: "Термостат", value: "Thermostat" }
  ];

  const homeModes = [
    { value: "home", label: "🏠 Дома", icon: "🏠" },
    { value: "away", label: "🚪 Я ушёл", icon: "🚪" },
    { value: "night", label: "🌙 Ночь", icon: "🌙" },
    { value: "vacation", label: "✈️ Отпуск", icon: "✈️" }
  ];

  const getDeviceTypeLabel = (type) => {
    const deviceType = deviceTypes.find(dt => dt.value === type);
    return deviceType ? deviceType.label : type;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("/devices");
        setDevices(res.data.devices);
      } catch (error) {
        console.error("Ошибка при получении устройств:", error);
      }
    };
    fetchData();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        setWeatherError(null);
        const res = await API.get(`/weather?lat=${lat}&lon=${lon}`);
        setWeather(res.data);
      } catch (error) {
        console.error("Ошибка при получении погоды:", error);
        setWeatherError("Не удалось получить данные о погоде");
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(latitude, longitude);
        },
        (error) => {
          console.error("Ошибка получения местоположения:", error);
          setWeatherError("Не удалось определить местоположение");
        }
      );
    } else {
      setTimeout(() => {
        setWeatherError("Геолокация не поддерживается вашим браузером");
      }, 0);
    }
  }, []);

  // Автоматический режим с обновленной логикой
  useEffect(() => {
    if (automationCheckInterval.current) {
      clearInterval(automationCheckInterval.current);
      automationCheckInterval.current = null;
    }

    lastTemperature.current = null;

    if (!autoMode || !weather) return;

    const runAutomation = async () => {
      try {
        setIsChecking(true);
        
        if (lastTemperature.current === weather.temperature) {
          setAutomationStatus(`Проверка: температура ${weather.temperature}°C (без изменений)`);
          setIsChecking(false);
          return;
        }

        setAutomationStatus(`Проверка условий при ${weather.temperature}°C...`);

        const res = await API.get("/devices");
        const currentDevices = res.data.devices;

        if (currentDevices.length === 0) {
          setAutomationStatus("Нет устройств для управления");
          lastTemperature.current = weather.temperature;
          setIsChecking(false);
          return;
        }

        const heater = currentDevices.find(
          d => d.type.toLowerCase() === "heater"
        );
        const ac = currentDevices.find(
          d => d.type.toLowerCase() === "ac"
        );

        // Включение Heater при температуре < 15
        if (heater && weather.temperature < 15 && !heater.status) {
          setAutomationStatus(`Включаю обогреватель (${weather.temperature}°C < 15°C)`);
          await API.post("/devices/toggle", { deviceId: heater.id });
          lastTemperature.current = weather.temperature;

          const updatedRes = await API.get("/devices");
          setDevices(updatedRes.data.devices);

          setAutomationLog(prev => [
            ...prev,
            `Обогреватель включён автоматически (${new Date().toLocaleTimeString()})`
          ]);
          setAutomationStatus("Обогреватель включён");
          setIsChecking(false);
          return;
        }

        // Выключение Heater при температуре > 18
        if (heater && weather.temperature > 18 && heater.status) {
          setAutomationStatus(`Выключаю обогреватель (${weather.temperature}°C > 18°C)`);
          await API.post("/devices/toggle", { deviceId: heater.id });
          lastTemperature.current = weather.temperature;

          const updatedRes = await API.get("/devices");
          setDevices(updatedRes.data.devices);

          setAutomationLog(prev => [
            ...prev,
            `Обогреватель выключен автоматически (${new Date().toLocaleTimeString()})`
          ]);
          setAutomationStatus("Обогреватель выключен");
          setIsChecking(false);
          return;
        }

        // Включение AC при температуре > 25
        if (ac && weather.temperature > 25 && !ac.status) {
          setAutomationStatus(`Включаю кондиционер (${weather.temperature}°C > 25°C)`);
          await API.post("/devices/toggle", { deviceId: ac.id });
          lastTemperature.current = weather.temperature;

          const updatedRes = await API.get("/devices");
          setDevices(updatedRes.data.devices);

          setAutomationLog(prev => [
            ...prev,
            `Кондиционер включён автоматически (${new Date().toLocaleTimeString()})`
          ]);
          setAutomationStatus("Кондиционер включён");
          setIsChecking(false);
          return;
        }

        // Выключение AC при температуре < 23
        if (ac && weather.temperature < 23 && ac.status) {
          setAutomationStatus(`Выключаю кондиционер (${weather.temperature}°C < 23°C)`);
          await API.post("/devices/toggle", { deviceId: ac.id });
          lastTemperature.current = weather.temperature;

          const updatedRes = await API.get("/devices");
          setDevices(updatedRes.data.devices);

          setAutomationLog(prev => [
            ...prev,
            `Кондиционер выключен автоматически (${new Date().toLocaleTimeString()})`
          ]);
          setAutomationStatus("Кондиционер выключен");
          setIsChecking(false);
          return;
        }

        // Если не было действий
        if (heater && weather.temperature >= 15 && weather.temperature <= 18) {
          setAutomationStatus(`Температура ${weather.temperature}°C в зоне гистерезиса обогревателя (15-18°C)`);
        } else if (ac && weather.temperature >= 23 && weather.temperature <= 25) {
          setAutomationStatus(`Температура ${weather.temperature}°C в зоне гистерезиса кондиционера (23-25°C)`);
        } else {
          setAutomationStatus(`Температура ${weather.temperature}°C - условия не выполнены`);
        }

        lastTemperature.current = weather.temperature;
        setIsChecking(false);

      } catch (error) {
        console.error("Ошибка авто-режима:", error);
        setAutomationStatus(`Ошибка: ${error.message}`);
        setIsChecking(false);
      }
    };

    runAutomation();

    automationCheckInterval.current = setInterval(() => {
      runAutomation();
    }, 5000);

    return () => {
      if (automationCheckInterval.current) {
        clearInterval(automationCheckInterval.current);
        automationCheckInterval.current = null;
      }
    };

  }, [autoMode, weather]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Умный дом</h2>
        <button 
          onClick={logout}
          className="logout-btn"
        >
          Выйти
        </button>
      </div>

      <div className="home-mode-section">
        <h3>Режим дома</h3>
        <div className="home-mode-buttons">
          {homeModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleHomeModeChange(mode.value)}
              className={`home-mode-btn ${homeMode === mode.value ? "active" : ""}`}
            >
              <span className="home-mode-icon">{mode.icon}</span>
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="weather-section">
        <h3>Погода</h3>
        {weather ? (
          <div>
            <p className="weather-temp">
              <strong>Температура:</strong> {weather.temperature}°C
            </p>
            <p className="weather-info">
              <strong>Скорость ветра:</strong> {weather.windspeed} км/ч
            </p>
            {autoMode && (
              <div className="test-temperature-controls">
                <p className="test-label">Тест автоматизации:</p>
                <div className="test-buttons">
                  <button onClick={() => changeTestTemperature(-10)} className="test-btn">-10°C</button>
                  <button onClick={() => changeTestTemperature(-5)} className="test-btn">-5°C</button>
                  <button onClick={() => changeTestTemperature(5)} className="test-btn">+5°C</button>
                  <button onClick={() => changeTestTemperature(10)} className="test-btn">+10°C</button>
                </div>
              </div>
            )}
          </div>
        ) : weatherError ? (
          <p className="weather-error">{weatherError}</p>
        ) : (
          <p>Загрузка данных о погоде...</p>
        )}
      </div>

      <div className={`automation-section ${autoMode ? "active" : ""}`}>
        <h3>Автоматический режим</h3>

        <label className="automation-checkbox-label">
          <input
            type="checkbox"
            checked={autoMode}
            onChange={(e) => {
              setAutoMode(e.target.checked);
              if (!e.target.checked) {
                setAutomationStatus("");
                setIsChecking(false);
              }
            }}
            className="automation-checkbox"
          />
          <strong>Включить авто-режим</strong>
          {autoMode && (
            <span className="automation-status-indicator">
              {isChecking ? "⏳ Проверка..." : "✓ Активен"}
            </span>
          )}
        </label>

        <div className="automation-info">
          <p>• Обогреватель: &lt; 15°C включить, &gt; 18°C выключить</p>
          <p>• Кондиционер: &gt; 25°C включить, &lt; 23°C выключить</p>
        </div>

        {autoMode && automationStatus && (
          <div className={`automation-status-box ${isChecking ? "checking" : "success"}`}>
            <strong>Статус:</strong> {automationStatus}
          </div>
        )}

        {autoMode && !automationStatus && (
          <div className="automation-waiting">
            Ожидание изменений температуры...
          </div>
        )}
      </div>

      <div className="add-device-section">
        <h3>Добавить устройство</h3>
        <div className="device-form">
          <input
            placeholder="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
          />
          <input
            placeholder="Комната"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="form-input"
          />
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="form-select"
          >
            <option value="">Выберите тип устройства</option>
            {deviceTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Источник (например Philips Hue)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="form-input"
          />
          <button 
            onClick={addDevice}
            className="add-device-btn"
          >
            Добавить
          </button>
        </div>
      </div>

      <div className="devices-section">
        <h3>Мои устройства</h3>
        {devices.length === 0 ? (
          <p className="empty-devices">Нет устройств. Добавьте первое устройство выше.</p>
        ) : (
          <div className="devices-grid">
            {devices.map((device) => (
              <div 
                key={device.id} 
                className={`device-card ${device.status ? "device-on" : "device-off"}`}
              >
                <div className="device-card-header">
                  <h4 className="device-name">{device.name}</h4>
                  <div className={`device-status-indicator ${device.status ? "on" : "off"}`}>
                    {device.status ? "●" : "○"}
                  </div>
                </div>
                <div className="device-card-body">
                  <p className="device-room">📍 {device.room}</p>
                  <p className="device-type">🔧 {getDeviceTypeLabel(device.type)}</p>
                </div>
                <div className="device-card-footer">
                  <button
                    onClick={() => toggleDevice(device.id)}
                    className={`device-toggle-btn ${device.status ? "on" : "off"}`}
                  >
                    {device.status ? "Выключить" : "Включить"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="automation-log-section">
        <h3>История автоматизаций</h3>

        {automationLog.length === 0 ? (
          <p className="empty-log">Пока нет автоматических действий</p>
        ) : (
          <ul className="automation-log-list">
            {automationLog.map((log, index) => (
              <li key={index} className="automation-log-item">{log}</li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
