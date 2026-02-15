import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../api/api';

const Header = () => {
    const toggleDarkMode = () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [user, setUser] = useState({});
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await API.get('/profile');
                setUser(res.data);
            } catch (error) {
                console.error("Failed to fetch profile", error);
            }
        };
        const token = localStorage.getItem('token');
        if (token) fetchProfile();
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const fetchNotifications = async () => {
        try {
            const res = await API.get('/notifications');
            setNotifications(res.data.notifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
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
            const load = async () => {
                await fetchNotifications();
            };
            load();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, []);

    return (
        <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 dark:border-slate-700 px-8 py-3">
            <div className="max-w-[1400px] mx-auto flex justify-between items-center">
                <div className="flex items-center gap-8">
                    <Link to="/dashboard" className="flex items-center gap-3">
                        <img src="/logo.png" alt="SmartSphere" className="w-8 h-8 rounded-lg" />
                        <span className="text-xl font-bold bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent tracking-tight">SmartSphere</span>
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
                            Энергия
                        </Link>
                        <Link
                            to="/automation"
                            className={`transition-colors ${isActive('/automation')
                                ? 'text-primary font-semibold'
                                : 'text-text-muted-light dark:text-text-muted-dark hover:text-primary'}`}
                        >
                            Автоматизация
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        onClick={toggleDarkMode}
                    >
                        <span className="material-icons-round text-xl block dark:hidden">dark_mode</span>
                        <span className="material-icons-round text-xl hidden dark:block">light_mode</span>
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
                            {notifications.length > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden transform transition-all origin-top-right animate-in fade-in slide-in-from-top-2">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
                                    <h3 className="font-bold text-text-light dark:text-text-dark">Уведомления</h3>
                                    <button
                                        onClick={clearNotifications}
                                        className="text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                                    >
                                        Очистить
                                    </button>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-text-muted-light dark:text-text-muted-dark">
                                            <span className="material-icons-round text-4xl mb-2 opacity-50">notifications_off</span>
                                            <p className="text-sm">Нет новых уведомлений</p>
                                        </div>
                                    ) : (
                                        notifications.map(notif => (
                                            <div key={notif.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0 flex gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                    notif.type === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                    }`}>
                                                    <span className="material-icons-round text-xl">{notif.icon}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{notif.message || notif.text}</p>
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
