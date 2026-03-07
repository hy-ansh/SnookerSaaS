import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/apiClient';

const MODULE_OPTIONS = [
    { key: 'pos', label: 'POS & Inventory', icon: 'point_of_sale' },
    { key: 'accounting', label: 'Accounting', icon: 'receipt_long' },
    { key: 'analytics', label: 'Analytics', icon: 'analytics' },
    { key: 'maintenance', label: 'Maintenance', icon: 'build' },
    { key: 'dues_management', label: 'Dues Mgmt', icon: 'account_balance_wallet' },
    { key: 'team_management', label: 'Team & Players', icon: 'group_add' },
];

export default function AdminSettings() {
    const [freeTrialDays, setFreeTrialDays] = useState<number>(3);
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

    const { data: plans = [], isLoading: loadingPlans } = useQuery({
        queryKey: ['adminPlans'],
        queryFn: () => apiFetch('/admin/plans')
    });

    const { data: tenants = [], isLoading: loadingTenants } = useQuery({
        queryKey: ['adminTenants'],
        queryFn: () => apiFetch('/admin/tenants')
    });

    const { data: settings } = useQuery({
        queryKey: ['adminSettings'],
        queryFn: () => apiFetch('/admin/settings')
    });

    useEffect(() => {
        if (settings?.freeTrialDays !== undefined) {
            setFreeTrialDays(settings.freeTrialDays);
        }
    }, [settings]);

    const handleSaveGlobalSettings = async () => {
        setSavingSettings(true);
        setSettingsSuccess(null);
        try {
            await apiFetch('/admin/settings', {
                method: 'PUT',
                body: JSON.stringify({ freeTrialDays })
            });
            setSettingsSuccess('Global platform settings updated');
            setTimeout(() => setSettingsSuccess(null), 3000);
        } catch (err: any) {
            console.error('Failed to update global settings', err);
        } finally {
            setSavingSettings(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 h-full font-display pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Global System Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Overview of SaaS tiers and active platform tenants</p>
                </div>
            </div>

            {/* Global Properties Settings Panel */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">public</span>
                            Platform Tuning
                        </h2>
                        <p className="text-sm text-slate-500 max-w-2xl mt-1">Configure global platform-wide variables that apply to all tenants.</p>
                    </div>
                    {settingsSuccess && (
                        <span className="text-xs font-bold px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 rounded-lg flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            {settingsSuccess}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Free Trial Duration</label>
                        <div className="relative">
                            <input
                                type="number"
                                min={0}
                                value={freeTrialDays}
                                onChange={(e) => setFreeTrialDays(parseInt(e.target.value) || 0)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500">Days</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Total number of days new tenants securely receive all pro features for free before being locked out.</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSaveGlobalSettings}
                        disabled={savingSettings || (settings?.freeTrialDays === freeTrialDays)}
                        className={`px-6 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${savingSettings || (settings?.freeTrialDays === freeTrialDays)
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                            : 'bg-primary text-white hover:-translate-y-0.5 shadow-md shadow-primary/20'
                            }`}
                    >
                        {savingSettings ? (
                            <><span className="material-symbols-outlined text-sm animate-spin">sync</span> Saving...</>
                        ) : (
                            <><span className="material-symbols-outlined text-sm">save</span> Save Changes</>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                {/* Subscription Plans — read-only overview, managed at /admin/plans */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">workspace_premium</span>
                            Subscription Plans
                        </h2>
                        <Link
                            to="/admin/plans"
                            className="text-xs font-bold px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                            Manage Plans
                        </Link>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[500px] p-4 flex flex-col gap-3">
                        {loadingPlans ? (
                            <div className="text-center text-slate-500 font-bold animate-pulse py-10">Loading plans...</div>
                        ) : plans.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 gap-4">
                                <span className="material-symbols-outlined text-5xl text-slate-300">workspace_premium</span>
                                <p className="text-slate-500 font-bold">No subscription plans yet.</p>
                                <Link to="/admin/plans" className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity">
                                    Create First Plan
                                </Link>
                            </div>
                        ) : (
                            (plans || []).map((p: any) => {
                                const f = p.features || {};
                                const maxBranches = f.max_branches;
                                return (
                                    <div key={p.id} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/20 flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">{p.name}</h3>
                                            <span className="text-xl font-black text-primary">₹{Number(p.price).toFixed(2)}<span className="text-xs text-slate-500 font-bold ml-0.5">/mo</span></span>
                                        </div>
                                        {/* Branch badge */}
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                                            <span className="material-symbols-outlined text-sm">corporate_fare</span>
                                            {maxBranches === 0 ? 'Unlimited Branches' : `Up to ${maxBranches ?? 1} Branch`}
                                        </div>
                                        {/* Module chips */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {MODULE_OPTIONS.map(m => {
                                                const on = !!f[m.key];
                                                return (
                                                    <span key={m.key} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${on ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 line-through'}`}>
                                                        <span className="material-symbols-outlined text-[10px]">{on ? 'check' : 'close'}</span>
                                                        {m.label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Active Tenants List */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">storefront</span>
                            Active Tenants
                        </h2>
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs rounded-full">{tenants.length} Total</span>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-slate-100 dark:divide-slate-800/50">
                        {loadingTenants ? (
                            <div className="text-center text-slate-500 font-bold animate-pulse py-10">Loading tenants...</div>
                        ) : tenants.length === 0 ? (
                            <div className="text-center text-slate-500 py-10 font-bold">No tenants found across the platform.</div>
                        ) : (
                            (tenants || []).map((tenant: any) => {
                                const activeSub = tenant.subscriptions?.find((s: any) => s.status === 'ACTIVE') || tenant.subscriptions?.[0];
                                const isActive = tenant.isActive !== false;

                                return (
                                    <div key={tenant.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                                                <span className="material-symbols-outlined text-xl">database</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-slate-900 dark:text-white tracking-tight">{tenant.name}</h3>
                                                    {!isActive && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">Paused</span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">ID: <span className="font-mono">{tenant.id.slice(0, 12)}…</span></p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {activeSub ? (
                                                <>
                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded border border-emerald-200 dark:border-emerald-500/30">
                                                        {activeSub.plan?.name || tenant.subscriptionTier}
                                                    </span>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Ends {new Date(activeSub.currentPeriodEnd).toLocaleDateString()}</p>
                                                </>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider rounded border border-slate-200 dark:border-slate-700">
                                                    {tenant.subscriptionTier || 'No Plan'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
