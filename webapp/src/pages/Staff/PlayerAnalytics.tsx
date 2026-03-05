import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/apiClient';

function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: string; color: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
                {sub && <p className="text-xs font-bold text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function StaffPlayerAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'today' | 'monthly'>('today');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await apiFetch('/player/analytics');
                setData(res);
            } catch (e) {
                console.error('Failed to load player analytics', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const scope = tab === 'today' ? data?.today : data?.monthly;
    const winners: any[] = scope?.winners || [];
    const leaderboard: any[] = data?.leaderboard || [];

    const RANK_STYLES = [
        'bg-amber-400/20 text-amber-700 dark:text-amber-400 border-amber-400/30',
        'bg-slate-200/60 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-300/50',
        'bg-orange-400/20 text-orange-700 dark:text-orange-400 border-orange-400/30',
    ];
    const MEDALS = ['🥇', '🥈', '🥉'];

    return (
        <div className="flex flex-col gap-8 font-display pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Player Analytics</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Games played, top winners, and branch leaderboard.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setTab('today')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors border ${tab === 'today' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>Today</button>
                    <button onClick={() => setTab('monthly')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors border ${tab === 'monthly' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>This Month</button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            ) : (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Sessions" value={scope?.sessions ?? 0} icon="sports_score" color="bg-primary/10 text-primary" />
                        <StatCard label="Unique Players" value={scope?.uniquePlayers ?? 0} icon="group" color="bg-blue-500/10 text-blue-600" />
                        <StatCard label="Revenue" value={`₹${(scope?.revenue ?? 0).toFixed(2)}`} icon="payments" color="bg-emerald-500/10 text-emerald-600" />
                        <StatCard label="Avg Sessions/Day" value={tab === 'monthly' ? Math.round((scope?.sessions ?? 0) / new Date().getDate()) : scope?.sessions ?? 0} icon="calendar_month" color="bg-violet-500/10 text-violet-600" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Winners for period */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-500">emoji_events</span>
                                    Top Winners — {tab === 'today' ? 'Today' : 'This Month'}
                                </h2>
                            </div>
                            {winners.length === 0 ? (
                                <div className="p-12 text-center">
                                    <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-700 mb-3 block">emoji_events</span>
                                    <p className="text-slate-500 font-bold text-sm">No winners recorded {tab === 'today' ? 'today' : 'this month'} yet.</p>
                                    <p className="text-slate-400 text-xs mt-1">Winners are recorded when LTP sessions are completed.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {winners.map((w, i) => (
                                        <div key={w.id} className="flex items-center justify-between px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`size-8 rounded-full flex items-center justify-center text-sm font-black border ${RANK_STYLES[i] ?? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    {i < 3 ? MEDALS[i] : i + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{w.name}</p>
                                                    <p className="text-xs text-slate-500">{w.sessions} session{w.sessions !== 1 ? 's' : ''} played</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{w.wins}</p>
                                                <p className="text-[10px] font-bold text-slate-400">WINS</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Branch Leaderboard */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">leaderboard</span>
                                    Branch Leaderboard (All Time)
                                </h2>
                            </div>
                            {leaderboard.length === 0 ? (
                                <div className="p-12 text-center">
                                    <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-700 mb-3 block">leaderboard</span>
                                    <p className="text-slate-500 font-bold text-sm">No players registered yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {leaderboard.map((player, i) => (
                                        <div key={player.id} className="flex items-center justify-between px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className={`size-8 rounded-full flex items-center justify-center text-sm font-black border ${RANK_STYLES[i] ?? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                                                    {i < 3 ? MEDALS[i] : i + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{player.name}</p>
                                                    <p className="text-xs text-slate-500">{player.played} played</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden md:block">
                                                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{player.winRate}%</p>
                                                    <p className="text-[10px] text-slate-400">win rate</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-slate-900 dark:text-white">{player.elo}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">ELO</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
