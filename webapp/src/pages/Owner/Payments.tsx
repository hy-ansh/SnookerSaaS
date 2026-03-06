import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/apiClient';

const METHOD_CONFIG: Record<string, { title: string; icon: string; text: string; bg: string; iconText: string; stroke: string, tagText: string, tagBg: string }> = {
    CASH: { title: 'Cash Revenue', icon: 'payments', text: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30', iconText: 'text-emerald-600', stroke: 'text-emerald-500', tagText: 'text-emerald-600', tagBg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    UPI: { title: 'UPI Payments', icon: 'qr_code_2', text: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30', iconText: 'text-blue-600', stroke: 'text-blue-500', tagText: 'text-blue-600', tagBg: 'bg-blue-50 dark:bg-blue-900/30' },
    WALLET: { title: 'Wallet Credits', icon: 'account_balance_wallet', text: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30', iconText: 'text-amber-600', stroke: 'text-amber-500', tagText: 'text-amber-600', tagBg: 'bg-amber-50 dark:bg-amber-900/30' },
    CARD: { title: 'Card Terminal', icon: 'credit_card', text: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/30', iconText: 'text-slate-600', stroke: 'text-slate-500', tagText: 'text-slate-600', tagBg: 'bg-slate-50 dark:bg-slate-900/30' },
    DUE: { title: 'Pending Dues', icon: 'money_off', text: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/30', iconText: 'text-rose-600', stroke: 'text-rose-500', tagText: 'text-rose-600', tagBg: 'bg-rose-50 dark:bg-rose-900/30' },
};

export default function AdminPayments() {
    const [dateFilter, setDateFilter] = useState('all');

    const { data: summary, isLoading: loading, refetch } = useQuery({
        queryKey: ['paymentSummary', dateFilter],
        queryFn: () => apiFetch(dateFilter === 'all' ? '/payments/summary' : `/payments/summary?period=${dateFilter}`),
        refetchInterval: 30_000, // auto-refresh every 30 seconds
        refetchOnWindowFocus: true,
    });

    const methodBreakdown: { method: string; total: number }[] = summary?.methodBreakdown || [];
    const recentPayments: any[] = summary?.recentPayments || [];

    const handleExport = () => {
        if (!recentPayments.length) {
            alert("No data available to export.");
            return;
        }

        const headers = ['Date', 'Method', 'Amount', 'Status', 'Payer/Table'];
        const csvRows = [headers.join(',')];

        recentPayments.forEach(p => {
            const dateStr = new Date(p.createdAt).toLocaleString().replace(/,/g, '');
            const method = p.method;
            const amount = p.amount;
            const status = p.status || (method === 'DUE' ? 'PENDING' : 'SUCCESS');
            const payerLabel = p.payer?.fullName || (p.session?.table?.nameOrNumber ? `Table ${p.session.table.nameOrNumber}` : 'Walk-in');

            csvRows.push([dateStr, method, amount, status, `"${payerLabel}"`].join(','));
        });

        const csvString = csvRows.join('\\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue_report_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-7xl mx-auto w-full font-display pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Revenue Dashboard</h1>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Live · auto-refreshes every 30s</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">calendar_today</span>
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold text-sm shadow-sm hover:bg-slate-50 transition-all cursor-pointer appearance-none outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="all">All Time</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="daily">Today</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">expand_more</span>
                    </div>
                    <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        Refresh
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                        <span className="material-symbols-outlined text-sm">ios_share</span>
                        Export Report
                    </button>
                </div>
            </div>
            {/* Total Revenue Hero
            {!loading && (
                <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-primary/20 dark:to-slate-900 shadow-xl border border-slate-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Total Collected Revenue</p>
                            <p className="text-4xl font-black text-white">₹{nonDueRevenue.toFixed(2)}</p>
                            <p className="text-sm text-slate-500 mt-1">Excludes ₹{(totalRevenue - nonDueRevenue).toFixed(2)} in pending dues</p>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-center">
                                <p className="text-2xl font-black text-emerald-400">₹{(methodBreakdown.find(m => m.method === 'CASH')?.total || 0).toFixed(0)}</p>
                                <p className="text-xs text-slate-500 font-bold uppercase">Cash</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-blue-400">₹{(methodBreakdown.find(m => m.method === 'UPI')?.total || 0).toFixed(0)}</p>
                                <p className="text-xs text-slate-500 font-bold uppercase">UPI</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-rose-400">₹{(methodBreakdown.find(m => m.method === 'DUE')?.total || 0).toFixed(0)}</p>
                                <p className="text-xs text-slate-500 font-bold uppercase">Pending</p>
                            </div>
                        </div>
                    </div>
                </div>
            )} */}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
                {loading ? (
                    [1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse h-32" />
                    ))
                ) : (
                    methodBreakdown.map((m) => {
                        const defaultCfg = { title: m.method, icon: 'payments', text: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/30', iconText: 'text-slate-600', stroke: 'text-slate-500', tagText: 'text-slate-600', tagBg: 'bg-slate-50 dark:bg-slate-900/30' };
                        const cfg = METHOD_CONFIG[m.method] || defaultCfg;
                        return (
                            <div key={m.method} className={`bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-transform hover:scale-[1.02] ${m.method === 'DUE' ? 'border-rose-200 dark:border-rose-900/40' : ''}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`size-10 ${cfg.bg} rounded-xl flex items-center justify-center ${cfg.iconText}`}>
                                        <span className="material-symbols-outlined">{cfg.icon}</span>
                                    </div>
                                    <div className={`${cfg.text} text-[10px] font-bold ${cfg.bg} px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                                        {m.method === 'DUE' ? 'Owed' : m.total > 0 ? 'Active' : 'None'}
                                    </div>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">{cfg.title}</p>
                                <p className={`text-xl font-extrabold ${cfg.text}`}>₹{m.total.toFixed(2)}</p>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Transaction Timeline Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">history</span>
                        Recent Activity
                    </h3>
                    <span className="text-sm font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                        {recentPayments.length} Transactions
                    </span>
                </div>

                <div className="relative ml-4 md:ml-8 pl-8 border-l-2 border-slate-200 dark:border-slate-800 space-y-6 pb-4">
                    {loading ? (
                        <div className="animate-pulse space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl w-full"></div>
                            ))}
                        </div>
                    ) : recentPayments.length === 0 ? (
                        <div className="text-slate-500 py-10 text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-300 block mb-2">payments</span>
                            No payments recorded yet.
                        </div>
                    ) : (
                        recentPayments.map((payment) => {
                            const defaultCfg = { title: payment.method, icon: 'payments', text: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/30', iconText: 'text-slate-600', stroke: 'text-slate-500', tagText: 'text-slate-600', tagBg: 'bg-slate-50 dark:bg-slate-900/30' };
                            const cfg = METHOD_CONFIG[payment.method] || defaultCfg;
                            const isDue = payment.method === 'DUE';
                            return (
                                <div key={payment.id} className="relative group">
                                    <div className={`absolute -left-[41px] top-1 size-4 rounded-full ${isDue ? 'bg-rose-500' : 'bg-primary'} ring-4 ring-white dark:ring-slate-950 group-hover:scale-125 transition-transform`}></div>
                                    <div className={`rounded-xl p-4 shadow-sm border ${isDue ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/40' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`size-10 rounded-lg ${cfg.bg} flex items-center justify-center ${cfg.iconText} shrink-0`}>
                                                    <span className="material-symbols-outlined text-[20px]">{isDue ? 'pending_actions' : cfg.icon}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                                        {isDue
                                                            ? `Due — ${payment.player?.fullName || 'Player'}`
                                                            : `${payment.payer?.fullName || 'Open Table'} · ${payment.method}`}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className={`text-[10px] font-bold ${cfg.tagText} ${cfg.tagBg} px-2 py-0.5 rounded uppercase tracking-tight`}>{payment.method}</span>
                                                        <span className="text-[11px] text-slate-400 font-medium">
                                                            {new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(payment.createdAt).toLocaleDateString()}
                                                        </span>
                                                        {payment.session?.table?.nameOrNumber && (
                                                            <span className="text-[11px] text-slate-400 font-medium">
                                                                · Table {payment.session.table.nameOrNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-4 w-full md:w-auto">
                                                <div className="text-right">
                                                    <p className={`text-xl font-black ${isDue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>₹{Number(payment.amount).toFixed(2)}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium uppercase">{payment.status || (isDue ? 'PENDING' : 'SUCCESS')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
