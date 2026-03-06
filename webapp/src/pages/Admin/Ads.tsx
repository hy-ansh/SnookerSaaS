import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/apiClient';

interface SubscriptionPlan {
    id: string;
    name: string;
}

interface AdPlacement {
    id: string;
    placementName: string;
}

interface AdPlanVisibility {
    id: string;
    planId: string | null;
    plan?: SubscriptionPlan;
}

interface Advertisement {
    id: string;
    title: string;
    imageUrl: string;
    redirectUrl: string | null;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
    priority: number;
    placements: AdPlacement[];
    planVisibilities: AdPlanVisibility[];
}

export default function AdminAds() {
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeModal, setActiveModal] = useState<'NONE' | 'CREATE' | 'EDIT'>('NONE');
    const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [redirectUrl, setRedirectUrl] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [priority, setPriority] = useState<number | ''>(0);
    const [placements, setPlacements] = useState<string[]>([]);
    const [planIds, setPlanIds] = useState<string[]>([]); // Empty = Global
    const [processing, setProcessing] = useState(false);

    const AVAILABLE_PLACEMENTS = [
        { id: 'dashboard_top', label: 'Dashboard Top Banner' },
        { id: 'dashboard_sidebar', label: 'Dashboard Sidebar' },
        { id: 'subscription_modal', label: 'Subscription Modal' },
        { id: 'login_screen', label: 'Login Screen' }
    ];

    const fetchAdsAndPlans = async () => {
        setLoading(true);
        try {
            const [adsData, plansData] = await Promise.all([
                apiFetch('/admin/ads'),
                apiFetch('/admin/plans')
            ]);
            setAds(adsData || []);
            setPlans(plansData || []);
        } catch (error) {
            console.error('Failed to load ads/plans:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAdsAndPlans(); }, []);

    const openCreateModal = () => {
        setTitle('');
        setImageUrl('');
        setRedirectUrl('');
        setIsActive(true);
        setStartDate('');
        setEndDate('');
        setPriority(0);
        setPlacements(['dashboard_top']);
        setPlanIds([]);
        setSelectedAd(null);
        setActiveModal('CREATE');
    };

    const formatDateForInput = (dateString: string | null) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toISOString().slice(0, 16); // YYYY-MM-DDThh:mm format for datetime-local
    };

    const openEditModal = (ad: Advertisement) => {
        setSelectedAd(ad);
        setTitle(ad.title);
        setImageUrl(ad.imageUrl);
        setRedirectUrl(ad.redirectUrl || '');
        setIsActive(ad.isActive);
        setStartDate(formatDateForInput(ad.startDate));
        setEndDate(formatDateForInput(ad.endDate));
        setPriority(ad.priority);
        setPlacements(ad.placements.map(p => p.placementName));

        // Handle plan targeting. If there's a visibility with null planId, it's global
        const hasGlobal = ad.planVisibilities.some(v => v.planId === null);
        if (hasGlobal) {
            setPlanIds([]);
        } else {
            setPlanIds(ad.planVisibilities.map(v => v.planId as string));
        }

        setActiveModal('EDIT');
    };

    const handleDeleteAd = async (id: string) => {
        if (!window.confirm('Are you certain you want to delete this advertisement?')) return;
        try {
            await apiFetch(`/admin/ads/${id}`, { method: 'DELETE' });
            setAds(ads.filter(a => a.id !== id));
        } catch (error: any) {
            alert(error.message || 'Failed to delete advertisement.');
        }
    };

    const togglePlacement = (placement: string) => {
        setPlacements(prev =>
            prev.includes(placement)
                ? prev.filter(p => p !== placement)
                : [...prev, placement]
        );
    };

    const togglePlan = (planId: string) => {
        setPlanIds(prev =>
            prev.includes(planId)
                ? prev.filter(p => p !== planId)
                : [...prev, planId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const payload = {
                title,
                imageUrl,
                redirectUrl: redirectUrl || null,
                isActive,
                startDate: startDate || null,
                endDate: endDate || null,
                priority: Number(priority),
                placements,
                planIds // Empty array implies global target in backend logic
            };

            if (activeModal === 'CREATE') {
                const newAd = await apiFetch('/admin/ads', { method: 'POST', body: JSON.stringify(payload) });
                setAds([newAd, ...ads]);
            } else if (activeModal === 'EDIT' && selectedAd) {
                const updatedAd = await apiFetch(`/admin/ads/${selectedAd.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                setAds(ads.map(a => a.id === selectedAd.id ? updatedAd : a));
            }
            setActiveModal('NONE');
        } catch (error: any) {
            alert(error.message || 'Failed to save Advertisement.');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 h-full font-display pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Advertisement Manager</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Control global and targeted tenant advertisements across the platform.</p>
                </div>
                <button onClick={openCreateModal} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md shadow-primary/20 transition-all">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Create Advertisement
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {ads.map(ad => {
                    const isGlobal = ad.planVisibilities.some(v => v.planId === null);

                    return (
                        <div key={ad.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-0 shadow-sm flex flex-col justify-between overflow-hidden">
                            <div className="flex flex-col">
                                {/* Banner Preview Box */}
                                <div className="h-40 w-full bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 relative group overflow-hidden">
                                    <img
                                        src={ad.imageUrl}
                                        alt={ad.title}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                    <div className="hidden absolute inset-0 flex items-center justify-center text-slate-400 font-medium">
                                        <span className="material-symbols-outlined mr-2">broken_image</span> Image failed to load
                                    </div>
                                    {!ad.isActive && (
                                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                                            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">Inactive</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white">{ad.title}</h2>
                                            {ad.redirectUrl && (
                                                <a href={ad.redirectUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate max-w-[250px] inline-block mt-1">
                                                    {ad.redirectUrl}
                                                </a>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Priority</div>
                                            <div className="text-lg font-black text-slate-700 dark:text-slate-300">{ad.priority}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div>
                                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Placements</div>
                                            <div className="flex flex-wrap gap-2">
                                                {ad.placements.length === 0 ? <span className="text-xs text-slate-400 italic">None</span> :
                                                    ad.placements.map(p => (
                                                        <span key={p.id} className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-bold uppercase tracking-wider">
                                                            {p.placementName.replace('_', ' ')}
                                                        </span>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Target Visibility</div>
                                            <div className="flex flex-wrap gap-2">
                                                {isGlobal ? (
                                                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded font-bold uppercase tracking-wider">
                                                        Global (All Enabled)
                                                    </span>
                                                ) : (
                                                    ad.planVisibilities.map(v => (
                                                        <span key={v.id} className="text-[10px] px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded font-bold uppercase tracking-wider">
                                                            {v.plan?.name || 'Unknown Plan'}
                                                        </span>
                                                    ))
                                                )}
                                                {!isGlobal && ad.planVisibilities.length === 0 && <span className="text-xs text-slate-400 italic">No plans targeted</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                                        <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950">
                                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                                            {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'Immediate'}
                                            <span className="mx-1">→</span>
                                            {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Forever'}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <div className="flex gap-2 p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800">
                                <button onClick={() => openEditModal(ad)} className="flex-1 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-sm">edit</span> Edit Ad
                                </button>
                                <button onClick={() => handleDeleteAd(ad.id)} className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/30 transition-colors flex items-center justify-center">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    );
                })}

                {ads.length === 0 && (
                    <div className="col-span-full p-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">campaign</span>
                        <p className="text-slate-500 font-bold text-lg">No Advertisements Configured</p>
                        <p className="text-slate-400 text-sm mt-1 mb-6">Create promotional banners to upsell plans or display sponsor content.</p>
                        <button onClick={openCreateModal} className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20">Create First Ad</button>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {activeModal !== 'NONE' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal('NONE')} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col gap-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                {activeModal === 'CREATE' ? 'Create Advertisement' : `Edit: ${selectedAd?.title}`}
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">Configure advertisement creatives, visibility, and targeting.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* General Information */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">Creative & General</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Advertisement Title (Internal)</label>
                                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Summer Pro Upgrade Promo" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Image URL</label>
                                        <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} required placeholder="https://example.com/banner.jpg" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary" />

                                        {imageUrl && (
                                            <div className="mt-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div className="text-xs text-slate-500 mb-1 font-bold">Preview</div>
                                                <img src={imageUrl} alt="Preview" className="h-24 object-cover rounded shadow-sm w-full" onError={(e) => (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YxZjVmOSI+PC9yZWN0Pjx0ZXh0IHg9IjUwIiB5PSI1MCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk0YTNiOSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiPkludmFsaWQgSW1hZ2UgVVJMPC90ZXh0Pjwvc3ZnPg=='} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Destination Redirect URL (Optional)</label>
                                        <input type="url" value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="https://example.com/checkout" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                </div>
                            </div>

                            {/* Scheduling & Settings */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">Scheduling & Priority</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Start Date</label>
                                        <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display End Date</label>
                                        <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority Weight (Higher shows first)</label>
                                        <input type="number" value={priority} onChange={e => setPriority(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <div className="flex items-center pt-8">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                                            <span className="font-bold text-slate-900 dark:text-white">Active Status</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Placements & Visibility */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">Placements & Targeting</h3>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Target Display Locations</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {AVAILABLE_PLACEMENTS.map(p => (
                                            <label key={p.id} className={`flex items-center gap-3 px-4 py-3 border-2 rounded-xl cursor-pointer transition-all ${placements.includes(p.id) ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                                <input type="checkbox" className="w-4 h-4 text-primary" checked={placements.includes(p.id)} onChange={() => togglePlacement(p.id)} />
                                                <span className={`text-sm font-bold ${placements.includes(p.id) ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{p.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex justify-between items-center">
                                        <span>Target Subscription Plans</span>
                                        {planIds.length > 0 && <button type="button" onClick={() => setPlanIds([])} className="text-primary hover:underline lowercase normal-case">Clear (Make Global)</button>}
                                    </label>
                                    {planIds.length === 0 && (
                                        <div className="mb-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-medium border border-blue-200 dark:border-blue-800">
                                            <span className="material-symbols-outlined text-sm align-middle mr-2">public</span>
                                            This ad will be displayed globally to all plans where ads are enabled.
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        {plans.map(plan => (
                                            <label key={plan.id} className={`flex items-center gap-3 px-4 py-3 border-2 rounded-xl cursor-pointer transition-all ${planIds.includes(plan.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                                <input type="checkbox" className="w-4 h-4 text-blue-500" checked={planIds.includes(plan.id)} onChange={() => togglePlan(plan.id)} />
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold ${planIds.includes(plan.id) ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{plan.name}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                                <button type="button" onClick={() => setActiveModal('NONE')} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center"
                                >
                                    {processing ? <div className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : 'Save Advertisement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
