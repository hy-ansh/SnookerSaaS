import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/apiClient';

interface PlanFeatures {
    pos: boolean;
    accounting: boolean;
    analytics: boolean;
    maintenance: boolean;
    dues_management: boolean;
    team_management: boolean;
    max_branches: number; // 0 = unlimited
}

interface SubscriptionPlan {
    id: string;
    name: string;
    type: string;
    billingCycle: string;
    adsEnabled: boolean;
    isActive: boolean;
    price: number;
    features: PlanFeatures;
}

const DEFAULT_FEATURES: PlanFeatures = {
    pos: false,
    accounting: false,
    analytics: false,
    maintenance: false,
    dues_management: false,
    team_management: true,
    max_branches: 1
};

const MODULE_OPTIONS: { key: keyof Omit<PlanFeatures, 'max_branches'>; label: string; icon: string; desc: string }[] = [
    { key: 'pos', label: 'POS & Inventory', icon: 'point_of_sale', desc: 'Canteen & product sales module' },
    { key: 'accounting', label: 'Accounting & Ledger', icon: 'receipt_long', desc: 'Expense tracking & store finance' },
    { key: 'analytics', label: 'Advanced Analytics', icon: 'analytics', desc: 'Heatmaps, revenue trends & insights' },
    { key: 'maintenance', label: 'Asset Maintenance', icon: 'build', desc: 'Table & equipment upkeep tracking' },
    { key: 'dues_management', label: 'Dues Management', icon: 'account_balance_wallet', desc: 'Player credit & dues tracking' },
    { key: 'team_management', label: 'Team & Players', icon: 'group_add', desc: 'Staff onboarding & rosters' },
];

