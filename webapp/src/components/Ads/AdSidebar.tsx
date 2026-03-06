import { useAdvertisements } from '../../hooks/useAdvertisements';

interface AdSidebarProps {
    placement: string;
    className?: string; // Optional wrapper styles
}

export function AdSidebar({ placement = 'dashboard_sidebar', className = '' }: AdSidebarProps) {
    const { ads, loading, hasAds } = useAdvertisements(placement);

    if (loading || !hasAds) return null;

    const ad = ads[0];

    const adContent = (
        <div className={`relative group overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all ${className}`}>
            <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                // The sidebar ad usually has a different aspect ratio, maybe taller
                style={{ minHeight: '120px' }}
                onError={(e) => {
                    (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                }}
            />

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
                className="block outline-none focus:ring-2 focus:ring-primary rounded-2xl focus:ring-offset-2 dark:focus:ring-offset-background-dark mt-4 mx-4"
                title={ad.title}
            >
                {adContent}
            </a>
        );
    }

    return (
        <div className="mt-4 mx-4">
            {adContent}
        </div>
    );
}
