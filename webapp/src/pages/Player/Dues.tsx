import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api/apiClient';

type PayMode = 'CASH' | 'UPI' | 'CUSTOM' | 'HALF';

function DueCard({ due }: { due: any }) {
    const [mode, setMode] = useState<PayMode>('CASH');
    const [customAmt, setCustomAmt] = useState('');
    const [expanded, setExpanded] = useState(false);
    const pending = Number(due.amount);
    const session = due.session;
    const coPlayers = (session?.players || []).filter((p: any) => p.playerId !== due.playerId);

    const getSettleAmount = () => {
        if (mode === 'HALF') return pending / 2;
        if (mode === 'CUSTOM') return Math.min(Number(customAmt) || 0, pending);
        return pending;
    };

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border-2 shadow-sm transition-all ${due.status === 'SETTLED' ? 'border-emerald-200 dark:border-emerald-500/20 opacity-70' : 'border-slate-200 dark:border-slate-800'}`}>
            <button
                className="w-full text-left p-5 flex items-center justify-between gap-3"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4 min-w-0">
                    <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${due.status === 'SETTLED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                        <span className="material-symbols-outlined">{due.status === 'SETTLED' ? 'check_circle' : 'account_balance'}</span>
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                            Table {session?.table?.nameOrNumber || '?'}
                            {session?.gameType && <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{session.gameType}</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {session?.startedAt ? new Date(session.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown date'}
                            {coPlayers.length > 0 && ` · vs. ${coPlayers.map((p: any) => p.player?.fullName || 'Guest').join(', ')}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {due.status === 'SETTLED' ? (
                        <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 uppercase tracking-wider">Settled</span>
                    ) : (
                        <span className="font-black text-red-500 text-lg">₹{pending.toFixed(2)}</span>
                    )}
                    <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
            </button>

            {expanded && due.status === 'PENDING' && (
                <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                    <div className="grid grid-cols-2 text-sm gap-3">
                        <div>
                            <p className="text-xs text-slate-500 font-bold mb-1">Session Total</p>
                            <p className="font-bold text-slate-900 dark:text-white">₹{Number(session?.totalAmount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold mb-1">Your Due</p>
                            <p className="font-black text-red-500">₹{pending.toFixed(2)}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">How would you like to close this?</p>
                        <div className="grid grid-cols-2 gap-2">
                            {(['CASH', 'HALF', 'CUSTOM'] as PayMode[]).map(m => (
                                <button key={m} onClick={() => setMode(m)}
                                    className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${mode === m ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                    {m === 'CASH' ? '💵 Full (Cash)'
                                        : m === 'HALF' ? `½ Half (₹${(pending / 2).toFixed(2)})`
                                            : '✏️ Custom Amount'}
                                </button>
                            ))}
                        </div>
                        {mode === 'CUSTOM' && (
                            <div className="mt-3">
                                <input
                                    type="number"
                                    value={customAmt}
                                    onChange={e => setCustomAmt(e.target.value)}
                                    placeholder={`Max ₹${pending.toFixed(2)}`}
                                    max={pending}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 italic">
                        Contact the store to settle your dues in person. Amount to settle: <span className="font-bold text-slate-600 dark:text-slate-300">₹{getSettleAmount().toFixed(2)}</span>
                    </p>
                </div>
            )}
        </div>
    );
}

export default function PlayerDues() {
    const [dues, setDues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPending, setTotalPending] = useState(0);
    const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('pending');

    const fetchDues = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch('/dues/my');
            setDues(res.dues || []);
            setTotalPending(res.totalPending || 0);
        } catch (e) {
            console.error('Failed to fetch dues', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDues(); }, [fetchDues]);



    const filtered = dues.filter(d => {
        if (filter === 'pending') return d.status === 'PENDING';
        if (filter === 'settled') return d.status === 'SETTLED';
        return true;
    });

    const pendingCount = dues.filter(d => d.status === 'PENDING').length;
    const settledCount = dues.filter(d => d.status === 'SETTLED').length;

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Dues</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Sessions where payment was added to dues.</p>
                </div>
                {totalPending > 0 && (
                    <div className="px-4 py-2.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500 text-lg">account_balance</span>
                        <div>
                            <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Total Pending</p>
                            <p className="font-black text-red-600 dark:text-red-400 text-xl">₹{totalPending.toFixed(2)}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            {totalPending > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
                    <span className="material-symbols-outlined text-amber-500 mt-0.5">info</span>
                    <div>
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">You have outstanding dues</p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Please settle your dues at the store counter. Sessions with dues must be cleared before future bookings.</p>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {([['all', `All (${dues.length})`], ['pending', `Pending (${pendingCount})`], ['settled', `Settled (${settledCount})`]] as [string, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setFilter(key as any)}
                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors border ${filter === key ? 'bg-primary text-white border-primary shadow-md' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Dues List */}
            {loading ? (
                <div className="flex items-center justify-center p-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-700 mb-3 block">
                        {filter === 'settled' ? 'check_circle' : 'account_balance'}
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white">
                        {filter === 'settled' ? 'No settled dues yet' : filter === 'pending' ? '🎉 No pending dues!' : 'No dues recorded'}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">
                        {filter === 'pending' ? "You're all cleared up. Great job!" : 'Dues appear here when a session is billed to your account.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((due: any) => (
                        <DueCard key={due.id} due={due} />
                    ))}
                </div>
            )}
        </div>
    );
}
