import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import API from '../api/api';

export default function Profile() {
    const [darkMode, setDarkMode] = useState(false);
    const [user, setUser] = useState({ name: '', email: '', avatar: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editAvatar, setEditAvatar] = useState('');

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const navigate = useNavigate();

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle('dark');
    };





    const fetchProfile = async () => {
        try {
            const res = await API.get('/profile');
            setUser(res.data);
            setEditName(res.data.name);
            setEditEmail(res.data.email);
            setEditAvatar(res.data.avatar || '');
        } catch (error) {
            console.error('Error fetching profile:', error);
            // If profile endpoint doesn't exist yet, use default values
            const defaultUser = {
                name: 'User',
                email: 'user@example.com',
                avatar: 'https://api.dicebear.com/9.x/identicon/svg?seed=Felix'
            };
            setUser(defaultUser);
            setEditName(defaultUser.name);
            setEditEmail(defaultUser.email);
            setEditAvatar(defaultUser.avatar);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        const loadData = async () => {
            await fetchProfile();
        };
        loadData();
    }, [navigate]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            await API.put('/profile', {
                name: editName,
                email: editEmail,
                avatar: editAvatar
            });
            setUser({ name: editName, email: editEmail, avatar: editAvatar });
            setIsEditing(false);
            alert('Профиль успешно обновлен!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Не удалось обновить профиль: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            alert('Пароли не совпадают!');
            return;
        }

        if (newPassword.length < 6) {
            alert('Пароль должен быть не менее 6 символов');
            return;
        }

        try {
            await API.put('/profile/password', {
                currentPassword,
                newPassword
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsChangingPassword(false);
            alert('Пароль успешно изменен!');
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Не удалось изменить пароль: ' + (error.response?.data?.error || error.message));
        }
    };

    const avatarOptions = [
        'https://api.dicebear.com/9.x/identicon/svg?seed=Alex',
        'https://api.dicebear.com/9.x/identicon/svg?seed=Sarah',
        'https://api.dicebear.com/9.x/identicon/svg?seed=James',
        'https://api.dicebear.com/9.x/identicon/svg?seed=Emily',
        'https://api.dicebear.com/9.x/identicon/svg?seed=Felix',
        'https://api.dicebear.com/9.x/identicon/svg?seed=Luna',
        'https://api.dicebear.com/9.x/identicon/svg?seed=Max',
        'https://api.dicebear.com/9.x/identicon/svg?seed=Oliver',
    ];

    return (
        <div className={darkMode ? 'dark' : ''}>
            <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300">
                {/* Header Navigation */}
                <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

                {/* Main Content */}
                <main className="max-w-4xl mx-auto px-8 py-12">
                    <div className="mb-8">
                        <Link to="/dashboard" className="inline-flex items-center gap-2 text-text-muted-light dark:text-text-muted-dark hover:text-primary transition-colors mb-4">
                            <span className="material-icons-round text-sm">arrow_back</span>
                            Назад в панель
                        </Link>
                        <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Настройки профиля</h1>
                        <p className="text-text-muted-light dark:text-text-muted-dark mt-2">Управление настройками аккаунта и предпочтениями</p>
                    </div>

                    {/* Profile Information Card */}
                    <div className="bg-white dark:bg-card-dark rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Личная информация</h2>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-all flex items-center gap-2"
                                >
                                    <span className="material-icons-round text-sm">edit</span>
                                    Редактировать
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                {/* Avatar Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-3">Фото профиля</label>
                                    <div className="flex items-center gap-4 mb-4">
                                        <img
                                            src={editAvatar || 'https://api.dicebear.com/9.x/identicon/svg?seed=Felix'}
                                            alt="Avatar"
                                            className="w-20 h-20 rounded-full object-cover border-4 border-primary/20"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-2">Выберите аватар:</p>
                                            <div className="grid grid-cols-8 gap-2">
                                                {avatarOptions.map((url, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setEditAvatar(url)}
                                                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${editAvatar === url ? 'border-primary scale-110' : 'border-transparent hover:border-primary/50'
                                                            }`}
                                                    >
                                                        <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Имя</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-light dark:text-text-dark focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Email адрес</label>
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-light dark:text-text-dark focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                                        required
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditName(user.name);
                                            setEditEmail(user.email);
                                            setEditAvatar(user.avatar);
                                        }}
                                        className="flex-1 px-6 py-3 rounded-xl font-semibold border border-slate-200 dark:border-slate-700 text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 rounded-xl font-semibold bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30 transition-all"
                                    >
                                        Сохранить
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={user.avatar || 'https://api.dicebear.com/9.x/identicon/svg?seed=Felix'}
                                        alt="Avatar"
                                        className="w-20 h-20 rounded-full object-cover border-4 border-primary/20"
                                    />
                                    <div>
                                        <h3 className="text-2xl font-bold text-text-light dark:text-text-dark">{user.name}</h3>
                                        <p className="text-text-muted-light dark:text-text-muted-dark">{user.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Security Card */}
                    <div className="bg-white dark:bg-card-dark rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Безопасность</h2>
                                <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">Управление паролем и безопасностью</p>
                            </div>
                            {!isChangingPassword && (
                                <button
                                    onClick={() => setIsChangingPassword(true)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-light dark:text-text-dark rounded-lg font-medium transition-all flex items-center gap-2"
                                >
                                    <span className="material-icons-round text-sm">lock</span>
                                    Изменить пароль
                                </button>
                            )}
                        </div>

                        {isChangingPassword ? (
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Текущий пароль</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-light dark:text-text-dark focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Новый пароль</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-light dark:text-text-dark focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Подтвердите новый пароль</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-light dark:text-text-dark focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsChangingPassword(false);
                                            setCurrentPassword('');
                                            setNewPassword('');
                                            setConfirmPassword('');
                                        }}
                                        className="flex-1 px-6 py-3 rounded-xl font-semibold border border-slate-200 dark:border-slate-700 text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 rounded-xl font-semibold bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30 transition-all"
                                    >
                                        Обновить пароль
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-text-muted-light dark:text-text-muted-dark">
                                <p className="text-sm">••••••••••••</p>
                                <p className="text-xs mt-2">Последнее изменение: Никогда</p>
                            </div>
                        )}
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-8 shadow-sm border border-red-200 dark:border-red-900/30 mt-6">
                        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Опасная зона</h2>
                        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4">Необратимые действия</p>
                        <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all">
                            Удалить аккаунт
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
}
