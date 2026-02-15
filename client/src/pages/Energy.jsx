import { useState, useEffect } from 'react';
import Header from '../components/Header';
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

export default function Energy() {
    const [consumption, setConsumption] = useState(250);
    const [occupants, setOccupants] = useState(1);
    const [stoveType, setStoveType] = useState('electric');
    const [region, setRegion] = useState('Astana');
    const [provider, setProvider] = useState('Астанаэнергосбыт');

    // Mock data to match screenshot
    const usageData = [
        { name: 'Пн', value: 4000 },
        { name: 'Вт', value: 3000 },
        { name: 'Ср', value: 2000 },
        { name: 'Чт', value: 2780 },
        { name: 'Пт', value: 1890 },
        { name: 'Сб', value: 2390 },
        { name: 'Вс', value: 3490 },
    ];

    // Tariff calculation logic (Simplified for demo)
    const calculateCost = () => {
        // 3-level tariff simulation
        const level1Limit = 100;
        const level2Limit = 150; // up to 250 total
        const rate1 = 18;
        const rate2 = 28;

        let totalCost = 0;

        if (consumption <= level1Limit) {
            totalCost = consumption * rate1;
        } else {
            totalCost = level1Limit * rate1;
            const remainder = consumption - level1Limit;
            totalCost += remainder * rate2;
        }

        return totalCost.toFixed(2);
    };

    const totalCost = calculateCost();

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300 font-sans">
            <Header />

            <main className="max-w-[1600px] mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Аналитика Энергии</h1>
                    <p className="text-slate-500 dark:text-slate-400">Следите за потреблением энергии и оптимизируйте его</p>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {/* Today */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                            <span className="material-icons-round text-xl">flash_on</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Сегодня</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">0.0 <span className="text-lg text-slate-400 font-normal">кВт·ч</span></h3>
                    </div>

                    {/* This Week */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
                            <span className="material-icons-round text-xl">calendar_today</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Эта неделя</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">0.0 <span className="text-lg text-slate-400 font-normal">кВт·ч</span></h3>
                    </div>

                    {/* This Month */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                            <span className="material-icons-round text-xl">date_range</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Этот месяц</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">0.0 <span className="text-lg text-slate-400 font-normal">кВт·ч</span></h3>
                    </div>

                    {/* Estimated Cost */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center text-yellow-600 dark:text-yellow-400 mb-4">
                            <span className="material-icons-round text-xl">attach_money</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Примерная стоимость</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">$0.00</h3>
                    </div>
                </div>

                {/* Tariff Calculator Section */}
                <div className="bg-white dark:bg-card-dark p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Калькулятор тарифов (KZ)</h2>
                        <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                            Локация определена
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Left Column: Inputs */}
                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Месячное потребление: <span className="text-slate-900 dark:text-white font-bold">{consumption} кВт·ч</span></label>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1000"
                                    step="10"
                                    value={consumption}
                                    onChange={(e) => setConsumption(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Тип плиты</label>
                                    <div className="relative">
                                        <select
                                            value={stoveType}
                                            onChange={(e) => setStoveType(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white font-medium appearance-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="electric">Электро</option>
                                            <option value="gas">Газ</option>
                                        </select>
                                        <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 text-sm">flash_on</span>
                                        <span className="material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">expand_more</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Проживающих</label>
                                    <input
                                        type="number"
                                        value={occupants}
                                        onChange={(e) => setOccupants(parseInt(e.target.value))}
                                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <button className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all">
                                <span className="material-icons-round animate-spin-slow">sync</span>
                                Обновить расчет
                            </button>
                        </div>

                        {/* Right Column: Result */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ваш регион / Поставщик</p>
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-lg">
                                        {region} <span className="text-slate-300">•</span> {provider}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Итоговая стоимость</p>
                                    <div className="text-3xl font-bold text-primary">{Math.round(totalCost)} ₸</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Детализация расчета (3 уровня):</p>

                                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">1</div>
                                        <span className="text-slate-600 dark:text-slate-300 text-sm">100 кВт·ч × 18 ₸</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">1800.00 ₸</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs font-bold">2</div>
                                        <span className="text-slate-600 dark:text-slate-300 text-sm">{Math.min(consumption - 100, 150)} кВт·ч × 28 ₸</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{(Math.max(0, Math.min(consumption, 250) - 100) * 28).toFixed(2)} ₸</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
