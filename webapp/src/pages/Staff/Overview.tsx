import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '../../api/sessions';
import { apiFetch } from '../../api/apiClient';

interface Table {
    id: string;
    nameOrNumber: string;
    status: 'AVAILABLE' | 'PLAYING' | 'RESERVED' | 'MAINTENANCE';
    type?: string;
    activeSession?: {
        id: string;
        startedAt: string;
        hourlyRateApplied: number;
        pausedDurationSecs: number;
        status: string;
        players: { player: { fullName: string } }[];
    };
}

interface PlayerResult { id: string; fullName: string; email: string; }

const TABLE_STATUS_CONFIG = {
    AVAILABLE: { label: 'Available', color: 'bg-emerald-500', border: 'border-emerald-400/50', glow: 'shadow-emerald-500/20', text: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: 'check_circle' },
    PLAYING: { label: 'Playing', color: 'bg-primary', border: 'border-primary/50', glow: 'shadow-primary/20', text: 'text-primary', bg: 'bg-primary/10', icon: 'sports_score' },
    RESERVED: { label: 'Reserved', color: 'bg-amber-500', border: 'border-amber-400/50', glow: 'shadow-amber-500/20', text: 'text-amber-500', bg: 'bg-amber-500/10', icon: 'event' },
    MAINTENANCE: { label: 'Maintenance', color: 'bg-red-500', border: 'border-red-400/50', glow: 'shadow-red-500/20', text: 'text-red-500', bg: 'bg-red-500/10', icon: 'build' },
};

function LiveTimer({ startedAt, pausedSecs, activePauseAt }: { startedAt: string; pausedSecs: number; activePauseAt?: string }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const calc = () => {
            const now = activePauseAt ? new Date(activePauseAt).getTime() : Date.now();
            const diff = Math.floor((now - new Date(startedAt).getTime()) / 1000) - pausedSecs;
            setElapsed(Math.max(0, diff));
        };
        calc();
        if (!activePauseAt) {
            const interval = setInterval(calc, 1000);
            return () => clearInterval(interval);
        }
    }, [startedAt, pausedSecs, activePauseAt]);

    const hh = Math.floor(elapsed / 3600).toString().padStart(2, '0');
    const mm = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
    const ss = (elapsed % 60).toString().padStart(2, '0');
    return <span className="font-mono tabular-nums">{hh}:{mm}:{ss}</span>;
}

