import { useState } from 'react';

const SmartSphereAI = () => {
    const [autoPilot, setAutoPilot] = useState(true);

    return (
        <div className="bg-white dark:bg-card-dark rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-all h-fit animate-fade-in-right">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-icons-round text-primary text-xl">auto_awesome</span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">SmartSphere AI</h3>
                </div>
                <div className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Active
                </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                AI is currently managing your energy usage. Savings of 12% projected this month.
            </p>

            <div className="space-y-4">
                {/* Toggle Option */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/10 transition-all cursor-pointer">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Auto-Pilot Mode</span>
                    <button
                        onClick={() => setAutoPilot(!autoPilot)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoPilot ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${autoPilot ? 'translate-x-4.5' : 'translate-x-1'}`} />
                    </button>
                </div>

                {/* Action Button/Dropdown simulation */}
                <div className="group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/10 transition-all cursor-pointer">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Preset: Arriving Home</span>
                    <span className="material-icons-round text-slate-400 group-hover:text-primary transition-colors">unfold_more</span>
                </div>
            </div>
        </div>
    );
};

export default SmartSphereAI;
