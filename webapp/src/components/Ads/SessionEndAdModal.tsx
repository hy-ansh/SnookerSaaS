import { useState, useEffect, useCallback } from 'react';
import AdSenseUnit from './AdSenseUnit';
import { useSubscription } from '../../hooks/useSubscription';

interface SessionEndAdModalProps {
    /** Whether the modal is visible */
    isOpen: boolean;
    /** Called when the ad is dismissed (countdown finished or skip clicked) */
    onDismiss: () => void;
    /** Countdown duration in seconds before auto-dismiss (default: 5) */
    countdownSeconds?: number;
}

/**
 * Full-screen interstitial ad modal shown after a session ends.
 * Features a countdown auto-dismiss and a "Skip Ad" button.
 * Renders an AdSense rectangle ad unit in the center.
 */
export default function SessionEndAdModal({
    isOpen,
    onDismiss,
    countdownSeconds = 5,
}: SessionEndAdModalProps) {
    const [remaining, setRemaining] = useState(countdownSeconds);

    // Reset countdown when modal opens
    useEffect(() => {
        if (isOpen) {
            setRemaining(countdownSeconds);
        }
    }, [isOpen, countdownSeconds]);

    // Countdown timer
    useEffect(() => {
        if (!isOpen) return;
        if (remaining <= 0) {
            onDismiss();
            return;
        }
        const timer = setTimeout(() => setRemaining(r => r - 1), 1000);
        return () => clearTimeout(timer);
    }, [isOpen, remaining, onDismiss]);

    const { subscription, lifecycle, isLoading } = useSubscription();

    const isAdsEnabled = (() => {
        if (isLoading) return true; // Default to true while loading to prevent premature skips
        if (lifecycle === 'TRIAL') return true;
        if (subscription?.plan?.adsEnabled) return true;
        if (!subscription?.plan) return true;
        return false;
    })();

    // Auto-dismiss immediately if ads are disabled
    useEffect(() => {
        if (isOpen && !isLoading && !isAdsEnabled) {
            onDismiss();
        }
    }, [isOpen, isLoading, isAdsEnabled, onDismiss]);

    const handleSkip = useCallback(() => {
        onDismiss();
    }, [onDismiss]);

    if (!isOpen || !isAdsEnabled) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            {/* Content */}
            <div className="relative w-full max-w-lg mx-4 animate-in fade-in">

                {/* Close / Skip controls */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-white/60">
                        <span className="material-symbols-outlined text-sm">campaign</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Sponsored</span>
                    </div>

                    <button
                        onClick={handleSkip}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors backdrop-blur-sm border border-white/10"
                    >
                        {remaining > 0 ? (
                            <>
                                <span className="text-white/70">Skip in</span>
                                <span className="size-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-black tabular-nums">
                                    {remaining}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-sm">close</span>
                                Skip Ad
                            </>
                        )}
                    </button>
                </div>

                {/* Ad Container */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6">
                        <AdSenseUnit
                            adSlot="session_end_interstitial"
                            adFormat="rectangle"
                            className="min-h-[250px]"
                        />
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white/40 rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${((countdownSeconds - remaining) / countdownSeconds) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
