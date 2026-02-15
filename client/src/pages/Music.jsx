import { useState, useEffect, useRef } from 'react';
import API from '../api/api';
import Header from '../components/Header';

export default function Music() {
    const [activeTab, setActiveTab] = useState('library'); // library, playlists
    const [tracks, setTracks] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    // Playlist creation state
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    useEffect(() => {
        fetchTracks();
        fetchPlaylists();
    }, []);

    const fetchTracks = async () => {
        try {
            const res = await API.get('/music/tracks');
            setTracks(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchPlaylists = async () => {
        try {
            const res = await API.get('/music/playlists');
            setPlaylists(res.data);
        } catch (e) {
            console.error(e);
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
            fetchTracks();
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (e) {
            alert('Upload failed: ' + (e.response?.data?.error || e.message));
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteTrack = async (id) => {
        if (!confirm('Удалить трек?')) return;
        try {
            await API.delete(`/music/tracks/${id}`);
            fetchTracks();
        } catch (e) {
            console.error(e);
        }
    };

    const createPlaylist = async (e) => {
        e.preventDefault();
        try {
            await API.post('/music/playlists', { name: newPlaylistName });
            setNewPlaylistName('');
            setShowCreatePlaylist(false);
            fetchPlaylists();
        } catch (e) {
            console.error(e);
        }
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
            <main className="max-w-[1500px] mx-auto px-8 py-10">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Музыка</h1>
                        <p className="text-slate-500">Управляйте вашей медиатекой</p>
                    </div>
                    {/* Tabs */}
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
                        {/* Upload Area */}
                        <div className="bg-white dark:bg-card-dark rounded-3xl p-8 border border-slate-200 dark:border-slate-800 border-dashed text-center">
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
                                className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform hover:scale-110"
                            >
                                <span className="material-icons-round text-3xl">cloud_upload</span>
                            </button>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Загрузить треки</h3>
                            <p className="text-slate-500 text-sm mb-4">MP3, WAV, OGG (max 20MB)</p>

                            {isUploading && (
                                <div className="max-w-md mx-auto">
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-primary font-bold mt-2">Загрузка {uploadProgress}%</p>
                                </div>
                            )}
                        </div>

                        {/* Tracks List */}
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
                                    {tracks.map(track => (
                                        <tr key={track.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{track.title}</td>
                                            <td className="px-6 py-4 text-slate-500">{track.artist}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm font-mono">{formatTime(track.durationSec)}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">{formatSize(track.sizeBytes)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteTrack(track.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <span className="material-icons-round text-lg">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
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
                            {playlists.map(pl => (
                                <div key={pl.id} className="bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all group">
                                    <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 flex items-center justify-center text-slate-300 dark:text-slate-600">
                                        <span className="material-icons-round text-6xl">queue_music</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{pl.name}</h3>
                                    <p className="text-sm text-slate-500">{pl._count?.tracks || 0} треков</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Create Playlist Modal */}
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
                                onChange={e => setNewPlaylistName(e.target.value)}
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
        </div>
    );
}
