import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../api/apiClient';

export default function PlayerLeaderboard() {
    const { user } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['playerLeaderboard'],
        queryFn: () => apiFetch('/player/leaderboard')
    });

    const players: any[] = Array.isArray(data) ? data : [];
    const myId = user?.id;

    const MEDALS = ['🥇', '🥈', '🥉'];
    const RANK_STYLES: Record<number, string> = {
        0: 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20',
        1: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50',
        2: 'bg-orange-50 dark:bg-orange-500/5 border-orange-200 dark:border-orange-500/20',
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Leaderboard</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Top players ranked by ELO rating at your club.</p>
                </div>
                {!isLoading && (
                    <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                        {players.length} players ranked
                    </span>
                )}
            </div>

            {/* Top 3 Podium */}
            {!isLoading && players.length >= 3 && (
                <div className="grid grid-cols-3 gap-3 md:gap-5">
                    {[players[1], players[0], players[2]].map((player, i) => {
                        const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3;
                        const heights = ['h-24', 'h-32', 'h-20'];
                        const isMe = player?.id === myId;
                        return (
                            <div key={player?.id} className={`flex flex-col items-center gap-2 ${i === 1 ? '-mt-4' : ''}`}>
                                <div className="relative">
                                    <div className={`size-14 md:size-16 rounded-2xl flex items-center justify-center font-black text-2xl border-2 ${isMe ? 'border-primary bg-primary/20' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'}`}>
                                        {MEDALS[actualRank - 1]}
                                    </div>
                                    {isMe && (
                                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary border-2 border-white dark:border-slate-900" />
                                    )}
                                </div>
                                <p className="text-xs font-black text-slate-900 dark:text-white text-center truncate w-full px-1">{player?.name || '?'}</p>
                                <p className="text-[10px] font-bold text-slate-400">{player?.elo} ELO</p>
                                <div className={`w-full ${heights[i]} rounded-t-2xl flex items-center justify-center ${actualRank === 1 ? 'bg-gradient-to-b from-amber-400 to-amber-500' : actualRank === 2 ? 'bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700' : 'bg-gradient-to-b from-orange-400 to-orange-500'}`}>
                                    <span className="text-white font-black text-2xl">#{actualRank}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Full Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Rank</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Player</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Sessions</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Win Rate</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">ELO Rating</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-10 text-center text-slate-500 font-bold animate-pulse">Loading Leaderboard...</td>
                                </tr>
                            ) : players.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800 mb-4 block">emoji_events</span>
                                        <p className="text-slate-500 font-bold">No players ranked yet.</p>
                                        <p className="text-slate-400 text-sm mt-1">Complete sessions to appear on the leaderboard.</p>
                                    </td>
                                </tr>
                            ) : (
                                players.map((player, idx) => {
                                    const isMe = player.id === myId;
                                    return (
                                        <tr key={player.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${RANK_STYLES[idx] ?? ''} ${isMe ? 'ring-1 ring-inset ring-primary/30 bg-primary/5 dark:bg-primary/5' : ''}`}>
                                            <td className="py-5 px-6">
                                                <div className={`size-8 rounded-full flex items-center justify-center font-extrabold text-sm ${idx < 3 ? [
                                                    'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
                                                    'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                                                    'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                                                ][idx] : 'text-slate-500 dark:text-slate-400'}`}>
                                                    {idx < 3 ? MEDALS[idx] : player.rank}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${isMe ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                        {player.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white">{player.name}</span>
                                                        {isMe && <span className="ml-2 text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">YOU</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                                    {player.matchesPlayed} <span className="text-slate-400 font-normal">played</span>
                                                    {player.matchesWon > 0 && <span className="ml-1 text-emerald-500">· {player.matchesWon}W</span>}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary rounded-full" style={{ width: `${player.winRate}%` }}></div>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{player.winRate}%</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-lg font-black text-slate-900 dark:text-white">{player.elo}</span>
                                                    <span className={`material-symbols-outlined text-xs ${idx === 0 ? 'text-emerald-500 rotate-[-45deg]' : 'text-slate-400'}`}>trending_flat</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
