import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/apiClient';

interface GlobalMetrics {
    activeTenants: number;
    activeSubscriptions: number;
    monthlyRecurringRevenue: number;
}

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
    const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    console.log("Help")
    useEffect(() => {
        async function fetchAdminData() {
            try {
                const [metricsData, fraudData] = await Promise.all([
                    apiFetch('/admin/metrics'),
                    apiFetch('/admin/fraud')
                ]);
                setMetrics(metricsData || null);
                setFraudAlerts(Array.isArray(fraudData) ? fraudData : []);
            } catch (error) {
                console.error("Failed to fetch admin dashboard data", error);
            } finally {
                setLoading(false);
            }
        }

        fetchAdminData();
    }, []);

    const handleResolveAlert = async (id: string) => {
        try {
            await apiFetch(`/admin/fraud/${id}/resolve`, { method: 'POST' });
            setFraudAlerts(fraudAlerts.filter(alert => alert.id !== id));
        } catch (error) {
            console.error("Failed to resolve alert", error);
            alert("Could not resolve alert.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 h-full font-display pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Super Admin Control Panel</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Global platform metrics, revenue, and security</p>
                </div>
            </div>

            {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-3xl">storefront</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Active Tenants</p>
                        <p className="text-4xl font-black text-slate-900 dark:text-white">{metrics?.activeTenants || 0}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <span className="material-symbols-outlined text-3xl">verified</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Active Subscriptions</p>
                        <p className="text-4xl font-black text-slate-900 dark:text-white">{metrics?.activeSubscriptions || 0}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <span className="material-symbols-outlined text-3xl">payments</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Recurring Revenue</p>
                        <p className="text-4xl font-black text-slate-900 dark:text-white">${metrics?.monthlyRecurringRevenue?.toFixed(2) || '0.00'}</p>
                    </div>
                </div>
            </div>

            {/* FRAUD ALERTS SECTION */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <span className="material-symbols-outlined text-red-500">security</span>
                        Active Security & Fraud Alerts
                    </h2>
                    {fraudAlerts.length > 0 && (
                        <span className="px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs rounded-full">
                            {fraudAlerts.length} Action{fraudAlerts.length !== 1 ? 's' : ''} Required
                        </span>
                    )}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fraudAlerts.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined text-6xl text-emerald-500/20 mb-4">check_circle</span>
                            <p className="text-slate-500 font-medium">All clear. No active fraud alerts across any tenant.</p>
                        </div>
                    ) : (
                        (fraudAlerts || []).map(alert => (
                            <div key={alert.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex gap-4 items-start">
                                    <div className="mt-1">
                                        <div className={`w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'bg-red-500 shadow-red-500/50 animate-pulse' : 'bg-amber-500 shadow-amber-500/50'}`}></div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-bold text-slate-900 dark:text-white">{alert.organization?.name || 'Unknown Tenant'}</span>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{alert.branch?.name || 'All Branches'}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{alert.description}</p>
                                        <p className="text-xs text-slate-400 mt-2 font-mono">{new Date(alert.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleResolveAlert(alert.id)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-500/30"
                                >
                                    <span className="material-symbols-outlined text-sm">done_all</span>
                                    Mark Resolved
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
