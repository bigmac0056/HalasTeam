import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../api/api';
import Header from '../components/Header';

const PLAYBACK_POLL_MS = 12000;

const emptyPlaybackState = {
    isPlaying: false,
    positionSec: 0,
    playlistId: null,
    currentTrackId: null,
    currentTrack: null
};

export default function Music() {
    const [activeTab, setActiveTab] = useState('library');
    const [tracks, setTracks] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [playbackState, setPlaybackState] = useState(emptyPlaybackState);
    const [isPlaybackBusy, setIsPlaybackBusy] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    const audioRef = useRef(null);

    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
    const [selectedTrackId, setSelectedTrackId] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const [showDeleteTrackModal, setShowDeleteTrackModal] = useState(false);
    const [trackToDelete, setTrackToDelete] = useState(null);

    const [toast, setToast] = useState({ visible: false, type: 'success', text: '' });

    const showToast = useCallback((text, type = 'success') => {
        setToast({ visible: true, type, text });
        window.setTimeout(() => {
            setToast((prev) => (prev.text === text ? { ...prev, visible: false } : prev));
        }, 2800);
    }, []);

    const normalizePlaybackState = useCallback((data) => {
        if (!data || typeof data !== 'object') return emptyPlaybackState;
        return {
            isPlaying: Boolean(data.isPlaying),
            positionSec: Number(data.positionSec || 0),
            playlistId: data.playlistId || null,
            currentTrackId: data.currentTrackId || data.currentTrack?.id || null,
            currentTrack: data.currentTrack || null
        };
    }, []);

    const fetchTracks = useCallback(async () => {
        try {
            const res = await API.get('/music/tracks');
            setTracks(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
            showToast('Не удалось загрузить треки', 'error');
        }
    }, [showToast]);

    const fetchPlaylists = useCallback(async () => {
        try {
            const res = await API.get('/music/playlists');
            setPlaylists(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
            showToast('Не удалось загрузить плейлисты', 'error');
        }
    }, [showToast]);

    const fetchPlaybackState = useCallback(async () => {
        try {
            const res = await API.get('/music/playback/state');
            setPlaybackState(normalizePlaybackState(res.data));
        } catch (e) {
            console.error(e);
        }
    }, [normalizePlaybackState]);

    useEffect(() => {
        fetchTracks();
        fetchPlaylists();
        fetchPlaybackState();

        const poll = setInterval(fetchPlaybackState, PLAYBACK_POLL_MS);
        return () => clearInterval(poll);
    }, [fetchPlaybackState, fetchPlaylists, fetchTracks]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const trackUrl = playbackState.currentTrack?.fileUrl;
        if (!trackUrl) {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            return;
        }

        if (audio.src !== trackUrl) {
            audio.src = trackUrl;
        }

        if (playbackState.isPlaying) {
            audio.play().catch((error) => {
                console.error('Audio play error:', error);
            });
        } else {
            audio.pause();
        }
    }, [playbackState.currentTrack?.id, playbackState.currentTrack?.fileUrl, playbackState.isPlaying]);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload({ target: { files: e.dataTransfer.files } });
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        setUploadProgress(0);

        try {
            await API.post('/music/tracks/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            await fetchTracks();
            showToast('Трек загружен');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (e2) {
            showToast(`Ошибка загрузки: ${e2.response?.data?.error || e2.message}`, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const requestDeleteTrack = (track) => {
        setTrackToDelete(track);
        setShowDeleteTrackModal(true);
    };

    const confirmDeleteTrack = async () => {
        if (!trackToDelete?.id) return;
        try {
            await API.delete(`/music/tracks/${trackToDelete.id}`);
            await fetchTracks();
            await fetchPlaylists();
            if (playbackState.currentTrackId === trackToDelete.id) {
                setPlaybackState(emptyPlaybackState);
            }
            showToast('Трек удален');
        } catch (e) {
            console.error(e);
            showToast(e.response?.data?.error || 'Не удалось удалить трек', 'error');
        } finally {
            setShowDeleteTrackModal(false);
            setTrackToDelete(null);
        }
    };

    const createPlaylist = async (e) => {
        e.preventDefault();
        const trimmed = newPlaylistName.trim();
        if (!trimmed) return;

        try {
            await API.post('/music/playlists', { name: trimmed });
            setNewPlaylistName('');
            setShowCreatePlaylist(false);
            await fetchPlaylists();
            showToast('Плейлист создан');
        } catch (e2) {
            console.error(e2);
            showToast(e2.response?.data?.error || 'Не удалось создать плейлист', 'error');
        }
    };

    const addToPlaylist = async (playlistId) => {
        try {
            await API.post(`/music/playlists/${playlistId}/tracks`, { trackId: selectedTrackId });
            setShowAddToPlaylist(false);
            setSelectedTrackId(null);
            await fetchPlaylists();
            showToast('Трек добавлен в плейлист');
        } catch (e) {
            showToast(e.response?.data?.error || 'Ошибка', 'error');
        }
    };

    const runPlaybackAction = async (apiCall, fallbackErrorText) => {
        setIsPlaybackBusy(true);
        try {
            const res = await apiCall();
            setPlaybackState(normalizePlaybackState(res.data));
        } catch (e) {
            console.error(e);
            showToast(e.response?.data?.error || fallbackErrorText, 'error');
        } finally {
            setIsPlaybackBusy(false);
        }
    };

    const playPlaylist = async (playlistId) => {
        await runPlaybackAction(
            () => API.post('/music/playback/select-playlist', { playlistId }),
            'Ошибка воспроизведения плейлиста'
        );
    };

    const playTrackFromLibrary = async (trackId) => {
        const track = tracks.find((item) => item.id === trackId);
        if (!track) return;

        setIsPlaybackBusy(true);
        try {
            await API.post('/music/playback/state', {
                isPlaying: true,
                positionSec: 0,
                currentTrackId: track.id,
                playlistId: null
            });
            setPlaybackState({
                isPlaying: true,
                positionSec: 0,
                playlistId: null,
                currentTrackId: track.id,
                currentTrack: track
            });
        } catch (e) {
            console.error(e);
            showToast(e.response?.data?.error || 'Не удалось запустить трек', 'error');
        } finally {
            setIsPlaybackBusy(false);
        }
    };

    const pausePlayback = async () => {
        await runPlaybackAction(() => API.post('/music/playback/pause'), 'Не удалось поставить на паузу');
    };

    const resumePlayback = async () => {
        await runPlaybackAction(() => API.post('/music/playback/play'), 'Не удалось запустить воспроизведение');
    };

    const playNextTrack = async () => {
        await runPlaybackAction(() => API.post('/music/playback/next'), 'Нет следующего трека');
    };

    const playPrevTrack = async () => {
        await runPlaybackAction(() => API.post('/music/playback/prev'), 'Нет предыдущего трека');
    };

    const formatTime = (sec) => {
        if (!sec) return '--:--';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const formatSize = (bytes) => {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] transition-colors duration-500">
            <Header />
            <main className="max-w-[1500px] mx-auto px-8 py-10 pb-32">
                <div className="mb-8 flex justify-between items-center gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Музыка</h1>
                        <p className="text-slate-500">Управляйте вашей медиатекой</p>
                    </div>
                    <div className="flex bg-white dark:bg-card-dark p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                        <button
                            onClick={() => setActiveTab('library')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'library' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Библиотека
                        </button>
                        <button
                            onClick={() => setActiveTab('playlists')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'playlists' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Плейлисты
                        </button>
                    </div>
                </div>

                {activeTab === 'library' && (
                    <div className="space-y-8 animate-fade-in">
                        <div
                            className={`bg-white dark:bg-card-dark rounded-3xl p-8 border-2 border-dashed text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800'}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="audio/*"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform hover:scale-110 disabled:opacity-60"
                            >
                                <span className="material-icons-round text-3xl">cloud_upload</span>
                            </button>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                {isUploading ? 'Загрузка...' : 'Загрузить треки'}
                            </h3>
                            <p className="text-slate-500 text-sm mb-4">Перетащите файлы сюда или нажмите для выбора</p>

                            {isUploading && (
                                <div className="max-w-md mx-auto">
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-primary font-bold mt-2">{uploadProgress}%</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Название</th>
                                        <th className="px-6 py-4">Исполнитель</th>
                                        <th className="px-6 py-4">Время</th>
                                        <th className="px-6 py-4">Размер</th>
                                        <th className="px-6 py-4 text-right">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {tracks.map((track) => {
                                        const isCurrent = playbackState.currentTrackId === track.id;

                                        return (
                                            <tr key={track.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{track.title}</td>
                                                <td className="px-6 py-4 text-slate-500">{track.artist}</td>
                                                <td className="px-6 py-4 text-slate-500 text-sm font-mono">{formatTime(track.durationSec)}</td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">{formatSize(track.sizeBytes)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => playTrackFromLibrary(track.id)}
                                                            className={`p-2 transition-colors ${isCurrent && playbackState.isPlaying ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
                                                            title="Воспроизвести"
                                                            disabled={isPlaybackBusy}
                                                        >
                                                            <span className="material-icons-round text-lg">play_arrow</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedTrackId(track.id);
                                                                setShowAddToPlaylist(true);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                                                            title="Добавить в плейлист"
                                                        >
                                                            <span className="material-icons-round text-lg">playlist_add</span>
                                                        </button>
                                                        <button
                                                            onClick={() => requestDeleteTrack(track)}
                                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                            title="Удалить"
                                                        >
                                                            <span className="material-icons-round text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {tracks.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                                Библиотека пуста
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'playlists' && (
                    <div className="animate-fade-in space-y-8">
                        <button
                            onClick={() => setShowCreatePlaylist(true)}
                            className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                        >
                            <span className="material-icons-round">add</span>
                            Создать плейлист
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {playlists.map((pl) => {
                                const isActivePlaylist = playbackState.playlistId === pl.id;

                                return (
                                    <div key={pl.id} className="bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all group relative">
                                        <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 flex items-center justify-center text-slate-300 dark:text-slate-600">
                                            <span className="material-icons-round text-6xl">queue_music</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{pl.name}</h3>
                                        <p className="text-sm text-slate-500">{pl._count?.tracks || 0} треков</p>

                                        {isActivePlaylist && (
                                            <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                                <span className="material-icons-round text-sm">equalizer</span>
                                                Активен
                                            </span>
                                        )}

                                        <button
                                            onClick={() => playPlaylist(pl.id)}
                                            className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                            title="Играть плейлист"
                                            disabled={isPlaybackBusy}
                                        >
                                            <span className="material-icons-round text-2xl">play_arrow</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(960px,calc(100%-2rem))] z-[90]">
                <div className="bg-white/95 dark:bg-card-dark/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Сейчас играет</p>
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                            {playbackState.currentTrack?.title || 'Нет активного трека'}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                            {playbackState.currentTrack?.artist || 'Выберите трек или плейлист'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={playPrevTrack}
                            disabled={isPlaybackBusy || !playbackState.currentTrack}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
                            title="Предыдущий"
                        >
                            <span className="material-icons-round">skip_previous</span>
                        </button>
                        <button
                            type="button"
                            onClick={playbackState.isPlaying ? pausePlayback : resumePlayback}
                            disabled={isPlaybackBusy}
                            className="w-12 h-12 rounded-full bg-primary text-white shadow-lg disabled:opacity-50"
                            title={playbackState.isPlaying ? 'Пауза' : 'Воспроизвести'}
                        >
                            <span className="material-icons-round">{playbackState.isPlaying ? 'pause' : 'play_arrow'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={playNextTrack}
                            disabled={isPlaybackBusy || !playbackState.currentTrack}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
                            title="Следующий"
                        >
                            <span className="material-icons-round">skip_next</span>
                        </button>
                    </div>
                </div>
                <audio
                    ref={audioRef}
                    preload="metadata"
                    onEnded={playNextTrack}
                />
            </div>

            {showCreatePlaylist && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-card-dark rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-in">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Новый плейлист</h3>
                        <form onSubmit={createPlaylist}>
                            <input
                                type="text"
                                autoFocus
                                placeholder="Название..."
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none mb-6 focus:ring-2 focus:ring-primary/50"
                            />
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreatePlaylist(false)}
                                    className="flex-1 py-3 font-bold text-slate-400"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold"
                                >
                                    Создать
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddToPlaylist && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-card-dark rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-in">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Выберите плейлист</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {playlists.map((pl) => (
                                <button
                                    key={pl.id}
                                    onClick={() => addToPlaylist(pl.id)}
                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center transition-colors"
                                >
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{pl.name}</span>
                                    <span className="text-xs text-slate-400">{pl._count?.tracks || 0} треков</span>
                                </button>
                            ))}
                            {playlists.length === 0 && (
                                <p className="text-center text-slate-500 py-4">Нет плейлистов</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAddToPlaylist(false)}
                            className="w-full mt-6 py-3 font-bold text-slate-400"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            )}

            {showDeleteTrackModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-card-dark rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-4">
                            <span className="material-icons-round text-2xl">warning</span>
                        </div>
                        <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">Удалить трек?</h3>
                        <p className="text-center text-slate-500 mb-6">
                            Трек <span className="font-semibold">"{trackToDelete?.title || ''}"</span> будет удален без возможности восстановления.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteTrackModal(false);
                                    setTrackToDelete(null);
                                }}
                                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={confirmDeleteTrack}
                                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all font-medium"
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast.visible && (
                <div className="fixed right-5 top-24 z-[130] animate-fade-in-up">
                    <div className={`px-4 py-3 rounded-xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                        {toast.text}
                    </div>
                </div>
            )}
        </div>
    );
}
