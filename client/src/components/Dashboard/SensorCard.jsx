import React, { useState } from 'react';
import API from '../../api/api';

const SensorCard = ({ device, onUpdate, onDelete }) => {
    // Determine alert state (assuming value 1 is alert for binary sensors)
    const isAlert = device.value === 1 || device.isAlert;
    const [loading, setLoading] = useState(false);

    const handleSimulate = async (trigger) => {
        setLoading(true);
        try {
            // For boolean sensors (Smoke, Water, Motion), 1 = Active/Danger, 0 = Inactive/Safe
            const newValue = trigger ? 1 : 0;
            // Toggle generic endpoint
            // Ideally we should use a specific endpoint or just update value
            // We'll use the generic verify-compatible 'toggle' or 'update value' if available
            // But usually sensors push data. Here we simulate it via API.

            // Checking if we have a specific endpoint for updating value
            // The instructions mentioned: POST /devices/:id/value
            await API.put(`/devices/${device.id}/value`, {
                value: newValue,
                unit: device.unit || ''
            });

            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Simulation failed", error);
        } finally {
            setLoading(false);
        }
    };

    let icon = 'sensors';
    let colorClass = 'text-slate-400';
    let bgClass = 'bg-slate-100 dark:bg-slate-800';
    let alertLabel = 'NORMAL';

    const type = device.sensorType || 'generic';

    if (type === 'smoke') {
        icon = 'local_fire_department';
        if (isAlert) {
            colorClass = 'text-red-500';
            bgClass = 'bg-red-100 dark:bg-red-900/30';
            alertLabel = 'SMOKE DETECTED';
        }
    } else if (type === 'waterLeak') {
        icon = 'water_drop';
        if (isAlert) {
            colorClass = 'text-blue-500';
            bgClass = 'bg-blue-100 dark:bg-blue-900/30';
            alertLabel = 'LEAK DETECTED';
        }
    } else if (type === 'motion') {
        icon = 'directions_run';
        if (isAlert) {
            colorClass = 'text-orange-500';
            bgClass = 'bg-orange-100 dark:bg-orange-900/30';
            alertLabel = 'MOTION DETECTED';
        }
    } else if (type === 'temperature') {
        icon = 'thermostat';
        if (device.value > 28) {
            colorClass = 'text-red-500';
            bgClass = 'bg-red-100 dark:bg-red-900/30';
            alertLabel = 'HIGH TEMP';
            // Logic for temp simulation might differ (slider?) but buttons work for min/max demo
        }
    }

    return (
        <div className={`relative group bg-white dark:bg-card-dark rounded-3xl p-6 border transition-all ${isAlert ? 'border-red-500/50 shadow-lg shadow-red-500/10' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${bgClass}`}>
                    <span className={`material-icons-round text-2xl ${colorClass}`}>{icon}</span>
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
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isAlert ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300' : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                        {alertLabel}
                    </div>
                </div>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{device.name}</h3>
            <p className="text-xs text-slate-400 mb-6">{device.room} • {type}</p>

            {type === 'temperature' ? (
                <div className="mb-4">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{device.value}°C</span>
                </div>
            ) : null}

            <div className="flex gap-2">
                <button
                    onClick={() => handleSimulate(true)}
                    disabled={loading || isAlert}
                    className="flex-1 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                    <span className="material-icons-round text-sm">warning</span>
                    TEST
                </button>
                <button
                    onClick={() => handleSimulate(false)}
                    disabled={loading || !isAlert}
                    className="flex-1 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                    <span className="material-icons-round text-sm">restart_alt</span>
                    RESET
                </button>
            </div>
        </div>
    );
};

export default SensorCard;
