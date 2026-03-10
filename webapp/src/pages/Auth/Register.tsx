import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';
import { LogoSpinner } from '../../components/Shared/LogoSpinner';
import { Logo } from '../../components/Shared/Logo';

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountType = 'STORE_OWNER' | 'PLAYER' | '';

interface FormData {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    organizationName: string;
    branchName: string;
    agreeTerms: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────



function roleToPath(role: string): string {
    if (role === 'STORE_OWNER') return '/owner';
    if (role === 'ADMIN') return '/admin';
    if (role === 'STAFF') return '/staff';
    return '/player';
}

function validatePassword(pw: string): string | null {
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter';
    if (!/[0-9]/.test(pw)) return 'Password must include a number';
    return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Register() {
    const navigate = useNavigate();

    const [step, setStep] = useState<1 | 2>(1);
    const [accountType, setAccountType] = useState<AccountType>('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { refreshProfile, appUser } = useAuth();

    // Auto-redirect if already logged in
    useEffect(() => {
        if (navigate) {
            setTimeout(() => {
                if (appUser) {
                    navigate(roleToPath(appUser.role), { replace: true });
                }
            }, 100);
        }
    }, [navigate, appUser, refreshProfile]);

    const [form, setForm] = useState<FormData>({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        organizationName: '',
        branchName: '',
        agreeTerms: false,
    });

    const set = (key: keyof FormData, value: string | boolean) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleTypeSelect = (type: AccountType) => {
        setAccountType(type);
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate
        if (!form.agreeTerms) { setError('Please accept the terms and conditions'); return; }
        if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
        const pwErr = validatePassword(form.password);
        if (pwErr) { setError(pwErr); return; }
        if (accountType === 'STORE_OWNER' && !form.organizationName.trim()) {
            setError('Venue name is required'); return;
        }

        setLoading(true);
        try {
            // 1. Call backend to create Supabase user + DB records
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: form.email.trim(),
                    password: form.password,
                    full_name: form.fullName.trim(),
                    role: accountType || 'PLAYER',
                    organization_name: form.organizationName.trim() || undefined,
                    branch_name: form.branchName.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            // 2. Sign in immediately with Supabase client
            const { error: signInErr } = await supabase.auth.signInWithPassword({
                email: form.email.trim(),
                password: form.password,
            });
            if (signInErr) throw new Error(signInErr.message);

            // 3. Navigate to the right dashboard
            navigate(roleToPath(accountType || 'PLAYER'), { replace: true });
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── UI helpers ──────────────────────────────────────────────────────────────

    const inputClass = "w-full px-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all";

    return (
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-6 py-16 relative overflow-hidden h-full bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
            {/* Background */}
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            {/* ── FORM CARD ── */}
            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <Logo size="medium" className="mx-auto lg:mx-0 lg:justify-start" />

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-900/10 dark:shadow-slate-950/50 p-8 lg:p-10">

                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-6">
                        {[1, 2].map(s => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`size-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${step >= s ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>{s}</div>
                                {s === 1 && <div className={`h-px flex-1 w-8 transition-all ${step >= 2 ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                            </div>
                        ))}
                    </div>

                    {/* ── STEP 1: Account type ── */}
                    {step === 1 && (
                        <>
                            <div className="mb-6">
                                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Create your account</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Start your 14-day free trial. No credit card required.</p>
                            </div>
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => handleTypeSelect('STORE_OWNER')}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                                >
                                    <div className="size-11 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center flex-shrink-0 transition-colors">
                                        <span className="material-symbols-outlined text-primary">store</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">Store Owner</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Manage your snooker hall, staff, tables & analytics</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary ml-auto transition-colors">chevron_right</span>
                                </button>

                                {/* <button
                                    type="button"
                                    onClick={() => handleTypeSelect('PLAYER')}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                                >
                                    <div className="size-11 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center flex-shrink-0 transition-colors">
                                        <span className="material-symbols-outlined text-primary">sports_pool</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">Player</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Track matches, wallet, ELO rating & leaderboard</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary ml-auto transition-colors">chevron_right</span>
                                </button> */}
                            </div>

                            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                                Already have an account?{' '}
                                <Link to="/login" className="text-primary font-bold hover:underline">Sign in</Link>
                            </p>
                        </>
                    )}

                    {/* ── STEP 2: Details form ── */}
                    {step === 2 && (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <button
                                    type="button"
                                    onClick={() => { setStep(1); setError(''); }}
                                    className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                </button>
                                <div>
                                    <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                        {accountType === 'STORE_OWNER' ? 'Set up your venue' : 'Create your player profile'}
                                    </h1>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {accountType === 'STORE_OWNER' ? 'Your venue dashboard awaits.' : 'Join the CueManager network.'}
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-5">
                                    <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5 flex-shrink-0">error</span>
                                    <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                                {/* Full Name */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">person</span>
                                        <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                                            required placeholder="John Doe" autoComplete="name" className={inputClass} />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">mail</span>
                                        <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                                            required placeholder="you@example.com" autoComplete="email" className={inputClass} />
                                    </div>
                                </div>

                                {/* Organization (owner only) */}
                                {accountType === 'STORE_OWNER' && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                Venue / Hall Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">store</span>
                                                <input type="text" value={form.organizationName} onChange={e => set('organizationName', e.target.value)}
                                                    required placeholder="Royal Cue Palace" className={inputClass} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                First Branch Name <span className="text-slate-400 font-normal">(optional)</span>
                                            </label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">location_on</span>
                                                <input type="text" value={form.branchName} onChange={e => set('branchName', e.target.value)}
                                                    placeholder="Main Branch" className={inputClass} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Password */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">lock</span>
                                        <input type={showPassword ? 'text' : 'password'} value={form.password}
                                            onChange={e => set('password', e.target.value)}
                                            required placeholder="Min 8 chars, A-Z, 0-9" autoComplete="new-password"
                                            className={inputClass + ' pr-11'} />
                                        <button type="button" onClick={() => setShowPassword(p => !p)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                            <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                    {/* Password strength mini-bar */}
                                    {form.password && (
                                        <div className="flex gap-1 pt-1">
                                            {[1, 2, 3, 4].map(n => {
                                                const strength = [
                                                    form.password.length >= 8,
                                                    /[A-Z]/.test(form.password),
                                                    /[0-9]/.test(form.password),
                                                    /[^A-Za-z0-9]/.test(form.password),
                                                ].filter(Boolean).length;
                                                return <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= strength
                                                    ? strength <= 1 ? 'bg-red-400'
                                                        : strength <= 2 ? 'bg-amber-400'
                                                            : strength <= 3 ? 'bg-blue-400'
                                                                : 'bg-primary'
                                                    : 'bg-slate-200 dark:bg-slate-700'
                                                    }`} />;
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">lock_reset</span>
                                        <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword}
                                            onChange={e => set('confirmPassword', e.target.value)}
                                            required placeholder="Repeat password" autoComplete="new-password"
                                            className={inputClass + ' pr-11'} />
                                        <button type="button" onClick={() => setShowConfirm(p => !p)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                            <span className="material-symbols-outlined text-[18px]">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                    {form.confirmPassword && form.password !== form.confirmPassword && (
                                        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px]">close</span> Passwords don't match
                                        </p>
                                    )}
                                    {form.confirmPassword && form.password === form.confirmPassword && (
                                        <p className="text-xs text-primary font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px]">check_circle</span> Passwords match
                                        </p>
                                    )}
                                </div>

                                {/* Terms */}
                                <label className="flex items-start gap-2.5 cursor-pointer group mt-1">
                                    <div
                                        onClick={() => set('agreeTerms', !form.agreeTerms)}
                                        className={`size-4 w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer ${form.agreeTerms ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'}`}
                                    >
                                        {form.agreeTerms && <span className="material-symbols-outlined text-white text-[11px]">check</span>}
                                    </div>
                                    <span className="text-sm text-slate-600 dark:text-slate-400 select-none">
                                        I agree to the{' '}
                                        <a href="#" className="text-primary font-semibold hover:underline">Terms of Service</a>
                                        {' '}and{' '}
                                        <a href="#" className="text-primary font-semibold hover:underline">Privacy Policy</a>
                                    </span>
                                </label>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-xl bg-primary hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mt-2"
                                >
                                    {loading ? (
                                        <>
                                            <LogoSpinner size="size-5" light />
                                            Creating your account...
                                        </>
                                    ) : (
                                        <>
                                            {accountType === 'STORE_OWNER' ? 'Launch My Venue' : 'Create Account'}
                                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
                                Already have an account?{' '}
                                <Link to="/login" className="text-primary font-bold hover:underline">Sign in</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* ── BENEFITS PANEL (desktop) ── */}
            <div className="hidden lg:flex flex-1 items-center justify-center">
                <div className="max-w-sm w-full space-y-4">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
                        Everything you need to<br />
                        <span className="text-primary">run your snooker hall.</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                        From live floor management to analytics, dues tracking, and inventory POS — all in one dashboard.
                    </p>
                    <div className="space-y-3 pt-2">
                        {[
                            { icon: 'table_bar', text: 'Live floor with table status & sessions' },
                            { icon: 'analytics', text: 'Revenue, occupancy & session analytics' },
                            { icon: 'group', text: 'Staff management & shift reconciliation' },
                            { icon: 'receipt_long', text: 'Dues, wallets & payment tracking' },
                            { icon: 'inventory_2', text: 'Canteen POS & inventory management' },
                            { icon: 'security', text: 'Fraud detection & audit logs' },
                        ].map(({ icon, text }) => (
                            <div key={text} className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary text-[16px]">{icon}</span>
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{text}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 flex items-center gap-3">
                        <div className="flex -space-x-2">
                            {['R', 'V', 'A'].map(l => (
                                <div key={l} className="size-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white border-2 border-white dark:border-slate-900">{l}</div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            <strong className="text-slate-900 dark:text-white">200+ venues</strong> already manage with CueManager
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
