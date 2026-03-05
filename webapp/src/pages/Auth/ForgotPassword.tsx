import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (err) throw err;
            setSent(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center px-6 py-20 relative overflow-hidden h-full bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 w-full max-w-md">
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-white text-xl">sports_pool</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white text-lg tracking-tight">CueManager</span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl p-8 lg:p-10">
                    {!sent ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                                    <span className="material-symbols-outlined text-3xl">lock_reset</span>
                                </div>
                                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5">Forgot password?</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Enter your email and we'll send a reset link.
                                </p>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-5 text-sm font-medium text-red-700 dark:text-red-400">
                                    <span className="material-symbols-outlined text-[18px]">error</span>{error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">mail</span>
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                            placeholder="you@example.com" autoComplete="email"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading}
                                    className="w-full py-3.5 rounded-xl bg-primary hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2">
                                    {loading ? <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <span className="material-symbols-outlined text-[18px]">send</span>}
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-5">
                                <span className="material-symbols-outlined text-3xl">mark_email_read</span>
                            </div>
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Check your inbox</h2>
                            <p className="text-sm text-slate-500 mb-6">
                                We sent a password reset link to <strong className="text-slate-900 dark:text-white">{email}</strong>
                            </p>
                            <p className="text-xs text-slate-400">Didn't receive it? Check spam or{' '}
                                <button onClick={() => setSent(false)} className="text-primary font-bold hover:underline">try again</button>
                            </p>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-sm text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
