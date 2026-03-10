import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionService, type CheckoutPayload } from '../../api/sessions';
import { CheckoutPaymentModal } from '../../components/Shared/CheckoutPaymentModal';
import SessionEndAdModal from '../../components/Ads/SessionEndAdModal';
import { LogoSpinner } from '../../components/Shared/LogoSpinner';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PlayerSearchResult { id: string; fullName: string; email: string; playerProfile?: { nickname?: string } }

// ── Player Search & Add Modal ──────────────────────────────────────────────────
function AddPlayerModal({ onAdd, onClose }: { onAdd: (player: PlayerSearchResult) => Promise<void>; onClose: () => void }) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState<PlayerSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState<string | null>(null);

    useEffect(() => {
        if (q.length < 1) { setResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            try { const r = await sessionService.searchPlayers(q); setResults(r); }
            catch { setResults([]); }
            finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [q]);

    const handleAdd = async (p: PlayerSearchResult) => {
        setAdding(p.id);
        try { await onAdd(p); onClose(); }
        catch (e: any) { alert(e.message); }
        finally { setAdding(null); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Add Player</h2>
                    <button onClick={onClose} className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
                <div className="relative mb-4">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">search</span>
                    <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searching && <p className="text-center text-xs text-slate-500 py-4">Searching...</p>}
                    {!searching && q.length > 0 && results.length === 0 && (
                        <p className="text-center text-xs text-slate-500 py-4">No players found for "{q}"</p>
                    )}
                    {!searching && q.length === 0 && (
                        <p className="text-center text-xs text-slate-500 py-4">Start typing to search players</p>
                    )}
                    {results.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                    {p.fullName?.charAt(0) || '?'}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{p.fullName}</p>
                                    <p className="text-xs text-slate-500 truncate">{p.email}</p>
                                </div>
                            </div>
                            <button onClick={() => handleAdd(p)} disabled={!!adding}
                                className="shrink-0 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1">
                                {adding === p.id ? <LogoSpinner size="size-3" light /> : <span className="material-symbols-outlined text-[14px]">person_add</span>}
                                Add
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Session Summary Modal (Step 1) ──────────────────────────────────────────────
function SessionSummaryModal({
    totalAmount, players, durationMins, gameType: sessionGameType, onNext, onClose
}: {
    totalAmount: number;
    players: any[];
    durationMins: number;
    gameType?: string;
    onNext: (payload: any) => void;
    onClose: () => void;
}) {
    const [gameType, setGameType] = useState<'LTP' | 'SPLIT' | 'SOLO'>(
        (sessionGameType as 'LTP' | 'SPLIT' | 'SOLO') || (players.length === 1 ? 'SOLO' : 'SPLIT')
    );
    const [winnerIds, setWinnerIds] = useState<string[]>([]);

    const toggleWinner = (playerId: string) => {
        setWinnerIds(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
    };

    const handleNext = () => {
        onNext({ gameType, winnerIds });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">Session Summary</h2>
                            <p className="text-sm text-slate-500 mt-0.5">{durationMins} min session</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Due</p>
                            <p className="text-3xl font-black text-primary">₹{totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto">
                    {/* Game Type Selection */}
                    {players.length > 1 && (
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Game Type</p>
                            <div className="flex gap-2">
                                <button onClick={() => setGameType('SPLIT')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 text-sm font-bold transition-all ${gameType === 'SPLIT' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:border-slate-300 dark:bg-slate-800'}`}>
                                    <span className="material-symbols-outlined text-[18px]">call_split</span> SPLIT
                                </button>
                                <button onClick={() => setGameType('LTP')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 text-sm font-bold transition-all ${gameType === 'LTP' ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:border-slate-300 dark:bg-slate-800'}`}>
                                    <span className="material-symbols-outlined text-[18px]">emoji_events</span> LTP
                                </button>
                                <button onClick={() => setGameType('SOLO')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 text-sm font-bold transition-all ${gameType === 'SOLO' ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:border-slate-300 dark:bg-slate-800'}`}>
                                    <span className="material-symbols-outlined text-[18px]">person</span> SOLO
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Winner Selection for LTP and SPLIT */}
                    {(gameType === 'LTP' || gameType === 'SPLIT') && players.length > 1 && (
                        <div>
                            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">stars</span>
                                Select Winner(s)
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {players.map(p => {
                                    const isW = winnerIds.includes(p.playerId);
                                    return (
                                        <button key={p.playerId} onClick={() => toggleWinner(p.playerId)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 flex items-center gap-2 ${isW ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 bg-slate-50 dark:bg-slate-800/50'}`}>
                                            <div className={`size-4 rounded-full border flex items-center justify-center ${isW ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400'}`}>
                                                {isW && <span className="material-symbols-outlined text-[12px] text-white">check</span>}
                                            </div>
                                            {p.player?.fullName || 'Guest'}
                                        </button>
                                    );
                                })}
                            </div>
                            {winnerIds.length === 0 && <p className="text-xs text-slate-500 mt-2">If no winners are selected, cost is split equally.</p>}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">Cancel</button>
                        <button onClick={handleNext}
                            className="flex-1 py-3 rounded-2xl font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                            Proceed to Payment
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Live Session Page ─────────────────────────────────────────────────────
export default function StaffLiveSession() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Edit Rate Modal
    const [isEditingRate, setIsEditingRate] = useState(false);
    const [newRateStr, setNewRateStr] = useState('');

    // Add Player Modal
    const [showAddPlayer, setShowAddPlayer] = useState(false);

    // Checkout Modals State
    const [showSummary, setShowSummary] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [checkoutPayload, setCheckoutPayload] = useState<any>({});

    // Session-end interstitial ad
    const [showSessionEndAd, setShowSessionEndAd] = useState(false);
    const [checkoutResult, setCheckoutResult] = useState<any>(null);

    // Live Timer
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const fetchSessionData = useCallback(async () => {
        if (!id) return;
        try {
            const data = await sessionService.getSessionById(id);
            setSession(data);
            if (data?.status === 'ACTIVE' && data.startedAt) {
                const diffSecs = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000) - (data.pausedDurationSecs || 0);
                setElapsedSeconds(Math.max(0, diffSecs));
            } else if (data?.status === 'PAUSED' && data.startedAt) {
                const activePause = data.pauses?.[0];
                const pausedAtTime = activePause ? new Date(activePause.pausedAt).getTime() : Date.now();
                const diffSecs = Math.floor((pausedAtTime - new Date(data.startedAt).getTime()) / 1000) - (data.pausedDurationSecs || 0);
                setElapsedSeconds(Math.max(0, diffSecs));
            }
        } catch (error) {
            console.error('Error fetching session:', error);
            navigate(-1);
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { fetchSessionData(); }, [fetchSessionData]);

    useEffect(() => {
        if (!session || session.status !== 'ACTIVE') return;
        const interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, [session]);

    const handleTogglePause = async () => {
        if (!session) return;
        setIsProcessing(true);
        try {
            if (session.status === 'ACTIVE') await sessionService.pauseSession(session.id);
            else if (session.status === 'PAUSED') await sessionService.resumeSession(session.id);
            await fetchSessionData();
        } catch (error: any) { alert('Action failed: ' + error.message); }
        finally { setIsProcessing(false); }
    };

    const handleCheckout = async (payload: CheckoutPayload) => {
        if (!session) return;
        try {
            const res = await sessionService.endSession(session.id, payload);
            setShowPayment(false);
            setCheckoutPayload({});
            setCheckoutResult(res);
            // Show interstitial ad before navigating away
            setShowSessionEndAd(true);
        } catch (error: any) {
            alert('Checkout failed: ' + error.message);
        }
    };

    /** Called when the session-end ad is dismissed (skip or countdown) */
    const handleAdDismiss = useCallback(() => {
        setShowSessionEndAd(false);
        if (checkoutResult) {
            alert(`✅ Session Closed\n⏱ Duration: ${checkoutResult.durationMinutes}m\n💰 Total: ₹${checkoutResult.totalAmount?.toFixed(2)}`);
        }
        navigate(-1);
    }, [checkoutResult, navigate]);

    const handleUpdateRate = async () => {
        if (!session) return;
        const rate = Number(newRateStr);
        if (isNaN(rate) || rate <= 0) { alert('Please enter a valid positive number'); return; }
        setIsProcessing(true);
        try {
            await sessionService.updateRate(session.id, rate);
            setIsEditingRate(false);
            await fetchSessionData();
        } catch (error: any) { alert('Could not update rate: ' + error.message); }
        finally { setIsProcessing(false); }
    };

    const handleAddPlayer = async (player: PlayerSearchResult) => {
        if (!session) return;
        const res = await sessionService.addPlayer(session.id, player.id);
        setSession(res.session);
    };

    const handleRemovePlayer = async (playerId: string) => {
        if (!session) return;
        if (!window.confirm('Remove this player from the session?')) return;
        try {
            const res = await sessionService.removePlayer(session.id, playerId);
            setSession(res.session);
        } catch (e: any) { alert(e.message); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <LogoSpinner size="size-12" />
            <p className="text-sm font-bold text-slate-400 animate-pulse">Entering Table Flow...</p>
        </div>
    );

    if (!session) return <div>Session not found.</div>;

    const hh = Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0');
    const mm = Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0');
    const ss = (elapsedSeconds % 60).toString().padStart(2, '0');

    // Calculate using exact same method as backend (round up to minutes, divide by 60)
    const durationMins = Math.ceil(elapsedSeconds / 60);
    const amount = (durationMins / 60) * Number(session.hourlyRateApplied || 0);
    const currentFee = (Math.round(amount * 100) / 100).toFixed(2);

    const isLive = session.status !== 'COMPLETED' && session.status !== 'CANCELLED';

    return (
        <div className="max-w-5xl mx-auto w-full font-display">
            {/* Session End Ad Interstitial */}
            <SessionEndAdModal isOpen={showSessionEndAd} onDismiss={handleAdDismiss} />

            {/* Modals */}
            {showAddPlayer && <AddPlayerModal onAdd={handleAddPlayer} onClose={() => setShowAddPlayer(false)} />}
            {showSummary && (
                <SessionSummaryModal
                    totalAmount={Number(currentFee)}
                    players={session.players || []}
                    durationMins={durationMins}
                    gameType={session.gameType}
                    onNext={(payload) => {
                        setCheckoutPayload(payload);
                        setShowSummary(false);
                        setShowPayment(true);
                    }}
                    onClose={() => setShowSummary(false)}
                />
            )}
            <CheckoutPaymentModal
                isOpen={showPayment}
                onClose={() => setShowPayment(false)}
                totalAmount={Number(currentFee)}
                title="Checkout Session"
                subtitle={`Table ${session.table?.nameOrNumber}`}
                players={session.players || []}
                initialPayload={checkoutPayload}
                onConfirm={handleCheckout}
            />
            {isEditingRate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditingRate(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 w-full max-w-[360px]">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Override Hourly Rate</h2>
                        <p className="text-slate-500 text-sm mb-6">This new rate will apply to the entire duration of this active session.</p>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Rate (₹/hr)</label>
                        <div className="relative mb-6">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                            <input type="number" value={newRateStr} onChange={e => setNewRateStr(e.target.value)} min="0" step="0.01"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-8 pr-4 text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsEditingRate(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 dark:bg-slate-800">Cancel</button>
                            <button onClick={handleUpdateRate} disabled={isProcessing} className="flex-1 py-3 rounded-xl font-bold text-white bg-primary disabled:opacity-50 flex items-center justify-center">
                                {isProcessing ? <LogoSpinner size="size-4" light /> : 'Save Rate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <span className="material-symbols-outlined text-sm">home</span>
                <span>/</span>
                <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(-1)}>Dashboard</span>
                <span>/</span>
                <span className="text-primary font-bold">Session #{session.id.slice(0, 8).toUpperCase()}</span>
            </nav>

            {/* Header Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
                <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className={`w-24 h-40 rounded-lg flex flex-col items-center justify-between py-4 shadow-lg ${session.status === 'ACTIVE' ? 'bg-primary shadow-primary/20' : session.status === 'PAUSED' ? 'bg-orange-500 shadow-orange-500/20' : 'bg-slate-500 shadow-slate-500/20'}`}>
                                <div className="w-4 h-4 rounded-full bg-white/20"></div><div className="w-4 h-4 rounded-full bg-white/20"></div><div className="w-4 h-4 rounded-full bg-white/20"></div>
                            </div>
                            {session.status === 'ACTIVE' && <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase border-2 border-white dark:border-slate-900 animate-pulse">Active</div>}
                            {session.status === 'PAUSED' && <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase border-2 border-white dark:border-slate-900">Paused</div>}
                            {session.status === 'COMPLETED' && <div className="absolute -top-2 -right-2 bg-slate-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase border-2 border-white dark:border-slate-900">Done</div>}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase">Table #{session.table?.nameOrNumber || '??'}</h1>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <div className="flex items-center gap-1">
                                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase">Rate: ₹{Number(session.hourlyRateApplied || 0).toFixed(2)}/hr</span>
                                    {isLive && (
                                        <button onClick={() => { setNewRateStr(String(session.hourlyRateApplied || '')); setIsEditingRate(true); }} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary hover:bg-primary/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {isLive && (
                        <div className="flex flex-col gap-3 min-w-[200px]">
                            <button onClick={() => setShowSummary(true)} disabled={isProcessing}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50">
                                <span className="material-symbols-outlined">stop_circle</span> End &amp; Checkout
                            </button>
                            <button onClick={handleTogglePause} disabled={isProcessing}
                                className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                                <span className="material-symbols-outlined">{session.status === 'ACTIVE' ? 'pause_circle' : 'play_circle'}</span>
                                {session.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Timer bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
                        <span className="material-symbols-outlined text-primary mb-2">schedule</span>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Start Time</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{new Date(session.startedAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className={`p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 ${session.status === 'ACTIVE' ? 'bg-primary/5' : session.status === 'PAUSED' ? 'bg-orange-500/5' : ''}`}>
                        <span className={`material-symbols-outlined mb-2 ${session.status === 'ACTIVE' ? 'text-primary' : session.status === 'PAUSED' ? 'text-orange-500' : 'text-slate-500'}`}>timer</span>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Duration</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{hh}:{mm}:{ss}</p>
                    </div>
                    <div className="p-6 flex flex-col items-center">
                        <span className="material-symbols-outlined text-primary mb-2">payments</span>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Running Cost</p>
                        <p className="text-3xl font-black text-primary tabular-nums">₹{currentFee}</p>
                    </div>
                </div>
            </div>

            {/* Body Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Players */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary">groups</span>
                            Players ({(session.players || []).length})
                        </h3>
                        {isLive && (
                            <button onClick={() => setShowAddPlayer(true)} className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">person_add</span> Add Player
                            </button>
                        )}
                    </div>
                    <div className="space-y-3 flex-1">
                        {(!session.players || session.players.length === 0) && (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500">
                                <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">person_off</span>
                                <p className="font-medium">No specific players assigned.</p>
                                <p className="text-xs mt-1">Running as an open table session.</p>
                            </div>
                        )}
                        {session.players?.map((sp: any, idx: number) => (
                            <div key={sp.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full border-2 border-primary/20 bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                        {sp.player?.fullName?.charAt(0) || 'G'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{sp.player?.fullName || 'Guest'}</p>
                                        <p className="text-xs text-slate-500">{idx === 0 ? 'Organizer' : 'Member'} · {Number(sp.splitPct ?? 0).toFixed(0)}% split</p>
                                    </div>
                                </div>
                                {isLive && (
                                    <button onClick={() => handleRemovePlayer(sp.playerId)} className="p-2 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-all">
                                        <span className="material-symbols-outlined text-[18px]">person_remove</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bill Overview */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <span className="material-symbols-outlined text-[120px]">receipt_long</span>
                    </div>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-5 text-slate-900 dark:text-white relative z-10">
                        <span className="material-symbols-outlined text-primary">receipt_long</span>
                        Live Bill
                    </h3>
                    <div className="space-y-3 mb-6 relative z-10">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Table time ({hh}h {mm}m)</span>
                            <span className="font-medium">₹{currentFee}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <span>Discounts</span>
                            <span className="font-medium text-emerald-500">-₹0.00</span>
                        </div>
                        <div className="pt-2 flex justify-between items-end">
                            <span className="text-xl font-extrabold text-slate-900 dark:text-white">Total</span>
                            <span className="text-4xl font-black text-primary tracking-tight">₹{currentFee}</span>
                        </div>
                        {session.players && session.players.length > 1 && (
                            <p className="text-xs text-slate-500 text-right">≈ ₹{(Number(currentFee) / session.players.length).toFixed(2)} per player</p>
                        )}
                    </div>
                    {isLive && (
                        <button onClick={() => setShowSummary(true)}
                            className="mt-auto relative z-10 w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">point_of_sale</span>
                            Checkout &amp; Close Session
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
