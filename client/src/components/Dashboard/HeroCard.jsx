const weatherCodeToUi = (code) => {
    const num = Number(code);
    if (!Number.isFinite(num)) {
        return { label: 'Погода', icon: '⛅' };
    }

    if (num === 0) return { label: 'Ясно', icon: '☀️' };
    if ([1, 2, 3].includes(num)) return { label: 'Облачно', icon: '⛅' };
    if ([45, 48].includes(num)) return { label: 'Туман', icon: '🌫️' };
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(num)) return { label: 'Дождь', icon: '🌧️' };
    if ([71, 73, 75, 77, 85, 86].includes(num)) return { label: 'Снег', icon: '❄️' };
    if ([95, 96, 99].includes(num)) return { label: 'Гроза', icon: '⛈️' };
    return { label: 'Переменно', icon: '🌤️' };
};

const HeroCard = ({ weather }) => {
    const rawTemp = weather?.temperature ?? weather?.temp;
    const tempNum = Number(rawTemp);
    const safeTemp = Number.isFinite(tempNum) ? Math.round(tempNum) : 18;

    const weatherUi = weatherCodeToUi(weather?.weathercode);
    const city = weather?.city || 'Ваш регион';
    const condition = weather?.condition || weatherUi.label;

    return (
        <div className="bg-[#0f172a] dark:bg-[#020617] rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-500/10 animate-fade-in-up">
            {/* Abstract Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <p className="text-blue-200/60 text-sm font-medium mb-1">С возвращением, Алекс</p>
                    <h2 className="text-5xl font-bold tracking-tight mb-8">Статус: <span className="text-blue-400">Оптимальный</span></h2>
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
                                <p className="text-lg font-bold">22.5°C</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="material-icons-round text-blue-300 text-xl">water_drop</span>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-blue-200/40 font-bold">Влажность</p>
                                <p className="text-lg font-bold">48%</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="material-icons-round text-blue-300 text-xl">air</span>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-blue-200/40 font-bold">Воздух</p>
                                <p className="text-lg font-bold text-green-400">Отличный</p>
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
