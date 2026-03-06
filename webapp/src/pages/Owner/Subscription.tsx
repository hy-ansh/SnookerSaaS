import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/apiClient';

interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    adsEnabled: boolean;
    features: Record<string, any>;
}

import { AdBanner } from '../../components/Ads/AdBanner';

export default function OwnerSubscription() {
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
    const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

    const { data: subscription, isLoading, refetch } = useQuery({
        queryKey: ['subscription'],
        queryFn: () => apiFetch('/owner/subscription')
    });

    useEffect(() => {
        // Fetch available plans for the upgrade modal
        const fetchPlans = async () => {
            try {
                // Assuming we'll make a public or owner-scoped endpoint for plans
                const data = await apiFetch('/owner/plans');
                setAvailablePlans(data || []);
            } catch (error) {
                console.error('Failed to load available plans');
            }
        };
        fetchPlans();
    }, []);

    const handleSelectPlan = async (planId: string) => {
        setProcessingPlanId(planId);
        try {
            // We will create this PUT endpoint next
            await apiFetch('/owner/subscription/change', {
                method: 'PUT',
                body: JSON.stringify({ planId })
            });
            await refetch();
            setIsUpgradeModalOpen(false);
        } catch (error) {
            alert('Failed to change subscription plan. Please try again or contact support.');
        } finally {
            setProcessingPlanId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20 animate-pulse text-slate-400 font-bold">
                Loading subscription data...
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">error</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Active Subscription</h2>
                <p className="text-slate-500 max-w-sm mt-2">You currently do not have an active subscription mapped to this workspace. Please contact support.</p>
            </div>
        );
    }

    // derived
    const isPastDue = subscription.status === 'PAST_DUE';
    const isCancelled = subscription.status === 'CANCELED'; // CANCELED in prisma likely based on typical enums

    // Status color mapping
    let statusClass = "bg-green-100 text-green-700 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
    if (isPastDue) statusClass = "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
    if (isCancelled) statusClass = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";

    return (
        <div className="flex flex-col gap-8 h-full font-display pb-10 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manage Subscription</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">View your current plan, billing history, and upcoming invoices</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                        Contact Support
                    </button>
                    {!isCancelled && (
                        <button
                            onClick={() => setIsUpgradeModalOpen(true)}
                            className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:opacity-90 transition-opacity shadow-sm"
                        >
                            Change Plan
                        </button>
                    )}
                </div>
            </div>

            <AdBanner placement="subscription_modal" className="h-24 md:h-32 mb-4" />

            {/* Current Plan Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Plan Card */}
                <div className="lg:col-span-2 bg-slate-900 dark:bg-slate-950 rounded-3xl p-8 relative overflow-hidden shadow-xl border border-slate-800">
                    {/* Decorative Background */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>
                    <div className="absolute right-10 bottom-10 opacity-10 pointer-events-none text-[150px] leading-none material-symbols-outlined">workspace_premium</div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Current Plan</h2>
                                    <h3 className="text-4xl font-black text-white">{subscription.plan?.name || 'Custom Plan'}</h3>
                                </div>
                                <div className={`px-3 py-1 text-xs font-black uppercase tracking-wider border rounded-full ${statusClass}`}>
                                    {subscription.status}
                                </div>
                            </div>

                            <p className="text-slate-300 max-w-sm mb-8 leading-relaxed">
                                You are on the {subscription.plan?.name} tier. You have access to all core POS, Accounting, and Analytics features.
                            </p>

                            <div className="grid grid-cols-2 gap-6 w-full max-w-md">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Billing Cycle</p>
                                    <p className="text-lg font-bold text-white capitalize">{subscription.plan?.interval || 'Monthly'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Period Ends</p>
                                    <p className="text-lg font-bold text-white uppercase">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Amount / Action Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col justify-center text-center items-center">
                    <span className="material-symbols-outlined text-4xl text-primary mb-2 opacity-50">payments</span>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Plan Amount</h3>
                    <div className="text-5xl font-black text-slate-900 dark:text-white mb-2">
                        ₹{Number(subscription.plan?.price || 0).toFixed(2)}
                    </div>
                    <p className="text-sm text-slate-500 mb-8 font-medium">per {subscription.plan?.interval?.toLowerCase() || 'month'}</p>

                    {isPastDue && (
                        <button className="w-full py-3 rounded-xl bg-red-500 text-white font-bold text-sm shadow-md hover:bg-red-600 transition-colors mb-3">
                            Pay Outstanding Balance
                        </button>
                    )}

                    <button className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Update Payment Method
                    </button>
                </div>
            </div>

            {/* Invoices List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Billing History</h3>
                </div>

                {subscription.invoices && subscription.invoices.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {subscription.invoices.map((invoice: any) => (
                            <div key={invoice.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                        <span className="material-symbols-outlined">receipt</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white mb-0.5">₹{Number(invoice.amount).toFixed(2)}</p>
                                        <p className="text-xs font-medium text-slate-500">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border rounded bg-transparent ₹{invoice.status === 'PAID' ? 'text-emerald-500 border-emerald-500/30' : invoice.status === 'OPEN' ? 'text-amber-500 border-amber-500/30' : 'text-slate-500 border-slate-300 dark:border-slate-700'}`}>
                                        {invoice.status}
                                    </span>
                                    <button className="text-primary hover:text-primary/70 font-bold text-sm flex items-center gap-1 transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">download</span> PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3 block">receipt_long</span>
                        <p className="text-slate-500 font-bold">No invoices generated yet.</p>
                    </div>
                )}
            </div>

            {/* Upgrade/Change Plan Modal */}
            {isUpgradeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsUpgradeModalOpen(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 w-full max-w-4xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
                        <div className="text-center max-w-lg mx-auto mb-4">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Select a Subscription Tier</h2>
                            <p className="text-slate-500 font-medium">Choose the plan that best fits your club's size and feature requirements. You can change this at any time.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {availablePlans.map(plan => {
                                const isCurrent = subscription.planId === plan.id || subscription.plan?.name === plan.name;
                                const isProcessing = processingPlanId === plan.id;

                                return (
                                    <div key={plan.id} className={`relative flex flex-col p-6 rounded-3xl border-2 transition-all ${isCurrent ? 'border-primary bg-primary/5 dark:bg-primary/10 scale-105 shadow-xl shadow-primary/10 z-10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/50'}`}>
                                        {isCurrent && (
                                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md">
                                                Active Plan
                                            </div>
                                        )}

                                        <div className="mb-6">
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-black text-slate-900 dark:text-white">₹{Number(plan.price).toFixed(2)}</span>
                                                <span className="text-sm font-bold text-slate-500">/mo</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 mb-6 space-y-1">
                                            {/* Branch Limit */}
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 mb-3">
                                                <span className="material-symbols-outlined text-slate-400 text-base">corporate_fare</span>
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    {(plan.features as any)?.max_branches === 0 ? 'Unlimited Branches' : `Up to ${(plan.features as any)?.max_branches ?? 1} Branch`}
                                                </span>
                                            </div>
                                            {/* Module Rows */}
                                            {([
                                                { key: 'pos', label: 'POS & Inventory', icon: 'point_of_sale' },
                                                { key: 'accounting', label: 'Accounting & Ledger', icon: 'receipt_long' },
                                                { key: 'analytics', label: 'Advanced Analytics', icon: 'analytics' },
                                                { key: 'maintenance', label: 'Asset Maintenance', icon: 'build' },
                                                { key: 'dues_management', label: 'Dues Management', icon: 'account_balance_wallet' },
                                                { key: 'team_management', label: 'Team & Players', icon: 'group_add' },
                                            ] as const).map(({ key, label, icon }) => {
                                                const enabled = !!(plan.features as any)?.[key];
                                                return (
                                                    <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${enabled ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-400 dark:text-slate-600'}`}>
                                                        <span className="material-symbols-outlined text-sm">{enabled ? 'check_circle' : 'cancel'}</span>
                                                        <span className="material-symbols-outlined text-sm">{icon}</span>
                                                        {label}
                                                    </div>
                                                );
                                            })}

                                            {/* Advertisement Support */}
                                            {plan.adsEnabled && (
                                                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10">
                                                    <span className="material-symbols-outlined text-sm">campaign</span>
                                                    Contains Platform Ads
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleSelectPlan(plan.id)}
                                            disabled={isCurrent || isProcessing}
                                            className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center ${isCurrent
                                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                                                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-md'
                                                }`}
                                        >
                                            {isProcessing ? (
                                                <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : isCurrent ? (
                                                'Current Plan'
                                            ) : (
                                                'Select Plan'
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="text-center mt-2">
                            <button onClick={() => setIsUpgradeModalOpen(false)} className="text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                Cancel and return to overview
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
