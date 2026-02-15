const HeroCard = ({ weather }) => {
    return (
        <div className="bg-[#0f172a] dark:bg-[#020617] rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-500/10 animate-fade-in-up">
            {/* Abstract Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <p className="text-blue-200/60 text-sm font-medium mb-1">Welcome back, Alex</p>
                    <h2 className="text-5xl font-bold tracking-tight mb-8">System Status: <span className="text-blue-400">Optimal</span></h2>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-8">
                    {/* Indoor KPIs */}
                    <div className="flex gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="material-icons-round text-blue-300 text-xl">thermostat</span>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-blue-200/40 font-bold">Indoor Temp</p>
                                <p className="text-lg font-bold">22.5°C</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="material-icons-round text-blue-300 text-xl">water_drop</span>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-blue-200/40 font-bold">Humidity</p>
                                <p className="text-lg font-bold">48%</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="material-icons-round text-blue-300 text-xl">air</span>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-blue-200/40 font-bold">Air Quality</p>
                                <p className="text-lg font-bold text-green-400">Excellent</p>
                            </div>
                        </div>
                    </div>

                    {/* External Weather */}
                    <div className="flex items-center gap-4 text-right">
                        <div>
                            <div className="text-6xl font-black flex items-start">
                                18°
                            </div>
                            <p className="text-sm font-medium text-blue-200/60 mt-1">Seattle, WA • Partly Cloudy</p>
                        </div>
                        <div className="text-6xl animate-pulse-slow">
                            ⛅
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroCard;
