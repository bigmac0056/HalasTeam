import { useState } from 'react';

const SCENARIOS = ['Прибытие домой', 'Ночной режим', 'Ушел из дома', 'Отпуск'];
const DEFAULT_AI_STATUS = {
  new: { count: 0, items: [] },
  applied: { count: 0, items: [] },
  effect: { successfulActions: 0, estimatedSavedKwhMonth: 0, estimatedSavedKztMonth: 0 }
};

const SmartSphereAI = ({
  autoPilot = false,
  onToggleAutoPilot,
  isAutoPilotUpdating = false,
  scenario = 'Прибытие домой',
  onScenarioSelect,
  recommendations = [],
  recommendationsLoading = false,
  onRefreshRecommendations,
  onApplyRecommendation,
  onDismissRecommendation,
  onClearActions,
  actions = [],
  aiStatus = DEFAULT_AI_STATUS
}) => {
  const [isScenarioOpen, setIsScenarioOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyRecId, setBusyRecId] = useState(null);
  const [isClearingActions, setIsClearingActions] = useState(false);

  const handleScenarioClick = (value) => {
    if (onScenarioSelect) onScenarioSelect(value);
    setIsScenarioOpen(false);
  };

  const handleRefresh = async () => {
    if (!onRefreshRecommendations) return;
    setIsRefreshing(true);
    try {
      await onRefreshRecommendations();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApply = async (id) => {
    if (!onApplyRecommendation) return;
    setBusyRecId(id);
    try {
      await onApplyRecommendation(id);
    } finally {
      setBusyRecId(null);
    }
  };

  const handleDismiss = async (id) => {
    if (!onDismissRecommendation) return;
    setBusyRecId(id);
    try {
      await onDismissRecommendation(id);
    } finally {
      setBusyRecId(null);
    }
  };

  const handleClearActions = async () => {
    if (!onClearActions) return;
    setIsClearingActions(true);
    try {
      await onClearActions();
    } finally {
      setIsClearingActions(false);
    }
  };

  return (
    <div className="bg-white dark:bg-card-dark rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-all h-fit animate-fade-in-right">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-icons-round text-primary text-xl">
              auto_awesome
            </span>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">
            SmartSphere AI
          </h3>
        </div>
        <div className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${autoPilot ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
          {autoPilot ? 'Активен' : 'Выключен'}
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
        ИИ анализирует ваши привычки для оптимизации комфорта и энергосбережения в реальном времени.
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-2 text-center">
          <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Новые</p>
          <p className="text-lg font-black text-slate-900 dark:text-white">{aiStatus?.new?.count || 0}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-2 text-center">
          <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Применено</p>
          <p className="text-lg font-black text-slate-900 dark:text-white">{aiStatus?.applied?.count || 0}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-2 text-center">
          <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-500">Эффект</p>
          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
            {(Number(aiStatus?.effect?.estimatedSavedKwhMonth || 0)).toFixed(1)} кВт·ч
          </p>
          <p className="text-[10px] font-semibold text-emerald-500">
            ~{Math.round(Number(aiStatus?.effect?.estimatedSavedKztMonth || 0))} ₸/мес
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/10 transition-all cursor-pointer">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Автопилот
          </span>
          <button
            type="button"
            disabled={isAutoPilotUpdating}
            onClick={() => onToggleAutoPilot?.(!autoPilot)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoPilot ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"} ${isAutoPilotUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${autoPilot ? "translate-x-5" : "translate-x-1"}`}
            />
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsScenarioOpen((prev) => !prev)}
            className="w-full group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/10 transition-all cursor-pointer"
          >
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Сценарий: {scenario}
            </span>
            <span className={`material-icons-round text-slate-400 group-hover:text-primary transition-all ${isScenarioOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {isScenarioOpen && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
              {SCENARIOS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleScenarioClick(item)}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                    item === scenario
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wide font-bold text-slate-400">Рекомендации ИИ</p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={recommendationsLoading || isRefreshing}
            className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {recommendationsLoading || isRefreshing ? 'Обновление...' : 'Обновить'}
          </button>
        </div>

        <div className="space-y-3">
          {recommendationsLoading ? (
            <div className="text-xs text-slate-400 animate-pulse">Загрузка рекомендаций...</div>
          ) : recommendations.length === 0 ? (
            <div className="text-xs text-slate-400">Рекомендаций пока нет. Нажмите "Обновить".</div>
          ) : (
            recommendations.slice(0, 3).map((rec) => (
              <div key={rec.id} className="rounded-xl border border-slate-100 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{rec.title}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    P{rec.priority || 1}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">{rec.reason}</p>
                <div className="text-[11px] font-semibold text-green-600 mb-2">
                  Экономия ~{Number(rec.estimatedKwhSaveMonth || 0).toFixed(1)} кВт·ч/мес
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApply(rec.id)}
                    disabled={busyRecId === rec.id}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-50"
                  >
                    Применить
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismiss(rec.id)}
                    disabled={busyRecId === rec.id}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold disabled:opacity-50"
                  >
                    Скрыть
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wide font-bold text-slate-400">Действия ИИ</p>
          <button
            type="button"
            onClick={handleClearActions}
            disabled={isClearingActions || actions.length === 0}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
          >
            {isClearingActions ? 'Очистка...' : 'Очистить'}
          </button>
        </div>
        <div className="space-y-2 max-h-36 overflow-auto pr-1">
          {actions.length === 0 ? (
            <div className="text-xs text-slate-400">Пока нет примененных действий</div>
          ) : (
            actions.slice(0, 4).map((action) => (
              <div key={action.id} className="text-xs rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold ${action.status === 'SUCCESS' ? 'text-green-600' : 'text-amber-600'}`}>
                    {action.status === 'SUCCESS' ? 'Выполнено' : 'Пропущено'}
                  </span>
                  <span className="text-slate-400">
                    {new Date(action.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{action.details || action.actionType}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartSphereAI;
