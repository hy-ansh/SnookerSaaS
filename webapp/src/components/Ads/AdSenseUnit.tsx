import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdFormat = 'horizontal' | 'vertical' | 'rectangle';

interface AdSenseUnitProps {
    /** The ad slot ID from your AdSense dashboard (e.g. "1234567890") */
    adSlot: string;
    /** Ad shape: horizontal (leaderboard), vertical (skyscraper), rectangle (box) */
    adFormat?: AdFormat;
    /** Additional CSS classes for the wrapper */
    className?: string;
    /** Test mode: when true, renders a visible placeholder even without real ads */
    testMode?: boolean;
}

// ─── Format → Style mapping ──────────────────────────────────────────────────

const FORMAT_STYLES: Record<AdFormat, React.CSSProperties> = {
    horizontal: { display: 'block', width: '100%', height: '90px' },
    vertical: { display: 'block', width: '100%', minHeight: '600px' },
    rectangle: { display: 'block', width: '100%', minHeight: '250px' },
};

const FORMAT_RESPONSIVE: Record<AdFormat, string> = {
    horizontal: 'auto',
    vertical: 'auto',
    rectangle: 'rectangle',
};

// ─── Component ───────────────────────────────────────────────────────────────

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

/**
 * Renders a Google AdSense ad unit. Subscription-aware: only renders if
 * the subscription plan has adsEnabled === true or user is in a trial.
 * Fails gracefully — never breaks the surrounding layout.
 */
export default function AdSenseUnit({
    adSlot,
    adFormat = 'horizontal',
    className = '',
    testMode = false,
}: AdSenseUnitProps) {
    const adRef = useRef<HTMLModElement>(null);
    const pushed = useRef(false);
    const location = useLocation();
    const { subscription, lifecycle, isLoading } = useSubscription();

    // ── Determine if ads should be shown ──────────────────────────────────
    const shouldShowAds = (() => {
        if (isLoading) return false;
        // During trial, show ads
        if (lifecycle === 'TRIAL') return true;
        // If subscription explicitly enables ads
        if (subscription?.plan?.adsEnabled) return true;
        // No subscription at all — show ads (free tier)
        if (!subscription?.plan) return true;
        return false;
    })();

    // Don't show ads on player or admin routes
    const isPlayerRoute = location.pathname.startsWith('/player');
    const isAdminRoute = location.pathname.startsWith('/admin');

    // ── Push AdSense on mount ─────────────────────────────────────────────
    useEffect(() => {
        if (!shouldShowAds || isPlayerRoute || isAdminRoute) return;
        if (pushed.current) return;

        try {
            if (typeof window !== 'undefined' && window.adsbygoogle) {
                window.adsbygoogle.push({});
                pushed.current = true;
            }
        } catch (err) {
            // AdSense errors should never crash the app
            console.warn('[AdSense] Failed to push ad:', err);
        }
    }, [shouldShowAds, isPlayerRoute, isAdminRoute]);

    // ── Don't render if ads are not enabled ────────────────────────────────
    if (!shouldShowAds || isPlayerRoute || isAdminRoute) return null;

    const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID || 'ca-pub-8088779829187608';
    const style = FORMAT_STYLES[adFormat];

    return (
        <div
            className={`ad-unit-wrapper overflow-hidden ${className}`}
            aria-label="Advertisement"
            role="complementary"
        >
            {/* Development placeholder when no publisher ID is configured */}
            {(!publisherId || testMode) ? (
                <div
                    className="flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 select-none"
                    style={{
                        ...style,
                        minHeight: style.minHeight || style.height,
                    }}
                >
                    <div className="flex flex-col items-center gap-1.5">
                        <span className="material-symbols-outlined text-2xl opacity-40">campaign</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                            Ad Space — {adFormat}
                        </span>
                    </div>
                </div>
            ) : (
                <ins
                    ref={adRef}
                    className="adsbygoogle"
                    style={style}
                    data-ad-client={publisherId}
                    data-ad-slot={adSlot}
                    data-ad-format={FORMAT_RESPONSIVE[adFormat]}
                    data-full-width-responsive="true"
                />
            )}
        </div>
    );
}
