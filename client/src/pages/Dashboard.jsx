import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import API from '../api/api';

// Premium Components
import HeroCard from '../components/Dashboard/HeroCard';
import SmartSphereAI from '../components/SmartSphereAI';
import MusicCard from '../components/Dashboard/MusicCard';
import HVACCard from '../components/Dashboard/HVACCard';
import CameraCard from '../components/Dashboard/CameraCard';

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
  const brightnessTimerRef = useRef({});

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

  const toggleDevice = async (id) => {
    try {
      await API.post('/devices/toggle', { deviceId: id });
      fetchDevices();
    } catch (error) {
      console.error('Error toggling device:', error);
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

  const addDevice = async (e) => {
    e.preventDefault();
    try {
      await API.post('/devices/add', { name, room, type, source });
      setName(''); setRoom(''); setType(''); setSource('');
      setShowAddDevice(false);
      fetchDevices();
    } catch (error) {
      alert('Не удалось добавить устройство');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    fetchDevices();
    fetchHomeMode();
    fetchAutomationLogs();
  }, [navigate]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await API.get(`/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
            setWeather(res.data);
          } catch (e) { setWeatherError('Error loading weather'); }
        },
        () => setWeatherError('Geolocation disabled')
      );
    }
  }, []);

  const rooms = ['Все', ...new Set(devices.map(d => d.room))];
  const filteredDevices = selectedRoom === 'Все' ? devices : devices.filter(d => d.room === selectedRoom);

  const renderDeviceCard = (device) => {
    if (device.type === 'Speaker' || (device.type === 'Socket' && device.name.toLowerCase().includes('speaker'))) {
      return (
        <MusicCard
          key={device.id}
          name={device.name}
          room={device.room}
          status={device.status}
          onToggle={() => toggleDevice(device.id)}
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
          <button
            onClick={() => toggleDevice(device.id)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${device.status ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${device.status ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
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
                Add Device
              </button>
            </div>

            {/* Hero Section */}
            <HeroCard weather={weather} />

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
            <SmartSphereAI />

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
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">New Device</h2>
            <form onSubmit={addDevice} className="space-y-6">
              <input type="text" placeholder="Device Name" value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20" required />
              <input type="text" placeholder="Room" value={room} onChange={e => setRoom(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20" required />
              <select value={type} onChange={e => setType(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20" required>
                <option value="">Select Type</option>
                <option value="Light">Light</option>
                <option value="Socket">Socket</option>
                <option value="Heater">Heater</option>
                <option value="AC">Air Conditioner</option>
                <option value="Speaker">Speaker</option>
                <option value="Camera">Camera</option>
              </select>
              <input type="text" placeholder="Brand / Source" value={source} onChange={e => setSource(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20" required />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddDevice(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
