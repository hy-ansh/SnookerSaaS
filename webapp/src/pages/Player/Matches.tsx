import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../api/apiClient';

export default function PlayerMatches() {
    const { user } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['playerHistory', user?.id],
        queryFn: () => apiFetch('/player/history'),
        enabled: !!user?.id,
    });

    const history: any[] = data?.history || [];
    const myId = user?.id;

    const getPaymentInfo = (session: any) => {
        const hasPendingDue = session.dues?.some((d: any) => d.playerId === myId && d.status === 'PENDING');
        if (hasPendingDue) return { text: 'Dues', icon: 'account_balance', color: 'text-red-600 bg-red-100 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20' };
        const payment = session.payments?.find((p: any) => p.payerId === myId && p.status === 'SUCCESS');
        if (payment) return { text: payment.method, icon: 'check_circle', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' };
        if (session.status === 'COMPLETED') return { text: 'Free', icon: 'card_giftcard', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700' };
        return null;
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Session History</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">All your table sessions — opponents, outcome, and payment.</p>
                </div>
                {!isLoading && (
                    <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                        {history.length} session{history.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 flex-1 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="animate-pulse p-10 space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full"></div>
                        ))}
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-20">
                        <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800 mb-4 block">history</span>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Session History</h3>
                        <p className="text-slate-500 font-medium mt-2">You haven't played any sessions yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {history.map((record: any) => {
                            const sess = record.session;
                            if (!sess) return null;
                            const winnerIds: string[] = sess.winnerIds || [];
                            const isWinner = winnerIds.includes(myId!);
                            const isLTP = sess.gameType === 'LTP';
                            const coPlayers = (sess.players || []).filter((p: any) => p.playerId !== myId);
                            const payInfo = getPaymentInfo(sess);
                            const isCompleted = sess.status === 'COMPLETED';

                            return (
                                <div key={sess.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                    {/* Left: Icon + Info */}
                                    <div className="flex items-center gap-5">
                                        <div className={`size-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${isCompleted && isLTP && isWinner ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500'
                                            : isCompleted && (sess.winnerIds?.length > 0) && !isWinner ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                                                : 'bg-primary/10 text-primary'
                                            }`}>
                                            <span className="material-symbols-outlined text-3xl">
                                                {isCompleted && sess.winnerIds?.length > 0 && isWinner ? 'emoji_events'
                                                    : isCompleted && sess.winnerIds?.length > 0 && !isWinner ? 'sentiment_dissatisfied'
                                                        : 'table_bar'}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                                                    Table {sess.table?.nameOrNumber || '?'}
                                                </h3>
                                                {sess.gameType && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${sess.gameType === 'LTP' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                                        }`}>
                                                        {sess.gameType}
                                                    </span>
                                                )}
                                                {sess.winnerIds?.length > 0 && isCompleted && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isWinner ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                                                        {isWinner ? '🏆 Winner' : '💸 Lost'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium">
                                                {new Date(sess.startedAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} • {sess.durationMinutes ? `${sess.durationMinutes} min` : 'In Progress'}
                                            </p>
                                            {coPlayers.length > 0 && (
                                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[13px]">group</span>
                                                    {isLTP ? 'vs.' : 'with'} {coPlayers.map((p: any) => p.player?.fullName || 'Guest').join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Amount + Payment */}
                                    <div className="flex flex-wrap items-center gap-3 ml-auto shrink-0">
                                        {payInfo && (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${payInfo.color}`}>
                                                <span className="material-symbols-outlined text-[14px]">{payInfo.icon}</span>
                                                {payInfo.text}
                                            </span>
                                        )}
                                        <div className="text-right">
                                            <p className="font-black text-primary text-lg">₹{Number(sess.totalAmount || 0).toFixed(2)}</p>
                                            {isCompleted && (
                                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
