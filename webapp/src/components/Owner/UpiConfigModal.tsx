import { useState } from 'react';
import { apiFetch } from '../../api/apiClient';

interface UpiConfigModalProps {
    onClose: () => void;
    onSaveSuccess: () => void;
    initialData?: { upiId: string; merchantName: string };
    required?: boolean;
}

export function UpiConfigModal({ onClose, onSaveSuccess, initialData, required }: UpiConfigModalProps) {
    const [upiId, setUpiId] = useState(initialData?.upiId || '');
    const [merchantName, setMerchantName] = useState(initialData?.merchantName || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!upiId.trim() || !merchantName.trim()) {
            setError('Please provide both UPI ID and Merchant Name');
            return;
        }

        setSaving(true);
        setError('');
        try {
            await apiFetch('/upi/config', {
                method: 'PUT',
                body: JSON.stringify({ upiId: upiId.trim(), merchantName: merchantName.trim() }),
            });
            onSaveSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to save UPI config');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={!required ? onClose : undefined}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm mx-4 border border-slate-200 dark:border-slate-800 p-8" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Store UPI Details</h2>
                        <p className="text-slate-500 text-sm">{required ? 'Required for payments' : 'Update your details'}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-red-600 text-sm font-medium">
                            <span className="material-symbols-outlined text-[16px]">error</span>{error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Business UPI ID <span className="text-red-500">*</span>
                        </label>
                        <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)}
                            placeholder="e.g. yourstore@okaxis" required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow"
                            autoFocus />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Registered Merchant Name <span className="text-red-500">*</span>
                        </label>
                        <input type="text" value={merchantName} onChange={e => setMerchantName(e.target.value)} required
                            placeholder="e.g. Master Break Snooker"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow" />
                        <p className="text-[11px] text-slate-400 mt-1">This name appears when customers scan your QR code.</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        {!required && (
                            <button type="button" onClick={onClose} disabled={saving}
                                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                        )}
                        <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving ? <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <span className="material-symbols-outlined text-[18px]">save</span>}
                            Save UPI Config
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
