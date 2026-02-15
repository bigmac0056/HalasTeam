import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Landing() {
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark') ||
    localStorage.getItem('theme') === 'dark'
  );
  const isLoggedIn = !!localStorage.getItem('token');

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div>
      <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white transition-colors duration-300 min-h-screen">
        {/* Navigation */}
        <nav className="fixed w-full z-50 top-0 px-6 py-4">
          <div className="max-w-7xl mx-auto glass-panel dark:border-slate-700/50 border border-white/50 rounded-2xl px-6 py-3 flex justify-between items-center shadow-soft dark:shadow-soft-dark">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="SmartSphere" className="w-10 h-10 rounded-xl" />
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">SmartSphere</span>
            </div>
            <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
              <a className="hover:text-primary transition-colors" href="#features">Функции</a>
              <a className="hover:text-primary transition-colors" href="#integrations">Интеграции</a>

              <a className="hover:text-primary transition-colors" href="#support">Поддержка</a>
            </div>
            <div className="flex items-center gap-4">
              <button
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                onClick={toggleDarkMode}
              >
                <span className="material-icons-round text-xl block dark:hidden">dark_mode</span>
                <span className="material-icons-round text-xl hidden dark:block">light_mode</span>
              </button>
              <Link
                className="bg-gradient-to-r from-primary-light to-primary hover:from-primary hover:to-primary-dark text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/30 hover:shadow-glow"
                to="/login"
              >
                Вход
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-primary-light/20 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-secondary/15 rounded-full blur-3xl opacity-60"></div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark">Система онлайн v2.4</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                Пробудите ваш <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light via-primary to-primary-dark">Умный Дом</span>
              </h1>

              <p className="text-lg md:text-xl text-text-muted-light dark:text-text-muted-dark max-w-lg leading-relaxed">
                Централизованное управление всей экосистемой. Управляйте устройствами, автоматизируйте рутину и следите за энергопотреблением с технологиями, ориентированными на конфиденциальность.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  className="bg-gradient-to-r from-primary-light to-primary hover:from-primary hover:to-primary-dark text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all shadow-xl shadow-primary/25 hover:shadow-glow flex items-center justify-center gap-2 group"
                  to={isLoggedIn ? "/dashboard" : "/login"}
                >
                  {isLoggedIn ? "Перейти в панель" : "Начать работу"}
                  <span className="material-icons-round group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <a
                  className="bg-white dark:bg-card-dark border-2 border-primary hover:border-primary-dark hover:bg-primary/5 dark:hover:bg-primary/10 text-primary px-8 py-4 rounded-2xl text-lg font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
                  href="#features"
                >
                  Узнать больше
                  <span className="material-icons-round text-sm">expand_more</span>
                </a>
              </div>

              <div className="pt-8 flex items-center gap-4 text-sm text-text-muted-light dark:text-text-muted-dark">
                <div className="flex -space-x-3">
                  <img alt="User" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900" src="https://i.pravatar.cc/150?img=1" />
                  <img alt="User" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900" src="https://i.pravatar.cc/150?img=2" />
                  <img alt="User" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900" src="https://i.pravatar.cc/150?img=3" />
                </div>
                <p>Нам доверяют 10,000+ умных домов</p>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="relative">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-2xl border border-slate-200 dark:border-slate-700 rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden aspect-[4/3] relative">
                  <div className="absolute inset-0 p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="w-32 h-6 bg-slate-300 dark:bg-slate-700 rounded-md"></div>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 h-full">
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-500">
                          <span className="material-icons-round">lightbulb</span>
                        </div>
                        <div>
                          <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                          <div className="w-12 h-3 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-500">
                          <span className="material-icons-round">thermostat</span>
                        </div>
                        <div>
                          <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                          <div className="w-12 h-3 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between col-span-2">
                        <div className="flex justify-between items-start">
                          <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center text-cyan-500">
                            <span className="material-icons-round">security</span>
                          </div>
                          <div className="w-16 h-6 bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 text-xs font-bold rounded-full flex items-center justify-center">ОХРАНА</div>
                        </div>
                        <div className="mt-4">
                          <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="w-3/4 h-full bg-primary rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 bg-white dark:bg-slate-900/50 scroll-mt-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Всё необходимое <br /> для управления вашим домом</h2>
              <p className="text-text-muted-light dark:text-text-muted-dark text-lg max-w-2xl mx-auto">
                Полный набор инструментов, делающих ваш дом умнее, безопаснее и эффективнее.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
              {/* Feature Card 1 */}
              <Link to="/login" className="md:col-span-2 bg-background-light dark:bg-card-dark rounded-3xl p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-800 hover:border-primary/30 dark:hover:border-primary/30 relative overflow-hidden group transition-all cursor-pointer">
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm mb-6">
                      <span className="material-icons-round text-primary text-2xl">grid_view</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Единое управление</h3>
                    <p className="text-text-muted-light dark:text-text-muted-dark max-w-md">Подключайте свет, замки, камеры и датчики от 1000+ брендов в единую интуитивную панель.</p>
                  </div>
                  <div className="flex gap-4 mt-4">
                    <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400"></span> Свет
                    </div>
                    <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span> Климат
                    </div>
                    <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span> Безопасность
                    </div>
                  </div>
                </div>
                <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent z-0"></div>
              </Link>

              {/* Feature Card 2 */}
              <Link to="/automation" className="bg-background-light dark:bg-card-dark rounded-3xl p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-800 hover:border-primary/30 dark:hover:border-primary/30 relative overflow-hidden group transition-all cursor-pointer">
                <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                  <span className="material-icons-round text-9xl text-blue-500 rotate-12">cloud</span>
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <span className="material-icons-round text-blue-600 dark:text-blue-400 text-2xl">water_drop</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Адаптация к погоде</h3>
                    <p className="text-text-muted-light dark:text-text-muted-dark text-sm">Автоматическое управление шторами и климатом на основе погоды.</p>
                  </div>
                </div>
              </Link>

              {/* Feature Card 3 */}
              <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-soft dark:shadow-none relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center mb-4 border border-slate-600">
                    <span className="material-icons-round text-yellow-400 text-2xl">auto_fix_high</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Умные сценарии</h3>
                    <p className="text-slate-400 text-sm">"Доброе утро", "Киновечер" или "Я ушел" - запуск одним касанием или голосом.</p>
                  </div>
                </div>
              </div>

              {/* Feature Card 3 - Energy Analytics */}
              <Link to="/energy" className="md:col-span-2 bg-background-light dark:bg-card-dark rounded-3xl p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-800 hover:border-primary/30 dark:hover:border-primary/30 relative overflow-hidden group transition-all cursor-pointer">
                <div className="relative z-10 h-full grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-6">
                      <span className="material-icons-round text-primary text-2xl">bolt</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Аналитика Энергии</h3>
                    <p className="text-text-muted-light dark:text-text-muted-dark mb-6">Отслеживайте потребление в реальном времени. Находите энергозатратные устройства и снижайте счета.</p>
                    <Link className="text-primary font-semibold text-sm hover:underline flex items-center gap-1" to={isLoggedIn ? "/energy" : "/login"}>
                      {isLoggedIn ? "Открыть панель" : "Попробовать"} <span className="material-icons-round text-sm">arrow_forward</span>
                    </Link>
                  </div>
                  <div className="h-full flex items-end justify-center pb-4">
                    <div className="flex items-end gap-3 h-32 w-full max-w-[200px]">
                      <div className="w-1/4 bg-primary-light/40 dark:bg-primary/30 rounded-t-lg h-[40%] group-hover:h-[50%] transition-all duration-500"></div>
                      <div className="w-1/4 bg-primary-light/60 dark:bg-primary/40 rounded-t-lg h-[60%] group-hover:h-[75%] transition-all duration-500 delay-75"></div>
                      <div className="w-1/4 bg-primary/80 dark:bg-primary/60 rounded-t-lg h-[30%] group-hover:h-[40%] transition-all duration-500 delay-100"></div>
                      <div className="w-1/4 bg-primary dark:bg-primary-dark rounded-t-lg h-[80%] group-hover:h-[90%] transition-all duration-500 delay-150"></div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Setup Steps Section */}
        <section id="integrations" className="py-24 px-6 relative overflow-hidden scroll-mt-20">
          <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 -z-20"></div>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
              <div>
                <span className="text-primary font-semibold tracking-wider text-sm uppercase mb-2 block">Простая установка</span>
                <h2 className="text-3xl md:text-5xl font-bold">От коробки до <br />автоматизации за минуты</h2>
              </div>
              <Link className="hidden md:inline-flex items-center gap-2 text-text-light dark:text-text-dark font-medium hover:text-primary transition-colors" to="/login">
                Начать <span className="material-icons-round">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group">
                <div className="text-6xl font-black text-slate-200 dark:text-slate-800 mb-4 group-hover:text-primary/20 transition-colors">01</div>
                <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-full">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                    <span className="material-icons-round">download</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">Установите Хаб</h3>
                  <p className="text-text-muted-light dark:text-text-muted-dark leading-relaxed">
                    Подключите SmartSphere Hub к роутеру. Он автоматически найдет совместимые устройства в сети.
                  </p>
                </div>
              </div>

              <div className="group">
                <div className="text-6xl font-black text-slate-200 dark:text-slate-800 mb-4 group-hover:text-primary/20 transition-colors">02</div>
                <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-full">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                    <span className="material-icons-round">link</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">Подключите устройства</h3>
                  <p className="text-text-muted-light dark:text-text-muted-dark leading-relaxed">
                    Добавьте свет, термостат и датчики одним касанием. Группируйте их по комнатам для удобства.
                  </p>
                </div>
              </div>

              <div className="group">
                <div className="text-6xl font-black text-slate-200 dark:text-slate-800 mb-4 group-hover:text-primary/20 transition-colors">03</div>
                <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-full">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                    <span className="material-icons-round">play_arrow</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">Создайте сценарии</h3>
                  <p className="text-text-muted-light dark:text-text-muted-dark leading-relaxed">
                    Настройте правила, например "Выключить свет, когда я ухожу". Пусть дом работает на вас.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section >

        {/* Footer */}
        < footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 pt-16 pb-8 px-6" >
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-1 md:col-span-1">
                <div className="flex items-center gap-3 mb-6">
                  <img src="/logo.png" alt="SmartSphere" className="w-10 h-10 rounded-xl" />
                  <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">SmartSphere</span>
                </div>
                <p className="text-text-muted-light dark:text-text-muted-dark text-sm leading-relaxed">
                  Делаем умные дома доступными, приватными и мощными для всех.
                </p>
                <div className="flex gap-4 mt-6">
                  <a className="text-slate-400 hover:text-primary transition-colors" href="https://facebook.com" target="_blank" rel="noopener noreferrer" title="Facebook"><span className="material-icons-round">facebook</span></a>
                  <a className="text-slate-400 hover:text-primary transition-colors" href="mailto:elubajernar291@gmail.com" title="Email"><span className="material-icons-round">alternate_email</span></a>
                  <a className="text-slate-400 hover:text-primary transition-colors" href="https://twitter.com" target="_blank" rel="noopener noreferrer" title="Twitter"><span className="material-icons-round">rss_feed</span></a>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-4 text-text-light dark:text-text-dark">Продукт</h4>
                <ul className="space-y-3 text-sm text-text-muted-light dark:text-text-muted-dark">
                  <li><a className="hover:text-primary transition-colors" href="#features">Функции</a></li>
                  <li><a className="hover:text-primary transition-colors" href="#integrations">Интеграции</a></li>
                  <li><Link className="hover:text-primary transition-colors" to="/login">Начать</Link></li>
                  <li><Link className="hover:text-primary transition-colors" to="/login">Демо</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-4 text-text-light dark:text-text-dark">Ресурсы</h4>
                <ul className="space-y-3 text-sm text-text-muted-light dark:text-text-muted-dark">
                  <li><Link className="hover:text-primary transition-colors" to="/info/documentation">Документация</Link></li>
                  <li><Link className="hover:text-primary transition-colors" to="/info/api">API</Link></li>
                  <li><Link className="hover:text-primary transition-colors" to="/info/community">Сообщество</Link></li>
                  <li><Link className="hover:text-primary transition-colors" to="/info/support">Поддержка</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-4 text-text-light dark:text-text-dark">Компания</h4>
                <ul className="space-y-3 text-sm text-text-muted-light dark:text-text-muted-dark">
                  <li><Link className="hover:text-primary transition-colors" to="/info/about">О нас</Link></li>
                  <li><Link className="hover:text-primary transition-colors" to="/info/careers">Вакансии</Link></li>
                  <li><Link className="hover:text-primary transition-colors" to="/info/privacy">Конфиденциальность</Link></li>
                  <li><Link className="hover:text-primary transition-colors" to="/info/contacts">Контакты</Link></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
              <p>© 2026 SmartSphere by HalasTeam. Все права защищены.</p>
              <div className="flex gap-6">
                <Link className="hover:text-primary transition-colors" to="/info/terms">Условия</Link>
                <Link className="hover:text-primary transition-colors" to="/info/privacy">Приватность</Link>
                <Link className="hover:text-primary transition-colors" to="/info/cookies">Куки</Link>
              </div>
            </div>
          </div>
        </footer >
      </div>
    </div>
  );
}