export default function StaffOverview() {
    const navigate = useNavigate();
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [startingSession, setStartingSession] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Player picker state
    const [pickedPlayers, setPickedPlayers] = useState<PlayerResult[]>([]);
    const [playerSearch, setPlayerSearch] = useState('');
    const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);
    const [searchingPlayers, setSearchingPlayers] = useState(false);
    type GameMode = 'OPEN' | 'SOLO' | 'SPLIT' | 'LTP';
    const [gameMode, setGameMode] = useState<GameMode>('OPEN');

    const fetchTables = async () => {
        try {
            const data = await apiFetch('/sessions/active');
            const tablesData = await apiFetch('/tables');
            const merged = (tablesData || []).map((t: Table) => {
                const active = (data || []).find((s: any) => s.tableId === t.id);
                return { ...t, activeSession: active || undefined };
            });
            setTables(merged);
        } catch (e) {
            console.error('Failed to fetch tables/sessions', e);
        } finally {
            setLoading(false);
        }
    };

    // Player search with debounce
    useEffect(() => {
        if (playerSearch.length < 1) { setPlayerResults([]); return; }
        const t = setTimeout(async () => {
            setSearchingPlayers(true);
            try { const r = await sessionService.searchPlayers(playerSearch); setPlayerResults(r); }
            catch { setPlayerResults([]); }
            finally { setSearchingPlayers(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [playerSearch]);

    useEffect(() => {
        fetchTables();
        intervalRef.current = setInterval(fetchTables, 10000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const addPickedPlayer = (p: PlayerResult) => {
        if (!pickedPlayers.find(x => x.id === p.id)) setPickedPlayers(prev => [...prev, p]);
        setPlayerSearch('');
        setPlayerResults([]);
    };

    const removePickedPlayer = (id: string) => setPickedPlayers(prev => prev.filter(x => x.id !== id));

    const handleStartSession = async () => {
        if (!selectedTable) return;

        if (gameMode === 'SOLO' && pickedPlayers.length !== 1) {
            alert('Please select exactly 1 player for a SOLO session.');
            return;
        }
        if ((gameMode === 'SPLIT' || gameMode === 'LTP') && pickedPlayers.length < 2) {
            alert('Please select at least 2 players for SPLIT or LTP sessions.');
            return;
        }

        setStartingSession(true);
        try {
            const apiGameType = gameMode === 'OPEN' ? 'SOLO' : gameMode;
            const res = await sessionService.startSession(selectedTable.id, gameMode === 'OPEN' ? [] : pickedPlayers.map(p => p.id), apiGameType);
            setSelectedTable(null);
            setPickedPlayers([]);
            setGameMode('OPEN');
            navigate(`/staff/live/${res.session.id}`);
        } catch (e: any) {
            alert('Could not start session: ' + e.message);
        } finally {
            setStartingSession(false);
        }
    };

    const available = tables.filter(t => t.status === 'AVAILABLE').length;
    const playing = tables.filter(t => t.status === 'PLAYING').length;
    const reserved = tables.filter(t => t.status === 'RESERVED').length;

    return (
        <div className="flex flex-col gap-8 font-display pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Live Table Monitor</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Real-time view of all tables. Click any table to manage its session.</p>
                </div>
                <button
                    onClick={fetchTables}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Refresh
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tables', value: tables.length, icon: 'table_bar', color: 'text-slate-500' },
                    { label: 'Playing Now', value: playing, icon: 'sports_score', color: 'text-primary' },
                    { label: 'Available', value: available, icon: 'check_circle', color: 'text-emerald-500' },
                    { label: 'Reserved', value: reserved, icon: 'event', color: 'text-amber-500' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm">
                        <span className={`material-symbols-outlined text-3xl ${stat.color}`}>{stat.icon}</span>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tables Grid */}
            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {tables.length === 0 && (
                        <div className="col-span-full p-20 text-center">
                            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">table_bar</span>
                            <p className="text-slate-500 font-bold">No tables found for your branch.</p>
                            <p className="text-slate-400 text-sm mt-1">Ask your Store Owner to add tables in the admin panel.</p>
                        </div>
                    )}
                    {tables.map(table => {
                        const cfg = TABLE_STATUS_CONFIG[table.status] || TABLE_STATUS_CONFIG.AVAILABLE;
                        const isPlaying = table.status === 'PLAYING';
                        const sess = table.activeSession;

                        return (
                            <button
                                key={table.id}
                                onClick={() => {
                                    if (isPlaying && sess) navigate(`/staff/live/${sess.id}`);
                                    else if (table.status === 'AVAILABLE') setSelectedTable(table);
                                }}
                                className={`relative group rounded-2xl border-2 p-5 flex flex-col items-center text-center transition-all hover:scale-105 shadow-sm cursor-pointer
                                    ${isPlaying
                                        ? 'bg-gradient-to-b from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border-primary/60 shadow-primary/20 shadow-lg hover:shadow-primary/30'
                                        : `${cfg.border} bg-white dark:bg-slate-900 hover:shadow-xl hover:${cfg.glow}`
                                    }`}
                            >
                                {/* Status Dot */}
                                <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${cfg.color} ${isPlaying ? 'animate-pulse' : ''}`}></div>

                                {/* Table Icon */}
                                <div className={`w-16 h-16 rounded-2xl ${cfg.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                                    <span className={`material-symbols-outlined text-4xl ${cfg.text}`}>table_bar</span>
                                </div>

                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{table.nameOrNumber}</h3>

                                <span className={`mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                                    {cfg.label}
                                </span>

                                {isPlaying && sess && (
                                    <div className="mt-3 w-full border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</p>
                                        <p className={`text-sm font-black ${cfg.text} flex items-center justify-center gap-1`}>
                                            <LiveTimer
                                                startedAt={sess.startedAt}
                                                pausedSecs={sess.pausedDurationSecs || 0}
                                                activePauseAt={sess.status === 'PAUSED' ? (sess as any).pauses?.[0]?.pausedAt || new Date().toISOString() : undefined}
                                            />
                                            {sess.status === 'PAUSED' && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">PAUSED</span>}
                                        </p>
                                        {sess.players?.length > 0 && (
                                            <p className="text-xs text-slate-500 truncate">{sess.players.map((p: any) => p.player?.fullName).join(', ')}</p>
                                        )}
                                    </div>
                                )}

                                {table.status === 'AVAILABLE' && (
                                    <div className="mt-3 w-full">
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-sm">add_circle</span>
                                            Tap to Start
                                        </span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Start Session Modal */}
            {selectedTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setSelectedTable(null); setPickedPlayers([]); setPlayerSearch(''); }} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 w-full max-w-md flex flex-col gap-5">
                        {/* Header */}
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <span className="material-symbols-outlined text-3xl">sports_score</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Start Session</h2>
                                <p className="text-slate-500 text-sm">Table {selectedTable.nameOrNumber}</p>
                            </div>
                        </div>

                        {/* Game Type Selection */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Match Type</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setGameMode('OPEN'); setPickedPlayers([]); }}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 font-bold text-xs transition-all ${gameMode === 'OPEN'
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-xl">public</span>
                                    <span>OPEN</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGameMode('SOLO')}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 font-bold text-xs transition-all ${gameMode === 'SOLO'
                                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-xl">person</span>
                                    <span>SOLO</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGameMode('SPLIT')}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 font-bold text-xs transition-all ${gameMode === 'SPLIT'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-xl">call_split</span>
                                    <span>SPLIT</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGameMode('LTP')}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 font-bold text-xs transition-all ${gameMode === 'LTP'
                                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-xl">emoji_events</span>
                                    <span>LTP</span>
                                </button>
                            </div>
                        </div>

                        {/* Player search */}
                        {gameMode !== 'OPEN' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Add Players <span className="text-slate-400 font-normal">
                                        {gameMode === 'SOLO' ? '(Pick 1)' : '(Pick 2+)'}
                                    </span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">search</span>
                                    <input type="text" value={playerSearch} onChange={e => setPlayerSearch(e.target.value)}
                                        placeholder="Search players by name or email..."
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                {/* Search results dropdown */}
                                {(playerResults.length > 0 || searchingPlayers) && (
                                    <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                                        {searchingPlayers && <p className="text-xs text-slate-500 p-3 text-center">Searching...</p>}
                                        {playerResults.map(p => (
                                            <button key={p.id} type="button" onClick={() => addPickedPlayer(p)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 text-left transition-colors">
                                                <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">{p.fullName?.charAt(0)}</div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{p.fullName}</p>
                                                    <p className="text-xs text-slate-500 truncate">{p.email}</p>
                                                </div>
                                                <span className="material-symbols-outlined text-primary text-[18px] ml-auto shrink-0">add_circle</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Picked player chips */}
                        {gameMode !== 'OPEN' && pickedPlayers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {pickedPlayers.map(p => (
                                    <div key={p.id} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-bold">
                                        <span>{p.fullName}</span>
                                        <button onClick={() => removePickedPlayer(p.id)} className="text-primary/60 hover:text-primary">
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {gameMode === 'OPEN' && (
                            <p className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                This will start an anonymous session for walk-in customers.
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => { setSelectedTable(null); setPickedPlayers([]); setPlayerSearch(''); setGameMode('OPEN'); }}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">Cancel</button>
                            <button onClick={handleStartSession} disabled={startingSession}
                                className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-60">
                                {startingSession ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <span className="material-symbols-outlined">play_circle</span>}
                                {startingSession ? 'Starting...' : `Start ${gameMode} Session`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
