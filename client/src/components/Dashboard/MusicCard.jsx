import { useState } from 'react';

const MusicCard = ({ name, room, status, onToggle }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <div className={`relative group bg-white dark:bg-card-dark rounded-3xl p-6 border transition-all hover:shadow-xl ${status ? 'border-primary/20 shadow-primary/5' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner">
                        <img src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=200" alt="Album" className="w-full h-full object-cover opacity-80" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{name}</h4>
                        <p className="text-xs text-primary font-medium mt-1">Playing: Morning Jazz Mix</p>
                    </div>
                </div>
                <button
                    onClick={onToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${status ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${status ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            <div className="relative h-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-6 overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-pink-500 w-1/3 shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
            </div>

            <div className="flex justify-center items-center gap-6">
                <button className="text-slate-400 hover:text-primary transition-colors">
                    <span className="material-icons-round text-xl">skip_previous</span>
                </button>
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shadow-lg shadow-pink-200 dark:shadow-none hover:scale-110 transition-transform"
                >
                    <span className="material-icons-round text-2xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
                </button>
                <button className="text-slate-400 hover:text-primary transition-colors">
                    <span className="material-icons-round text-xl">skip_next</span>
                </button>
            </div>
        </div>
    );
};

export default MusicCard;
