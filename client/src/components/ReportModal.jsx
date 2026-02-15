
import { useState, useEffect, useCallback } from 'react';
import API from '../api/api';

export default function ReportModal({ isOpen, onClose, periodDays, totalCost }) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);

    const fetchPreview = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get('/reports/energy/preview', { params: { periodDays } });
            setReport(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [periodDays]);

    useEffect(() => {
        if (isOpen) {
            fetchPreview();
        }
    }, [isOpen, fetchPreview]);

    const downloadPdf = async () => {
        try {
            const res = await API.get('/reports/energy/pdf', {
                params: { periodDays },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `energy_report_${periodDays}d.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            console.error(error);
            alert('Ошибка скачивания');
        }
    };

    const sendEmail = async () => {
        setSending(true);
        try {
            await API.post('/reports/energy/email', { periodDays, email });
            alert('Отчет отправлен!');
            setEmail('');
        } catch (e) {
            alert('Ошибка отправки: ' + (e.response?.data?.error || e.message));
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-card-dark rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-card-dark z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Отчет энергопотребления</h2>
                        <p className="text-slate-500">За последние {periodDays} дней</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <span className="material-icons-round text-slate-500">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-500">Генерация отчета...</p>
                        </div>
                    ) : report ? (
                        <div className="space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl">
                                    <p className="text-sm text-slate-500 mb-1">Всего потреблено</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{report.totalConsumption.toFixed(2)} кВт·ч</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl">
                                    <p className="text-sm text-slate-500 mb-1">Среднее в день</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{report.avgDaily.toFixed(2)} кВт·ч</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl">
                                    <p className="text-sm text-slate-500 mb-1">Примерная стоимость</p>
                                    <p className="text-2xl font-bold text-primary">{report.totalCost.toFixed(0)} ₸</p>
                                </div>
                            </div>

                            {/* Top Consumers */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Топ потребители</h3>
                                <div className="space-y-3">
                                    {report.topConsumers.map((device, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                                                    {idx + 1}
                                                </span>
                                                <span className="font-medium text-slate-900 dark:text-white">{device.name}</span>
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white">{device.kwh.toFixed(2)} кВт·ч</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommendations */}
                            {report.recommendations.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Рекомендации AI</h3>
                                    <div className="grid gap-4">
                                        {report.recommendations.map(rec => (
                                            <div key={rec.id} className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl flex gap-4">
                                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 shrink-0">
                                                    <span className="material-icons-round">eco</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white">{rec.title}</h4>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{rec.reason}</p>
                                                    <div className="mt-2 text-xs font-bold text-green-600">
                                                        Экономия: ~{rec.estimatedKwhSaveMonth} кВт·ч/мес
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-red-500">Не удалось загрузить отчет</p>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row gap-4 items-center justify-between z-10 rounded-b-3xl">
                    <button
                        onClick={downloadPdf}
                        disabled={loading || !report}
                        className="w-full md:w-auto px-6 py-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-icons-round">file_download</span>
                        Скачать PDF
                    </button>

                    <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
                        <input
                            type="email"
                            placeholder="example@mail.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                        <button
                            onClick={sendEmail}
                            disabled={sending || loading || !report}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-icons-round">send</span>
                            {sending ? 'Отправка...' : 'Отправить'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
