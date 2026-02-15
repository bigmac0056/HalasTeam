import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return document.documentElement.classList.contains('dark');
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await API.post('/auth/register', {
        name,
        email,
        password,
      });

      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      // Handle array of errors if backend returns validation errors
      const message = err.response?.data?.error || 'Ошибка регистрации. Попробуйте еще раз.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/oauth/google`;
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300 relative">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center">
            <img src="/logo.png" alt="SmartSphere" className="w-8 h-8 object-contain" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">SmartSphere<span className="text-primary">.io</span></span>
          <button
            type="button"
            onClick={handleBack}
            className="ml-3 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            Назад
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsDark(prev => !prev)}
          className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300"
          title={isDark ? 'Светлая тема' : 'Темная тема'}
        >
          <span className="material-icons-round">{isDark ? 'light_mode' : 'dark_mode'}</span>
        </button>
      </div>

      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-card-dark p-8 rounded-3xl shadow-soft-dark border border-slate-200 dark:border-slate-700 w-full max-w-md relative overflow-hidden">
          {/* Blue top border */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 to-blue-600"></div>

          <div className="text-center mb-8 mt-4">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Создать аккаунт
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Присоединяйтесь к экосистеме SmartSphere
            </p>
          </div>

          <div className="flex border-b border-slate-100 dark:border-slate-800 mb-8">
            <Link to="/login" className="flex-1 py-3 text-sm font-medium text-slate-400 hover:text-slate-600 text-center">Войти</Link>
            <button className="flex-1 py-3 text-sm font-bold text-primary border-b-2 border-primary">Регистрация</button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-start gap-2">
              <span className="material-icons-round text-base mt-0.5">error_outline</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300 ml-1">Имя</label>
              <div className="relative">
                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">person</span>
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                  placeholder="Как к вам обращаться?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300 ml-1">Email</label>
              <div className="relative">
                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">mail</span>
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300 ml-1">Пароль</label>
              <div className="relative">
                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 mt-4"
            >
              {isLoading ? 'Создание...' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-white dark:bg-card-dark text-slate-400 font-medium">Или продолжите через</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-3 group"
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
            Войти через Google
          </button>
        </div>
      </div>
    </div>
  );
}
