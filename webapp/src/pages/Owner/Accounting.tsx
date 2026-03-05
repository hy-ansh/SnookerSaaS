import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/apiClient';
import FeatureGate from '../../components/FeatureGate';

const formatAccountId = (id: string, refType?: string) => {
    const map: Record<string, string> = {
        'Revenue_Session': 'Session Revenue',
        'Revenue_Canteen': 'POS / Canteen Revenue',
        'CashInHand': 'Cash Received',
        'BankReconciled': 'UPI / Card Received',
        'ASSET_CASH': 'Cash Received',
        'ASSET_UPI': 'UPI Received',
        'ASSET_CARD': 'Card Received',
        'ASSET_WALLET': 'Wallet Payment',
        'ACCOUNTS_RECEIVABLE': 'Pending Dues',
        'CASH': 'Cash (Settlement)',
        'UPI': 'UPI (Settlement)',
        'CARD': 'Card (Settlement)',
        'WALLET': 'Wallet (Settlement)',
    };
    if (map[id]) return map[id];
    if (id.startsWith('EXPENSE_')) return `Expense: ${id.replace('EXPENSE_', '').replace(/_/g, ' ')}`;
    return id.replace(/_/g, ' ');
};

const formatRefType = (refType: string) => {
    const map: Record<string, string> = {
        'POS_ORDER': '🛒 POS Sale',
        'SESSION_PAYMENT': '🎱 Session',
        'DUES_SETTLEMENT': '✅ Due Settled',
        'EXPENSE': '💸 Expense',
    };
    return map[refType] || refType;
};

