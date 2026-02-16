import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Landing() {
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark') ||
    localStorage.getItem('theme') === 'dark'
  );
  const [footerModal, setFooterModal] = useState(null);
  const isLoggedIn = !!localStorage.getItem('token');

  const footerContent = {
    features: {
      title: 'Функции',
      text: 'SmartSphere объединяет управление устройствами, автоматизацию сценариев, уведомления и энергоаналитику в одном интерфейсе.'
    },
    integrations: {
      title: 'Интеграции',
      text: 'Поддерживаются интеграции с погодными сервисами, Google OAuth и архитектура под расширение IoT-устройств.'
    },
    pricing: {
      title: 'Цены',
      text: 'На этапе MVP проект доступен бесплатно для демонстрации и тестирования. В будущем возможны тарифные планы.'
    },
    updates: {
      title: 'Обновления',
      text: 'История изменений проекта и последние улучшения публикуются в репозитории GitHub команды.'
    },
    docs: {
      title: 'Документация',
      text: 'Документация содержит архитектуру, запуск, env-переменные и ограничения MVP.'
    },
    api: {
      title: 'API',
      text: 'REST API включает модули auth, devices, automation, notifications, weather, analytics и settings.'
    },
    community: {
      title: 'Сообщество',
      text: 'Для предложений и баг-репортов используйте Issues в GitHub репозитории.'
    },
    blog: {
      title: 'Блог',
      text: 'Новости проекта и важные релизные заметки публикуются в разделе релизов GitHub.'
    },
    about: {
      title: 'О нас',
      text: 'HalasTeam развивает SmartSphere как понятную и реалистичную платформу для умного дома под задачи хакатона и MVP.'
    },
    career: {
      title: 'Карьера',
      text: 'Если хотите присоединиться к проекту, напишите нам на почту команды и укажите ваши навыки.'
    },
    contacts: {
      title: 'Контакты',
      text: 'Связаться с командой можно через email: halasteam.project@gmail.com'
    },
    partners: {
      title: 'Партнеры',
      text: 'Открыты к сотрудничеству для интеграций устройств, пилотов и совместных продуктовых экспериментов.'
    },
    terms: {
      title: 'Условия использования',
      text: 'Используя SmartSphere, вы принимаете правила безопасного и добросовестного использования сервиса и его API.'
    },
    privacy: {
      title: 'Конфиденциальность',
      text: 'Мы обрабатываем только необходимые данные для авторизации и управления устройствами в рамках функционала платформы.'
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    if (document.documentElement.classList.contains('dark')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300 font-sans">
      <div className="bg-[url('/grid.svg')] bg-center">
        <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <img src="/logo.png" alt="SmartSphere" className="w-10 h-10 object-contain" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-400">
              SmartSphere
            </span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
            >
              <span className="material-icons-round text-xl">
                {darkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <div className="flex gap-3">
              {!isLoggedIn ? (
                <>
                  <Link
                    to="/login"
                    className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Войти
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/30 hover:shadow-primary/40"
                  >
                    Регистрация
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard"
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/30 hover:shadow-primary/40 flex items-center gap-2"
                >
                  <span className="material-icons-round text-sm">dashboard</span>
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </nav>

        <header className="relative pt-20 pb-32 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8 animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Умный дом нового поколения v2.0
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-slate-900 dark:text-white leading-tight">
              Управляйте домом <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                силой мысли
              </span>
            </h1>

            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Единый центр управления устройствами, автоматизация сценариев и мониторинг энергопотребления.
              Просто, красиво, эффективно.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to={isLoggedIn ? "/dashboard" : "/register"}
                className="px-8 py-4 bg-primary hover:bg-primary-hover text-white text-lg font-bold rounded-2xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 transition-all flex items-center gap-2"
              >
                <span>Начать бесплатно</span>
                <span className="material-icons-round">arrow_forward</span>
              </Link>
              <a
                href="#demo"
                className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-lg font-bold rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-all flex items-center gap-2"
              >
                <span className="material-icons-round">play_circle</span>
                Смотреть демо
              </a>
            </div>

            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl -z-10 animate-blob"></div>
            <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -z-10 animate-blob animation-delay-2000"></div>
          </div>
        </header>

        <section id="features" className="py-24 bg-white dark:bg-slate-950 px-6 relative scroll-mt-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">Всё под контролем</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                SmartSphere объединяет все ваши устройства в экосистему.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/50 transition-all hover:shadow-xl dark:hover:shadow-primary/10">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-icons-round text-3xl">hub</span>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">Централизация</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Управляйте светом, климатом и безопасностью из одного красивого приложения.
                  Поддержка Philips Hue, Xiaomi, Apple HomeKit.
                </p>
              </div>

              <div className="group p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/50 transition-all hover:shadow-xl dark:hover:shadow-primary/10">
                <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-icons-round text-3xl">auto_awesome</span>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">Автоматизация</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Создавайте сложные сценарии: "Выключить всё, когда я ухожу" или
                  "Включить увлажнитель, если сухо".
                </p>
              </div>

              <div className="group p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/50 transition-all hover:shadow-xl dark:hover:shadow-primary/10">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400 mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-icons-round text-3xl">analytics</span>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">Аналитика</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Следите за расходами на электроэнергию. Умные советы помогут сэкономить до 30% на счетах.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-24 bg-slate-100 dark:bg-slate-900 px-6 scroll-mt-24">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-16">
              <div className="max-w-xl">
                <h2 className="text-4xl font-bold mb-6 text-slate-950 dark:text-white">Начать проще простого</h2>
                <p className="text-lg text-slate-700 dark:text-slate-300">
                  Мы сделали процесс настройки максимально интуитивным. Никакого кодинга, никаких сложных инструкций.
                </p>
              </div>
              <Link className="hidden md:inline-flex items-center gap-2 text-primary font-bold text-lg hover:underline decoration-2 underline-offset-4" to="/register">
                Пошаговая инструкция <span className="material-icons-round">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="absolute -left-4 -top-4 text-9xl font-black text-slate-200 dark:text-slate-800/40 -z-10 select-none">01</div>
                <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 h-full">
                  <h3 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">Хаб</h3>
                  <p className="text-slate-800 dark:text-slate-200 text-lg leading-relaxed">
                    Подключите SmartSphere Hub к вашему роутеру. Он автоматически обнаружит совместимые устройства в сети.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-4 -top-4 text-9xl font-black text-slate-200 dark:text-slate-800/40 -z-10 select-none">02</div>
                <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 h-full">
                  <h3 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">Устройства</h3>
                  <p className="text-slate-800 dark:text-slate-200 text-lg leading-relaxed">
                    Добавьте умные лампы, розетки и датчики в один клик. Распределите их по комнатам.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-4 -top-4 text-9xl font-black text-slate-200 dark:text-slate-800/40 -z-10 select-none">03</div>
                <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 h-full">
                  <h3 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600">Магия</h3>
                  <p className="text-slate-800 dark:text-slate-200 text-lg leading-relaxed">
                    Настройте сценарии и наслаждайтесь комфортом. Дом сам позаботится о климате и освещении.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer id="about" className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8 px-6 scroll-mt-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-1 md:col-span-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                    <img src="/logo.png" alt="SmartSphere" className="w-8 h-8 object-contain" />
                  </div>
                  <span className="font-bold text-xl tracking-tight text-slate-950 dark:text-white">SmartSphere</span>
                </div>
                <p className="text-slate-800 dark:text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                  Делаем умные дома доступными, приватными и мощными для всех.
                </p>
                <div className="flex gap-4">
                  <a href="https://github.com/bigmac0056" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white transition-colors shadow-sm">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.3c-3.3.7-4-1.4-4-1.4-.5-1.3-1.2-1.6-1.2-1.6-1-.6.1-.6.1-.6 1.1.1 1.7 1.1 1.7 1.1 1 .1.7 2.7 3.4 1.9.1-.7.4-1.2.7-1.5-2.6-.3-5.4-1.3-5.4-5.8 0-1.3.5-2.4 1.1-3.2-.1-.3-.5-1.5.1-3 0 0 .9-.3 3.3 1.2a11.3 11.3 0 0 1 6 0c2.4-1.5 3.3-1.2 3.3-1.2.6 1.5.2 2.7.1 3 .7.8 1.1 1.9 1.1 3.2 0 4.5-2.8 5.5-5.4 5.8.4.3.8 1 .8 2.1v3.1c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
                    </svg>
                  </a>
                  <a href="mailto:halasteam.project@gmail.com" className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white transition-colors shadow-sm">
                    <span className="material-icons-round text-lg">alternate_email</span>
                  </a>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-6 text-slate-950 dark:text-white uppercase text-xs tracking-widest">Продукт</h4>
                <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-300 font-semibold">
                  <li><button type="button" onClick={() => setFooterModal('features')} className="hover:text-primary transition-colors">Функции</button></li>
                  <li><button type="button" onClick={() => setFooterModal('integrations')} className="hover:text-primary transition-colors">Интеграции</button></li>
                  <li><button type="button" onClick={() => setFooterModal('pricing')} className="hover:text-primary transition-colors">Цены</button></li>
                  <li><button type="button" onClick={() => setFooterModal('updates')} className="hover:text-primary transition-colors">Обновления</button></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-6 text-slate-950 dark:text-white uppercase text-xs tracking-widest">Ресурсы</h4>
                <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-300 font-semibold">
                  <li><button type="button" onClick={() => setFooterModal('docs')} className="hover:text-primary transition-colors">Документация</button></li>
                  <li><button type="button" onClick={() => setFooterModal('api')} className="hover:text-primary transition-colors">API</button></li>
                  <li><button type="button" onClick={() => setFooterModal('community')} className="hover:text-primary transition-colors">Сообщество</button></li>
                  <li><button type="button" onClick={() => setFooterModal('blog')} className="hover:text-primary transition-colors">Блог</button></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-6 text-slate-950 dark:text-white uppercase text-xs tracking-widest">Компания</h4>
                <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-300 font-semibold">
                  <li><button type="button" onClick={() => setFooterModal('about')} className="hover:text-primary transition-colors">О нас</button></li>
                  <li><button type="button" onClick={() => setFooterModal('career')} className="hover:text-primary transition-colors">Карьера</button></li>
                  <li><button type="button" onClick={() => setFooterModal('contacts')} className="hover:text-primary transition-colors">Контакты</button></li>
                  <li><button type="button" onClick={() => setFooterModal('partners')} className="hover:text-primary transition-colors">Партнеры</button></li>
                </ul>
              </div>
            </div>


            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-600 dark:text-slate-300 font-bold">
              <p>© 2026 SmartSphere by HalasTeam. Все права защищены.</p>
              <div className="flex gap-6">
                <button type="button" onClick={() => setFooterModal('terms')} className="hover:text-primary transition-colors">Условия использования</button>
                <button type="button" onClick={() => setFooterModal('privacy')} className="hover:text-primary transition-colors">Конфиденциальность</button>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {footerModal && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {footerContent[footerModal]?.title}
              </h3>
              <button
                type="button"
                onClick={() => setFooterModal(null)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              {footerContent[footerModal]?.text}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFooterModal(null)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
