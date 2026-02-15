import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../api/api';

const Header = () => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [user, setUser] = useState({});
    const navigate = useNavigate();
    const location = useLocation();

    // Lazy init for theme
    const [isDark, setIsDark] = useState(() => {
        const storedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return storedTheme === 'dark' || (!storedTheme && systemPrefersDark);
    });

    // Apply theme side-effect
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const toggleDarkMode = () => setIsDark(!isDark);

    const isActive = (path) => location.pathname === path;

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await API.get('/profile');
                setUser(res.data || {});
            } catch (error) {
                console.error("Failed to fetch profile", error);
            }
        };
        const token = localStorage.getItem('token');
        if (token) fetchProfile();
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('auth-changed'));
        navigate('/login', { replace: true });
    };

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await API.get('/notifications');
            setNotifications(res.data?.notifications || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, []);

    const markAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            await API.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllRead = async () => {
        try {
            // Assuming APIs supports this or we iterate. 
            // Since prompt asked for 'mark all as read UX', and API might not have bulk endpoint, 
            // I'll use the clear (DELETE) as "Clear All" is already there. 
            // If I need true "Mark All Read", I'd need a new endpoint or loop. 
            // For now, I'll stick to clarifying the UI. 
            // Actually, I'll add a loop for now or just visual update if backend lacks bulk.
            // But valid "Mark all read" usually calls an endpoint.
            // Let's implement it as a visual update + loop for MVP if needed, 
            // OR just rely on "Clear" which deletes them. 
            // The prompt mainly asked for "UX". I will add "Mark read" per item logic first.
            // For "Mark all", I'll loop frontend for now if endpoint missing.
            const unread = notifications.filter(n => !n.isRead);
            await Promise.all(unread.map(n => API.patch(`/notifications/${n.id}/read`)));
            fetchNotifications();
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    };

    const clearNotifications = async () => {
        try {
            await API.delete('/notifications');
            setNotifications([]);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // eslint-disable-next-line
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 15000); // Polling every 15s per requirement
            return () => clearInterval(interval);
        }
    }, [fetchNotifications]);

    return (
        <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 dark:border-slate-700 px-8 py-3">
            <div className="max-w-[1400px] mx-auto flex justify-between items-center">
                <div className="flex items-center gap-8">
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                            <img src="/logo.png" alt="SmartSphere" className="w-10 h-10 object-contain group-hover:scale-105 transition-transform" />
                        </div>
                        <span className="text-2xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent tracking-tighter">SmartSphere</span>
                    </Link>
                    <nav className="hidden md:flex gap-6 text-sm font-medium">
                        <Link
                            to="/dashboard"
                            className={`transition-colors ${isActive('/dashboard')
                                ? 'text-primary font-semibold'
                                : 'text-text-muted-light dark:text-text-muted-dark hover:text-primary'}`}
                        >
                            Панель
                        </Link>
                        <Link
                            to="/energy"
                            className={`transition-colors ${isActive('/energy')
                                ? 'text-primary font-semibold'
                                : 'text-text-muted-light dark:text-text-muted-dark hover:text-primary'}`}
                        >
                            Энергопотребление
                        </Link>
                        <Link
                            to="/automation"
                            className={`transition-colors ${isActive('/automation')
                                ? 'text-primary font-semibold'
                                : 'text-text-muted-light dark:text-text-muted-dark hover:text-primary'}`}
                        >
                            Автоматизация
                        </Link>
                        <Link
                            to="/music"
                            className={`transition-colors ${isActive('/music')
                                ? 'text-primary font-semibold'
                                : 'text-text-muted-light dark:text-text-muted-dark hover:text-primary'}`}
                        >
                            Музыка
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        onClick={toggleDarkMode}
                        title={isDark ? "Светлая тема" : "Темная тема"}
                    >
                        {/* Status: Logic simplified to prevent duplicates */}
                        {isDark ? (
                            <span className="material-icons-round text-xl text-yellow-400">light_mode</span>
                        ) : (
                            <span className="material-icons-round text-xl text-slate-700">dark_mode</span>
                        )}
                    </button>
                    <div className="relative">
                        <button
                            className="relative p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            onClick={() => {
                                if (!showNotifications) fetchNotifications();
                                setShowNotifications(!showNotifications);
                            }}
                        >
                            <span className="material-icons-round text-xl text-text-light dark:text-text-dark">notifications</span>
                            {notifications.some(n => !n.isRead) && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden transform transition-all origin-top-right animate-in fade-in slide-in-from-top-2">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
                                    <h3 className="font-bold text-text-light dark:text-text-dark">Уведомления</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={markAllRead}
                                            className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
                                        >
                                            Прочитать все
                                        </button>
                                        <div className="w-px h-3 bg-slate-300 dark:bg-slate-600 self-center"></div>
                                        <button
                                            onClick={clearNotifications}
                                            className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                                        >
                                            Очистить
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-text-muted-light dark:text-text-muted-dark">
                                            <span className="material-icons-round text-4xl mb-2 opacity-50">notifications_off</span>
                                            <p className="text-sm">Нет новых уведомлений</p>
                                        </div>
                                    ) : (
                                        notifications.map(notif => (
                                            <div
                                                key={notif.id}
                                                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0 flex gap-4 ${!notif.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                    notif.type === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                    }`}>
                                                    <span className="material-icons-round text-xl">{notif.icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <p className={`text-sm ${!notif.isRead ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-text-light dark:text-text-dark'}`}>
                                                            {notif.message || notif.text}
                                                        </p>
                                                        {!notif.isRead && (
                                                            <button
                                                                onClick={(e) => markAsRead(notif.id, e)}
                                                                title="Mark as read"
                                                                className="text-blue-500 hover:text-blue-600"
                                                            >
                                                                <span className="material-icons-round text-xs">circle</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                                                        {new Date(notif.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="relative group">
                        <button className="flex items-center gap-2 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <img
                                alt="User"
                                className="w-8 h-8 rounded-full object-cover"
                                src={user.avatar || 'https://api.dicebear.com/9.x/identicon/svg?seed=Felix'}
                            />
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                            <Link
                                to="/profile"
                                className="w-full text-left px-4 py-3 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-xl transition-colors flex items-center gap-2"
                            >
                                <span className="material-icons-round text-sm">person</span>
                                Профиль
                            </Link>
                            <button
                                onClick={logout}
                                className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-b-xl transition-colors flex items-center gap-2"
                            >
                                <span className="material-icons-round text-sm">logout</span>
                                Выйти
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
