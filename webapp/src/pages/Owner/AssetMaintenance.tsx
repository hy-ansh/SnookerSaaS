import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../api/apiClient';
import FeatureGate from '../../components/FeatureGate';

function AssetMaintenanceContent() {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [newAsset, setNewAsset] = useState({ assetName: '', cost: '', nextDueDate: '' });

    const { data: assets = [], isLoading } = useQuery({
        queryKey: ['assetMaintenance'],
        queryFn: () => apiFetch('/maintenance')
    });

    const addMutation = useMutation({
        mutationFn: (newRecord: any) => apiFetch('/maintenance', {
            method: 'POST',
            body: JSON.stringify(newRecord)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assetMaintenance'] });
            setIsAdding(false);
            setNewAsset({ assetName: '', cost: '', nextDueDate: '' });
        }
    });

    const handleAddAsset = () => {
        if (!newAsset.assetName || !newAsset.cost) return;
        addMutation.mutate({
            assetName: newAsset.assetName,
            cost: Number(newAsset.cost),
            nextDueDate: newAsset.nextDueDate || null
        });
    };

    return (
        <div className="flex flex-col gap-8 h-full font-display">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Asset Maintenance</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Track operational costs and maintenance schedules</p>
                </div>
                <div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:opacity-90 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-sm">add</span> Add Maintenance Record
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Record New Maintenance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Asset / Task Name</label>
                            <input
                                type="text"
                                value={newAsset.assetName}
                                onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}
                                placeholder="e.g. Table Cloth Replacement"
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cost (₹)</label>
                            <input
                                type="number"
                                value={newAsset.cost}
                                onChange={(e) => setNewAsset({ ...newAsset, cost: e.target.value })}
                                placeholder="0.00"
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Next Due Date (Optional)</label>
                            <input
                                type="date"
                                value={newAsset.nextDueDate}
                                onChange={(e) => setNewAsset({ ...newAsset, nextDueDate: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setIsAdding(false)} disabled={addMutation.isPending} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">Cancel</button>
                        <button onClick={handleAddAsset} disabled={addMutation.isPending} className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                            {addMutation.isPending ? 'Saving...' : 'Save Record'}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="p-4">Asset / Task</th>
                            <th className="p-4">Cost</th>
                            <th className="p-4">Performed Date</th>
                            <th className="p-4">Next Due Date</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500 font-bold animate-pulse">Loading records...</td>
                            </tr>
                        ) : assets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-4xl opacity-50">hardware</span>
                                    <p className="font-bold">No maintenance records found</p>
                                </td>
                            </tr>
                        ) : assets.map((asset: any) => {
                            const isOverdue = asset.nextDueDate && new Date(asset.nextDueDate) < new Date();
                            const isComingUp = asset.nextDueDate && new Date(asset.nextDueDate) < new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // within 14 days

                            let statusBadge = <span className="px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded text-[10px] font-bold">OK</span>;
                            if (asset.nextDueDate) {
                                if (isOverdue) statusBadge = <span className="px-2 py-1 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded text-[10px] font-bold">OVERDUE</span>;
                                else if (isComingUp) statusBadge = <span className="px-2 py-1 bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 rounded text-[10px] font-bold">UPCOMING</span>;
                            }

                            return (
                                <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="p-4">
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{asset.assetName}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">₹{Number(asset.cost).toFixed(2)}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm font-medium text-slate-500">{new Date(asset.performedAt).toLocaleDateString()}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm font-medium text-slate-500">{asset.nextDueDate ? new Date(asset.nextDueDate).toLocaleDateString() : '-'}</span>
                                    </td>
                                    <td className="p-4">
                                        {statusBadge}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function AssetMaintenance() {
    return (
        <FeatureGate feature="maintenance">
            <AssetMaintenanceContent />
        </FeatureGate>
    );
}
