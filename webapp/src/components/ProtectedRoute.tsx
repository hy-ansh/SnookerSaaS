import { useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { AppRole } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

function roleHome(role: AppRole | null): string {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin';
    if (role === 'STORE_OWNER') return '/owner';
    if (role === 'STAFF') return '/staff';
    return '/player';
}

// ── Modals & Screens ──────────────────────────────────────────────

function LoadingScreen() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-white">sports_pool</span>
            </div>
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-primary" />
            <p className="text-xs text-slate-400 font-medium">Loading session…</p>
        </div>
    );
}

function SuspendedScreen() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-10">
                <div className="size-20 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl text-red-500">block</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Account Suspended</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto mb-8 leading-relaxed">
                    Your organization's account has been suspended by the platform administrators. Contact support to restore access.
                </p>
                <button
                    onClick={() => window.location.href = '/login'}
                    className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
}

function LockedOutScreen({ isGracePeriod }: { isGracePeriod: boolean }) {
    const navigate = useNavigate();
    const { signOut } = useAuth();

    const handleSignOut = async () => { await signOut(); navigate('/login'); };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6 text-center">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-10">
                <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-5xl text-primary">workspace_premium</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
                    {isGracePeriod ? 'Grace Period Expired' : 'Subscription Required'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
                    {isGracePeriod
                        ? 'Your 3-day grace period has ended. Subscribe to a plan to resume access.'
                        : 'Your free trial has ended. Choose a plan to unlock your venue management tools.'}
                </p>
                <button
                    onClick={() => navigate('/owner/subscription')}
                    className="w-full py-4 rounded-xl font-black text-white bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 transition-all text-lg mb-3"
                >
                    View Subscription Plans
                </button>
                <button onClick={handleSignOut} className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    Sign Out
                </button>
            </div>
        </div>
    );
}

function ExpiringWarningModal({ daysLeft, onDismiss }: { daysLeft: number; onDismiss: () => void }) {
    const navigate = useNavigate();
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700/50 p-10 w-full max-w-md text-center">
                <div className="size-20 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl text-amber-500">notification_important</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Subscription Expiring Soon</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">
                    Your subscription expires in{' '}
                    <strong className="text-amber-600 dark:text-amber-400 text-lg">{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.
                    {' '}Renew now to avoid service interruption.
                </p>
                <div className="flex gap-3">
                    <button onClick={onDismiss} className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">
                        Remind Me Later
                    </button>
                    <button onClick={() => navigate('/owner/subscription')} className="flex-1 py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/30 transition-all">
                        Renew Plan
                    </button>
                </div>
            </div>
        </div>
    );
}

function GracePeriodBanner() {
    const navigate = useNavigate();
    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white text-center py-2 px-4 text-sm font-bold flex items-center justify-center gap-3">
            <span className="material-symbols-outlined text-base">hourglass_bottom</span>
            You are in a grace period. Your service will stop soon.
            <button onClick={() => navigate('/owner/subscription')} className="underline font-black ml-2">
                Renew Now →
            </button>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────

// Session-storage key to persist warning dismissal per browser session
const WARNING_DISMISSED_KEY = 'sub_warning_dismissed';

export default function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
    const { session, role, loading, appUser } = useAuth();
    const { subscription, isLoading: subLoading, lifecycle, daysUntilExpiry } = useSubscription();
    const location = useLocation();
    const navigate = useNavigate();

    // Track dismissal in component state (won't reset on route change, only on refresh)
    const [warningDismissed, setWarningDismissed] = useState<boolean>(
        () => sessionStorage.getItem(WARNING_DISMISSED_KEY) === '1'
    );

    const dismissWarning = () => {
        sessionStorage.setItem(WARNING_DISMISSED_KEY, '1');
        setWarningDismissed(true);
        navigate(location.pathname);
    };

    // 1. Auth loading
    if (loading) return <LoadingScreen />;

    // 2. Not authenticated
    if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

    // 3. Wrong role → redirect to home
    if (allowedRoles && role && !allowedRoles.includes(role)) {
        return <Navigate to={roleHome(role)} replace />;
    }

    // 4. Account suspended check (for non-admin users)
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        const orgIsActive = (subscription as any)?.orgIsActive ?? (appUser as any)?.orgIsActive;
        if (orgIsActive === false) {
            return <SuspendedScreen />;
        }
    }

    // 5. Subscription lifecycle enforcement — only for Store Owners
    if (role === 'STORE_OWNER' && !subLoading && lifecycle !== 'LOADING') {
        const isOnSubPage = location.pathname === '/owner/subscription';

        if (lifecycle === 'LOCKED_OUT' && !isOnSubPage) {
            const hadSub = !!(subscription?.currentPeriodEnd);
            return <LockedOutScreen isGracePeriod={hadSub} />;
        }

        if (lifecycle === 'GRACE_PERIOD') {
            // Allow navigation but show top banner
            return (
                <>
                    <GracePeriodBanner />
                    <div style={{ paddingTop: '2.5rem' }}>
                        <Outlet />
                    </div>
                </>
            );
        }

        if (lifecycle === 'EXPIRING_SOON' && !isOnSubPage && !warningDismissed) {
            const days = daysUntilExpiry() ?? 1;
            return (
                <>
                    <ExpiringWarningModal daysLeft={days} onDismiss={dismissWarning} />
                    <Outlet />
                </>
            );
        }
    }

    return <Outlet />;
}
