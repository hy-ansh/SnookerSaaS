import { Link } from 'react-router-dom';
import type { FeatureKey } from '../hooks/useSubscription';
import { useSubscription } from '../hooks/useSubscription';

interface FeatureGateProps {
    feature: FeatureKey;
    children: React.ReactNode;
}

/**
 * FeatureGate — wraps a page or section.
 * If the current subscription plan doesn't include the feature, renders an
 * upgrade prompt. During free trial, all features are accessible.
 */
export default function FeatureGate({ feature, children }: FeatureGateProps) {
    const { hasFeature, isLoading, lifecycle } = useSubscription();

    if (isLoading || lifecycle === 'LOADING') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin size-8 rounded-full border-2 border-slate-200 border-t-primary" />
            </div>
        );
    }

    if (!hasFeature(feature)) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-8">
                <div className="max-w-sm w-full text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-10">
                    <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl text-primary">lock</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                        Feature Locked
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-8">
                        This module is not included in your current subscription plan. Upgrade to unlock it.
                    </p>
                    <Link
                        to="/owner/subscription"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">workspace_premium</span>
                        Upgrade Plan
                    </Link>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