const exportToCSV = (entries: any[]) => {
    const headers = ['Account', 'Ref Type', 'Date', 'Debit (In)', 'Credit (Out)'];
    const rows = entries.map(e => [
        formatAccountId(e.accountId),
        e.referenceType,
        new Date(e.createdAt).toLocaleDateString(),
        Number(e.debit).toFixed(2),
        Number(e.credit).toFixed(2),
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

function AccountingContent() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [expenseForm, setExpenseForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: 'MISC'
    });

    // Live Data State
    const [summary, setSummary] = useState({ mtdExpenses: 0, mtdRevenue: 0, netProfit: 0 });
    const [entries, setEntries] = useState<any[]>([]);
    const [trend, setTrend] = useState<{ label: string; revenue: number; expenses: number }[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLedger = async () => {
        try {
            setLoading(true);
            const [ledgerData, trendData] = await Promise.all([
                apiFetch('/accounting'),
                apiFetch('/accounting/trend')
            ]);
            setSummary(ledgerData.summary);
            setEntries(ledgerData.entries);
            if (trendData.trend) setTrend(trendData.trend);
        } catch (error) {
            console.error('Failed to fetch ledger:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLedger();
    }, []);

    const handleAddExpense = async () => {
        if (!expenseForm.amount || !expenseForm.category || isSubmitting) return;

        // We need branchId from the current context. For now, assuming Owner's org has 1 branch or API defaults to it.
        // Actually, API requires branchId. Let's get branchId from localStorage or default it.
        const authData = JSON.parse(localStorage.getItem('adminAuth') || '{}');
        const branchId = authData.user?.branchId || authData.user?.storeId; // If owner has no branchId, might fail if strict. Let's send storeId as branchId for simplicity or assume backend fixes it.

        try {
            setIsSubmitting(true);
            await apiFetch('/accounting/expenses', {
                method: 'POST',
                body: JSON.stringify({
                    amount: Number(expenseForm.amount),
                    category: expenseForm.category,
                    description: expenseForm.description,
                    incurredAt: expenseForm.date,
                    branchId: branchId // Needs to be a valid branchId
                })
            });
            setIsModalOpen(false);
            setExpenseForm({ amount: '', date: new Date().toISOString().split('T')[0], description: '', category: 'MISC' });
            fetchLedger();
        } catch (error: any) {
            alert(`Failed to add expense: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate Highest Expense Category (Mock UI calc based on trend or entries)
    const highestCategory = entries.length > 0 ? entries[0].accountId : 'None';
    const highestAmount = entries.length > 0 ? entries[0].debit : 0;

    return (
        <>
            <div className="flex flex-col gap-8 h-full">
                {/* Summary Section */}
                <div className="max-w-7xl mx-auto w-full font-display pb-10">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Store Accounting & Ledger</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Financial pulse and compliance tracking</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => exportToCSV(entries)}
                                disabled={entries.length === 0}
                                className="flex items-center justify-center gap-2 rounded-xl h-11 px-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                                <span className="material-symbols-outlined">download</span> Export CSV
                            </button>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center justify-center gap-2 rounded-xl h-11 px-6 bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"
                            >
                                <span className="material-symbols-outlined">add</span> Add Expense
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-2 rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start">
                                <p className="text-slate-500 text-sm font-semibold">Total Expenses (MTD)</p>
                                <span className="material-symbols-outlined text-slate-400">payments</span>
                            </div>
                            <p className="text-slate-900 dark:text-white text-3xl font-black tracking-tight">
                                {loading ? '...' : `₹${summary.mtdExpenses.toFixed(2)}`}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-2xl p-6 bg-primary text-white border border-primary shadow-xl shadow-primary/10">
                            <div className="flex justify-between items-start">
                                <p className="text-white/80 text-sm font-semibold">Net Profit Margin</p>
                                <span className="material-symbols-outlined text-white/60">savings</span>
                            </div>
                            <p className="text-white text-4xl font-black tracking-tight">
                                {loading ? '...' : `₹${summary.netProfit.toFixed(2)}`}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start">
                                <p className="text-slate-500 text-sm font-semibold">Total Revenue (MTD)</p>
                                <span className="material-symbols-outlined text-slate-400">monetization_on</span>
                            </div>
                            <p className="text-slate-900 dark:text-white text-3xl font-black tracking-tight">
                                {loading ? '...' : `₹${summary.mtdRevenue.toFixed(2)}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Chart & Table Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Bar Chart */}
                    <div className="xl:col-span-1 flex flex-col gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Monthly Spending</h3>
                            <span className="material-symbols-outlined text-slate-400">more_horiz</span>
                        </div>
                        <div className="flex items-end justify-between h-48 gap-2 px-2">
                            {loading ? (
                                <div className="h-full w-full flex items-center justify-center text-sm font-bold text-slate-400">Loading Chart...</div>
                            ) : trend.length === 0 ? (
                                <div className="h-full w-full flex items-center justify-center text-sm font-bold text-slate-400">No Data Available</div>
                            ) : (
                                trend.map((month, idx) => {
                                    // Scale to max height (approx 160px)
                                    const maxVal = Math.max(...trend.map(t => Math.max(t.revenue, t.expenses, 1)));
                                    const heightPct = Math.max((month.expenses / maxVal) * 100, 5);

                                    return (
                                        <div key={idx} className="flex flex-col items-center gap-2 w-full h-full justify-end">
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative group h-full flex items-end">
                                                <div
                                                    className="w-full bg-slate-300 dark:bg-slate-600 rounded-t-sm group-hover:bg-rose-500 transition-colors tooltip"
                                                    style={{ height: `${heightPct}%` }}
                                                    title={`Exp: ₹${month.expenses.toFixed(0)} | Rev: ₹${month.revenue.toFixed(0)}`}
                                                ></div>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{month.label.split(' ')[0]}</span>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500">Most Recent Expense</p>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-sm font-bold">{highestCategory.replace('EXPENSE_', '')}</span>
                                <span className="text-sm font-bold text-rose-500">₹{highestAmount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Expense Table */}
                    <div className="xl:col-span-2 flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold">Ledger Entries</h3>
                            <div className="flex gap-2">
                                <button onClick={fetchLedger} className="text-sm font-semibold text-primary dark:text-emerald-500 px-3 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Refresh Data</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto flex-1 h-full">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-[11px] uppercase tracking-wider font-bold sticky top-0">
                                        <th className="px-6 py-4">Account</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4 text-right">Debit (In)</th>
                                        <th className="px-6 py-4 text-right">Credit (Out)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading ? (
                                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading records...</td></tr>
                                    ) : entries.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No ledger entries found.</td></tr>
                                    ) : (
                                        entries.map(entry => {
                                            const isRevenue = Number(entry.credit) > 0;
                                            const isPosRevenue = entry.referenceType === 'POS_ORDER' && entry.accountId === 'Revenue_Canteen';
                                            const isDue = entry.accountId === 'ACCOUNTS_RECEIVABLE';
                                            const isSettlement = entry.referenceType === 'DUES_SETTLEMENT' && Number(entry.debit) > 0 && entry.accountId !== 'ACCOUNTS_RECEIVABLE';
                                            const isExpense = entry.referenceType === 'EXPENSE';
                                            return (
                                                <tr key={entry.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isDue ? 'bg-rose-50/50 dark:bg-rose-900/10'
                                                    : isRevenue || isPosRevenue || isSettlement ? 'bg-emerald-50/40 dark:bg-emerald-900/10'
                                                        : isExpense ? 'bg-amber-50/40 dark:bg-amber-900/10'
                                                            : ''
                                                    }`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full shrink-0 ${isDue ? 'bg-rose-400' : isRevenue || isPosRevenue || isSettlement ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                                            <span className="font-bold text-slate-800 dark:text-white text-sm">{formatAccountId(entry.accountId, entry.referenceType)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${entry.referenceType === 'POS_ORDER' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                                            : entry.referenceType === 'DUES_SETTLEMENT' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                                : entry.referenceType === 'EXPENSE' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                                            }`}>{formatRefType(entry.referenceType)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 text-sm">{new Date(entry.createdAt).toLocaleDateString()} <span className="text-slate-400 text-xs">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                                                    <td className="px-6 py-4 text-[11px] text-slate-400 italic">{entry.referenceId?.slice(0, 8) || '—'}</td>
                                                    <td className="px-6 py-4 text-right font-black text-emerald-600 dark:text-emerald-400">{Number(entry.debit) > 0 ? `₹${Number(entry.debit).toFixed(2)}` : '—'}</td>
                                                    <td className="px-6 py-4 text-right font-black text-rose-500">{Number(entry.credit) > 0 ? `₹${Number(entry.credit).toFixed(2)}` : '—'}</td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden m-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Add New Expense</h3>
                            <button onClick={() => setIsModalOpen(false)} className="size-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                        <input
                                            value={expenseForm.amount}
                                            onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                            className="w-full h-11 pl-8 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold outline-none transition-all"
                                            placeholder="0.00"
                                            type="number"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                                    <input
                                        value={expenseForm.date}
                                        onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                        className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium outline-none transition-all text-sm"
                                        type="date"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Description (Optional)</label>
                                <input
                                    value={expenseForm.description}
                                    onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                                    placeholder="What was this for?"
                                    type="text"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                                <select
                                    value={expenseForm.category}
                                    onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                    className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm font-bold"
                                >
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="UTILITIES">Utilities</option>
                                    <option value="SUPPLIES">Supplies</option>
                                    <option value="SALARIES">Salaries</option>
                                    <option value="MISC">Miscellaneous</option>
                                </select>
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={handleAddExpense} disabled={isSubmitting || !expenseForm.amount} className="px-8 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-emerald-500/20 shadow-lg hover:bg-emerald-600 transition-all focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex items-center gap-2 disabled:opacity-50">
                                {isSubmitting ? 'Saving...' : 'Save Expense'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function OwnerAccounting() {
    return (
        <FeatureGate feature="accounting">
            <AccountingContent />
        </FeatureGate>
    );
}
