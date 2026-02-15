import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../api/api';
import Header from '../components/Header';
import { useMusicPlayer } from '../context/MusicPlayerContext';

export default function Music() {
    const [activeTab, setActiveTab] = useState('library');
    const [tracks, setTracks] = useState([]);
    const [playlists, setPlaylists] = useState([]);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
    const [selectedTrackId, setSelectedTrackId] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const [showDeleteTrackModal, setShowDeleteTrackModal] = useState(false);
    const [trackToDelete, setTrackToDelete] = useState(null);

    const [toast, setToast] = useState({ visible: false, type: 'success', text: '' });

    const {
        playback,
        isBusy: isPlaybackBusy,
        play,
        pause,
        next,
        prev,
        seek,
        playPlaylist,
        playTrack,
        syncFromBackend
    } = useMusicPlayer();

    const showToast = useCallback((text, type = 'success') => {
        setToast({ visible: true, type, text });
        window.setTimeout(() => {
            setToast((prevToast) => (prevToast.text === text ? { ...prevToast, visible: false } : prevToast));
        }, 2600);
    }, []);

    const fetchTracks = useCallback(async () => {
        try {
            const res = await API.get('/music/tracks');
            setTracks(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
            showToast('Не удалось загрузить треки', 'error');
        }
    }, [showToast]);

    const fetchPlaylists = useCallback(async () => {
        try {
            const res = await API.get('/music/playlists');
            setPlaylists(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
            showToast('Не удалось загрузить плейлисты', 'error');
        }
    }, [showToast]);

    useEffect(() => {
        fetchTracks();
        fetchPlaylists();
        syncFromBackend();
    }, [fetchPlaylists, fetchTracks, syncFromBackend]);

    const handleDrag = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.type === 'dragenter' || event.type === 'dragover') {
            setDragActive(true);
        } else if (event.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            handleFileUpload({ target: { files: event.dataTransfer.files } });
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
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
        } catch (error) {
            showToast(`Ошибка загрузки: ${error.response?.data?.error || error.message}`, 'error');
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
            showToast('Трек удален');
        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.error || 'Не удалось удалить трек', 'error');
        } finally {
            setTrackToDelete(null);
            setShowDeleteTrackModal(false);
        }
    };

    const createPlaylist = async (event) => {
        event.preventDefault();
        const trimmed = newPlaylistName.trim();
        if (!trimmed) return;

        try {
            await API.post('/music/playlists', { name: trimmed });
            setNewPlaylistName('');
            setShowCreatePlaylist(false);
            await fetchPlaylists();
            showToast('Плейлист создан');
        } catch (error) {
            showToast(error.response?.data?.error || 'Не удалось создать плейлист', 'error');
        }
    };

    const addToPlaylist = async (playlistId) => {
        try {
            await API.post(`/music/playlists/${playlistId}/tracks`, { trackId: selectedTrackId });
            setShowAddToPlaylist(false);
            setSelectedTrackId(null);
            await fetchPlaylists();
            showToast('Трек добавлен в плейлист');
        } catch (error) {
            showToast(error.response?.data?.error || 'Ошибка добавления в плейлист', 'error');
        }
    };

    const handlePlayTrack = async (trackId) => {
        const track = tracks.find((item) => item.id === trackId);
        if (!track) return;
        await playTrack(track);
    };

    const handlePlayPause = async () => {
        if (playback.isPlaying) {
            await pause();
            return;
        }
        await play();
    };

    const formatTime = (sec) => {
        if (sec === null || sec === undefined || Number.isNaN(Number(sec))) return '--:--';
        const safe = Math.max(0, Number(sec));
        const min = Math.floor(safe / 60);
        const seconds = Math.floor(safe % 60);
        return `${min}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatSize = (bytes) => {
        return `${(Number(bytes || 0) / (1024 * 1024)).toFixed(2)} MB`;
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

                {playback.currentTrack && (
                    <div className="mb-6 bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex flex-wrap items-center gap-3 justify-between">
                            <div>
                                <p className="text-xs uppercase text-slate-400">Сейчас играет</p>
                                <p className="font-bold text-slate-900 dark:text-white">{playback.currentTrack.title}</p>
                                <p className="text-sm text-slate-500">{playback.currentTrack.artist || 'Неизвестный исполнитель'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={prev} disabled={isPlaybackBusy} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40">
                                    <span className="material-icons-round">skip_previous</span>
                                </button>
                                <button type="button" onClick={handlePlayPause} disabled={isPlaybackBusy} className="w-12 h-12 rounded-full bg-primary text-white shadow-lg disabled:opacity-50">
                                    <span className="material-icons-round">{playback.isPlaying ? 'pause' : 'play_arrow'}</span>
                                </button>
                                <button type="button" onClick={next} disabled={isPlaybackBusy} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40">
                                    <span className="material-icons-round">skip_next</span>
                                </button>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={Number.isFinite(playback.progressPercent) ? playback.progressPercent : 0}
                            onChange={(event) => seek(Number(event.target.value))}
                            className="mt-3 w-full h-1.5 rounded-full appearance-none cursor-pointer accent-pink-500 bg-slate-200 dark:bg-slate-700"
                        />
                        <div className="mt-1 flex justify-between text-xs text-slate-400">
                            <span>{playback.currentTimeLabel}</span>
                            <span>{playback.durationLabel}</span>
                        </div>
                        {playback.error && (
                            <p className="mt-2 text-sm text-red-500 font-medium">{playback.error}</p>
                        )}
                    </div>
                )}

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
                                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
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
                                        const isCurrent = playback.currentTrackId === track.id;

                                        return (
                                            <tr key={track.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{track.title}</td>
                                                <td className="px-6 py-4 text-slate-500">{track.artist}</td>
                                                <td className="px-6 py-4 text-slate-500 text-sm font-mono">{formatTime(track.durationSec)}</td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">{formatSize(track.sizeBytes)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handlePlayTrack(track.id)}
                                                            className={`p-2 transition-colors ${isCurrent && playback.isPlaying ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
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
                            {playlists.map((playlist) => {
                                const isActivePlaylist = playback.playlistId === playlist.id;

                                return (
                                    <div key={playlist.id} className="bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all group relative">
                                        <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 flex items-center justify-center text-slate-300 dark:text-slate-600">
                                            <span className="material-icons-round text-6xl">queue_music</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{playlist.name}</h3>
                                        <p className="text-sm text-slate-500">{playlist._count?.tracks || 0} треков</p>

                                        {isActivePlaylist && (
                                            <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                                <span className="material-icons-round text-sm">equalizer</span>
                                                Активен
                                            </span>
                                        )}

                                        <button
                                            onClick={() => playPlaylist(playlist.id)}
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
                                onChange={(event) => setNewPlaylistName(event.target.value)}
                                className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none mb-6 focus:ring-2 focus:ring-primary/50"
                            />
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowCreatePlaylist(false)} className="flex-1 py-3 font-bold text-slate-400">Отмена</button>
                                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold">Создать</button>
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
                            {playlists.map((playlist) => (
                                <button
                                    key={playlist.id}
                                    onClick={() => addToPlaylist(playlist.id)}
                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center transition-colors"
                                >
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{playlist.name}</span>
                                    <span className="text-xs text-slate-400">{playlist._count?.tracks || 0} треков</span>
                                </button>
                            ))}
                            {playlists.length === 0 && (
                                <p className="text-center text-slate-500 py-4">Нет плейлистов</p>
                            )}
                        </div>
                        <button type="button" onClick={() => setShowAddToPlaylist(false)} className="w-full mt-6 py-3 font-bold text-slate-400">Отмена</button>
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
                            <button onClick={confirmDeleteTrack} className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all font-medium">Удалить</button>
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
