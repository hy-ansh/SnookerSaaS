import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';
import AdSenseUnit from '../components/Ads/AdSenseUnit';
import { useSubscription } from '../hooks/useSubscription';

// Basic Error Boundary to prevent full white screens
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 m-8 border-2 border-red-500 bg-red-50 text-red-900 rounded-2xl">
                    <h2 className="text-xl font-bold mb-4">Dashboard Component Crashed</h2>
                    <pre className="text-sm overflow-auto p-4 bg-white/50 rounded">{this.state.error?.message}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function DashboardLayout() {
    const location = useLocation();
    const { subscription, lifecycle, isLoading } = useSubscription();

    // ── Determine if ads should be shown based on subscription ─────────────
    const isAdsEnabled = (() => {
        if (isLoading) return false; // Prevent layout shifts during load
        if (lifecycle === 'TRIAL') return true;
        if (subscription?.plan?.adsEnabled) return true;
        if (!subscription?.plan) return true; // Default to showing ads for free/no plan
        return false;
    })();

    // Only show ads on Owner and Staff routes AND if the plan allows it
    const isOwnerRoute = location.pathname.startsWith('/owner');
    const isStaffRoute = location.pathname.startsWith('/staff');
    const showAds = (isOwnerRoute || isStaffRoute) && isAdsEnabled;

    return (
        <div className="relative flex h-auto min-h-screen w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar />
            <main className="flex-1 ml-64 min-h-screen flex flex-col">
                <DashboardHeader />

                {/* ── Top Ad Banner ──────────────────────────────────────── */}
                {showAds && (
                    <div className="px-8 pt-4">
                        <AdSenseUnit
                            adSlot="top_banner"
                            adFormat="horizontal"
                            className="rounded-xl"
                        />
                    </div>
                )}

                {/* ── Main Content + Right Ad Panel ─────────────────────── */}
                <div className={`flex flex-1 ${showAds ? 'gap-4' : ''}`}>
                    {/* Page content */}
                    <div className={`flex-1 p-8 min-w-0 ${showAds ? 'pr-2' : ''}`}>
                        <ErrorBoundary>
                            <Outlet />
                        </ErrorBoundary>
                    </div>

                    {/* ── Right Ad Panel (sidebar) ──────────────────────── */}
                    {showAds && (
                        <aside className="w-[200px] xl:w-[260px] shrink-0 py-8 pr-6 hidden lg:flex flex-col gap-5">
                            <AdSenseUnit
                                adSlot="right_panel_1"
                                adFormat="rectangle"
                                className="rounded-xl sticky top-24"
                            />
                            <AdSenseUnit
                                adSlot="right_panel_2"
                                adFormat="vertical"
                                className="rounded-xl"
                            />
                        </aside>
                    )}
                </div>

                {/* ── Bottom Ad Banner ──────────────────────────────────── */}
                {showAds && (
                    <div className="px-8 pb-6">
                        <AdSenseUnit
                            adSlot="bottom_banner"
                            adFormat="horizontal"
                            className="rounded-xl"
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
