import { useState, useEffect } from 'react';
import { apiFetch } from '../api/apiClient';
import { useSubscription } from './useSubscription';

export interface AdvertisementData {
    id: string;
    title: string;
    imageUrl: string;
    redirectUrl: string | null;
    priority: number;
}

export function useAdvertisements(placement: string) {
    const [ads, setAds] = useState<AdvertisementData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const { lifecycle, subscription, isLoading: subLoading } = useSubscription();

    useEffect(() => {
        // Don't fetch until we know subscription state
        if (subLoading) return;

        // Determine if ads should be fetched for this tenant based on client awareness
        // The backend enforces it too, but we can save a network call here if we know.
        // A tenant sees ads if:
        // 1. They are in Trial (no active sub, lifecycle = TRIAL)
        // 2. They have a sub but the plan has adsEnabled = true

        let shouldFetch = false;

        if (lifecycle === 'TRIAL') {
            shouldFetch = true;
        } else if (subscription?.plan?.adsEnabled) {
            shouldFetch = true;
        } else if (!subscription) {
            // Unhandled edge case, just try fetching and let the backend decide
            shouldFetch = true;
        }

        if (!shouldFetch) {
            setAds([]);
            setLoading(false);
            return;
        }

        const fetchAds = async () => {
            try {
                setLoading(true);
                // We pass placement as a query param to get filtered results
                const data = await apiFetch(`/owner/ads?placement=${placement}`);
                setAds(data || []);
            } catch (err: any) {
                console.warn('Failed to load advertisements. Failing gracefully.', err);
                setError(err);
                setAds([]); // Fail safe: show no ads
            } finally {
                setLoading(false);
            }
        };

        fetchAds();
    }, [placement, lifecycle, subscription, subLoading]);

    return {
        ads,
        loading,
        error,
        hasAds: ads.length > 0
    };
}
