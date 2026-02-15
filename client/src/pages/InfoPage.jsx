import { useParams, Link } from 'react-router-dom';
import { footerContent } from '../data/footerContent';
import { useEffect } from 'react';

export default function InfoPage() {
    const { slug } = useParams();
    const data = footerContent[slug];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center transition-colors duration-300">
                <h1 className="text-4xl font-bold mb-4 text-slate-800 dark:text-slate-200">404</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-8">Страница не найдена</p>
                <Link to="/" className="text-primary hover:underline font-medium">Вернуться на главную</Link>
            </div>
        );
    }

    // Check dark mode preference on mount to ensure correct styling if reloaded directly
    // Actually, usually this is handled by a context or root component, but Landing handles it locally.
    // We can just add the dark class checking if we want, or rely on html class.
    // Since Landing toggles documentElement class, it should persist if user navigated. 
    // But if refreshed, it might default to light.
    // Ideally App should handle theme. But Landing has local state.
    // I will check local storage for theme or just let it be. Landing uses local state.
    // I'll add a simple dark mode init here too if needed, but 'dark' class on html is usually persistent via local storage if implemented globally.
    // Landing implements it via state but toggles html class.
    // I'll assume html class persists or at least rely on system preference if I added that logic.
    // Actually, Landing.jsx `useState(false)` defaults to light.
    // I'll just rely on whatever is set on <html> tag.

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link to="/" className="flex items-center gap-3 group">
                        <img src="/logo.png" alt="SmartSphere" className="w-8 h-8 rounded-lg group-hover:scale-105 transition-transform" />
                        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">SmartSphere</span>
                    </Link>
                    <Link to="/" className="text-sm font-medium text-slate-500 hover:text-primary transition-colors flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900">
                        <span className="material-icons-round text-sm">arrow_back</span> Назад
                    </Link>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-6 py-12 md:py-20 animate-fade-in-up">
                <div className="mb-8">
                    <span className="text-primary text-sm font-bold tracking-wider uppercase mb-2 block">Информация</span>
                    <h1 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white leading-tight">{data.title}</h1>
                    <div className="h-1 w-20 bg-primary/20 rounded-full"></div>
                </div>

                <div className="prose prose-lg dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                    {data.content.split('\n').map((paragraph, idx) => (
                        paragraph.trim() && <p key={idx} className="mb-4">{paragraph}</p>
                    ))}
                </div>
            </main>

            <footer className="border-t border-slate-100 dark:border-slate-800 py-8 text-center text-sm text-slate-400">
                © 2026 SmartSphere by HalasTeam
            </footer>
        </div>
    );
}
