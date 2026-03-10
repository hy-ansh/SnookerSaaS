import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { playerService } from "../api/player";
import { Logo } from "../components/Shared/Logo";

export default function PlayerLayout() {
  const { appUser, user, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["playerStatsHeader", user?.id],
    queryFn: () => playerService.getStats(user!.id),
    enabled: !!user?.id,
    retry: false,
  });

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/player" && location.pathname.startsWith(path));

  const navLinks = [
    { path: "/player", label: "Overview", icon: "dashboard" },
    { path: "/player/matches", label: "Matches", icon: "history" },
    { path: "/player/leaderboard", label: "Leaderboard", icon: "trophy" },
    { path: "/player/dues", label: "Dues", icon: "receipt_long" },
  ];

  const userName =
    stats?.user?.fullName || user?.email?.split("@")[0] || "Player";

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 font-display text-slate-800 dark:text-slate-300">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-10">
          {/* Logo & Org Name */}
          <Link to="/player" className="flex items-center gap-3 group shrink-0">
            <Logo size="small" />
            {appUser?.organizationName && (
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Playing at
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                  {appUser.organizationName}
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isActive(link.path)
                    ? "text-primary bg-primary/5"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions & Profile */}
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>

            <div className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>

            {/* Desktop User Dropdown */}
            <div className="hidden md:flex items-center gap-3 group relative">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">
                  {userName}
                </p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                  Pro Member
                </p>
              </div>
              <button className="size-10 rounded-full border-2 border-primary/20 bg-slate-200 dark:bg-slate-800 overflow-hidden hover:border-primary transition-all">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage:
                      'url("https://ui-avatars.com/api/?name=' +
                      userName +
                      '&background=random")',
                  }}
                />
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="w-48 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2">
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-3"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      logout
                    </span>{" "}
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-[28px]">
                {isMobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-top-2">
            <div className="p-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  to={link.path}
                  className={`px-4 py-4 rounded-xl flex items-center gap-4 transition-colors ${
                    isActive(link.path)
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="material-symbols-outlined">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
              <div className="my-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full px-4 py-4 rounded-xl flex items-center gap-4 text-rose-500 font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <span className="material-symbols-outlined">logout</span> Sign
                  Out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-10 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="w-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="size-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">
                sports_handball
              </span>
            </div>
            <p className="text-sm font-bold text-slate-400 italic">
              © 2026 CueFlow SaaS
            </p>
          </div>
          <div className="flex items-center gap-8">
            {["Support", "Terms", "Privacy"].map((item) => (
              <Link
                key={item}
                to="#"
                className="text-sm font-bold text-slate-400 hover:text-primary transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
