import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, type FeatureKey } from '../hooks/useSubscription';
import { AdSidebar } from './Ads/AdSidebar';

// ── Sidebar nav items ─────────────────────────────────────────────
interface NavItem {
    to: string;
    icon: string;
    label: string;
    feature?: FeatureKey;  // If set, item is gated by this plan feature
    exact?: boolean;
}

const OWNER_NAV: NavItem[] = [
    { to: '/owner', icon: 'dashboard', label: 'Store Monitor', exact: true },
    { to: '/owner/pos', icon: 'point_of_sale', label: 'Inventory & POS', feature: 'pos' },
    { to: '/owner/accounting', icon: 'receipt_long', label: 'Accounting', feature: 'accounting' },
    { to: '/owner/analytics', icon: 'analytics', label: 'Analytics', feature: 'analytics' },
    { to: '/owner/maintenance', icon: 'build', label: 'Asset Maintenance', feature: 'maintenance' },
    { to: '/owner/dues', icon: 'account_balance_wallet', label: 'Dues Management', feature: 'dues_management' },
    { to: '/owner/payments', icon: 'payments', label: 'Payments' },
    { to: '/owner/onboarding', icon: 'group_add', label: 'Team & Players', feature: 'team_management' },
    { to: '/owner/settings', icon: 'settings', label: 'Settings' },
];

const STAFF_NAV: NavItem[] = [
    { to: '/staff', icon: 'sensors', label: 'Live Tables', exact: true },
    { to: '/staff/sessions', icon: 'receipt_long', label: 'Session History' },
    { to: '/staff/players', icon: 'leaderboard', label: 'Player Analytics' },
    { to: '/staff/dues', icon: 'account_balance_wallet', label: 'Dues Management' },
    { to: '/staff/pos', icon: 'point_of_sale', label: 'POS Entry', feature: 'pos' },
];

const ADMIN_NAV: NavItem[] = [
    { to: '/admin', icon: 'public', label: 'Global Metrics', exact: true },
    { to: '/admin/organizations', icon: 'corporate_fare', label: 'Organizations' },
    { to: '/admin/plans', icon: 'workspace_premium', label: 'Subscription Plans' },
    { to: '/admin/ads', icon: 'campaign', label: 'Advertisements' },
    { to: '/admin/settings', icon: 'settings', label: 'Settings' },
];

const PLAYER_NAV: NavItem[] = [
    { to: '/player', icon: 'dashboard', label: 'Dashboard', exact: true },
    { to: '/player/matches', icon: 'history', label: 'Session History' },
    { to: '/player/dues', icon: 'account_balance', label: 'My Dues' },
    { to: '/player/leaderboard', icon: 'leaderboard', label: 'Leaderboard' },
    { to: '/player/wallet', icon: 'account_balance_wallet', label: 'Wallet' },
];

// ── Sub-components ────────────────────────────────────────────────
function LockedNavItem({ item }: { item: NavItem }) {
    return (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-slate-400 dark:text-slate-600 cursor-not-allowed select-none opacity-60">
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span>{item.label}</span>
            </div>
            <span className="material-symbols-outlined text-sm">lock</span>
        </div>
    );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
    return (
        <Link
            to={item.to}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
        >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            {item.label}
        </Link>
    );
}

function NavSection({ items, pathname }: { items: NavItem[]; pathname: string }) {
    const { hasFeature, lifecycle } = useSubscription();

    return (
        <>
            {items.map(item => {
                const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                // Gate feature items — but allow during TRIAL
                if (item.feature && lifecycle !== 'LOADING' && !hasFeature(item.feature)) {
                    return <LockedNavItem key={item.to} item={item} />;
                }
                return <NavLink key={item.to} item={item} isActive={isActive} />;
            })}
        </>
    );
}

// ── Main Sidebar ──────────────────────────────────────────────────
export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { appUser, signOut } = useAuth();
    const { lifecycle, subscription } = useSubscription();

    const isSuperAdmin = location.pathname.startsWith('/admin');
    const isOwner = location.pathname.startsWith('/owner');
    const isStaff = location.pathname.startsWith('/staff');
    const isPlayer = location.pathname.startsWith('/player');

    const isOwnerRole = appUser?.role === 'STORE_OWNER' || appUser?.role === 'ADMIN';

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const initials = (appUser?.fullName?.charAt(0) ?? appUser?.email?.charAt(0) ?? 'U').toUpperCase();

    return (
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex flex-col fixed h-full z-20">
            {/* Logo / Brand */}
            <div className="p-6 flex items-center gap-3">
                <div className="bg-primary text-white p-1.5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl">sports_pool</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate" title={appUser?.organizationName || 'CueManager'}>
                    {appUser?.organizationName || 'CueManager'}
                </h2>
            </div>

            {/* Free trial badge */}
            {isOwner && lifecycle === 'TRIAL' && (
                <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-amber-500">timer</span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Free Trial Active</span>
                </div>
            )}
            {isOwner && lifecycle === 'EXPIRING_SOON' && (
                <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-red-500">warning</span>
                    <span className="text-xs font-bold text-red-700 dark:text-red-400">Subscription expiring soon</span>
                </div>
            )}
            {isOwner && lifecycle === 'GRACE_PERIOD' && (
                <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-orange-500">hourglass_bottom</span>
                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400">Grace period — renew now</span>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">

                {isSuperAdmin && (
                    <NavSection items={ADMIN_NAV} pathname={location.pathname} />
                )}

                {isOwner && (
                    <>
                        <NavSection items={OWNER_NAV} pathname={location.pathname} />
                        <div className="px-4 py-3 mt-1">
                            <div className="h-px bg-slate-100 dark:bg-slate-800" />
                        </div>
                        <Link
                            to="/owner/subscription"
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/owner/subscription'
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="material-symbols-outlined text-xl">card_membership</span>
                            My Subscription
                            {lifecycle === 'OK' && subscription?.plan && (
                                <span className="ml-auto text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                                    {subscription.plan.name}
                                </span>
                            )}
                        </Link>
                    </>
                )}

                {isStaff && (
                    <>
                        {isOwnerRole && (
                            <Link
                                to="/owner"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2 border border-dashed border-slate-200 dark:border-slate-700"
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                <span className="text-sm">Owner Dashboard</span>
                            </Link>
                        )}
                        <NavSection items={STAFF_NAV} pathname={location.pathname} />
                    </>
                )}

                {isPlayer && (
                    <NavSection items={PLAYER_NAV} pathname={location.pathname} />
                )}
            </nav>

            {/* Sub/Free Trial Ads */}
            <AdSidebar placement="dashboard_sidebar" className="mb-4" />

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                {isOwner && isOwnerRole && (
                    <Link
                        to="/staff"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors text-sm font-bold"
                    >
                        <span className="material-symbols-outlined text-sm">manage_accounts</span>
                        Staff Controls
                    </Link>
                )}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
                    <div className="size-10 rounded-full border border-slate-200 dark:border-slate-700 bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{appUser?.fullName || 'User'}</p>
                        <p className="text-xs text-slate-500 truncate uppercase mt-0.5">{appUser?.role?.replace(/_/g, ' ') || 'Guest'}</p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-sm font-bold border border-rose-200 dark:border-rose-800/40"
                >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
