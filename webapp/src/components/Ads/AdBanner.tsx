import { useAdvertisements } from '../../hooks/useAdvertisements';

interface AdBannerProps {
    placement: string;
    className?: string; // Optional wrapper styles
}

export function AdBanner({ placement, className = '' }: AdBannerProps) {
    const { ads, loading, hasAds } = useAdvertisements(placement);

    // Fail safe: if loading, or no ads, or error occurred, render nothing to avoid breaking UI layout
    if (loading || !hasAds) {
        return null;
    }

    // Usually, ads are sorted by priority. We'll show the top ad.
    // In a more complex system, we'd cycle through them or use a carousel.
    const ad = ads[0];

    const adContent = (
        <div className={`relative group overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all ${className}`}>
            <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                    // Hide entirely if image fails to load
                    (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                }}
            />

            {/* Overlay gradient indicating it's an ad */}
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 backdrop-blur-sm text-white/90 text-[10px] uppercase tracking-widest font-bold rounded">
                Sponsored
            </div>

            <div className="absolute inset-0 bg-transparent group-hover:bg-primary/5 transition-colors pointer-events-none" />
        </div>
    );

    if (ad.redirectUrl) {
        return (
            <a
                href={ad.redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block outline-none focus:ring-2 focus:ring-primary rounded-2xl focus:ring-offset-2 dark:focus:ring-offset-background-dark"
                title={ad.title}
            >
                {adContent}
            </a>
        );
    }

    return adContent;
}
