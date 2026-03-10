import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { playerService } from '../api/player';
import { Logo } from '../components/Shared/Logo';

export default function PlayerLayout() {
    const { appUser, user, signOut } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-primary/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-6 md:px-20 py-4 sticky top-0 z-50">
                    <div className="flex items-center justify-between w-full md:w-auto">
                        <Link to="/player" className="flex items-center gap-3 shrink-0 group">
                            <Logo size="small" />
                            {appUser?.organizationName && (
                                <div className="flex flex-col -gap-1">
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Playing at</span>
                                    <span className="text-lg font-900 text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 group-hover:from-primary group-hover:to-primary/80 transition-all">
                                        {appUser.organizationName}
                                    </span>
                                </div>
                            )}
                        </Link>
                        
                        {/* Mobile Menu Toggle */}
                        <div className="flex items-center gap-3 md:hidden">
                            <button className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined">notifications</span>
                            </button>
                            <button 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        {/* Desktop Navigation Links */}
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
                            <Link to="/player/dues" className={`${isActive('/player/dues') ? 'text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'} transition-colors flex items-center gap-2`}>
                                <span className="material-symbols-outlined text-sm shrink-0">receipt_long</span> Dues
                            </Link>
                        </nav>

                        {/* Desktop Profile Area */}
                        <div className="hidden md:flex items-center gap-4">
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
                    </div>
                </header>

                {/* Mobile Navigation Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-lg absolute top-[73px] left-0 w-full z-40 px-6 py-4 flex flex-col gap-2 animate-in slide-in-from-top-2">
                        <nav className="flex flex-col gap-1">
                            <Link onClick={() => setIsMobileMenuOpen(false)} to="/player" className={`px-4 py-3 rounded-xl flex items-center gap-3 ${isActive('/player') && location.pathname === '/player' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <span className="material-symbols-outlined text-[20px]">dashboard</span> Overview
                            </Link>
                            <Link onClick={() => setIsMobileMenuOpen(false)} to="/player/matches" className={`px-4 py-3 rounded-xl flex items-center gap-3 ${isActive('/player/matches') ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <span className="material-symbols-outlined text-[20px]">history</span> Matches
                            </Link>
                            <Link onClick={() => setIsMobileMenuOpen(false)} to="/player/leaderboard" className={`px-4 py-3 rounded-xl flex items-center gap-3 ${isActive('/player/leaderboard') ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <span className="material-symbols-outlined text-[20px]">trophy</span> Leaderboard
                            </Link>
                            <Link onClick={() => setIsMobileMenuOpen(false)} to="/player/dues" className={`px-4 py-3 rounded-xl flex items-center gap-3 ${isActive('/player/dues') ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <span className="material-symbols-outlined text-[20px]">receipt_long</span> Dues
                            </Link>
                        </nav>
                        <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3 px-4 py-2 mb-2">
                                <div className="size-10 rounded-full border-2 border-primary/20 bg-slate-200 dark:bg-slate-800 overflow-hidden" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDIUJ-sKrB-nF6eCzF0IlQtnVeLEo1csnwpRAwwNJCwlX5_qkcvqZDxncNBWVic_neNemEKUrF7-SHfKDwWpb8we0dFItF9E0Jkmj5KEfY1sLGLEWLgyUaVZaqG5abP_H656YdBZ0BF_IxtJM2bDUHcF7MvV4WJriJEAn6p7TnegVjV0a-9uA3vTt9oextMuMZiGp4y72l2R5TtLIb5M2pdosglAfZfmxBYduNyzUGCm0Zslt-xAlglalyKhoQh3IlEEjh6vQzA69oN")', backgroundSize: 'cover' }}></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{stats?.user?.fullName || user?.email?.split('@')[0] || 'Player'}</p>
                                    <p className="text-xs font-semibold text-primary uppercase">Pro Member</p>
                                </div>
                            </div>
                            <button onClick={() => { setIsMobileMenuOpen(false); signOut(); }} className="w-full px-4 py-3 rounded-xl flex items-center gap-3 text-rose-500 font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10">
                                <span className="material-symbols-outlined text-[20px]">logout</span> Sign Out
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Desktop Profile Area */}
                <div className="hidden md:flex items-center justify-end px-6 md:px-20 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
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
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col py-2 z-50">
                                <button onClick={() => signOut()} className="w-full text-left px-4 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

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
            </div >
        </div >
    );
}
