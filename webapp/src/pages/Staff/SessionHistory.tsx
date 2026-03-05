import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/apiClient';

function GameTypeBadge({ type }: { type?: string }) {
    if (!type) return null;
    const styles: Record<string, string> = {
        LTP: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
        SPLIT: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
        SOLO: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
        CUSTOM: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
    };
    const icons: Record<string, string> = {
        LTP: 'emoji_events',
        SPLIT: 'call_split',
        SOLO: 'person',
        CUSTOM: 'tune',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles[type] || styles.SPLIT}`}>
            <span className="material-symbols-outlined text-[10px]">{icons[type] || 'sports'}</span>
            {type}
        </span>
    );
}

function PaymentBadge({ method, isDues }: { method?: string; isDues?: boolean }) {
    if (isDues) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                <span className="material-symbols-outlined text-[10px]">account_balance</span>
                Dues
            </span>
        );
    }
    if (!method) return <span className="text-slate-400 text-xs">—</span>;
    const styles: Record<string, string> = {
        CASH: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
        CARD: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
        UPI: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
        WALLET: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles[method] || styles.CASH}`}>
            <span className="material-symbols-outlined text-[10px]">check_circle</span>
            {method}
        </span>
    );
}

export default function StaffSessionHistory() {
    const [filter, setFilter] = useState<'all' | 'today'>('today');
    const [expanded, setExpanded] = useState<string | null>(null);

    const { data: sessions = [], isLoading: loading, refetch, dataUpdatedAt } = useQuery({
        queryKey: ['completedSessions'],
        queryFn: () => apiFetch('/sessions/completed'),
        refetchInterval: 20_000, // auto-refresh every 20 seconds
        staleTime: 15_000,
    });

    const today = new Date().toLocaleDateString();
    const filteredSessions = filter === 'today'
        ? sessions.filter(s => new Date(s.endedAt || s.startedAt).toLocaleDateString() === today)
        : sessions;

    const totalRevenue = filteredSessions.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);

    const getPlayerPaymentInfo = (session: any, playerId: string) => {
        // Only show "Dues" badge if there's a PENDING due for this player
        const hasPendingDue = session.dues?.some((d: any) => d.playerId === playerId && d.status === 'PENDING');
        if (hasPendingDue) return { isDues: true, method: undefined };
        // Check payment record — find any successful payment for this player
        const payment = session.payments?.find((p: any) => p.payerId === playerId && p.status === 'SUCCESS');
        if (payment) return { isDues: false, method: payment.method };
        return { isDues: false, method: undefined };
    };

    return (
        <div className="flex flex-col gap-8 font-display pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Session History</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="relative flex size-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                        </span>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                            Live · updated {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-primary/40 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh
                    </button>
                    <button onClick={() => setFilter('today')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors border ${filter === 'today' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                        Today
                    </button>
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors border ${filter === 'all' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                        All Recent
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-2xl">receipt_long</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sessions</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{filteredSessions.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <span className="material-symbols-outlined text-2xl">payments</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Revenue</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">₹{totalRevenue.toFixed(2)}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <span className="material-symbols-outlined text-2xl">timer</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Duration</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">
                            {filteredSessions.length > 0
                                ? `${Math.round(filteredSessions.reduce((a, s) => a + (s.durationMinutes || 0), 0) / filteredSessions.length)}m`
                                : '—'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Sessions List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">history</span>
                        {filter === 'today' ? "Today's" : 'Recent'} Sessions ({filteredSessions.length})
                    </h2>
                </div>

                {loading ? (
                    <div className="p-12 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="p-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3 block">receipt_long</span>
                        <p className="text-slate-500 font-bold">No sessions found.</p>
                        <p className="text-slate-400 text-sm mt-1">Sessions will appear here after they are completed.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {filteredSessions.map(session => {
                            const isExpanded = expanded === session.id;
                            const players: any[] = session.players || [];
                            const winnerIds: string[] = session.winnerIds || [];
                            const winners = players.filter(p => winnerIds.includes(p.playerId));
                            const losers = players.filter(p => !winnerIds.includes(p.playerId));
                            const hasResults = winnerIds.length > 0 && players.length > 1;

                            return (
                                <div key={session.id}>
                                    {/* Main Row */}
                                    <button
                                        className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex flex-wrap items-center gap-x-4 gap-y-2"
                                        onClick={() => setExpanded(isExpanded ? null : session.id)}
                                    >
                                        {/* Table + Type */}
                                        <div className="flex items-center gap-3 min-w-[120px]">
                                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <span className="material-symbols-outlined text-sm">table_bar</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{session.table?.nameOrNumber || 'Unknown'}</p>
                                                <p className="text-xs text-slate-500">{new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>

                                        {/* Game Type */}
                                        <div className="shrink-0">
                                            <GameTypeBadge type={session.gameType} />
                                        </div>

                                        {/* Players summary */}
                                        <div className="flex-1 min-w-[120px]">
                                            {players.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {players.map((p: any) => {
                                                        const isWinner = winnerIds.includes(p.playerId);
                                                        const isLoser = hasResults && !isWinner;
                                                        return (
                                                            <span key={p.playerId} className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isWinner ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                                : isLoser ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                                                }`}>
                                                                {isWinner && <span className="material-symbols-outlined text-[11px]">emoji_events</span>}
                                                                {isLoser && <span className="material-symbols-outlined text-[11px]">payments</span>}
                                                                {p.player?.fullName || 'Guest'}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">Open Table</span>
                                            )}
                                        </div>

                                        {/* Duration + Amount */}
                                        <div className="flex items-center gap-4 shrink-0 ml-auto">
                                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
                                                {session.durationMinutes ? `${session.durationMinutes}m` : '—'}
                                            </span>
                                            <span className="font-black text-primary">
                                                ₹{Number(session.totalAmount || 0).toFixed(2)}
                                            </span>
                                            <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                        </div>
                                    </button>

                                    {/* Expanded Detail Panel */}
                                    {isExpanded && players.length > 0 && (
                                        <div className="px-5 pb-5 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
                                            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Winners column */}
                                                {hasResults && (
                                                    <div>
                                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">emoji_events</span>
                                                            Winner{winners.length > 1 ? 's' : ''}
                                                        </p>
                                                        <div className="space-y-2">
                                                            {winners.map((p: any) => (
                                                                <div key={p.playerId} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="size-7 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                                                            {p.player?.fullName?.charAt(0) || '?'}
                                                                        </div>
                                                                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{p.player?.fullName || 'Guest'}</p>
                                                                    </div>
                                                                    {session.gameType === 'LTP' && (
                                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">Free!</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Losers / Payers column */}
                                                <div className={hasResults ? '' : 'md:col-span-2'}>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[12px]">payments</span>
                                                        {hasResults && session.gameType === 'LTP' ? `Loser${losers.length > 1 ? 's' : ''} (Paying)` : 'Players & Payments'}
                                                    </p>
                                                    <div className="space-y-2">
                                                        {(hasResults && session.gameType === 'LTP' ? losers : players).map((p: any) => {
                                                            const payInfo = getPlayerPaymentInfo(session, p.playerId);
                                                            return (
                                                                <div key={p.playerId} className={`flex items-center justify-between p-2.5 rounded-xl border gap-2 ${payInfo.isDues
                                                                    ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                                                    }`}>
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold ${payInfo.isDues ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
                                                                            {p.player?.fullName?.charAt(0) || '?'}
                                                                        </div>
                                                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.player?.fullName || 'Guest'}</p>
                                                                    </div>
                                                                    <PaymentBadge isDues={payInfo.isDues} method={payInfo.method} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
