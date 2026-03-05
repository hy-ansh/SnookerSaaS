import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

// ─── Feature keys must match the keys used in AdminPlans form ───
export type FeatureKey =
    | 'pos'
    | 'accounting'
    | 'analytics'
    | 'maintenance'
    | 'dues_management'
    | 'team_management';

// All features that exist in the system, keyed to a human label
export const ALL_FEATURES: Record<FeatureKey, { label: string; icon: string; path: string }> = {
    pos: { label: 'POS & Inventory', icon: 'point_of_sale', path: '/owner/pos' },
    accounting: { label: 'Accounting', icon: 'receipt_long', path: '/owner/accounting' },
    analytics: { label: 'Analytics', icon: 'analytics', path: '/owner/analytics' },
    maintenance: { label: 'Asset Maintenance', icon: 'build', path: '/owner/maintenance' },
    dues_management: { label: 'Dues Management', icon: 'account_balance_wallet', path: '/owner/dues' },
    team_management: { label: 'Team & Players', icon: 'group_add', path: '/owner/onboarding' },
};

export type SubLifecycleState = 'LOADING' | 'OK' | 'TRIAL' | 'EXPIRING_SOON' | 'GRACE_PERIOD' | 'LOCKED_OUT';

export interface SubscriptionData {
    status: string;
    orgCreatedAt?: string;
    orgIsActive?: boolean;
    currentPeriodEnd: string | null;
    plan: {
        id?: string;
        name: string;
        price: number;
        interval: string;
        features: Record<string, any>;
    } | null;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function computeLifecycle(sub: SubscriptionData | null | undefined): SubLifecycleState {
    if (!sub) return 'LOADING';

    const now = Date.now();
    const hasActiveSub = sub.status === 'ACTIVE';
    const endDate = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() : null;

    if (hasActiveSub && endDate) {
        const msLeft = endDate - now;
        if (msLeft > TWO_DAYS_MS) return 'OK';
        if (msLeft > 0) return 'EXPIRING_SOON';
        // Subscription expired
        if (now < endDate + THREE_DAYS_MS) return 'GRACE_PERIOD';
        return 'LOCKED_OUT';
    }

    // No active subscription — check free trial window
    if (sub.orgCreatedAt) {
        const created = new Date(sub.orgCreatedAt).getTime();
        if (now < created + THREE_DAYS_MS) return 'TRIAL';
    }

    return 'LOCKED_OUT';
}

export function useSubscription() {
    const { role } = useAuth();
    const isOwner = role === 'STORE_OWNER';

    const { data: subscription, isLoading } = useQuery<SubscriptionData>({
        queryKey: ['subscription'],
        queryFn: () => apiFetch('/owner/subscription'),
        enabled: isOwner,
        staleTime: 60_000,
        retry: false,
    });

    // Compute lifecycle state
    const lifecycle: SubLifecycleState = isLoading ? 'LOADING' : computeLifecycle(subscription);

    // Feature checker — defaults to false (deny) if subscription or plan is missing
    const hasFeature = (key: FeatureKey): boolean => {
        // During trial, grant ALL features so owner can explore
        if (lifecycle === 'TRIAL') return true;
        if (!subscription?.plan?.features) return false;
        return !!subscription.plan.features[key];
    };

    // Days remaining helper
    const daysUntilExpiry = (): number | null => {
        if (!subscription?.currentPeriodEnd) return null;
        const ms = new Date(subscription.currentPeriodEnd).getTime() - Date.now();
        return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    };

    return {
        subscription,
        isLoading,
        lifecycle,
        hasFeature,
        daysUntilExpiry,
    };
}
