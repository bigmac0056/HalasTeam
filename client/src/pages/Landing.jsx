import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark flex flex-col">
      {/* Navbar */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          SmartSphere
        </div>
        <div className="flex gap-4">
          {!token ? (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                Войти
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-lg hover:shadow-primary/30"
              >
                Регистрация
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-lg"
            >
              В Dashboard
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto mt-[-80px]">
        <div className="inline-block p-1 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 mb-6 backdrop-blur-sm border border-white/10">
          <span className="px-4 py-1 text-sm font-medium text-primary-light">
            🚀 Умный дом нового поколения
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          Управляйте своим домом <br />
          <span className="bg-clip-text text-transparent bg-gradient-primary">
            силой мысли
          </span>
        </h1>

        <p className="text-xl text-text-muted-light dark:text-text-muted-dark max-w-2xl mb-10 leading-relaxed">
          Единый центр управления устройствами, автоматизация сценариев
          и мониторинг энергопотребления. Просто, красиво, эффективно.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          {!token ? (
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-gradient-primary text-white text-lg font-bold rounded-xl shadow-glow hover:scale-105 transition-transform"
            >
              Начать бесплатно
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 bg-gradient-primary text-white text-lg font-bold rounded-xl shadow-glow hover:scale-105 transition-transform"
            >
              Открыть Dashboard
            </button>
          )}
          <button className="px-8 py-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-medium">
            Узнать больше
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full text-left">
          {[
            { title: "Автоматизация", icon: "⚡", desc: "Сценарии по времени и событиям" },
            { title: "Мониторинг", icon: "📊", desc: "Следите за расходами энергии" },
            { title: "Уведомления", icon: "🔔", desc: "Мгновенные оповещения в Telegram" }
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-soft dark:shadow-none">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-text-muted-light dark:text-text-muted-dark">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="p-6 text-center text-text-muted-light dark:text-text-muted-dark text-sm">
        © 2026 SmartSphere by HalasTeam. All rights reserved.
      </footer>
    </div>
  );
}
