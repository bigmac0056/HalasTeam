const SmartSphereAI = ({ autoPilot = false, onToggleAutoPilot, isAutoPilotUpdating = false }) => {

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
        ИИ управляет вашим энергопотреблением. Прогнозируемая экономия 12% в
        этом месяце.
      </p>

      <div className="space-y-4">
        {/* Toggle Option */}
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

        {/* Action Button/Dropdown simulation */}
        <div className="group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/10 transition-all cursor-pointer">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Сценарий: Прибытие домой
          </span>
          <span className="material-icons-round text-slate-400 group-hover:text-primary transition-colors">
            unfold_more
          </span>
        </div>
      </div>
    </div>
  );
};

export default SmartSphereAI;
