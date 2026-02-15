import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import API from '../api/api';

export default function Automation() {
    const [devices, setDevices] = useState([]);
    const [automationRules, setAutomationRules] = useState([]);
    const [automationLogs, setAutomationLogs] = useState([]);
    const [showAddRule, setShowAddRule] = useState(false);
    const [newRule, setNewRule] = useState({
        name: '',
        triggerType: 'time',
        triggerTime: '',
        triggerOperator: '<',
        triggerValue: 20,
        actionDeviceId: '',
        actionStatus: true,
        icon: 'schedule'
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState(null);

    const navigate = useNavigate();

    const fetchRules = useCallback(async () => {
        try {
            const res = await API.get('/automation');
            setAutomationRules(res.data.rules);
        } catch (error) {
            console.error('Error fetching rules:', error);
        }
    }, []);

    const fetchDevices = useCallback(async () => {
        try {
            const res = await API.get('/devices');
            setDevices(res.data.devices);
        } catch (error) {
            console.error('Error fetching devices:', error);
        }
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            const res = await API.get('/automation/logs');
            setAutomationLogs(Array.isArray(res.data?.logs) ? res.data.logs : []);
        } catch (error) {
            console.error('Error fetching automation logs:', error);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        const loadData = async () => {
            await fetchDevices();
            await fetchRules();
            await fetchLogs();
        };
        loadData();

        const interval = setInterval(fetchLogs, 15000);
        return () => clearInterval(interval);
    }, [navigate, fetchDevices, fetchLogs, fetchRules]);

    const toggleRule = async (id) => {
        try {
            await API.patch(`/automation/${id}/toggle`);
            setAutomationRules(rules =>
                rules.map(rule =>
                    rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
                )
            );
            fetchLogs();
        } catch (error) {
            console.error('Error toggling rule:', error);
        }
    };

    const deleteRule = (id) => {
        setRuleToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (ruleToDelete) {
            try {
                await API.delete(`/automation/${ruleToDelete}`);
                setAutomationRules(rules => rules.filter(rule => rule.id !== ruleToDelete));
                setShowDeleteModal(false);
                setRuleToDelete(null);
                fetchLogs();
            } catch (error) {
                console.error('Error deleting rule:', error);
            }
        }
    };

    // Parse trigger/action JSON for display (ROBUST VERSION)
    const parseTrigger = (triggerStr) => {
        try {
            // If it's already an object, return it
            if (typeof triggerStr === 'object') return triggerStr;

            // Try to parse JSON
            return JSON.parse(triggerStr);
        } catch (e) {
            console.error(e);
            // Fallback for simple strings (legacy data)
            return { type: 'time', value: triggerStr || '00:00' };
        }
    };

    const parseAction = (actionStr) => {
        try {
            if (typeof actionStr === 'object') return actionStr;
            return JSON.parse(actionStr);
        } catch (e) {
            console.error(e);
            return { deviceId: 'unknown', status: false };
        }
    };

    const todayCount = automationLogs.filter((log) => {
        const ts = new Date(log.timestamp || log.time);
        if (Number.isNaN(ts.getTime())) return false;
        const now = new Date();
        return ts.getFullYear() === now.getFullYear()
            && ts.getMonth() === now.getMonth()
            && ts.getDate() === now.getDate();
    }).length;

    const handleAddRule = async (e) => {
        e.preventDefault();

        // Construct standard Trigger object
        const trigger = {
            type: newRule.triggerType, // 'time' | 'temperature' | 'sensor'
            value: newRule.triggerType === 'time' ? newRule.triggerTime : parseFloat(newRule.triggerValue),
            operator: newRule.triggerOperator
        };

        // Construct standard Action object
        const action = {
            deviceId: newRule.actionDeviceId,
            status: newRule.actionStatus // true = ON, false = OFF
        };

        const icon = newRule.triggerType === 'time' ? 'schedule' : 'thermostat';

        try {
            const res = await API.post('/automation', {
                name: newRule.name,
                trigger,
                action,
                icon
            });
            setAutomationRules([...automationRules, res.data.rule]);
            fetchLogs();
            setShowAddRule(false);
            setNewRule({
                name: '', triggerType: 'time', triggerTime: '', triggerOperator: '<',
                triggerValue: 20, actionDeviceId: '', actionStatus: true, icon: 'schedule'
            });
        } catch (error) {
            console.error('Error creating rule:', error);
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300">
            <Header />

            <main className="max-w-[1400px] mx-auto px-8 py-12 pb-32">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-text-main-light dark:text-text-main-dark">Правила автоматизации</h1>
                        <p className="text-text-muted-light dark:text-text-muted-dark mt-2">Создавайте и управляйте автоматизацией вашего дома</p>
                    </div>
                    <button
                        onClick={() => setShowAddRule(true)}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2"
                    >
                        <span className="material-icons-round">add</span>
                        Новое правило
                    </button>
                </div>

                {/* Automation Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <span className="material-icons-round text-blue-600 dark:text-blue-400 text-2xl">rule</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-1">Всего правил</h3>
                        <p className="text-3xl font-bold text-text-main-light dark:text-text-main-dark">{automationRules.length}</p>
                    </div>

                    <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <span className="material-icons-round text-green-600 dark:text-green-400 text-2xl">play_circle</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-1">Активные</h3>
                        <p className="text-3xl font-bold text-text-main-light dark:text-text-main-dark">
                            {automationRules.filter(r => r.enabled).length}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <span className="material-icons-round text-purple-600 dark:text-purple-400 text-2xl">history</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-1">Срабатываний за сегодня</h3>
                        <p className="text-3xl font-bold text-text-main-light dark:text-text-main-dark">{todayCount}</p>
                    </div>
                </div>

                {/* Rules List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {automationRules.map((rule) => {
                        const trigger = parseTrigger(rule.trigger);
                        const action = parseAction(rule.action);
                        const targetDevice = devices.find(d => d.id === action.deviceId);
                        const actionStatus = typeof action.status === 'boolean' ? action.status : action.setStatus;

                        return (
                            <div key={rule.id} className={`bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border transition-all ${rule.enabled
                                ? 'border-primary/30 dark:border-primary/20'
                                : 'border-slate-100 dark:border-slate-800 opacity-75'
                                }`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rule.enabled
                                            ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/20'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                            }`}>
                                            <span className="material-icons-round">{rule.icon || 'smart_toy'}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">{rule.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-text-muted-light dark:text-text-muted-dark">
                                                <span className={`inline-block w-2 h-2 rounded-full ${rule.enabled ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                {rule.enabled ? 'Активно' : 'На паузе'}
                                                {rule.lastTriggeredAt && (
                                                    <span className="ml-2 text-xs opacity-70 border-l pl-2 border-slate-300 dark:border-slate-700">
                                                        Сраб.: {new Date(rule.lastTriggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleRule(rule.id)}
                                            className={`p-2 rounded-lg transition-colors ${rule.enabled
                                                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            <span className="material-icons-round text-xl">
                                                {rule.enabled ? 'pause' : 'play_arrow'}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => deleteRule(rule.id)}
                                            className="p-2 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <span className="material-icons-round text-xl">delete</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm text-slate-500 dark:text-slate-300">
                                            <span className="material-icons-round text-sm">input</span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-text-muted-light dark:text-text-muted-dark block text-xs">Если</span>
                                            <span className="font-medium text-text-main-light dark:text-text-main-dark">
                                                {trigger.type === 'time'
                                                    ? `Время: ${trigger.time || trigger.value}`
                                                    : `Температура ${trigger.operator === '>' ? 'больше' : 'меньше'} ${trigger.value}°C`
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-center -my-2 relative z-10">
                                        <div className="bg-slate-100 dark:bg-slate-700 rounded-full p-1 border-4 border-white dark:border-card-dark">
                                            <span className="material-icons-round text-slate-400 text-sm block">arrow_downward</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm text-slate-500 dark:text-slate-300">
                                            <span className="material-icons-round text-sm">output</span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-text-muted-light dark:text-text-muted-dark block text-xs">То</span>
                                            <div className="font-medium text-text-main-light dark:text-text-main-dark flex items-center gap-1">
                                                <span>{targetDevice?.name || 'Устройство'}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${actionStatus
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                    }`}>
                                                    {actionStatus ? 'ВКЛ' : 'ВЫКЛ'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Add Rule Modal */}
            {showAddRule && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-card-dark rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark">Новое правило</h2>
                            <button
                                onClick={() => setShowAddRule(false)}
                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="material-icons-round text-text-main-light dark:text-text-main-dark">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddRule} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-2">Название сценария</label>
                                <input
                                    type="text"
                                    value={newRule.name}
                                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                                    placeholder="Например: Утренний свет"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main-light dark:text-text-main-dark focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                    required
                                />
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-text-main-light dark:text-text-main-dark border-b border-slate-100 dark:border-slate-800 pb-2">Если (Триггер)</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewRule({ ...newRule, triggerType: 'time' })}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2 ${newRule.triggerType === 'time'
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-slate-200 dark:border-slate-700 text-text-muted-light dark:text-text-muted-dark hover:border-primary/50'
                                            }`}
                                    >
                                        <span className="material-icons-round">schedule</span>
                                        Время
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewRule({ ...newRule, triggerType: 'temperature' })}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2 ${newRule.triggerType === 'temperature'
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-slate-200 dark:border-slate-700 text-text-muted-light dark:text-text-muted-dark hover:border-primary/50'
                                            }`}
                                    >
                                        <span className="material-icons-round">thermostat</span>
                                        Температура
                                    </button>
                                </div>

                                {newRule.triggerType === 'time' ? (
                                    <input
                                        type="time"
                                        value={newRule.triggerTime}
                                        onChange={(e) => setNewRule({ ...newRule, triggerTime: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main-light dark:text-text-main-dark outline-none focus:border-primary"
                                        required
                                    />
                                ) : (
                                    <div className="flex gap-3">
                                        <select
                                            value={newRule.triggerOperator}
                                            onChange={(e) => setNewRule({ ...newRule, triggerOperator: e.target.value })}
                                            className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main-light dark:text-text-main-dark outline-none focus:border-primary"
                                        >
                                            <option value=">">Больше</option>
                                            <option value="<">Меньше</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={newRule.triggerValue}
                                            onChange={(e) => setNewRule({ ...newRule, triggerValue: e.target.value })}
                                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main-light dark:text-text-main-dark outline-none focus:border-primary"
                                            required
                                        />
                                        <span className="flex items-center text-text-muted-light dark:text-text-muted-dark font-medium">°C</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-text-main-light dark:text-text-main-dark border-b border-slate-100 dark:border-slate-800 pb-2">То (Действие)</h3>
                                <div>
                                    <label className="block text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-2">Выберите устройство</label>
                                    <select
                                        value={newRule.actionDeviceId}
                                        onChange={(e) => setNewRule({ ...newRule, actionDeviceId: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main-light dark:text-text-main-dark outline-none focus:border-primary"
                                        required
                                    >
                                        <option value="">Не выбрано</option>
                                        {devices.map(d => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.room})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewRule({ ...newRule, actionStatus: true })}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${newRule.actionStatus
                                            ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                            : 'border-slate-200 dark:border-slate-700 text-text-muted-light dark:text-text-muted-dark hover:border-green-500/50'
                                            }`}
                                    >
                                        ВКЛЮЧИТЬ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewRule({ ...newRule, actionStatus: false })}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${!newRule.actionStatus
                                            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                            : 'border-slate-200 dark:border-slate-700 text-text-muted-light dark:text-text-muted-dark hover:border-red-500/50'
                                            }`}
                                    >
                                        ВЫКЛЮЧИТЬ
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddRule(false)}
                                    className="flex-1 px-6 py-3 rounded-xl font-semibold border border-slate-200 dark:border-slate-700 text-text-main-light dark:text-text-main-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 rounded-xl font-semibold bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30 transition-all"
                                >
                                    Создать правило
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-card-dark rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-4">
                            <span className="material-icons-round text-2xl">warning</span>
                        </div>
                        <h3 className="text-xl font-bold text-center text-text-main-light dark:text-text-main-dark mb-2">Удалить правило?</h3>
                        <p className="text-center text-text-muted-light dark:text-text-muted-dark mb-6">
                            Это действие нельзя отменить. Правило перестанет работать сразу.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-text-main-light dark:text-text-main-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all font-medium"
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
