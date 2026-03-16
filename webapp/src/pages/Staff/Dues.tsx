import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { UpiQrCode } from '../../components/Shared/UpiQrCode';

type SettleMode = 'FULL' | 'HALF' | 'CUSTOM';

function SettleModal({
    player,
    onClose,
    onSuccess
}: {
    player: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { appUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'all' | 'individual'>('all');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const allowedMethods = (appUser?.allowedPaymentMethods || ['CASH', 'UPI', 'CARD']).filter((m: string) => m !== 'WALLET');
    const PAY_OPTIONS: { value: string; label: string; icon: string; color: string }[] = [];
    if (allowedMethods.includes('CASH')) PAY_OPTIONS.push({ value: 'CASH', label: 'Cash', icon: 'payments', color: 'text-emerald-600' });
    if (allowedMethods.includes('CARD')) PAY_OPTIONS.push({ value: 'CARD', label: 'Card', icon: 'credit_card', color: 'text-blue-600' });
    if (allowedMethods.includes('UPI')) PAY_OPTIONS.push({ value: 'UPI', label: 'UPI', icon: 'qr_code_scanner', color: 'text-violet-600' });

    const [method, setMethod] = useState<string>(PAY_OPTIONS[0]?.value || 'CASH');

    const [dueSettings, setDueSettings] = useState<Record<string, { mode: SettleMode; custom: string }>>(() =>
        Object.fromEntries(player.dueItems.map((d: any) => [d.id, { mode: 'FULL' as SettleMode, custom: '' }]))
    );

    const updateDueSetting = (dueId: string, field: 'mode' | 'custom', val: string) => {
        setDueSettings(prev => ({ ...prev, [dueId]: { ...prev[dueId], [field]: val } }));
    };

    const getDueAmount = (due: any) => {
        const s = dueSettings[due.id];
        if (!s) return Number(due.amount);
        if (s.mode === 'HALF') return Number(due.amount) / 2;
        if (s.mode === 'CUSTOM') return Math.min(Number(s.custom) || 0, Number(due.amount));
        return Number(due.amount);
    };

    const handleSettleAll = async () => {
        setProcessing(true);
        setError('');
        try {
            await apiFetch(`/dues/settle/${player.id}`, { method: 'POST', body: JSON.stringify({ method }) });
            onSuccess();
        } catch (e: any) {
            setError(e.message || 'Failed to settle dues');
        } finally {
            setProcessing(false);
        }
    };

    const handleSettleIndividual = async (dueId: string) => {
        const amount = getDueAmount({ id: dueId, amount: player.dueItems.find((d: any) => d.id === dueId)?.amount });
        setProcessing(true);
        setError('');
        try {
            await apiFetch(`/dues/settle-one/${dueId}`, {
                method: 'POST',
                body: JSON.stringify({ method, amount })
            });
            onSuccess();
        } catch (e: any) {
            setError(e.message || 'Failed to settle due');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-3xl">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Settle: {player.name}</h2>
                        <p className="text-sm text-slate-500">Total Pending: <span className="font-bold text-red-500">₹{player.pending.toFixed(2)}</span></p>
                    </div>
                    <button onClick={onClose} className="size-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex border-b border-slate-100 dark:border-slate-800">
                    <button onClick={() => setActiveTab('all')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'all' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}>
                        Settle All at Once
                    </button>
                    <button onClick={() => setActiveTab('individual')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'individual' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}>
                        Per Session
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Payment method */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Method</p>
                        <div className={`grid gap-2 ${PAY_OPTIONS.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                            {PAY_OPTIONS.map(opt => (
                                <button key={opt.value} type="button"
                                    onClick={() => setMethod(opt.value)}
                                    className={`flex flex-col items-center justify-center py-3 rounded-2xl border-2 transition-all gap-1 ${method === opt.value
                                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20'
                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300'
                                        }`}>
                                    <span className={`material-symbols-outlined text-xl ${method === opt.value ? 'text-primary' : opt.color}`}>{opt.icon}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${method === opt.value ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* UPI QR Code */}
                    {method === 'UPI' && (
                        <div className="mt-1 pb-2">
                            <UpiQrCode amount={activeTab === 'all' ? player.pending : undefined} />
                        </div>
                    )}

                    {activeTab === 'all' ? (
                        <>
                            <div className="bg-slate-900 dark:bg-black rounded-2xl p-5 text-white">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-slate-400 text-sm">Sessions</span>
                                    <span>{player.dueItems.length}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-700">
                                    <span className="font-bold">Total Due</span>
                                    <span className="text-2xl font-black text-primary">₹{player.pending.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {player.dueItems.map((item: any) => {
                                    const label = item.session?.table?.nameOrNumber
                                        ? `Table ${item.session.table.nameOrNumber}`
                                        : 'Walk-in (POS)';
                                    const time = new Date(item.session?.startedAt || item.createdAt).toLocaleString();
                                    return (
                                        <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{label}</p>
                                                <p className="text-xs text-slate-500">{time}</p>
                                            </div>
                                            <span className="font-black text-slate-900 dark:text-white">₹{Number(item.amount).toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {player.dueItems.map((item: any) => {
                                const s = dueSettings[item.id] || { mode: 'FULL', custom: '' };
                                const calcAmt = getDueAmount(item);
                                return (
                                    <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">
                                                    {item.session?.table?.nameOrNumber
                                                        ? `Table ${item.session.table.nameOrNumber}`
                                                        : 'Walk-in (POS)'}
                                                </p>
                                                <p className="text-xs text-slate-500">{new Date(item.session?.startedAt || item.createdAt).toLocaleString()}</p>
                                            </div>
                                            <span className="font-black text-red-500">₹{Number(item.amount).toFixed(2)}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5 flex-1">
                                            {(['FULL', 'HALF', 'CUSTOM'] as SettleMode[]).map(m => (
                                                <button key={m} onClick={() => updateDueSetting(item.id, 'mode', m)}
                                                    className={`py-1.5 text-[11px] font-bold rounded-lg border-2 transition-all ${s.mode === m ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                                    {m === 'FULL' ? '✓ Full' : m === 'HALF' ? `½ ₹${(Number(item.amount) / 2).toFixed(0)}` : 'Custom'}
                                                </button>
                                            ))}
                                        </div>
                                        {s.mode === 'CUSTOM' && (
                                            <input type="number" value={s.custom}
                                                onChange={e => updateDueSetting(item.id, 'custom', e.target.value)}
                                                placeholder={`0 – ${Number(item.amount).toFixed(2)}`}
                                                max={Number(item.amount)}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary" />
                                        )}
                                        <button onClick={() => handleSettleIndividual(item.id)} disabled={processing || calcAmt <= 0}
                                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            Settle ₹{calcAmt.toFixed(2)}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400 font-medium">
                            {error}
                        </div>
                    )}
                </div>

                {activeTab === 'all' && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 rounded-b-3xl">
                        <button onClick={handleSettleAll} disabled={processing}
                            className="w-full bg-primary text-white py-4 rounded-xl font-black text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                            {processing ? (
                                <><span className="material-symbols-outlined animate-spin">refresh</span> PROCESSING...</>
                            ) : (
                                <><span className="material-symbols-outlined">account_balance_wallet</span> SETTLE ALL ₹{player.pending.toFixed(2)}</>
                            )}
                        </button>
                        <p className="text-center text-xs text-slate-400 mt-3">Marks all sessions above as settled and logs to ledger.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function StaffDues() {
    const [dues, setDues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [filterOverdue, setFilterOverdue] = useState(false);

    const fetchDues = useCallback(async (query = '') => {
        try {
            setLoading(true);
            const url = query ? `/dues?q=${encodeURIComponent(query)}` : '/dues';
            const data = await apiFetch(url);

            const playerMap = new Map<string, any>();
            (data.dues || []).forEach((due: any) => {
                if (due.status !== 'PENDING') return;
                if (!playerMap.has(due.playerId)) {
                    playerMap.set(due.playerId, {
                        id: due.playerId,
                        name: due.player?.fullName || due.player?.email || 'Unknown',
                        pId: due.player?.id?.split('-')[0].toUpperCase() || '—',
                        pending: 0,
                        lastSession: new Date(due.session?.startedAt || due.createdAt).toLocaleString(),
                        overdue: (Date.now() - new Date(due.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000,
                        dueItems: []
                    });
                }
                const rec = playerMap.get(due.playerId)!;
                rec.pending += Number(due.amount);
                rec.dueItems.push(due);
            });

            setDues(Array.from(playerMap.values()));
        } catch (err) {
            console.error('Failed to fetch dues:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => fetchDues(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery, fetchDues]);

    const handleSuccess = (playerName: string) => {
        setSuccessMsg(`Dues settled successfully for ${playerName}`);
        setSelectedPlayer(null);
        fetchDues(searchQuery);
        setTimeout(() => setSuccessMsg(''), 4000);
    };

    const visible = filterOverdue ? dues.filter(p => p.overdue) : dues;
    const totalPending = dues.reduce((s, p) => s + p.pending, 0);

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden font-display relative">
            <main className="flex-1 overflow-y-auto flex flex-col w-full border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                <div className="max-w-7xl mx-auto w-full font-display pb-10 px-6 md:px-8 pt-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dues Management</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                                {dues.length} player{dues.length !== 1 ? 's' : ''} with outstanding dues
                                {totalPending > 0 && <span className="ml-2 text-red-500 font-bold">· ₹{totalPending.toFixed(2)} total</span>}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative w-full md:w-72">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                <input
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-sm font-medium"
                                    placeholder="Search by player name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setFilterOverdue(!filterOverdue)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 whitespace-nowrap transition-all ${filterOverdue ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                Overdue Only
                            </button>
                        </div>
                    </div>

                    {successMsg && (
                        <div className="mb-5 p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center gap-2 text-sm font-medium">
                            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                            {successMsg}
                        </div>
                    )}

                    {errorMsg && (
                        <div className="mb-5 p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center gap-2 text-sm font-medium">
                            <span className="material-symbols-outlined text-rose-500">error</span>
                            {errorMsg}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                        {loading ? (
                            [1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl h-36" />
                            ))
                        ) : visible.length === 0 ? (
                            <div className="col-span-full text-center py-16">
                                <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-700 mb-3 block">check_circle</span>
                                <p className="font-bold text-slate-600 dark:text-slate-400">No pending dues found</p>
                                <p className="text-slate-400 text-sm mt-1">{filterOverdue ? 'No overdue dues.' : 'All players are cleared up!'}</p>
                            </div>
                        ) : (
                            visible.map((player) => (
                                <div
                                    key={player.id}
                                    onClick={() => setSelectedPlayer(player)}
                                    className={`relative bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md ${selectedPlayer?.id === player.id ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'}`}>
                                    {player.overdue && (
                                        <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">Overdue</div>
                                    )}
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-black">
                                            {player.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white truncate">{player.name}</h3>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">ID: {player.pId}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-slate-500">{player.dueItems.length} session{player.dueItems.length !== 1 ? 's' : ''}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Last: {player.lastSession}</p>
                                        </div>
                                        <p className="text-2xl font-black text-red-500">₹{player.pending.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {selectedPlayer && (
                <SettleModal
                    player={selectedPlayer}
                    onClose={() => setSelectedPlayer(null)}
                    onSuccess={() => handleSuccess(selectedPlayer.name)}
                />
            )}
        </div>
    );
}
