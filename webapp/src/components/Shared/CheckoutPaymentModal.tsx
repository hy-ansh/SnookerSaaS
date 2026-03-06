import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UpiQrCode } from './UpiQrCode';
import type { CheckoutPayload } from '../../api/sessions';

type PayMode = 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'DUES' | 'SPLIT';

interface CheckoutPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    title?: string;
    subtitle?: string;
    // Optional, if used for split payments
    players?: any[];
    // Initial payload collected before payment method selection (e.g. from POS cart or Session Checkout)
    initialPayload?: any;
    onConfirm: (payload: any) => Promise<void>;
}

export function CheckoutPaymentModal({
    isOpen,
    onClose,
    totalAmount,
    title = 'Checkout',
    subtitle,
    players = [],
    initialPayload = {},
    onConfirm,
}: CheckoutPaymentModalProps) {
    const { appUser } = useAuth();

    // Fallback to default methods if not specified by org
    const allowedMethods = appUser?.allowedPaymentMethods || ['CASH', 'UPI', 'CARD', 'WALLET'];

    // Always include DUES, and maybe SPLIT
    const isSplitEligible = players.length > 1;

    // Build the dynamic payment options list
    const PAY_OPTIONS: { value: PayMode; label: string; icon: string; color: string }[] = [];

    if (allowedMethods.includes('CASH')) PAY_OPTIONS.push({ value: 'CASH', label: 'Cash', icon: 'payments', color: 'text-emerald-600' });
    if (allowedMethods.includes('CARD')) PAY_OPTIONS.push({ value: 'CARD', label: 'Card', icon: 'credit_card', color: 'text-blue-600' });
    if (allowedMethods.includes('UPI')) PAY_OPTIONS.push({ value: 'UPI', label: 'UPI', icon: 'qr_code_scanner', color: 'text-violet-600' });
    if (allowedMethods.includes('WALLET')) PAY_OPTIONS.push({ value: 'WALLET', label: 'Wallet', icon: 'account_balance_wallet', color: 'text-amber-600' });

    // Add DUES for player tracking
    PAY_OPTIONS.push({ value: 'DUES', label: 'Add to Dues', icon: 'account_balance', color: 'text-red-500' });
    if (isSplitEligible) PAY_OPTIONS.push({ value: 'SPLIT', label: 'Split Payments', icon: 'call_split', color: 'text-indigo-600' });

    const [mode, setMode] = useState<PayMode>(PAY_OPTIONS[0]?.value || 'CASH');
    const [submitting, setSubmitting] = useState(false);

    // Split State
    const [splitModes, setSplitModes] = useState<Record<string, PayMode>>(() => {
        const init: Record<string, PayMode> = {};
        players.forEach(p => {
            // Default split to CASH or DUES based on allowed methods
            init[p.playerId || p.id] = allowedMethods.includes('CASH') ? 'CASH' : 'DUES';
        });
        return init;
    });

    if (!isOpen) return null;

    const perPlayer = players.length > 0 ? totalAmount / players.length : totalAmount;

    const handleConfirm = async () => {
        setSubmitting(true);
        try {
            let finalPayload = { ...initialPayload };

            if (mode === 'SPLIT' || (mode === 'DUES' && initialPayload?.gameType === 'LTP')) {
                // Determine payer list (for LTP if winners selected)
                const payingPlayers = (initialPayload?.gameType === 'LTP' && initialPayload?.winnerIds?.length > 0 && initialPayload?.winnerIds?.length < players.length)
                    ? players.filter(p => !initialPayload.winnerIds.includes(p.playerId || p.id))
                    : players;

                const dynamicSplitAmount = totalAmount / payingPlayers.length;

                finalPayload = {
                    ...finalPayload,
                    paymentMethod: 'SPLIT',
                    splitPayments: payingPlayers.map((p: any) => ({
                        playerId: p.playerId || p.id,
                        method: mode === 'DUES' ? 'DUES' : (splitModes[p.playerId || p.id] || mode),
                        amount: dynamicSplitAmount
                    }))
                };
            } else {
                finalPayload = { ...finalPayload, paymentMethod: mode };
            }

            await onConfirm(finalPayload);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">{title}</h2>
                            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Due</p>
                            <p className="text-3xl font-black text-primary">₹{totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Select Payment Mode</p>
                        <div className="grid grid-cols-3 gap-2">
                            {PAY_OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => setMode(opt.value)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5 ${mode === opt.value ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300'}`}>
                                    <span className={`material-symbols-outlined text-2xl ${mode === opt.value ? 'text-primary' : opt.color}`}>{opt.icon}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${mode === opt.value ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === 'DUES' && (
                        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600">
                            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">warning</span>
                            <p>This will create pending dues for {players.length > 0 ? 'the associated player(s)' : 'the guest/session'}.</p>
                        </div>
                    )}

                    {mode === 'SPLIT' && players.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Per-Player Split (≈ ₹{perPlayer.toFixed(2)} each)</p>
                            {players.map((sp: any) => (
                                <div key={sp.playerId || sp.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                            {(sp.player?.fullName || sp.fullName)?.charAt(0) || '?'}
                                        </div>
                                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{sp.player?.fullName || sp.fullName || 'Player'}</p>
                                    </div>
                                    <select value={splitModes[sp.playerId || sp.id] || PAY_OPTIONS[0].value} onChange={e => setSplitModes(prev => ({ ...prev, [sp.playerId || sp.id]: e.target.value as PayMode }))}
                                        className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none">
                                        {PAY_OPTIONS.filter(o => o.value !== 'SPLIT').map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}

                    {mode === 'UPI' && (
                        <div className="mt-4 pb-2">
                            <UpiQrCode amount={totalAmount} />
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">Cancel</button>
                        <button onClick={handleConfirm} disabled={submitting}
                            className="flex-1 py-3 rounded-2xl font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {submitting ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <span className="material-symbols-outlined text-[18px]">check_circle</span>}
                            Confirm Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
