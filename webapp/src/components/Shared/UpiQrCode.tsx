import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/apiClient';

interface UpiQrCodeProps {
    amount: number;
    className?: string;
}

export function UpiQrCode({ amount, className = '' }: UpiQrCodeProps) {
    const [qrData, setQrData] = useState<{ upiLink?: string; upiId?: string; merchantName?: string } | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQr = async () => {
            if (amount <= 0) return;
            setLoading(true);
            try {
                const res = await apiFetch(`/upi/qr?amount=${amount}`);
                setQrData(res);
            } catch (err: any) {
                setError(err.message || 'Failed to generate QR code');
            } finally {
                setLoading(false);
            }
        };
        fetchQr();
    }, [amount]);

    if (loading) {
        return (
            <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl ${className}`}>
                <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-sm font-bold text-slate-500">Generating QR...</p>
            </div>
        );
    }

    if (error || !qrData?.upiLink) {
        return (
            <div className={`p-4 bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800/50 rounded-2xl ${className}`}>
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold mb-1">
                    <span className="material-symbols-outlined">error</span>
                    <span>QR Code Error</span>
                </div>
                <p className="text-sm text-red-500">{error || 'UPI Configuration not found. The store owner needs to set it up.'}</p>
            </div>
        );
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData.upiLink)}`;

    return (
        <div className={`bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col items-center ${className}`}>
            <div className="flex items-center gap-2 mb-3 text-slate-800">
                <span className="material-symbols-outlined text-primary">qr_code_scanner</span>
                <span className="font-bold text-sm">Scan with any UPI App</span>
            </div>

            <div className="bg-white p-2 border-2 border-slate-100 rounded-xl shadow-inner relative group mb-3">
                <img src={qrUrl} alt="UPI Payment QR Code" className="w-[200px] h-[200px]" />
                <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Amount: ₹{amount.toFixed(2)}</span>
                </div>
            </div>

            <div className="text-center w-full px-2">
                <p className="text-slate-900 font-black text-lg">₹{amount.toFixed(2)}</p>
                <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mt-0.5 max-w-full truncate" title={qrData.merchantName}>
                    {qrData.merchantName}
                </p>
            </div>
        </div>
    );
}
