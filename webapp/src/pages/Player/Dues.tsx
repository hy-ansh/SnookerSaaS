import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../../api/apiClient';
import { CheckoutPaymentModal } from '../../components/Shared/CheckoutPaymentModal';

type DueItem = {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    session?: {
        table?: { nameOrNumber: string };
        branch?: { name: string };
        players?: any[];
    };
};

export default function PlayerDues() {
    const [dues, setDues] = useState<DueItem[]>([]);
    const [totalPending, setTotalPending] = useState(0);
    const [loading, setLoading] = useState(true);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentPayload, setPaymentPayload] = useState<{ amount: number; dueId?: string } | null>(null);

    const fetchMyDues = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/dues/my');
            setDues(data.dues || []);
            setTotalPending(data.totalPending || 0);
        } catch (err: any) {
            console.error('Failed to fetch player dues:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMyDues();
    }, [fetchMyDues]);

    const handlePayAll = () => {
        setPaymentPayload({ amount: totalPending });
        setShowPaymentModal(true);
    };

    const handlePayIndividual = (dueId: string, amount: number) => {
        setPaymentPayload({ amount, dueId });
        setShowPaymentModal(true);
    };

    const handlePaymentConfirm = async (payload: any) => {
        // Player self-checkout mock - in a real app this might trigger a payment gateway or notify staff
        alert(`Payment of ₹${paymentPayload?.amount} via ${payload.method} initiated.\nPlease request staff to verify and settle your dues.`);
        setShowPaymentModal(false);
        setPaymentPayload(null);
    };

    const pendingDues = dues.filter(d => d.status === 'PENDING');
    const settledDues = dues.filter(d => d.status === 'SETTLED');

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="mb-10">
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                    <span className="material-symbols-outlined text-rose-500 text-4xl">receipt_long</span>
                    My Dues
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg mt-2 font-medium">
                    View and manage your pending and past dues.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-1 bg-rose-50 dark:bg-rose-500/10 p-6 rounded-2xl border border-rose-100 dark:border-rose-500/20 flex flex-col justify-center">
                    <p className="text-sm font-bold text-rose-500 uppercase tracking-widest mb-1">Total Pending</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white mb-4">₹{totalPending.toFixed(2)}</p>
                    {/* <button
                        onClick={handlePayAll}
                        disabled={totalPending <= 0}
                        className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                        <span className="material-symbols-outlined">payments</span>
                        Pay All Dues
                    </button> */}
                </div>

                <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="size-12 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined">info</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">How paying dues works</h3>
                            <p className="text-slate-500 text-sm">
                                You can generate a UPI QR code or choose another payment method here. After paying, show the confirmation to the staff to get your dues marked as settled.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <h2 className="font-bold text-slate-900 dark:text-white">Pending Dues ({pendingDues.length})</h2>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-slate-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-3 font-medium">Loading dues...</p>
                    </div>
                ) : pendingDues.length === 0 ? (
                    <div className="p-10 text-center">
                        <span className="material-symbols-outlined text-5xl text-emerald-500 mb-3 block">check_circle</span>
                        <p className="text-slate-600 dark:text-slate-400 font-bold text-lg">You're all clear!</p>
                        <p className="text-slate-500 text-sm">No pending dues to settle.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pendingDues.map(due => (
                            <div key={due.id} className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-xl bg-rose-100 text-rose-500 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-xl">money_off</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">
                                            {due.session?.table?.nameOrNumber
                                                ? `Table ${due.session.table.nameOrNumber} Session`
                                                : 'POS/Walk-in Bill'}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {new Date(due.createdAt).toLocaleString()}
                                            {due.session?.branch && ` • ${due.session.branch.name}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-xl font-black text-rose-500">₹{Number(due.amount).toFixed(2)}</p>
                                        <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">Pending</p>
                                    </div>
                                    {/* <button
                                        onClick={() => handlePayIndividual(due.id, Number(due.amount))}
                                        className="h-10 px-4 bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-200 dark:text-black rounded-lg font-bold text-sm transition-colors cursor-pointer flex items-center gap-2">
                                        Pay
                                    </button> */}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {settledDues.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <h2 className="font-bold text-slate-900 dark:text-white">Past Dues</h2>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {settledDues.map(due => (
                            <div key={due.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-lg">check_circle</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                                            {due.session?.table?.nameOrNumber
                                                ? `Table ${due.session.table.nameOrNumber}`
                                                : 'POS/Walk-in'}
                                        </p>
                                        <p className="text-xs text-slate-500">{new Date(due.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-600 dark:text-slate-300">₹{Number(due.amount).toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showPaymentModal && paymentPayload && (
                <CheckoutPaymentModal
                    isOpen={showPaymentModal}
                    totalAmount={paymentPayload.amount}
                    onClose={() => setShowPaymentModal(false)}
                    onConfirm={handlePaymentConfirm}
                    title={paymentPayload.dueId ? "Pay Individual Due" : "Pay All Dues"}
                />
            )}
        </div>
    );
}