import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { apiFetch } from '../../api/apiClient';
import FeatureGate from '../../components/FeatureGate';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface KpiData {
    monthlyRevenue: number;
    activePlayers: number;
    avgSessionMinutes: number;
    tableTurnoverRate: number;
    revenueTrend?: { label: string; revenue: number }[];
}

interface OperationalData {
    totalTables: number;
    occupiedTables: number;
    occupancyPct: number;
    todayRevenue: number;
    revenuePerHour: number;
    activityFeed: {
        id: string;
        event: string;
        type: 'start' | 'end' | 'active' | 'paused';
        tableName: string;
        playerCount: number;
        amount: number;
        minutesAgo: number;
        status: string;
    }[];
}

function AnalyticsContent() {
    const [heatmapData, setHeatmapData] = useState<number[]>([]);
    const [kpis, setKpis] = useState<KpiData | null>(null);
    const [ops, setOps] = useState<OperationalData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [heatmapRes, summaryRes, opsRes] = await Promise.all([
                    apiFetch('/analytics/heatmap').catch(() => null),
                    apiFetch('/analytics/summary').catch(() => null),
                    apiFetch('/analytics/operational').catch(() => null),
                ]);

                // Aggregate 7×24 matrix into 24-hour totals
                const aggregated = Array(24).fill(0);
                if (heatmapRes?.heatmap) {
                    heatmapRes.heatmap.forEach((day: number[]) => {
                        day.forEach((count: number, idx: number) => { aggregated[idx] += Number(count); });
                    });
                }
                setHeatmapData(aggregated);
                if (summaryRes) setKpis(summaryRes);
                if (opsRes) setOps(opsRes);
            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const heatmapChartData = {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
            label: 'Session Starts',
            data: heatmapData,
            backgroundColor: 'rgba(5, 150, 105, 0.8)',
            borderRadius: 4,
        }],
    };

    const chartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
        }
    };

    const trendLabels = kpis?.revenueTrend?.map(t => t.label) ?? [];
    const trendValues = kpis?.revenueTrend?.map(t => Number(t.revenue)) ?? [];

    const revenueChartData = {
        labels: trendLabels,
        datasets: [{
            label: 'Monthly Revenue',
            data: trendValues,
            backgroundColor: 'rgba(5, 150, 105, 0.8)',
            borderRadius: 4,
        }],
    };

    // Compute efficiency score from occupancy + turnover (simple weighted blend)
    const efficiency = ops
        ? Math.min(100, Math.round(ops.occupancyPct * 0.6 + Math.min((kpis?.tableTurnoverRate ?? 0) * 10, 40)))
        : 0;
    const svgOffset = Math.round(283 * (1 - efficiency / 100));

    // Activity feed helpers
    const feedColor = (type: string) => {
        if (type === 'start' || type === 'active') return 'border-primary';
        if (type === 'end') return 'border-blue-400';
        return 'border-amber-400';
    };
    const feedDot = (type: string) => {
        if (type === 'start' || type === 'active') return 'bg-primary';
        if (type === 'end') return 'bg-blue-400';
        return 'bg-amber-400';
    };
    const timeAgo = (mins: number) => {
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
    };

    return (
        <div className="flex flex-col gap-8 h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Store Analytics</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Deep dive into performance & growth metrics</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold rounded-xl shadow-sm text-slate-600 dark:text-slate-300">
                        <span className="material-symbols-outlined text-sm">calendar_month</span> Last 30 Days
                    </span>
                </div>
            </div>

            <div className="space-y-8 pb-8">
                {/* KPI Cards */}
                <div>
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                        <span className="material-symbols-outlined text-primary">leaderboard</span> Key Performance Indicators
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Monthly Revenue */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group">
                            <div className="flex justify-between items-center mb-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined mt-0">payments</span>
                                </div>
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{kpis ? 'Live' : '—'}</span>
                            </div>
                            <h4 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Monthly Revenue</h4>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                                {loading ? '...' : `₹${Number(kpis?.monthlyRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                            </p>
                        </div>
                        {/* Active Players */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-pointer group">
                            <div className="flex justify-between items-center mb-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined mt-0">group</span>
                                </div>
                                <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full">{kpis ? 'Live' : 'N/A'}</span>
                            </div>
                            <h4 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Unique Players</h4>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                                {loading ? '...' : Number(kpis?.activePlayers || 0).toLocaleString()} <span className="text-sm font-medium text-slate-400">total</span>
                            </p>
                        </div>
                        {/* Avg Session Time */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-rose-500/5 transition-all cursor-pointer group">
                            <div className="flex justify-between items-center mb-4">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined mt-0">timer</span>
                                </div>
                                <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full">Avg</span>
                            </div>
                            <h4 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Avg Session Time</h4>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                                {loading ? '...' : kpis?.avgSessionMinutes
                                    ? `${Math.floor(Number(kpis.avgSessionMinutes) / 60)}h ${Math.floor(Number(kpis.avgSessionMinutes) % 60)}m`
                                    : '—'}
                            </p>
                        </div>
                        {/* Table Turnover */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 transition-all cursor-pointer group">
                            <div className="flex justify-between items-center mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined mt-0">table_bar</span>
                                </div>
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">Per Day</span>
                            </div>
                            <h4 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Table Turnover Rate</h4>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                                {loading ? '...' : Number(kpis?.tableTurnoverRate || 0).toFixed(1)} <span className="text-sm font-medium text-slate-400">/ day</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Revenue Trend */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Revenue Trend (Last 6 Months)</h3>
                            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(5,150,105,0.6)]"></span> Revenue
                            </span>
                        </div>
                        <div className="w-full h-80 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center justify-center border border-slate-200 dark:border-slate-700/50">
                            {loading ? (
                                <div className="text-slate-500 font-bold animate-pulse">Loading...</div>
                            ) : trendValues.length > 0 ? (
                                <Bar data={revenueChartData} options={chartOptions} />
                            ) : (
                                <div className="text-center text-slate-400">
                                    <span className="material-symbols-outlined text-4xl opacity-40">bar_chart</span>
                                    <p className="font-bold mt-2">No revenue data yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hourly Heatmap */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Hourly Session Starts (30 Days)</h3>
                            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(5,150,105,0.6)]"></span> Starts/hr
                            </span>
                        </div>
                        <div className="w-full h-80 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center justify-center border border-slate-200 dark:border-slate-700/50">
                            {loading ? (
                                <div className="text-slate-500 font-bold animate-pulse">Loading...</div>
                            ) : heatmapData.some(v => v > 0) ? (
                                <Bar data={heatmapChartData} options={chartOptions} />
                            ) : (
                                <div className="text-center text-slate-400">
                                    <span className="material-symbols-outlined text-4xl opacity-40">schedule</span>
                                    <p className="font-bold mt-2">No session data yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Operational Health + Activity Feed */}
                <div className="grid grid-cols-12 gap-8">
                    {/* Operational Health */}
                    <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Operational Health</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Based on live table occupancy & session data</p>
                            </div>
                            {!loading && ops && (
                                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${ops.occupancyPct >= 70
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                        : ops.occupancyPct >= 40
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}>
                                    {ops.occupancyPct >= 70 ? 'BUSY' : ops.occupancyPct >= 40 ? 'MODERATE' : 'QUIET'}
                                </span>
                            )}
                        </div>

                        {/* Efficiency Gauge */}
                        <div className="relative flex justify-center items-center py-8">
                            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl opacity-50"></div>
                            <div className="relative w-56 h-56 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle className="text-slate-100 dark:text-slate-800" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="10"></circle>
                                    <circle
                                        className="text-primary transition-all duration-700"
                                        cx="50" cy="50" fill="transparent" r="40"
                                        stroke="currentColor"
                                        strokeDasharray="251"
                                        strokeDashoffset={loading ? 251 : Math.round(251 * (1 - efficiency / 100))}
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                    ></circle>
                                </svg>
                                <div className="absolute inset-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-full shadow-lg border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
                                    {loading ? (
                                        <span className="text-2xl font-extrabold text-slate-400 animate-pulse">...</span>
                                    ) : (
                                        <>
                                            <span className="text-4xl font-extrabold text-primary">{efficiency}<span className="text-xl">%</span></span>
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">Efficiency</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stats grid */}
                        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-slate-500">Table Occupancy</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">
                                    {loading ? '...' : `${ops?.occupancyPct ?? 0}%`}
                                </p>
                                <p className="text-xs text-slate-400">{ops?.occupiedTables ?? 0} / {ops?.totalTables ?? 0} tables</p>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-primary h-full transition-all duration-700" style={{ width: `${ops?.occupancyPct ?? 0}%` }}></div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-slate-500">Revenue Run Rate</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">
                                    {loading ? '...' : `₹${Number(ops?.revenuePerHour ?? 0).toLocaleString('en-IN')}/hr`}
                                </p>
                                <p className="text-xs text-slate-400">Today's avg/hr</p>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-400 h-full transition-all" style={{ width: `${Math.min((ops?.revenuePerHour ?? 0) / 50, 1) * 100}%` }}></div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-slate-500">Today's Revenue</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">
                                    {loading ? '...' : `₹${Number(ops?.todayRevenue ?? 0).toLocaleString('en-IN')}`}
                                </p>
                                <p className="text-xs text-slate-400">Completed sessions</p>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-400 h-full" style={{ width: `${Math.min((ops?.todayRevenue ?? 0) / (kpis?.monthlyRevenue ?? 1) * 30 * 100, 100)}%` }}></div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-slate-500">Table Turnover</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">
                                    {loading ? '...' : `${Number(kpis?.tableTurnoverRate ?? 0).toFixed(1)}x`}
                                </p>
                                <p className="text-xs text-slate-400">Sessions/table/day</p>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-amber-400 h-full" style={{ width: `${Math.min((kpis?.tableTurnoverRate ?? 0) * 10, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Live Activity Feed */}
                    <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(5,150,105,0.8)]"></div>
                        </div>
                        <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[420px]">
                            {loading ? (
                                <div className="text-slate-400 text-sm font-bold animate-pulse text-center pt-8">Loading activity...</div>
                            ) : (ops?.activityFeed ?? []).length === 0 ? (
                                <div className="text-center text-slate-400 pt-8">
                                    <span className="material-symbols-outlined text-4xl opacity-40">history</span>
                                    <p className="font-bold mt-2 text-sm">No sessions yet</p>
                                </div>
                            ) : (ops?.activityFeed ?? []).map(item => (
                                <div key={item.id} className={`relative pl-6 border-l-2 ${feedColor(item.type)} py-1`}>
                                    <div className={`absolute left-[-5px] top-2 w-2 h-2 ${feedDot(item.type)} rounded-full`}></div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.event}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {item.tableName}
                                        {item.playerCount > 0 && ` · ${item.playerCount} player${item.playerCount > 1 ? 's' : ''}`}
                                        {item.status === 'COMPLETED' && item.amount > 0 && ` · ₹${Number(item.amount).toLocaleString('en-IN')}`}
                                    </p>
                                    <span className="text-[10px] font-bold text-slate-400 mt-1.5 block uppercase tracking-wider">{timeAgo(item.minutesAgo)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OwnerAnalytics() {
    return (
        <FeatureGate feature="analytics">
            <AnalyticsContent />
        </FeatureGate>
    );
}
