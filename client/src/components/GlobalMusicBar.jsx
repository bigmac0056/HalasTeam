import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useMusicPlayer } from '../context/MusicPlayerContext';

const HIDDEN_PREFIXES = ['/login', '/register', '/oauth/callback'];

export default function GlobalMusicBar() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const {
    playback,
    isBusy,
    play,
    pause,
    next,
    prev,
    seek
  } = useMusicPlayer();

  const hiddenByRoute = useMemo(() => {
    if (location.pathname === '/') return true;
    if (location.pathname.startsWith('/info/')) return true;
    return HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));
  }, [location.pathname]);

  if (!token || hiddenByRoute || !playback.currentTrack) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(980px,calc(100%-2rem))] z-[90]">
      <div className="bg-white/95 dark:bg-card-dark/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 md:w-64">
          <p className="text-xs uppercase tracking-wide text-slate-400">Сейчас играет</p>
          <p className="font-bold text-slate-900 dark:text-white truncate">{playback.currentTrack.title}</p>
          <p className="text-sm text-slate-500 truncate">{playback.currentTrack.artist || 'Неизвестный исполнитель'}</p>
        </div>

        <div className="flex-1 min-w-[220px] max-w-xl">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={Number.isFinite(playback.progressPercent) ? playback.progressPercent : 0}
            onChange={(event) => seek(Number(event.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-pink-500 bg-slate-200 dark:bg-slate-700"
            title="Перемотка"
          />
          <div className="mt-1 flex justify-between text-[11px] text-slate-400">
            <span>{playback.currentTimeLabel}</span>
            <span>{playback.durationLabel}</span>
          </div>
          {playback.error && (
            <p className="mt-1 text-[11px] text-red-500 font-medium">{playback.error}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={isBusy}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
            title="Предыдущий"
          >
            <span className="material-icons-round">skip_previous</span>
          </button>
          <button
            type="button"
            onClick={playback.isPlaying ? pause : play}
            disabled={isBusy}
            className="w-12 h-12 rounded-full bg-primary text-white shadow-lg disabled:opacity-50"
            title={playback.isPlaying ? 'Пауза' : 'Воспроизвести'}
          >
            <span className="material-icons-round">{playback.isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>
          <button
            type="button"
            onClick={next}
            disabled={isBusy}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
            title="Следующий"
          >
            <span className="material-icons-round">skip_next</span>
          </button>
        </div>
      </div>
    </div>
  );
}
