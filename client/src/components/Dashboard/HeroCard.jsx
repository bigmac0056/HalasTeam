const CLOUD_CODES = [1, 2, 3];
const FOG_CODES = [45, 48];
const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];
const SNOW_CODES = [71, 73, 75, 77, 85, 86];
const STORM_CODES = [95, 96, 99];

const weatherCodeToUi = (code, isDay = true) => {
    const num = Number(code);
    if (!Number.isFinite(num)) {
        return { label: 'Погода', icon: isDay ? '⛅' : '🌙' };
    }

    if (num === 0) return { label: isDay ? 'Ясно' : 'Ясная ночь', icon: isDay ? '☀️' : '🌙' };
    if (CLOUD_CODES.includes(num)) return { label: 'Облачно', icon: isDay ? '⛅' : '☁️' };
    if (FOG_CODES.includes(num)) return { label: 'Туман', icon: '🌫️' };
    if (RAIN_CODES.includes(num)) return { label: 'Дождь', icon: '🌧️' };
    if (SNOW_CODES.includes(num)) return { label: 'Снег', icon: '❄️' };
    if (STORM_CODES.includes(num)) return { label: 'Гроза', icon: '⛈️' };
    return { label: 'Переменно', icon: '🌤️' };
};

const weatherThemeByCode = (code, isDay = true) => {
    const num = Number(code);
    const safeCode = Number.isFinite(num) ? num : null;

    if (!safeCode && !isDay) {
        return {
            cardClass: 'bg-gradient-to-br from-[#0c1633] via-[#10285e] to-[#0b1026]',
            glowClass: 'bg-indigo-400/25'
        };
    }
    if (!safeCode && isDay) {
        return {
            cardClass: 'bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600',
            glowClass: 'bg-cyan-200/35'
        };
    }

    if (safeCode === 0) {
        if (isDay) {
            return {
                cardClass: 'bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600',
                glowClass: 'bg-yellow-300/35'
            };
        }
        return {
            cardClass: 'bg-gradient-to-br from-[#0b1633] via-[#142b64] to-[#0b1026]',
            glowClass: 'bg-indigo-300/30'
        };
    }

    if (CLOUD_CODES.includes(safeCode)) {
        return {
            cardClass: isDay
                ? 'bg-gradient-to-br from-slate-400 via-slate-500 to-sky-700'
                : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900',
            glowClass: 'bg-slate-300/25'
        };
    }

    if (FOG_CODES.includes(safeCode)) {
        return {
            cardClass: isDay
                ? 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600'
                : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900',
            glowClass: 'bg-slate-200/20'
        };
    }

    if (RAIN_CODES.includes(safeCode)) {
        return {
            cardClass: isDay
                ? 'bg-gradient-to-br from-blue-500 via-indigo-600 to-slate-700'
                : 'bg-gradient-to-br from-[#1a2b5f] via-[#202f63] to-[#0b1228]',
            glowClass: 'bg-blue-300/20'
        };
    }

    if (SNOW_CODES.includes(safeCode)) {
        return {
            cardClass: isDay
                ? 'bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-500'
                : 'bg-gradient-to-br from-sky-700 via-indigo-800 to-slate-900',
            glowClass: 'bg-cyan-100/30'
        };
    }

    if (STORM_CODES.includes(safeCode)) {
        return {
            cardClass: 'bg-gradient-to-br from-violet-700 via-indigo-900 to-slate-950',
            glowClass: 'bg-violet-300/20'
        };
    }

    return {
        cardClass: isDay
            ? 'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600'
            : 'bg-gradient-to-br from-[#0c1633] via-[#10285e] to-[#0b1026]',
        glowClass: 'bg-blue-300/25'
    };
};

const HeroCard = ({ weather, devices = [], notifications = [] }) => {
    const rawTemp = weather?.temperature ?? weather?.temp;
    const tempNum = Number(rawTemp);
    const safeTemp = Number.isFinite(tempNum) ? Math.round(tempNum) : '--';

    const isDay = weather?.isDay ?? true;
    const weatherUi = weatherCodeToUi(weather?.weathercode, isDay);
    const weatherTheme = weatherThemeByCode(weather?.weathercode, isDay);
    const city = weather?.city || 'Ваш регион';
    const condition = weather?.condition || weatherUi.label;

    // Calculate real stats
    const tempSensors = devices.filter(d => (d.type === 'Sensor' && d.sensorType === 'temperature') || d.type === 'AC' || d.type === 'Heater');
    const avgTemp = tempSensors.length
        ? Math.round(tempSensors.reduce((acc, d) => acc + (d.value || 21), 0) / tempSensors.length)
        : 22;

    // Count unread notifications for "Active Alerts"
    const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

    // Status depends on critical sensors OR high unread count
    const criticalSensors = devices.filter(d => d.type === 'Sensor' && (d.value === 1 || d.isAlert));

    // Status Logic: Red if critical sensors, Orange if many notifications, else Blue
    let statusText = 'Оптимальный';
    let statusColor = 'text-blue-400';
    let cardBgClass = 'bg-blue-500/10';

    if (criticalSensors.length > 0) {
        statusText = 'ТРЕВОГА';
        statusColor = 'text-red-500 animate-pulse';
        cardBgClass = 'bg-red-500/20';
    } else if (unreadNotificationsCount > 0) {
        statusText = 'Новые события';
        statusColor = 'text-orange-400';
        cardBgClass = 'bg-orange-500/20';
    }

    return (
        <div className={`${weatherTheme.cardClass} rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-500/20 animate-fade-in-up`}>
            {/* Abstract Background Decor */}
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none ${cardBgClass}`}></div>
            <div className={`absolute bottom-0 left-0 w-52 h-52 rounded-full -ml-20 -mb-20 blur-3xl pointer-events-none ${weatherTheme.glowClass}`}></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <h2 className="text-5xl font-bold tracking-tight mb-8">Статус: <span className={statusColor}>{statusText}</span></h2>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-8">
                    {/* Indoor KPIs */}
                    <div className="flex gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="material-icons-round text-blue-300 text-xl">thermostat</span>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-blue-200/40 font-bold">Темп. Дома</p>
                                <p className="text-lg font-bold">{avgTemp}°C</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="material-icons-round text-blue-300 text-xl">notifications_active</span>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-blue-200/40 font-bold">Активные уведомления</p>
                                <p className="text-lg font-bold">{unreadNotificationsCount}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="material-icons-round text-blue-300 text-xl">devices</span>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-blue-200/40 font-bold">Устройств</p>
                                <p className="text-lg font-bold text-green-400">{devices.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* External Weather */}
                    <div className="flex items-center gap-4 text-right">
                        <div>
                            <div className="text-6xl font-black flex items-start">
                                {safeTemp}°
                            </div>
                            <p className="text-sm font-medium text-blue-200/60 mt-1">
                                {city} • {condition}
                            </p>
                        </div>
                        <div className="text-6xl animate-pulse-slow">
                            {weatherUi.icon}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroCard;
