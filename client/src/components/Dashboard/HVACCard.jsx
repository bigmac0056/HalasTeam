import React from 'react';

const HVACCard = ({ name, room, status, value, onToggle, onChange = () => {}, onDelete }) => {

    return (
        <div className={`relative group bg-white dark:bg-card-dark rounded-3xl p-6 border transition-all hover:shadow-xl ${status ? 'border-primary/20 shadow-primary/5' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <span className="material-icons-round text-2xl">ac_unit</span>
                </div>
                <div className="flex items-center gap-2">
                    {onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors"
                            title="Удалить устройство"
                        >
                            <span className="material-icons-round text-base">delete</span>
                        </button>
                    )}
                    <button
                        onClick={onToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${status ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${status ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{name}</h4>
                <p className="text-xs text-slate-400 mt-1">{room} • Охлаждение</p>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{value || 24}°C</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Целевая Темп.</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onChange((value || 24) - 1)}
                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-icons-round">remove</span>
                    </button>
                    <button
                        onClick={() => onChange((value || 24) + 1)}
                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-icons-round">add</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HVACCard;
