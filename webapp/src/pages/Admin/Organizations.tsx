import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/apiClient';

interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
}

interface Tenant {
    id: string;
    name: string;
    isActive: boolean;
    subscriptionTier: string;
    createdAt: string;
    subscriptions: any[];
    branchCount: number;
    owner: {
        id: string;
        email: string;
        fullName?: string;
        role: string;
    } | null;
}

export default function AdminOrganizations() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modals
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [activeModal, setActiveModal] = useState<'NONE' | 'CHANGE_PLAN' | 'DETAIL'>('NONE');
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [processing, setProcessing] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tenantsData, plansData] = await Promise.all([
                apiFetch('/admin/tenants'),
                apiFetch('/admin/plans')
            ]);
            setTenants(tenantsData || []);
            setPlans(plansData || []);
        } catch (error) {
            console.error('Failed to load CRM data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleToggleStatus = async (tenant: Tenant) => {
        if (!window.confirm(`Are you sure you want to ${tenant.isActive ? 'Suspend' : 'Reactivate'} ${tenant.name}?`)) return;
        try {
            const updated = await apiFetch(`/admin/tenants/${tenant.id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ isActive: !tenant.isActive })
            });
            setTenants(tenants.map(t => t.id === tenant.id ? { ...t, isActive: updated.isActive } : t));
        } catch (error) {
            alert('Failed to update tenant status.');
        }
    };

    const handlePlanChange = async () => {
        if (!selectedTenant || !selectedPlanId) return;
        setProcessing(true);
        try {
            await apiFetch(`/admin/tenants/${selectedTenant.id}/subscription`, {
                method: 'PUT',
                body: JSON.stringify({ planId: selectedPlanId })
            });
            await fetchData();
            setActiveModal('NONE');
        } catch (error) {
            alert('Failed to override subscription plan.');
        } finally {
            setProcessing(false);
        }
    };

    const filtered = tenants.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.owner?.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.owner?.fullName || '').toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 h-full font-display pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Organizations</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} across the platform
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Search by name or owner email…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium outline-none focus:ring-2 focus:ring-primary w-64"
                        />
                    </div>
                    <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Orgs', value: tenants.length, icon: 'corporate_fare', color: 'text-blue-500' },
                    { label: 'Active', value: tenants.filter(t => t.isActive).length, icon: 'check_circle', color: 'text-emerald-500' },
                    { label: 'Subscribed', value: tenants.filter(t => t.subscriptions?.some((s: any) => s.status === 'ACTIVE')).length, icon: 'workspace_premium', color: 'text-primary' }
                ].map(s => (
                    <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
                        <div className={`size-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${s.color}`}>
                            <span className="material-symbols-outlined">{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4 pl-6">Organization</th>
                                <th className="p-4">Owner</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Current Plan</th>
                                <th className="p-4">Branches</th>
                                <th className="p-4">MRR</th>
                                <th className="p-4">Joined</th>
                                <th className="p-4 text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {filtered.map(tenant => {
                                const activeSub = tenant.subscriptions?.find((s: any) => s.status === 'ACTIVE');
                                const currentPlan = activeSub?.plan;

                                return (
                                    <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                        {/* Org Name */}
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm flex-shrink-0">
                                                    {tenant.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{tenant.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono">{tenant.id.slice(0, 8)}…</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Owner */}
                                        <td className="p-4">
                                            {tenant.owner ? (
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{tenant.owner.fullName || '—'}</p>
                                                    <p className="text-[11px] text-slate-400">{tenant.owner.email}</p>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm italic">No owner linked</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="p-4">
                                            {tenant.isActive ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Suspended
                                                </span>
                                            )}
                                        </td>

                                        {/* Plan */}
                                        <td className="p-4">
                                            {currentPlan ? (
                                                <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-black rounded-lg uppercase tracking-wider">
                                                    {currentPlan.name}
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold rounded-lg">
                                                    {tenant.subscriptionTier || 'No Plan'}
                                                </span>
                                            )}
                                        </td>

                                        {/* Branches */}
                                        <td className="p-4">
                                            <span className="flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-300">
                                                <span className="material-symbols-outlined text-base text-slate-400">corporate_fare</span>
                                                {tenant.branchCount ?? 0}
                                            </span>
                                        </td>

                                        {/* MRR */}
                                        <td className="p-4">
                                            <span className="text-sm font-black text-slate-900 dark:text-white">
                                                ₹{currentPlan ? Number(currentPlan.price).toFixed(2) : '0.00'}
                                            </span>
                                        </td>

                                        {/* Joined */}
                                        <td className="p-4">
                                            <span className="text-slate-500 text-sm">{new Date(tenant.createdAt).toLocaleDateString()}</span>
                                        </td>

                                        {/* Actions */}
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => { setSelectedTenant(tenant); setSelectedPlanId(currentPlan?.id || ''); setActiveModal('CHANGE_PLAN'); }}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Change Subscription Plan"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit_document</span>
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(tenant)}
                                                    className={`p-2 rounded-lg transition-colors ${tenant.isActive ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20'}`}
                                                    title={tenant.isActive ? 'Suspend Account' : 'Reactivate Account'}
                                                >
                                                    <span className="material-symbols-outlined text-sm">{tenant.isActive ? 'block' : 'play_circle'}</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-16 text-center">
                                        <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">corporate_fare</span>
                                        <p className="text-slate-500 font-bold">{search ? 'No organizations match your search.' : 'No organizations found.'}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Change Plan Modal */}
            {activeModal === 'CHANGE_PLAN' && selectedTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal('NONE')} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 w-full max-w-sm flex flex-col gap-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Force Plan Change</h2>
                            <p className="text-slate-500 text-sm mt-1">Select a new tier for <strong className="text-slate-700 dark:text-slate-300">{selectedTenant.name}</strong>.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assign Plan</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">workspace_premium</span>
                                <select
                                    value={selectedPlanId}
                                    onChange={e => setSelectedPlanId(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary appearance-none"
                                >
                                    <option value="" disabled>Select a plan</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (₹{Number(p.price)}/mo)</option>
                                    ))}
                                </select>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined pointer-events-none text-sm">expand_more</span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setActiveModal('NONE')} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button
                                onClick={handlePlanChange}
                                disabled={!selectedPlanId || processing}
                                className="flex-1 py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center"
                            >
                                {processing ? <div className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : 'Apply Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
