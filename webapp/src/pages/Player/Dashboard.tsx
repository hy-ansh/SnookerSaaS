import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { playerService } from '../../api/player';
import { apiFetch } from '../../api/apiClient';

export default function PlayerDashboard() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['playerStats', user?.id],
        queryFn: () => playerService.getStats(user!.id),
        enabled: !!user?.id,
        retry: false
    });

    const { data: walletData, isLoading: walletLoading } = useQuery({
        queryKey: ['walletData', user?.id],
        queryFn: () => playerService.getWallet(),
        enabled: !!user?.id,
    });

    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['playerHistory', user?.id],
        queryFn: () => apiFetch('/player/history'),
        enabled: !!user?.id,
    });

    const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: () => apiFetch('/player/leaderboard'),
        enabled: !!user?.id,
    });

    const rechargeMutation = useMutation({
        mutationFn: playerService.rechargeWallet,
        onSuccess: (data: { orderId: string, amount: number }) => {
            alert(`Razorpay checkout opened for ${data.amount} INR (Mock Order: ${data.orderId})`);
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['walletData'] });
            }, 1000);
        },
        onError: () => {
            alert('Failed to initiate recharge');
        }
    });

    const handleRecharge = () => {
        const amount = prompt("Enter amount to add to wallet (INR):", "500");
        if (amount && !isNaN(Number(amount))) {
            rechargeMutation.mutate(Number(amount));
        }
    };

    const winRate = stats?.matchesPlayed
        ? Math.round((stats.matchesWon / stats.matchesPlayed) * 100)
        : 0;

    const recentSessions: any[] = historyData?.history?.slice(0, 5) || [];
    const myId = user?.id;

    const getPaymentInfo = (session: any) => {
        const hasPendingDue = session.dues?.some((d: any) => d.playerId === myId && d.status === 'PENDING');
        if (hasPendingDue) return { text: 'Dues', color: 'text-red-500 bg-red-100 dark:bg-red-500/10 dark:text-red-400', icon: 'account_balance' };
        const payment = session.payments?.find((p: any) => p.payerId === myId && p.status === 'SUCCESS');
        if (payment) return { text: payment.method, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400', icon: 'check_circle' };
        if (session.status === 'COMPLETED') return { text: 'Free', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400', icon: 'card_giftcard' };
        return null;
    };

    return (
        <>
            {/* Welcome Section */}
            <div className="mb-10">
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Player Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg mt-2 font-medium">Welcome back, {stats?.user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Player'}. Ready for another break?</p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                            <span className="material-symbols-outlined">sports_score</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sessions Played</p>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{statsLoading ? '-' : stats?.matchesPlayed || 0}</p>
                    <div className="flex items-center gap-1 text-primary text-xs font-bold mt-2">
                        <span className="material-symbols-outlined text-sm">emoji_events</span>
                        <span>{stats?.matchesWon || 0} Wins</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                            <span className="material-symbols-outlined">military_tech</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">ELO Rating</p>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{statsLoading ? '-' : stats?.eloRating || 1200}</p>
                    <div className="flex items-center gap-1 text-primary text-xs font-bold mt-2">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        <span>{stats?.eloRating && stats.eloRating >= 1500 ? 'Pro Rank' : 'Amateur'}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                            <span className="material-symbols-outlined">query_stats</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Win Rate</p>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{statsLoading ? '-' : `${winRate}%`}</p>
                    <div className="flex items-center gap-1 text-slate-400 text-xs font-bold mt-2">
                        <span className="material-symbols-outlined text-sm">analytics</span>
                        <span>Out of {stats?.matchesPlayed || 0} sessions</span>
                    </div>
                </div>

                {/* <div className="bg-slate-900 dark:bg-black p-6 rounded-xl border border-slate-800 shadow-xl shadow-slate-900/10 group">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="size-12 rounded-lg bg-primary text-white flex items-center justify-center">
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                        </div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Wallet Balance</p>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-3xl font-extrabold text-white">{walletLoading ? '...' : `₹${Number(walletData?.balance || 0).toFixed(2)}`}</p>
                            {(stats?.pendingDues ?? 0) > 0 && (
                                <p className="text-xs text-red-400 font-bold mt-1">⚠ ₹{Number(stats!.pendingDues!).toFixed(2)} in dues</p>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 relative z-10">
                            <button
                                onClick={handleRecharge}
                                disabled={rechargeMutation.isPending}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                                <span className="material-symbols-outlined text-sm">add</span>
                                {rechargeMutation.isPending ? 'ADDING...' : 'ADD FUNDS'}
                            </button>
                            <Link to="/player/dues" className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-sm">payments</span>
                                PAY DUES
                            </Link>
                        </div>
                    </div> 
                </div>*/}
            </div>

            {/* Split Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Session History */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">history</span>
                            Recent Sessions
                        </h2>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        {historyLoading ? (
                            <div className="p-8 text-center text-slate-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                            </div>
                        ) : recentSessions.length === 0 ? (
                            <div className="p-12 text-center">
                                <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-700 block mb-3">sports_score</span>
                                <p className="text-slate-500 font-bold">No sessions yet</p>
                                <p className="text-slate-400 text-sm mt-1">Your session history will appear here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {recentSessions.map((record: any) => {
                                    const sess = record.session;
                                    if (!sess) return null;
                                    const isWinner = (sess.winnerIds || []).includes(myId);
                                    const isLTP = sess.gameType === 'LTP';
                                    const coPlayers = (sess.players || []).filter((p: any) => p.playerId !== myId);
                                    const payInfo = getPaymentInfo(sess);

                                    return (
                                        <div key={sess.id} className="p-5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${isWinner ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500'
                                                    : (sess.winnerIds?.length > 0 && !isWinner) ? 'bg-red-100 text-red-500 dark:bg-red-500/10 dark:text-red-400'
                                                        : 'bg-primary/10 text-primary'
                                                    }`}>
                                                    <span className="material-symbols-outlined">{isWinner ? 'emoji_events' : (sess.winnerIds?.length > 0 && !isWinner) ? 'sentiment_dissatisfied' : 'table_bar'}</span>
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm">Table {sess.table?.nameOrNumber || '?'}</p>
                                                        {sess.gameType && (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${sess.gameType === 'LTP' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                                                : sess.gameType === 'SPLIT' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                                                }`}>{sess.gameType}</span>
                                                        )}
                                                        {sess.winnerIds?.length > 0 && (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isWinner ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                                                }`}>{isWinner ? '🏆 Won' : '💸 Lost'}</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(sess.startedAt).toLocaleDateString()} · {sess.durationMinutes ? `${sess.durationMinutes}m` : 'In Progress'}
                                                    </p>
                                                    {coPlayers.length > 0 && (
                                                        <p className="text-xs text-slate-400 mt-0.5">vs. {coPlayers.map((p: any) => p.player?.fullName || 'Guest').join(', ')}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {payInfo && (
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${payInfo.color}`}>
                                                        <span className="material-symbols-outlined text-[11px]">{payInfo.icon}</span>
                                                        {payInfo.text}
                                                    </span>
                                                )}
                                                <span className="font-black text-primary text-sm">₹{Number(sess.totalAmount || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Leaderboard Column */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-amber-500">leaderboard</span>
                            Top Players
                        </h2>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
                        {leaderboardLoading ? (
                            <div className="p-8 text-center text-slate-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                <p className="font-bold">No ranking data yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {leaderboard.map((player: any) => {
                                    const isMe = player.id === user?.id;
                                    return (
                                        <div key={player.id} className={`p-4 flex items-center justify-between gap-4 transition-colors ${isMe ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="flex flex-col items-center justify-center w-6 shrink-0">
                                                    <span className={`text-lg font-black ${player.rank === 1 ? 'text-amber-500' : player.rank === 2 ? 'text-slate-400' : player.rank === 3 ? 'text-amber-700' : 'text-slate-400'}`}>#{player.rank}</span>
                                                </div>
                                                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shrink-0">
                                                    {player.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`font-bold text-sm truncate ${isMe ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                                                        {player.name} {isMe && <span className="ml-1 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full uppercase">You</span>}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{player.matchesWon} wins / {player.matchesPlayed} matches</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-slate-900 dark:text-white">{player.elo}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rating</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
