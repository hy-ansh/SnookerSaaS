import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

function roleToPath(role: string): string {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin';
    if (role === 'STORE_OWNER') return '/owner';
    if (role === 'STAFF') return '/staff';
    return '/player';
}

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshProfile, appUser } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const from = (location.state as any)?.from || null;

    // Auto-redirect if already logged in
    useEffect(() => {
        if (navigate) {
            // We use setTimeout to allow auth context to initialize first
            setTimeout(() => {
                if (appUser) {
                    navigate(roleToPath(appUser.role), { replace: true });
                }
            }, 100);
        }
    }, [navigate, refreshProfile, appUser]);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) throw new Error(signInError.message);

            // Fetch the real DB role from backend
            await refreshProfile();

            // Re-read after refresh
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('No session after login');

            // Fetch enriched profile to get role
            const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const profile = res.ok ? await res.json() : null;
            const role: string = profile?.role ?? session?.user?.user_metadata?.role ?? 'PLAYER';

            navigate(from ?? roleToPath(role), { replace: true });
        } catch (err: any) {
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-6 py-20 relative overflow-hidden h-full bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
            {/* Background decoration */}
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-emerald-500/3 rounded-full blur-2xl pointer-events-none" />

            {/* ── FORM CARD ── */}
            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-8 justify-center lg:justify-start">
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-white text-xl">sports_pool</span>
                    </div>
                    <div>
                        <span className="font-black text-slate-900 dark:text-white text-lg tracking-tight">CueManager</span>
                        <span className="ml-1.5 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">SaaS</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-900/10 dark:shadow-slate-950/50 p-8 lg:p-10">
                    <div className="mb-8">
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5">Welcome back</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to manage your snooker venue.</p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6 animate-in slide-in-from-top-1">
                            <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5 flex-shrink-0">error</span>
                            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSignIn} className="space-y-5" noValidate>
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">mail</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">lock</span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Remember me + Forgot */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div
                                    onClick={() => setRememberMe(p => !p)}
                                    className={`size-4.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${rememberMe ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'}`}
                                >
                                    {rememberMe && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                                </div>
                                <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors select-none">Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="text-sm text-primary font-semibold hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-primary hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mt-2"
                        >
                            {loading ? (
                                <>
                                    <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary font-bold hover:underline">Start Free Trial</Link>
                        </p>
                    </div>

                    {/* Demo credentials */}
                    <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Demo Credentials</p>
                        <div className="space-y-1">
                            {[
                                ['Store Owner', 'owner1@cuemanager.demo', 'Demo@123!'],
                                ['Staff', 'staff1@cuemanager.demo', 'Demo@123!'],
                                ['Player', 'player1@cuemanager.demo', 'Demo@123!'],
                            ].map(([role, em, pw]) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => { setEmail(em); setPassword(pw); }}
                                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors group text-left"
                                >
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">{role}</span>
                                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">{em}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── VISUAL PANEL (desktop only) ── */}
            <div className="hidden lg:flex flex-1 items-center justify-center">
                <div className="relative max-w-md w-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-emerald-500/5 to-transparent rounded-3xl blur-2xl" />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 shadow-2xl">
                        {/* Live status indicator */}
                        <div className="flex items-center gap-2 mb-6">
                            <span className="relative flex size-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                            </span>
                            <span className="text-xs font-bold text-primary uppercase tracking-widest">Live Floor Status</span>
                        </div>

                        {/* Table grid preview */}
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            {[
                                { n: '1', s: 'playing' }, { n: '2', s: 'available' }, { n: '3', s: 'available' },
                                { n: '4', s: 'playing' }, { n: '5', s: 'reserved' }, { n: '6', s: 'playing' },
                            ].map(({ n, s }) => (
                                <div key={n} className={`rounded-xl p-3 border text-center transition-all ${s === 'playing' ? 'bg-primary/10 border-primary/20' :
                                    s === 'reserved' ? 'bg-amber-500/10 border-amber-500/20' :
                                        'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                                    }`}>
                                    <div className={`text-lg font-black ${s === 'playing' ? 'text-primary' :
                                        s === 'reserved' ? 'text-amber-600' :
                                            'text-slate-400'
                                        }`}>T{n}</div>
                                    <div className={`text-[9px] font-bold uppercase tracking-wider ${s === 'playing' ? 'text-primary' :
                                        s === 'reserved' ? 'text-amber-500' :
                                            'text-slate-400'
                                        }`}>{s}</div>
                                </div>
                            ))}
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[
                                { label: "Today's Rev", value: '₹4,250', icon: 'payments' },
                                { label: 'Active', value: '3', icon: 'timer' },
                                { label: 'Due', value: '₹850', icon: 'receipt_long' },
                            ].map(({ label, value, icon }) => (
                                <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700">
                                    <span className="material-symbols-outlined text-primary text-[16px] block mb-1">{icon}</span>
                                    <div className="text-base font-black text-slate-900 dark:text-white">{value}</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Testimonial */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
                            <div className="flex gap-1 mb-3">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className="material-symbols-outlined text-amber-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                ))}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                                "Revenue up <strong className="text-slate-900 dark:text-white">28%</strong> in 3 months. The live floor view alone saves 2 hrs daily."
                            </p>
                            <div className="flex items-center gap-2.5 mt-3">
                                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-[14px]">person</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Raj Sharma</p>
                                    <p className="text-[10px] text-slate-400">Owner, Royal Cue Palace</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
