import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import ReportModal from '../components/ReportModal';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import API from '../api/api';

const DEFAULT_COORDS = { lat: 51.1694, lon: 71.4491 };
const LAST_KNOWN_COORDS_KEY = 'smartsphere_last_known_coords';
const CITY_LABELS = {
    Astana: 'Астана',
    Almaty: 'Алматы',
    Shymkent: 'Шымкент',
    Pavlodar: 'Павлодар',
    Karaganda: 'Караганда',
    Oskemen: 'Өскемен',
    Kostanay: 'Костанай',
    Aktau: 'Актау',
    Atyrau: 'Атырау',
    Aktobe: 'Актобе'
};

const localizeCity = (value) => {
    if (!value) return '';
    return CITY_LABELS[value] || value;
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

const buildRegionLabel = (city, region) => {
    const safeCity = localizeCity(city);
    const safeRegion = localizeCity(region);

    if (safeCity && safeRegion) {
        return safeCity.toLowerCase() === safeRegion.toLowerCase()
            ? safeCity
            : `${safeCity}, ${safeRegion}`;
    }
    return safeCity || safeRegion || '';
};

export default function Energy() {
    const [analytics, setAnalytics] = useState(null);
    const [tariff, setTariff] = useState(null);
    const [resolvedCity, setResolvedCity] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // User inputs for tariff calculation
    const [consumptionOverride, setConsumptionOverride] = useState(null);
    const [pendingConsumption, setPendingConsumption] = useState(null);
    const [occupants, setOccupants] = useState(1);
    const [stoveType, setStoveType] = useState('electric');
    const [periodDays, setPeriodDays] = useState(30);
    const [isTariffUpdating, setIsTariffUpdating] = useState(false);

    // Location state
    const [coords, setCoords] = useState(null);
    const [locationStatus, setLocationStatus] = useState('locating');

    useEffect(() => {
        let cancelled = false;

        const applyFallbackLocation = () => {
            if (cancelled) return;
            setCoords(readStoredCoords() || DEFAULT_COORDS);
            setLocationStatus('fallback');
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (cancelled) return;
                    const nextCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                    setCoords(nextCoords);
                    persistCoords(nextCoords.lat, nextCoords.lon);
                    setLocationStatus('ok');
                },
                (err) => {
                    console.warn('Location access denied, utilizing default (Astana)', err);
                    applyFallbackLocation();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5 * 60 * 1000
                }
            );
        } else {
            applyFallbackLocation();
        }

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (pendingConsumption === null) return undefined;
        setIsTariffUpdating(true);

        const debounceTimer = setTimeout(() => {
            setConsumptionOverride(pendingConsumption);
        }, 450);

        return () => clearTimeout(debounceTimer);
    }, [pendingConsumption]);

    const fetchData = useCallback(async () => {
        if (!coords?.lat || !coords?.lon) return;

        setLoading(true);
        setError('');
        try {
            // 2. Fetch Analytics
            const analyticsRes = await API.get('/analytics', {
                params: {
                    lat: coords.lat,
                    lon: coords.lon,
                    periodDays
                }
            });
            const analyticsData = analyticsRes.data?.analytics || null;
            setAnalytics(analyticsData);

            // Determine consumption to use for calculation (real or override)
            const realConsumption = Number(analyticsData?.totalEnergyConsumption || 0);
            const calcConsumption = consumptionOverride !== null ? consumptionOverride : realConsumption;

            // 3. Fetch Tariff + city from weather service for consistent geolocation naming
            const [tariffRes, weatherRes] = await Promise.all([
                API.get('/tariffs/resolve', {
                    params: {
                        lat: coords.lat,
                        lon: coords.lon,
                        monthlyKwh: Math.max(calcConsumption, 1),
                        stoveType,
                        peopleCount: occupants
                    }
                }),
                API.get('/weather', {
                    params: { lat: coords.lat, lon: coords.lon }
                }).catch(() => null)
            ]);

            const tariffData = tariffRes.data || {};
            setTariff({
                ...tariffData,
                totalCost: tariffData.totalCost ?? tariffData.totalKzt ?? 0,
                breakdown: tariffData.breakdown ?? tariffData.tariffBreakdown ?? []
            });

            if (weatherRes?.data?.city) {
                setResolvedCity(weatherRes.data.city);
            }
        } catch (error) {
            console.error("Failed to load energy data:", error);
            setError(error.response?.data?.error || 'Не удалось загрузить данные по энергопотреблению');
        } finally {
            setLoading(false);
            setIsTariffUpdating(false);
        }
    }, [coords, stoveType, occupants, consumptionOverride, periodDays]);

    useEffect(() => {
        if (!coords?.lat || !coords?.lon) return;
        fetchData();
    }, [coords, stoveType, occupants, consumptionOverride, periodDays, fetchData]);

    // Format currency
    const formatKZT = (val) => new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT' }).format(val);

    const groupedByDay = (analytics?.recentActivity || []).reduce((acc, record) => {
        const day = new Date(record.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        acc[day] = (acc[day] || 0) + Number(record.energyConsumed || 0);
        return acc;
    }, {});
    const chartData = Object.entries(groupedByDay).map(([name, value]) => ({
        name,
        kwh: Number(value.toFixed(2))
    }));
    const displayChartData = chartData.length > 0 ? chartData : [{ name: 'Нет данных', kwh: 0 }];

    const committedConsumption = consumptionOverride !== null
        ? consumptionOverride
        : (analytics?.totalEnergyConsumption || 0);
    const currentConsumption = pendingConsumption !== null
        ? pendingConsumption
        : committedConsumption;
    const periodLabel = periodDays === 0 ? 'за все время' : `за ${periodDays} дн.`;
    const tariffRegionLabel = buildRegionLabel(tariff?.city, tariff?.region);
    const displayRegion = resolvedCity || tariffRegionLabel || (locationStatus === 'locating' ? 'Определение...' : 'Не определен');
    const hasTariffCost = tariff && typeof tariff.totalCost === 'number';

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300 font-sans">
            <Header />

            <main className="max-w-[1600px] mx-auto px-6 py-8 pb-32">
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Аналитика энергопотребления</h1>
                        <p className="text-slate-500 dark:text-slate-400">Данные по электричеству с ваших устройств {periodLabel}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="mr-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <span className="material-icons-round text-sm">assessment</span>
                            Отчет
                        </button>
                        <select
                            value={periodDays}
                            onChange={(e) => {
                                setPeriodDays(Number(e.target.value));
                                setConsumptionOverride(null);
                                setPendingConsumption(null);
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-sm text-slate-700 dark:text-slate-200"
                        >
                            <option value={7}>Последние 7 дней</option>
                            <option value={30}>Последние 30 дней</option>
                            <option value={90}>Последние 90 дней</option>
                            <option value={0}>Все время</option>
                        </select>
                        {loading && <span className="text-primary font-medium animate-pulse">Обновление данных...</span>}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {/* Active Devices */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                            <span className="material-icons-round text-xl">devices</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Активные устройства</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {analytics?.activeDevices || 0} <span className="text-lg text-slate-400 font-normal">/ {analytics?.totalDevices || 0}</span>
                        </h3>
                    </div>

                    {/* Total Consumption */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
                            <span className="material-icons-round text-xl">flash_on</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Потребление (Всего)</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {Number(analytics?.totalEnergyConsumption || 0).toFixed(1)} <span className="text-lg text-slate-400 font-normal">кВт·ч</span>
                        </h3>
                    </div>

                    {/* Region */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                            <span className="material-icons-round text-xl">location_on</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ваш регион</p>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                            {displayRegion}
                        </h3>
                        {locationStatus === 'fallback' && (
                            <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">Геолокация отключена: используется резерв</p>
                        )}
                    </div>

                    {/* Estimated Cost */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center text-yellow-600 dark:text-yellow-400 mb-4">
                            <span className="material-icons-round text-xl">payments</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Стоимость (KPI)</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {hasTariffCost ? formatKZT(tariff.totalCost) : '---'}
                        </h3>
                    </div>
                </div>

                {/* Period Chart */}
                <div className="bg-white dark:bg-card-dark p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Отчет за период</h2>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{periodLabel}</span>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={displayChartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(val) => `${val}`} />
                                <Tooltip
                                    formatter={(val) => [`${Number(val).toFixed(2)} кВт·ч`, 'Потребление']}
                                    labelFormatter={(label) => `Дата: ${label}`}
                                />
                                <Bar dataKey="kwh" radius={[8, 8, 0, 0]} name="Потребление">
                                    {displayChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.kwh > 0 ? '#3B82F6' : '#CBD5E1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tariff Calculator Section */}
                <div className="bg-white dark:bg-card-dark p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Калькулятор тарифов (KZ)</h2>
                        <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                            {tariff?.provider || 'Загрузка...'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Left Column: Inputs */}
                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        Потребление для расчета: <span className="text-slate-900 dark:text-white font-bold">{Number(currentConsumption || 0).toFixed(1)} кВт·ч</span>
                                    </label>
                                    <button
                                        onClick={() => {
                                            setConsumptionOverride(null);
                                            setPendingConsumption(null);
                                            setIsTariffUpdating(false);
                                        }}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Сбросить к реальному
                                    </button>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1000"
                                    step="10"
                                    value={currentConsumption}
                                    onChange={(e) => setPendingConsumption(parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                {isTariffUpdating && (
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 animate-pulse">Пересчет стоимости...</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Тип плиты (для норматива)</label>
                                    <div className="relative">
                                        <select
                                            value={stoveType}
                                            onChange={(e) => setStoveType(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white font-medium appearance-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="electric">Электрическая</option>
                                            <option value="gas">Газовая</option>
                                        </select>
                                        <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 text-sm">flash_on</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Влияет на расчет соц. порогов тарифа в некоторых регионах</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Проживающих</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={occupants}
                                        onChange={(e) => setOccupants(Math.max(1, Number(e.target.value) || 1))}
                                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Result */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Регион</p>
                                    <div className="text-slate-900 dark:text-white font-bold text-lg">
                                        {displayRegion || '---'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Расчетная стоимость</p>
                                    <div className="text-3xl font-bold text-primary">
                                        {isTariffUpdating ? '...' : (hasTariffCost ? formatKZT(tariff.totalCost) : '---')}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Детали тарифа:</p>
                                {tariff?.breakdown?.length > 0 ? tariff.breakdown.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                                            <span className="text-slate-600 dark:text-slate-300 text-sm">
                                                Тариф {item.tier}: {item.kwh} кВт·ч × {item.price} ₸
                                            </span>
                                        </div>
                                        <span className="font-bold text-slate-900 dark:text-white">{formatKZT(item.cost)}</span>
                                    </div>
                                )) : <p className="text-sm text-slate-400">{tariff?.error || 'Нет данных для отображения'}</p>}
                            </div>
                        </div>
                    </div>
                </div>
                <ReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    periodDays={periodDays}
                    totalCost={tariff?.totalCost || 0}
                    coords={coords}
                    stoveType={stoveType}
                    peopleCount={occupants}
                />
            </main>
        </div>
    );
}
