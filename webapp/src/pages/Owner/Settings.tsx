import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../api/apiClient';
import { LogoSpinner } from '../../components/Shared/LogoSpinner';

const PAYMENT_METHODS = [
    { id: 'CASH', label: 'Cash', icon: 'payments', desc: 'Accept physical cash at the counter' },
    { id: 'UPI', label: 'UPI / QR', icon: 'qr_code_scanner', desc: 'Accept payments via UPI and QR codes' },
    { id: 'CARD', label: 'Credit / Debit Card', icon: 'credit_card', desc: 'Accept card payments via Swipe machine' },
    { id: 'WALLET', label: 'Player Wallet', icon: 'account_balance_wallet', desc: 'Allow players to pay using their house wallet balance' },
];

export default function OwnerSettings() {
    const { appUser, refreshProfile } = useAuth();
    const [allowedMethods, setAllowedMethods] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [savingUpi, setSavingUpi] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // UPI state
    const [upiId, setUpiId] = useState('');
    const [merchantName, setMerchantName] = useState('');
    const [initialUpi, setInitialUpi] = useState({ upiId: '', merchantName: '' });

    // Initialize from DB/Auth context
    useEffect(() => {
        if (appUser?.allowedPaymentMethods) {
            setAllowedMethods(appUser.allowedPaymentMethods);
        }

        // Fetch UPI config
        apiFetch('/upi/config').then(data => {
            if (data) {
                setUpiId(data.upiId || '');
                setMerchantName(data.merchantName || '');
                setInitialUpi({ upiId: data.upiId || '', merchantName: data.merchantName || '' });
            }
        }).catch(err => console.error('Failed to load UPI config:', err));
    }, [appUser]);

    const toggleMethod = (methodId: string) => {
        setAllowedMethods(prev => {
            if (prev.includes(methodId)) {
                // Prevent disabling all methods to avoid lockouts
                if (prev.length <= 1) {
                    setError('You must have at least one payment method enabled.');
                    setTimeout(() => setError(null), 3000);
                    return prev;
                }
                return prev.filter(m => m !== methodId);
            } else {
                return [...prev, methodId];
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await apiFetch('/owner/payment-methods', {
                method: 'PUT',
                body: JSON.stringify({ allowedPaymentMethods: allowedMethods })
            });
            // Force auth context to reload the profile to get updated payment methods throughout the app
            await refreshProfile();
            setSuccess('Payment methods saved successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update payment methods');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveUpi = async () => {
        if (!upiId || !merchantName) {
            setError('Please provide both UPI ID and Merchant Name.');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setSavingUpi(true);
        setError(null);
        setSuccess(null);
        try {
            await apiFetch('/upi/config', {
                method: 'PUT',
                body: JSON.stringify({ upiId, merchantName })
            });
            setInitialUpi({ upiId, merchantName });
            setSuccess('UPI configuration saved successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update UPI configuration');
        } finally {
            setSavingUpi(false);
        }
    };

    const hasChanges = appUser?.allowedPaymentMethods
        ? JSON.stringify([...appUser.allowedPaymentMethods].sort()) !== JSON.stringify([...allowedMethods].sort())
        : false;

    const hasUpiChanges = upiId !== initialUpi.upiId || merchantName !== initialUpi.merchantName;

    return (
        <div className="max-w-4xl mx-auto space-y-8 font-display pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Organization Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Configure global preferences for your business.</p>
            </div>

            {/* Payment Methods Section */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <div className="flex items-start justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary">point_of_sale</span>
                            Payment Methods
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                            Select which payment methods should be available during checkout across all point of sale and session forms. 'Split' and 'Dues' remain natively available for eligible players.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined">error</span>
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center gap-2 text-sm font-bold">
                        <span className="material-symbols-outlined">check_circle</span>
                        {success}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {PAYMENT_METHODS.map(method => {
                        const isDisabledMethod = method.id === 'WALLET' || method.id === 'CARD';
                        const isEnabled = !isDisabledMethod && allowedMethods.includes(method.id);
                        return (
                            <button
                                key={method.id}
                                onClick={() => !isDisabledMethod && toggleMethod(method.id)}
                                disabled={isDisabledMethod}
                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-200 group ${isDisabledMethod
                                    ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                                    : isEnabled
                                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm shadow-primary/10'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50'
                                    }`}
                            >
                                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDisabledMethod
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                    : isEnabled ? 'bg-primary text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-primary/20 group-hover:text-primary'
                                    }`}>
                                    <span className="material-symbols-outlined text-2xl">{method.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <p className={`font-bold text-base truncate ${isDisabledMethod ? 'text-slate-400' : isEnabled ? 'text-primary dark:text-primary' : 'text-slate-900 dark:text-white'}`}>
                                                {method.label}
                                            </p>
                                            {isDisabledMethod && (
                                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider rounded-full">Coming Soon</span>
                                            )}
                                        </div>
                                        {!isDisabledMethod && (
                                            <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 flex-shrink-0 ${isEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                                                }`}>
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isEnabled ? 'translate-x-4' : 'translate-x-0'
                                                    }`} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pr-6 leading-relaxed">
                                        {isDisabledMethod ? `${method.label} integration — will be available in a future update` : method.desc}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${hasChanges && !saving
                            ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25 hover:-translate-y-0.5'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        {saving ? (
                            <LogoSpinner size="size-5" light />
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">save</span>
                                Save Preferences
                            </>
                        )}
                    </button>
                </div>
            </section>

            {/* UPI Account Settings Section */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <div className="flex items-start justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary">qr_code_scanner</span>
                            UPI Receiving Account
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                            Configure the account details where player payments made via UPI QR codes will be deposited.
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Merchant UPI ID <span className="text-rose-500">*</span></label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">alternate_email</span>
                            <input
                                type="text"
                                value={upiId}
                                onChange={e => setUpiId(e.target.value)}
                                placeholder="storename@bank"
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">Example: 9876543210@paytm or businessname@ybl</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Merchant Name <span className="text-rose-500">*</span></label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">store</span>
                            <input
                                type="text"
                                value={merchantName}
                                onChange={e => setMerchantName(e.target.value)}
                                placeholder="Business Legal Name"
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">Must exactly match the name registered with your bank.</p>
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleSaveUpi}
                        disabled={!hasUpiChanges || savingUpi}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${hasUpiChanges && !savingUpi
                            ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25 hover:-translate-y-0.5'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        {savingUpi ? (
                            <LogoSpinner size="size-5" light />
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">save</span>
                                Save UPI Details
                            </>
                        )}
                    </button>
                </div>
            </section>
        </div>
    );
}
