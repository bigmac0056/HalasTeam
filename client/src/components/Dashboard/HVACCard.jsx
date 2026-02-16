import React, { useEffect, useState } from 'react';

const HVACCard = ({ name, room, status, value, type, onToggle, onChange = () => {}, onDelete }) => {
    const isAC = type === 'AC';
    const MIN_TEMP = 16;
    const MAX_TEMP = 30;
    const currentValue = Number.isFinite(Number(value)) ? Number(value) : 24;
    const [draftValue, setDraftValue] = useState(String(currentValue));
    const modeLabel = isAC ? 'Охлаждение' : 'Обогрев';
    const ecoRangeLabel = isAC ? 'Эко-диапазон: 23-24°C' : 'Эко-диапазон: 21-22°C';
    const icon = isAC ? 'ac_unit' : 'local_fire_department';
    const iconClass = isAC
        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
        : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400';
    const activeBorder = isAC ? 'border-blue-300/40 shadow-blue-500/10' : 'border-orange-300/40 shadow-orange-500/10';

    useEffect(() => {
        setDraftValue(String(currentValue));
    }, [currentValue]);

    const commitDraftValue = () => {
        const parsed = Number(String(draftValue).replace(',', '.'));
        if (!Number.isFinite(parsed)) {
            setDraftValue(String(currentValue));
            return;
        }
        const clamped = Math.max(MIN_TEMP, Math.min(MAX_TEMP, Math.round(parsed)));
        setDraftValue(String(clamped));
        if (clamped !== currentValue) {
            onChange(clamped);
        }
    };

    return (
        <div className={`relative group bg-white dark:bg-card-dark rounded-3xl p-6 border transition-all hover:shadow-xl ${status ? activeBorder : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconClass}`}>
                    <span className="material-icons-round text-2xl">{icon}</span>
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
                <p className="text-xs text-slate-400 mt-1">{room} • {modeLabel}</p>
                <p className="text-[11px] text-slate-400 mt-1">{ecoRangeLabel}</p>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <div className="flex items-end gap-2">
                        <input
                            type="number"
                            min={MIN_TEMP}
                            max={MAX_TEMP}
                            value={draftValue}
                            onChange={(e) => setDraftValue(e.target.value)}
                            onBlur={commitDraftValue}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitDraftValue();
                                }
                            }}
                            className="w-20 bg-transparent text-3xl font-black text-slate-900 dark:text-white leading-none focus:outline-none"
                        />
                        <span className="text-3xl font-black text-slate-900 dark:text-white">°C</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Целевая Темп. (16-30)</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onChange(currentValue - 1)}
                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-icons-round">remove</span>
                    </button>
                    <button
                        onClick={() => onChange(currentValue + 1)}
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
