import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { playerService } from '../api/player';

export default function PlayerLayout() {
    const { appUser, user, signOut } = useAuth();
    const location = useLocation();

    const { data: stats } = useQuery({
        queryKey: ['playerStatsHeader', user?.id],
        queryFn: () => playerService.getStats(user!.id),
        enabled: !!user?.id,
        retry: false
    });

    const isActive = (path: string) => location.pathname === path || (path !== '/player' && location.pathname.startsWith(path));

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 font-display text-slate-800 dark:text-slate-300 overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-primary/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-6 md:px-20 py-4 sticky top-0 z-50">
                    <div className="flex items-center gap-8">
                        <Link to="/player" className="flex items-center gap-3">
                            <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined">sports_handball</span>
                            </div>
                            <h2 className="text-slate-900 dark:text-slate-100 text-xl font-extrabold tracking-tight truncate max-w-[150px] sm:max-w-[200px]" title={appUser?.organizationName || 'CueFlow'}>
                                {appUser?.organizationName || 'CueFlow'}
                            </h2>
                        </Link>

                        {/* Navigation Links */}
                        <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
                            <Link to="/player" className={`${isActive('/player') && location.pathname === '/player' ? 'text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'} transition-colors flex items-center gap-2`}>
                                <span className="material-symbols-outlined text-sm shrink-0">dashboard</span> Overview
                            </Link>
                            <Link to="/player/matches" className={`${isActive('/player/matches') ? 'text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'} transition-colors flex items-center gap-2`}>
                                <span className="material-symbols-outlined text-sm shrink-0">history</span> Matches
                            </Link>
                            <Link to="/player/leaderboard" className={`${isActive('/player/leaderboard') ? 'text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'} transition-colors flex items-center gap-2`}>
                                <span className="material-symbols-outlined text-sm shrink-0">trophy</span> Leaderboard
                            </Link>
                            <Link to="/player/wallet" className={`${isActive('/player/wallet') ? 'text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'} transition-colors flex items-center gap-2`}>
                                <span className="material-symbols-outlined text-sm shrink-0">account_balance_wallet</span> Wallet
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                        <div className="h-10 w-px bg-primary/10 dark:bg-primary/20 mx-2 hidden sm:block"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden xl:block pr-2">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{stats?.user?.fullName || user?.email?.split('@')[0] || 'Player'}</p>
                                <p className="text-xs font-medium text-primary uppercase tracking-wider">Pro Member</p>
                            </div>
                            <div className="group relative">
                                <button className="size-10 rounded-full border-2 border-primary/20 bg-slate-200 dark:bg-slate-800 overflow-hidden outline-none hover:border-primary transition-colors focus:ring-4 focus:ring-primary/20"
                                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDIUJ-sKrB-nF6eCzF0IlQtnVeLEo1csnwpRAwwNJCwlX5_qkcvqZDxncNBWVic_neNemEKUrF7-SHfKDwWpb8we0dFItF9E0Jkmj5KEfY1sLGLEWLgyUaVZaqG5abP_H656YdBZ0BF_IxtJM2bDUHcF7MvV4WJriJEAn6p7TnegVjV0a-9uA3vTt9oextMuMZiGp4y72l2R5TtLIb5M2pdosglAfZfmxBYduNyzUGCm0Zslt-xAlglalyKhoQh3IlEEjh6vQzA69oN")', backgroundSize: 'cover' }}>
                                </button>
                                {/* Dropdown menu */}
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col py-2">
                                    <button onClick={() => signOut()} className="w-full text-left px-4 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-20 py-10">
                    <Outlet />
                </main>

                <footer className="mt-auto px-6 md:px-20 py-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-7xl mx-auto w-full">
                        <div className="flex items-center gap-2">
                            <div className="size-8 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-slate-600 dark:text-slate-400">
                                <span className="material-symbols-outlined text-sm">sports_handball</span>
                            </div>
                            <p className="text-sm font-bold text-slate-400">© 2024 CueFlow SaaS</p>
                        </div>
                        <div className="flex gap-8">
                            <Link to="#" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Support</Link>
                            <Link to="#" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Terms</Link>
                            <Link to="#" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Privacy</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
