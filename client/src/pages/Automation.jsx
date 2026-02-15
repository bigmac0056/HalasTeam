import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import API from '../api/api';

export default function Automation() {
    const [devices, setDevices] = useState([]);
    const [automationRules, setAutomationRules] = useState([]);
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

    const fetchRules = async () => {
        try {
            const res = await API.get('/automation');
            setAutomationRules(res.data.rules);
        } catch (error) {
            console.error('Error fetching rules:', error);
        }
    };

    const fetchDevices = async () => {
        try {
            const res = await API.get('/devices');
            setDevices(res.data.devices);
        } catch (error) {
            console.error('Error fetching devices:', error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        const loadData = async () => {
            await fetchDevices();
            await fetchRules();
        };
        loadData();
    }, [navigate]);

    const toggleRule = async (id) => {
        try {
            await API.patch(`/automation/${id}/toggle`);
            setAutomationRules(rules =>
                rules.map(rule =>
                    rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
                )
            );
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
            } catch (error) {
                console.error('Error deleting rule:', error);
            }
        }
    };

    // Parse trigger/action JSON for display (ROBUST VERSION)
    const parseTrigger = (triggerStr) => {
        try {
            let t = triggerStr;
            if (typeof triggerStr === 'string') {
                try {
                    t = JSON.parse(triggerStr);
                } catch {
                    // If it's a string but not JSON, return it as legacy text
                    return triggerStr;
                }
            }

            if (typeof t === 'object' && t !== null) {
                if (t.type === 'time') return `⏰ В ${t.time}`;
                if (t.type === 'temperature') return `🌡️ Температура ${t.operator} ${t.value}°C`;
                return JSON.stringify(t); // Fallback for unknown object
            }
        } catch (e) {
            console.error("Error parsing trigger", e);
        }
        return String(triggerStr); // Safety cast
    };

    const parseAction = (actionStr) => {
        try {
            let a = actionStr;
            if (typeof actionStr === 'string') {
                try {
                    a = JSON.parse(actionStr);
                } catch {
                    return actionStr;
                }
            }

            if (typeof a === 'object' && a !== null) {
                const device = devices.find(d => d.id === a.deviceId);
                const name = device ? device.name : 'Устройство';
                return `${a.setStatus ? '✅ Включить' : '⛔ Выключить'} ${name}`;
            }
        } catch (e) {
            console.error("Error parsing action", e);
        }
        return String(actionStr);
    };

    const handleCreateRule = async (e) => {
        e.preventDefault();

        if (!newRule.name || !newRule.actionDeviceId) return;

        // Build trigger JSON
        let trigger;
        if (newRule.triggerType === 'time') {
            if (!newRule.triggerTime) return;
            trigger = { type: 'time', time: newRule.triggerTime };
        } else {
            trigger = { type: 'temperature', operator: newRule.triggerOperator, value: Number(newRule.triggerValue) };
        }

        // Build action JSON
        const action = { deviceId: newRule.actionDeviceId, setStatus: newRule.actionStatus };

        const icon = newRule.triggerType === 'time' ? 'schedule' : 'thermostat';

        try {
            const res = await API.post('/automation', {
                name: newRule.name,
                trigger,
                action,
                icon
            });
            setAutomationRules([...automationRules, res.data.rule]);
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

            <main className="max-w-[1400px] mx-auto px-8 py-12">
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
                                <span className="material-icons-round text-green-600 dark:text-green-400 text-2xl">check_circle</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-1">Активные правила</h3>
                        <p className="text-3xl font-bold text-text-main-light dark:text-text-main-dark">
                            {automationRules.filter(r => r.enabled).length}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <span className="material-icons-round text-purple-600 dark:text-purple-400 text-2xl">devices</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-1">Подключено устройств</h3>
                        <p className="text-3xl font-bold text-text-main-light dark:text-text-main-dark">{devices.length}</p>
                    </div>
                </div>

                {/* Rules List */}
                <div className="bg-white dark:bg-card-dark rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700/50">
                    <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-6">Ваши правила</h2>
                    {automationRules.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="material-icons-round text-6xl text-slate-300 dark:text-slate-600 mb-4">auto_awesome</span>
                            <h3 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-2">Нет правил автоматизации</h3>
                            <p className="text-text-muted-light dark:text-text-muted-dark mb-6">Создайте первое правило для автоматизации дома</p>
                            <button
                                onClick={() => setShowAddRule(true)}
                                className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-semibold transition-all inline-flex items-center gap-2"
                            >
                                <span className="material-icons-round">add</span>
                                Создать правило
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {automationRules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className={`p-6 rounded-xl border-2 transition-all ${rule.enabled
                                        ? 'bg-primary/5 border-primary/30 dark:bg-primary/10 dark:border-primary/40'
                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rule.enabled
                                                ? 'bg-primary/20 text-primary'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                                }`}>
                                                <span className="material-icons-round text-2xl">{rule.icon}</span>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark mb-2">{rule.name}</h3>
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="material-icons-round text-sm text-text-muted-light dark:text-text-muted-dark">schedule</span>
                                                        <span className="text-text-muted-light dark:text-text-muted-dark">Если: {parseTrigger(rule.trigger)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="material-icons-round text-sm text-text-muted-light dark:text-text-muted-dark">bolt</span>
                                                        <span className="text-text-muted-light dark:text-text-muted-dark">То: {parseAction(rule.action)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => toggleRule(rule.id)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                            <button
                                                onClick={() => deleteRule(rule.id)}
                                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                                            >
                                                <span className="material-icons-round text-xl">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tips */}
                <div className="mt-8 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 text-white dark:border dark:border-slate-700">
                    <h2 className="text-2xl font-bold mb-2">Как работает автоматизация</h2>
                    <p className="text-blue-100 dark:text-slate-400 mb-6">Правила проверяются каждые 30 секунд на главном экране</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/10 dark:bg-slate-700/50 backdrop-blur-sm rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-icons-round text-2xl">schedule</span>
                                <h3 className="font-bold">По времени</h3>
                            </div>
                            <p className="text-sm text-blue-100 dark:text-slate-400">Включить/выключить устройство в заданное время</p>
                        </div>
                        <div className="bg-white/10 dark:bg-slate-700/50 backdrop-blur-sm rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-icons-round text-2xl">thermostat</span>
                                <h3 className="font-bold">По температуре</h3>
                            </div>
                            <p className="text-sm text-blue-100 dark:text-slate-400">Реакция на изменение температуры на улице</p>
                        </div>
                        <div className="bg-white/10 dark:bg-slate-700/50 backdrop-blur-sm rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-icons-round text-2xl">home</span>
                                <h3 className="font-bold">Режим &quot;Ушел&quot;</h3>
                            </div>
                            <p className="text-sm text-blue-100 dark:text-slate-400">Автоматически выключает опасные устройства</p>
                        </div>
                        <div className="bg-white/10 dark:bg-slate-700/50 backdrop-blur-sm rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-icons-round text-2xl">nightlight</span>
                                <h3 className="font-bold">Режим &quot;Ночь&quot;</h3>
                            </div>
                            <p className="text-sm text-blue-100 dark:text-slate-400">Автоматически выключает весь свет</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Rule Modal — Structured Form */}
            {showAddRule && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-card-dark rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark">Создать правило</h2>
                            <button
                                onClick={() => setShowAddRule(false)}
                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="material-icons-round text-text-main-light dark:text-text-main-dark">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateRule} className="space-y-4">
                            {/* Rule name */}
                            <div>
                                <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-1">Название</label>
                                <input
                                    type="text"
                                    value={newRule.name}
                                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Например: Вечерний свет"
                                    required
                                />
                            </div>

                            {/* Trigger type */}
                            <div>
                                <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-1">Тип условия</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewRule({ ...newRule, triggerType: 'time' })}
                                        className={`flex-1 p-3 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2 ${newRule.triggerType === 'time'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-slate-200 dark:border-slate-600 text-text-muted-light dark:text-text-muted-dark hover:border-primary/50'
                                            }`}
                                    >
                                        <span className="material-icons-round text-lg">schedule</span>
                                        По времени
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewRule({ ...newRule, triggerType: 'temperature' })}
                                        className={`flex-1 p-3 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2 ${newRule.triggerType === 'temperature'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-slate-200 dark:border-slate-600 text-text-muted-light dark:text-text-muted-dark hover:border-primary/50'
                                            }`}
                                    >
                                        <span className="material-icons-round text-lg">thermostat</span>
                                        По температуре
                                    </button>
                                </div>
                            </div>

                            {/* Time trigger */}
                            {newRule.triggerType === 'time' && (
                                <div>
                                    <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-1">Время</label>
                                    <input
                                        type="time"
                                        value={newRule.triggerTime}
                                        onChange={(e) => setNewRule({ ...newRule, triggerTime: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            )}

                            {/* Temperature trigger */}
                            {newRule.triggerType === 'temperature' && (
                                <div className="flex gap-3">
                                    <div className="w-1/3">
                                        <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-1">Условие</label>
                                        <select
                                            value={newRule.triggerOperator}
                                            onChange={(e) => setNewRule({ ...newRule, triggerOperator: e.target.value })}
                                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="<">Ниже</option>
                                            <option value=">">Выше</option>
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-1">Градусы °C</label>
                                        <input
                                            type="number"
                                            value={newRule.triggerValue}
                                            onChange={(e) => setNewRule({ ...newRule, triggerValue: e.target.value })}
                                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Target device */}
                            <div>
                                <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-1">Устройство</label>
                                <select
                                    value={newRule.actionDeviceId}
                                    onChange={(e) => setNewRule({ ...newRule, actionDeviceId: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                >
                                    <option value="">Выберите устройство...</option>
                                    {devices.map(d => (
                                        <option key={d.id} value={d.id}>{d.name} ({d.room})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Action: on/off */}
                            <div>
                                <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-1">Действие</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewRule({ ...newRule, actionStatus: true })}
                                        className={`flex-1 p-3 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2 ${newRule.actionStatus
                                            ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                            : 'border-slate-200 dark:border-slate-600 text-text-muted-light dark:text-text-muted-dark'
                                            }`}
                                    >
                                        <span className="material-icons-round text-lg">power</span>
                                        Включить
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewRule({ ...newRule, actionStatus: false })}
                                        className={`flex-1 p-3 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2 ${!newRule.actionStatus
                                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                            : 'border-slate-200 dark:border-slate-600 text-text-muted-light dark:text-text-muted-dark'
                                            }`}
                                    >
                                        <span className="material-icons-round text-lg">power_off</span>
                                        Выключить
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full px-6 py-3 rounded-xl font-semibold bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30 transition-all mt-4"
                            >
                                Создать правило
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-card-dark rounded-2xl p-8 max-w-sm w-full shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-icons-round text-3xl text-red-600 dark:text-red-400">delete_forever</span>
                            </div>
                            <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-2">Удалить правило?</h2>
                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                                Вы уверены, что хотите удалить это правило? Это действие нельзя отменить.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 rounded-xl font-semibold border border-slate-200 dark:border-slate-600 text-text-main-light dark:text-text-main-dark hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 rounded-xl font-semibold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all"
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