export default function AdminPlans() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeModal, setActiveModal] = useState<'NONE' | 'CREATE' | 'EDIT'>('NONE');
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState('pro');
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [adsEnabled, setAdsEnabled] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [price, setPrice] = useState<number | ''>('');
    const [features, setFeatures] = useState<PlanFeatures>({ ...DEFAULT_FEATURES });
    const [processing, setProcessing] = useState(false);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/admin/plans');
            setPlans(data || []);
        } catch (error) {
            console.error('Failed to load plans:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlans(); }, []);

    const openCreateModal = () => {
        setName('');
        setType('pro');
        setBillingCycle('monthly');
        setAdsEnabled(false);
        setIsActive(true);
        setPrice('');
        setFeatures({ ...DEFAULT_FEATURES });
        setSelectedPlan(null);
        setActiveModal('CREATE');
    };

    const openEditModal = (plan: SubscriptionPlan) => {
        setSelectedPlan(plan);
        setName(plan.name);
        setType(plan.type || 'pro');
        setBillingCycle(plan.billingCycle || 'monthly');
        setAdsEnabled(plan.adsEnabled || false);
        setIsActive(plan.isActive ?? true);
        setPrice(Number(plan.price));
        // Merge stored features with defaults to avoid missing keys
        setFeatures({ ...DEFAULT_FEATURES, ...(plan.features || {}) });
        setActiveModal('EDIT');
    };

    const handleDeletePlan = async (id: string) => {
        if (!window.confirm('Are you certain you want to delete this subscription tier? This action cannot be undone.')) return;
        try {
            await apiFetch(`/admin/plans/${id}`, { method: 'DELETE' });
            setPlans(plans.filter(p => p.id !== id));
        } catch (error: any) {
            alert(error.message || 'Failed to delete plan. Subscriptions may be actively tied to it.');
        }
    };

    const toggleFeature = (key: keyof Omit<PlanFeatures, 'max_branches'>) => {
        setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const payload = { name, type, billingCycle, adsEnabled, isActive, price: Number(price), features };
            if (activeModal === 'CREATE') {
                const newPlan = await apiFetch('/admin/plans', { method: 'POST', body: JSON.stringify(payload) });
                setPlans([...plans, newPlan]);
            } else if (activeModal === 'EDIT' && selectedPlan) {
                const updatedPlan = await apiFetch(`/admin/plans/${selectedPlan.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                setPlans(plans.map(p => p.id === selectedPlan.id ? updatedPlan : p));
            }
            setActiveModal('NONE');
        } catch (error: any) {
            alert(error.message || 'Failed to save plan.');
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
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Subscription Plans</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Define SaaS tiers with structured module access and branch limits.</p>
                </div>
                <button onClick={openCreateModal} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md shadow-primary/20 transition-all">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Create New Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => {
                    const f = plan.features || {} as PlanFeatures;
                    const enabledModules = MODULE_OPTIONS.filter(m => f[m.key]);
                    return (
                        <div key={plan.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    {plan.name}
                                    {!plan.isActive && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md ml-2 uppercase font-bold tracking-widest">Inactive</span>}
                                </h2>
                                <h3 className="text-xl font-black text-primary">₹{Number(plan.price).toFixed(2)}<span className="text-xs text-slate-500 font-bold ml-1">/{plan.billingCycle === 'yearly' ? 'yr' : 'mo'}</span></h3>

                                {/* Branch limit badge */}
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-slate-400 text-base">corporate_fare</span>
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                        {(f as any).max_branches === 0 ? 'Unlimited Branches' : `Up to ₹{(f as any).max_branches ?? 1} Branch₹{(f as any).max_branches > 1 ? 'es' : ''}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-slate-400 text-base">campaign</span>
                                    <span className={`text-sm font-bold ₹{plan.adsEnabled ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {plan.adsEnabled ? 'Ads Displayed' : 'Ad-Free Experience'}
                                    </span>
                                </div>

                                {/* Enabled modules */}
                                <div className="space-y-2">
                                    {MODULE_OPTIONS.map(m => (
                                        <div key={m.key} className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium ₹{f[m.key] ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-400 dark:text-slate-600'}`}>
                                            <span className="material-symbols-outlined text-sm">{f[m.key] ? 'check_circle' : 'cancel'}</span>
                                            {m.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button onClick={() => openEditModal(plan)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                    Edit Plan
                                </button>
                                <button onClick={() => handleDeletePlan(plan.id)} className="px-4 py-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm rounded-xl transition-colors flex items-center justify-center border border-red-500/20">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    );
                })}

                {plans.length === 0 && (
                    <div className="col-span-full p-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">workspace_premium</span>
                        <p className="text-slate-500 font-bold text-lg">No Subscription Plans Configured</p>
                        <p className="text-slate-400 text-sm mt-1 mb-6">Create your first pricing tier to start onboarding tenants.</p>
                        <button onClick={openCreateModal} className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20">Create Starter Plan</button>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {activeModal !== 'NONE' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal('NONE')} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 w-full max-w-2xl my-auto flex flex-col gap-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                {activeModal === 'CREATE' ? 'Deploy New Plan' : `Edit: ${selectedPlan?.name}`}
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">Configure the plan name, price, module access, and branch limits.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name + Price */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Plan Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                        placeholder="e.g. PRO TIER"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly Price (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={price}
                                        onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                        required
                                        placeholder="99.99"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Billing Cycle</label>
                                    <select
                                        value={billingCycle}
                                        onChange={e => setBillingCycle(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary appearance-none"
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Plan Type</label>
                                    <select
                                        value={type}
                                        onChange={e => setType(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary appearance-none"
                                    >
                                        <option value="free">Free / Trial</option>
                                        <option value="pro">Pro / Premium</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-slate-50 dark:bg-slate-800 hover:border-primary/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="w-5 h-5 rounded text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-sm">Active Plan</div>
                                        <div className="text-xs text-slate-500">Available for signups</div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-slate-50 dark:bg-slate-800 hover:border-primary/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={adsEnabled}
                                        onChange={(e) => setAdsEnabled(e.target.checked)}
                                        className="w-5 h-5 rounded text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-sm">Show Ads</div>
                                        <div className="text-xs text-slate-500">Inject banners in UI</div>
                                    </div>
                                </label>
                            </div>

                            {/* Branch Limit */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    <span className="material-symbols-outlined text-sm align-middle mr-1">corporate_fare</span>
                                    Max Branches (0 = Unlimited)
                                </label>
                                <div className="flex items-center gap-3">
                                    {[1, 2, 3, 5, 10, 0].map(n => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setFeatures(f => ({ ...f, max_branches: n }))}
                                            className={`px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${features.max_branches === n ? 'bg-primary text-white border-primary shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary'}`}
                                        >
                                            {n === 0 ? '∞ Unlimited' : n === 1 ? '1 Branch' : `${n} Branches`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Module Toggles */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    <span className="material-symbols-outlined text-sm align-middle mr-1">widgets</span>
                                    Allowed Modules
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {MODULE_OPTIONS.map(({ key, label, icon, desc }) => {
                                        const enabled = features[key];
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => toggleFeature(key)}
                                                className={`group flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${enabled ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/40'}`}
                                            >
                                                <div className={`size-9 rounded-xl flex-shrink-0 flex items-center justify-center transition-colors ${enabled ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined text-base">{icon}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-bold transition-colors ${enabled ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}>{label}</p>
                                                    <p className="text-xs text-slate-400 leading-tight mt-0.5">{desc}</p>
                                                </div>
                                                <span className={`material-symbols-outlined ml-auto mt-0.5 text-base flex-shrink-0 transition-colors ${enabled ? 'text-primary' : 'text-slate-300'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                                    {enabled ? 'check_circle' : 'radio_button_unchecked'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setActiveModal('NONE')} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center"
                                >
                                    {processing ? <div className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : 'Save Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
