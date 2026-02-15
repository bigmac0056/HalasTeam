import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '../components/Header';
import API from '../api/api';

export default function Energy() {
    const [energyData, setEnergyData] = useState({
        today: 0,
        week: 0,
        month: 0,
        cost: 0
    });
    const [devices, setDevices] = useState([]);

    // Tariff Calculator State
    const [tariffData, setTariffData] = useState(null);
    const [consumption, setConsumption] = useState(200);
    const [stoveType, setStoveType] = useState('electric');
    const [peopleCount, setPeopleCount] = useState(1);
    const [locationStatus, setLocationStatus] = useState('IDLE'); // IDLE, LOADING, SUCCESS, ERROR
    const [coords, setCoords] = useState(null);

    const fetchTariff = async (lat, lon, fetchConsumption, fetchStove, fetchPeople) => {
        try {
            const res = await API.get('/tariffs/resolve', {
                params: {
                    lat,
                    lon,
                    monthlyKwh: fetchConsumption,
                    stoveType: fetchStove,
                    peopleCount: fetchPeople
                }
            });
            setTariffData(res.data);
        } catch (e) {
            console.error("Tariff fetch error", e);
        }
    };

    const handleLocate = () => {
        setLocationStatus('LOADING');
        if (!navigator.geolocation) {
            console.warn("Geolocation not supported");
            setLocationStatus('ERROR');
            // Fallback default
            setCoords({ lat: 43.2, lon: 76.8 });
            fetchTariff(43.2, 76.8, consumption, stoveType, peopleCount);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocationStatus('SUCCESS');
                const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                setCoords(c);
                fetchTariff(c.lat, c.lon, consumption, stoveType, peopleCount);
            },
            (err) => {
                console.error("Geolocation error:", err);
                setLocationStatus('ERROR');
                // Fallback to Almaty defaults
                const c = { lat: 43.2, lon: 76.8 };
                setCoords(c);
                fetchTariff(c.lat, c.lon, consumption, stoveType, peopleCount);
            }
        );
    };

    // Auto-update calculation when inputs change if we have coords
    useEffect(() => {
        if (coords) {
            const timer = setTimeout(() => {
                fetchTariff(coords.lat, coords.lon, consumption, stoveType, peopleCount);
            }, 500); // 500ms debounce
            return () => clearTimeout(timer);
        }
    }, [consumption, stoveType, peopleCount, coords]);

    const navigate = useNavigate();







    const fetchDevices = async () => {
        try {
            const res = await API.get('/devices');
            setDevices(res.data.devices);
        } catch (error) {
            console.error('Error fetching devices:', error);
        }
    };

    const fetchEnergyData = async () => {
        try {
            const res = await API.get('/analytics');
            const data = res.data.analytics;
            setEnergyData({
                today: data.todayEnergy || 0,
                week: data.weekEnergy || 0,
                month: data.monthEnergy || 0,
                cost: data.estimatedCost || 0
            });
        } catch (error) {
            console.error('Error fetching energy data:', error);
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
            await fetchEnergyData();
        };
        loadData();
    }, [navigate]);

    const energyTips = [
        { icon: '💡', tip: 'Выключайте свет, выходя из комнаты', savings: '2 000 ₸/мес' },
        { icon: '🌡️', tip: 'Снижайте температуру на 2°C ночью', savings: '6 000 ₸/мес' },
        { icon: '🔌', tip: 'Отключайте неиспользуемые устройства', savings: '3 500 ₸/мес' },
        { icon: '🌞', tip: 'Используйте дневной свет', savings: '4 000 ₸/мес' }
    ];

    return (
        <div className="min-h-screen bg-background-light transition-colors duration-300">
            {/* Header Navigation */}
            <Header />

            {/* Main Content */}
            <main className="max-w-[1400px] mx-auto px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Аналитика Энергии</h1>
                    <p className="text-text-muted-light dark:text-text-muted-dark mt-2">Следите за потреблением энергии и оптимизируйте его</p>
                </div>

                {/* Energy Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <span className="material-icons-round text-blue-600 dark:text-blue-400 text-2xl">bolt</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-1">Сегодня</h3>
                        <p className="text-3xl font-bold text-text-light dark:text-text-dark">{energyData.today.toFixed(1)} <span className="text-lg">кВт⋅ч</span></p>
                    </div>

                    <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <span className="material-icons-round text-green-600 dark:text-green-400 text-2xl">calendar_today</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-1">Эта неделя</h3>
                        <p className="text-3xl font-bold text-text-light dark:text-text-dark">{energyData.week.toFixed(1)} <span className="text-lg">кВт⋅ч</span></p>
                    </div>

                    <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <span className="material-icons-round text-purple-600 dark:text-purple-400 text-2xl">event</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-1">Этот месяц</h3>
                        <p className="text-3xl font-bold text-text-light dark:text-text-dark">{energyData.month.toFixed(1)} <span className="text-lg">кВт⋅ч</span></p>
                    </div>

                    <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                <span className="material-icons-round text-yellow-600 dark:text-yellow-400 text-2xl">attach_money</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-1">Примерная стоимость</h3>
                        <p className="text-3xl font-bold text-text-light dark:text-text-dark">
                            {new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(energyData.cost)}
                        </p>
                    </div>
                </div>

                {/* Tariff Calculator Section */}
                <div className="bg-white dark:bg-card-dark rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Калькулятор тарифов (KZ)</h2>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${locationStatus === 'SUCCESS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            locationStatus === 'ERROR' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                            {locationStatus === 'SUCCESS' ? 'Локация определена' :
                                locationStatus === 'ERROR' ? 'Геолокация недоступна (Almaty)' :
                                    'Ожидание локации'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Inputs */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-2">
                                    Месячное потребление: <span className="text-text-light dark:text-text-dark font-bold">{consumption} кВт⋅ч</span>
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="1000"
                                    step="10"
                                    value={consumption}
                                    onChange={(e) => setConsumption(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-2">Тип плиты</label>
                                    <select
                                        value={stoveType}
                                        onChange={(e) => setStoveType(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    >
                                        <option value="electric">⚡ Электро</option>
                                        <option value="gas">🔥 Газ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-2">Проживающих</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={peopleCount}
                                        onChange={(e) => setPeopleCount(Number(e.target.value))}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleLocate}
                                disabled={locationStatus === 'LOADING'}
                                className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-70"
                            >
                                {locationStatus === 'LOADING' ? (
                                    <span className="animate-spin material-icons-round">refresh</span>
                                ) : (
                                    <span className="material-icons-round">my_location</span>
                                )}
                                {locationStatus === 'IDLE' ? 'Определить тариф' : 'Обновить расчет'}
                            </button>
                        </div>

                        {/* Results */}
                        <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6">
                            {tariffData ? (
                                <div>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                                        <div>
                                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Ваш регион / Поставщик</p>
                                            <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                                                {tariffData.city} <span className="text-slate-400 mx-2">•</span> {tariffData.provider}
                                            </h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Итоговая стоимость</p>
                                            <p className="text-3xl font-bold text-primary">{tariffData.totalKzt} ₸</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-medium text-text-light dark:text-text-dark mb-2">Детализация расчета (3 уровня):</h4>
                                        {tariffData.tariffBreakdown.map((tier) => (
                                            <div key={tier.tier} className="flex justify-between items-center text-sm p-3 bg-white dark:bg-card-dark rounded-lg border border-slate-100 dark:border-slate-700/50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${tier.tier === 1 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        tier.tier === 2 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {tier.tier}
                                                    </div>
                                                    <span className="text-text-muted-light dark:text-text-muted-dark">
                                                        {tier.kwh} кВт⋅ч × {tier.price} ₸
                                                    </span>
                                                </div>
                                                <span className="font-bold text-text-light dark:text-text-dark">{tier.cost.toFixed(2)} ₸</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-text-muted-light dark:text-text-muted-dark">
                                        <div className="flex items-center gap-1">
                                            <span>Источник:</span>
                                            <a href={tariffData.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                                                Официальный сайт <span className="material-icons-round text-[10px]">open_in_new</span>
                                            </a>
                                        </div>
                                        <span>Актуально на: {tariffData.effectiveDate}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                                    <span className="material-icons-round text-5xl text-slate-300 dark:text-slate-600 mb-4">calculate</span>
                                    <p className="text-text-muted-light dark:text-text-muted-dark">Нажмите "Определить тариф" для расчета точной стоимости электроэнергии в вашем регионе.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Energy Chart Placeholder (kept as is) */}
                {/* Energy Chart */}
                <div className="bg-white dark:bg-card-dark rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-6">Тренд потребления (за 7 дней)</h2>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={[
                                    { name: 'Пн', kwh: 12.5 },
                                    { name: 'Вт', kwh: 14.2 },
                                    { name: 'Ср', kwh: 11.8 },
                                    { name: 'Чт', kwh: 15.1 },
                                    { name: 'Пт', kwh: 13.6 },
                                    { name: 'Сб', kwh: 18.4 },
                                    { name: 'Вс', kwh: 16.9 },
                                ]}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b' }}
                                    unit=" кВт"
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="kwh"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorKwh)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Energy Saving Tips */}
                <div className="bg-white dark:bg-card-dark rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-6">Советы по экономии</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {energyTips.map((tip, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                <div className="text-3xl">{tip.icon}</div>
                                <div className="flex-1">
                                    <p className="text-text-light dark:text-text-dark font-medium mb-1">{tip.tip}</p>
                                    <p className="text-sm text-green-600 dark:text-green-400 font-semibold">Экономия {tip.savings}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Device Energy Consumption */}
                <div className="bg-white dark:bg-card-dark rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-6">Потребление устройств</h2>
                    {devices.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="material-icons-round text-6xl text-slate-300 dark:text-slate-700 mb-4">devices</span>
                            <p className="text-text-muted-light dark:text-text-muted-dark">Устройства не найдены</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {devices.map((device) => (
                                <div key={device.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${device.status ? 'bg-primary/20 text-primary' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                            }`}>
                                            <span className="material-icons-round text-xl">
                                                {device.type === 'Light' ? 'lightbulb' : device.type === 'AC' ? 'ac_unit' : 'power'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-text-light dark:text-text-dark">{device.name}</h3>
                                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{device.room}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-text-light dark:text-text-dark">
                                            {device.status ? '2.5 кВт⋅ч' : '0 кВт⋅ч'}
                                        </p>
                                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                                            {device.status ? 'Активно' : 'Неактивно'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>

    );
}
