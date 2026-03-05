import { useQuery } from '@tanstack/react-query';
import { playerService } from '../../api/player';
import { Link } from 'react-router-dom';

export default function PlayerWallet() {
    const { data, isLoading } = useQuery({
        queryKey: ['playerWallet'],
        queryFn: () => playerService.getWallet()
    });

    const handleRecharge = async (amount: number) => {
        try {
            const res = await playerService.rechargeWallet(amount);
            alert(`Razorpay Checkout Simulation: Order ${res.orderId} for INR ${res.amount}`);
            // Integrate actual razorpay checkout here
        } catch (err) {
            console.error(err);
            alert('Failed to initiate recharge');
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Wallet</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your credits & billing history.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Balance Card Section */}
                <div className="col-span-1 lg:col-span-1 space-y-8">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20 transition-transform group-hover:scale-110"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                            <div className="flex justify-between items-start">
                                <div className="size-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                                    <span className="material-symbols-outlined text-white">account_balance_wallet</span>
                                </div>
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm">Active</span>
                            </div>

                            <div>
                                <p className="text-slate-400 font-medium mb-1 text-sm">Available Credits</p>
                                <h2 className="text-5xl font-black tracking-tighter">
                                    ₹{isLoading ? '...' : (data?.balance || '0.00')}
                                </h2>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Quick Recharge</h3>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {[500, 1000, 2500, 5000].map(amt => (
                                <button key={amt} onClick={() => handleRecharge(amt)} className="py-3 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary dark:hover:border-primary font-bold text-slate-700 dark:text-slate-300 transition-colors">
                                    ₹{amt}
                                </button>
                            ))}
                        </div>
                        <button className="w-full py-4 bg-primary hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-primary/25 transition-all flex justify-center items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">add_circle</span> Add Custom Amount
                        </button>
                    </div>
                </div>

                {/* History Section */}
                <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Recent Transactions</h3>
                        <Link to="#" className="text-primary text-sm font-bold hover:underline">Download Statement</Link>
                    </div>
                    <div className="p-6 md:p-8 space-y-4">
                        {isLoading ? (
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl w-full"></div>)}
                            </div>
                        ) : data?.history && data.history.length > 0 ? (
                            data.history.map((txn: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                    <div className="flex items-center gap-4">
                                        <div className={`size-12 rounded-xl flex items-center justify-center shadow-inner ${txn.type === 'DEPOSIT' || txn.type === 'REFUND' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                                            <span className="material-symbols-outlined">
                                                {txn.type === 'DEPOSIT' ? 'arrow_downward' : txn.type === 'REFUND' ? 'replay' : 'arrow_upward'}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white tracking-tight">
                                                {txn.type === 'DEPOSIT' ? 'Wallet Recharge' : txn.type === 'REFUND' ? 'Refund Processed' : 'Session Deduction'}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">{new Date(txn.createdAt).toLocaleDateString()} • Ref: {txn.referenceId || txn.id.slice(0, 8)}</p>
                                        </div>
                                    </div>
                                    <div className={`font-extrabold text-lg ${txn.type === 'DEPOSIT' || txn.type === 'REFUND' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                        {txn.type === 'DEPOSIT' || txn.type === 'REFUND' ? '+' : '-'}₹{Math.abs(txn.amount).toFixed(2)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10">
                                <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-800 mb-2">receipt_long</span>
                                <p className="text-slate-500 font-medium">No transactions found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
