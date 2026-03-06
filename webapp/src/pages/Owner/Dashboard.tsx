import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { tableService } from '../../api/tables';
import { sessionService, type SessionData } from '../../api/sessions';
import { dashboardService, type DashboardSummary } from '../../api/dashboard';
import { apiFetch } from '../../api/apiClient';
import { AdBanner } from '../../components/Ads/AdBanner';
import { UpiConfigModal } from '../../components/Owner/UpiConfigModal';

const TABLE_STATUS_CONFIG = {
    AVAILABLE: { label: 'Available', color: 'bg-emerald-500', border: 'border-emerald-400/50', glow: 'shadow-emerald-500/20', text: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: 'check_circle' },
    PLAYING: { label: 'Playing', color: 'bg-primary', border: 'border-primary/50', glow: 'shadow-primary/20', text: 'text-primary', bg: 'bg-primary/10', icon: 'sports_score' },
    RESERVED: { label: 'Reserved', color: 'bg-amber-500', border: 'border-amber-400/50', glow: 'shadow-amber-500/20', text: 'text-amber-500', bg: 'bg-amber-500/10', icon: 'event' },
    MAINTENANCE: { label: 'Maint.', color: 'bg-red-500', border: 'border-red-400/50', glow: 'shadow-red-500/20', text: 'text-red-500', bg: 'bg-red-500/10', icon: 'build' },
};

function LiveTimer({ startedAt, pausedSecs, activePauseAt }: { startedAt: string; pausedSecs: number; activePauseAt?: string }) {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const calc = () => {
            const now = activePauseAt ? new Date(activePauseAt).getTime() : Date.now();
            setElapsed(Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000) - pausedSecs));
        };
        calc();
        if (!activePauseAt) {
            const iv = setInterval(calc, 1000);
            return () => clearInterval(iv);
        }
    }, [startedAt, pausedSecs, activePauseAt]);
    const hh = Math.floor(elapsed / 3600).toString().padStart(2, '0');
    const mm = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
    const ss = (elapsed % 60).toString().padStart(2, '0');
    return <span className="font-mono tabular-nums">{hh}:{mm}:{ss}</span>;
}

function PricingModal({ branch, onClose }: { branch: Branch; onClose: () => void }) {
    const [rate, setRate] = useState('');
    const [peak, setPeak] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        apiFetch(`/pricing/${branch.id}`).then((r: any) => {
            if (r?.hourlyRate) setRate(String(r.hourlyRate));
            if (r?.peakHourRate) setPeak(String(r.peakHourRate));
        }).catch(() => { });
    }, [branch.id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(''); setSuccess(false);
        try {
            await apiFetch(`/pricing/${branch.id}`, {
                method: 'PUT',
                body: JSON.stringify({ hourlyRate: Number(rate), peakHourRate: peak ? Number(peak) : undefined }),
            });
            setSuccess(true);
            setTimeout(onClose, 800);
        } catch (err: any) { setError(err.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[20px]">payments</span>
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Set Pricing Rate</h2>
                            <p className="text-xs text-slate-500">{branch.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-sm text-red-600 font-medium">{error}</div>}
                    {success && <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-lg text-sm text-emerald-600 font-medium flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">check_circle</span>Saved!</div>}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Standard Rate (₹/hr) <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                            <input type="number" min="1" step="0.5" value={rate} onChange={e => setRate(e.target.value)} required placeholder="100"
                                className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Peak Hour Rate (₹/hr) <span className="text-slate-400 font-normal">(optional)</span></label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                            <input type="number" min="1" step="0.5" value={peak} onChange={e => setPeak(e.target.value)} placeholder="150"
                                className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Used during evenings/weekends if configured</p>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving ? <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <span className="material-symbols-outlined text-[16px]">save</span>}
                            Save Rate
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

interface Branch {
    id: string;
    name: string;
    address?: string | null;
    _count?: { tables: number; sessions: number };
}

// ─── Branch Modal ─────────────────────────────────────────────────────────────

function BranchModal({
    mode,
    branch,
    onClose,
    onSave,
}: {
    mode: 'add' | 'edit';
    branch?: Branch;
    onClose: () => void;
    onSave: (name: string, address: string) => Promise<void>;
}) {
    const [name, setName] = useState(branch?.name || '');
    const [address, setAddress] = useState(branch?.address || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('Branch name is required'); return; }
        setSaving(true);
        setError('');
        try {
            await onSave(name.trim(), address.trim());
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save branch');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[20px]">store</span>
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                            {mode === 'add' ? 'Add New Branch' : 'Edit Branch'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-red-600 text-sm font-medium">
                            <span className="material-symbols-outlined text-[16px]">error</span>{error}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Branch Name <span className="text-red-500">*</span>
                        </label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main Hall, Downtown Branch"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow"
                            autoFocus />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Address <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                            placeholder="e.g. 123 Main St, Mumbai, MH 400001"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving ? <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <span className="material-symbols-outlined text-[16px]">{mode === 'add' ? 'add_circle' : 'save'}</span>}
                            {mode === 'add' ? 'Add Branch' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Table Modal ──────────────────────────────────────────────────────────────

function TableModal({
    branches,
    table,
    onClose,
    onSave,
}: {
    branches: Branch[];
    table?: any;
    onClose: () => void;
    onSave: (nameOrNumber: string, branchId: string, customHourlyRate: number | null) => Promise<void>;
}) {
    // Auto-assign: if only 1 branch exists, use it directly
    const defaultBranch = branches.length === 1 ? branches[0].id : (table?.branchId || '');
    const [nameOrNumber, setNameOrNumber] = useState(table?.nameOrNumber || '');
    const [branchId, setBranchId] = useState(defaultBranch);
    const [customRate, setCustomRate] = useState(table?.customHourlyRate ? String(table.customHourlyRate) : '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nameOrNumber.trim()) { setError('Table name/number is required'); return; }
        if (!branchId) { setError('Please select a branch'); return; }
        setSaving(true);
        setError('');
        try {
            const parsedRate = customRate.trim() ? Number(customRate) : null;
            await onSave(nameOrNumber.trim(), branchId, parsedRate);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save table');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[20px]">table_bar</span>
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                            {table ? 'Edit Table' : 'Add New Table'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-red-600 text-sm font-medium">
                            <span className="material-symbols-outlined text-[16px]">error</span>{error}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Table Name / Number <span className="text-red-500">*</span>
                        </label>
                        <input type="text" value={nameOrNumber} onChange={e => setNameOrNumber(e.target.value)}
                            placeholder="e.g. 1, A, Table 1, Snooker Hall A"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow"
                            autoFocus />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Custom Hourly Rate (₹/hr) <span className="text-slate-400 font-normal">(optional override)</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                            <input type="number" min="1" step="0.5" value={customRate} onChange={e => setCustomRate(e.target.value)}
                                placeholder="E.g. VIP Table Rate"
                                className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow" />
                        </div>
                    </div>
                    {/* Show branch selector only if multiple branches exist */}
                    {branches.length > 1 ? (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Branch <span className="text-red-500">*</span>
                            </label>
                            <select value={branchId} onChange={e => setBranchId(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow">
                                <option value="">Select a branch...</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    ) : branches.length === 1 ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-[16px] text-primary">store</span>
                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                Auto-assigned to: <strong>{branches[0].name}</strong>
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 text-sm font-medium">
                            <span className="material-symbols-outlined text-[16px]">warning</span>
                            No branches found. Add a branch first.
                        </div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving || branches.length === 0} className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving ? <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <span className="material-symbols-outlined text-[16px]">{table ? 'save' : 'add_circle'}</span>}
                            {table ? 'Save Changes' : 'Add Table'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ label, onConfirm, onClose }: { label: string; onConfirm: () => Promise<void>; onClose: () => void }) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const run = async () => {
        setDeleting(true);
        setError('');
        try { await onConfirm(); onClose(); }
        catch (err: any) { setError(err.message || 'Failed to delete'); }
        finally { setDeleting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className="size-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">delete</span>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">Delete?</h3>
                    <p className="text-slate-500 text-sm">This will permanently remove <strong className="text-slate-700 dark:text-slate-300">{label}</strong>.</p>
                    {error && <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 text-red-600 text-sm font-medium">{error}</div>}
                    <div className="flex gap-3 mt-6">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                        <button onClick={run} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-500/20 disabled:opacity-60 flex items-center justify-center gap-2">
                            {deleting ? <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <span className="material-symbols-outlined text-[16px]">delete</span>}
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Owner Dashboard ──────────────────────────────────────────────────────────

type Tab = 'overview' | 'branches';

export default function OwnerDashboard() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('overview');
    const [tables, setTables] = useState<any[]>([]);
    const [activeSessions, setActiveSessions] = useState<SessionData[]>([]);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Floor session modal (like Staff)
    const [selectedTable, setSelectedTable] = useState<any | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [newStatus, setNewStatus] = useState<string>('');

    // Pricing modal
    const [pricingBranch, setPricingBranch] = useState<Branch | null>(null);

    // Modal states
    const [showAddTable, setShowAddTable] = useState(false);
    const [editingTable, setEditingTable] = useState<any | null>(null);
    const [deletingTable, setDeletingTable] = useState<any | null>(null);
    const [showAddBranch, setShowAddBranch] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

    // UPI setup modal
    const [showUpiModal, setShowUpiModal] = useState(false);
    const [upiConfigRequired, setUpiConfigRequired] = useState(false);

    const loadData = useCallback(async (showSpinner = true) => {
        try {
            if (showSpinner) setLoading(true);
            const [tablesData, sessionsData, summaryData, branchesData, upiData] = await Promise.all([
                tableService.getTables(),
                sessionService.getActiveSessions(),
                dashboardService.getSummary(),
                apiFetch('/branches'),
                apiFetch('/upi/config').catch(() => null),
            ]);
            setTables(tablesData || []);
            setActiveSessions(sessionsData || []);
            setSummary(summaryData || null);
            setBranches(Array.isArray(branchesData) ? branchesData : []);
            if (!upiData?.upiId) {
                setShowUpiModal(true);
                setUpiConfigRequired(true);
            }
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            if (showSpinner) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(true);
        intervalRef.current = setInterval(() => loadData(false), 15000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [loadData]);

    // ── Table handlers ─────────────────────────────────────────────────────────

    const handleTableClick = (table: any) => {
        const session = activeSessions.find(s => s.tableId === table.id);
        if (session) {
            navigate(`/owner/live/${session.id}`);
        } else if (table.status !== 'PLAYING') {
            setSelectedTable(table);
            setNewStatus(table.status || 'AVAILABLE');
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedTable) return;
        setUpdatingStatus(true);
        try {
            const updated = await tableService.updateTable(selectedTable.id, { status: newStatus });
            setTables(prev => prev.map(t => t.id === updated.id ? updated : t));
            setSelectedTable(null);
        } catch (err: any) {
            alert('Could not update status: ' + err.message);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleAddTable = async (nameOrNumber: string, branchId: string, customHourlyRate: number | null) => {
        const res = await apiFetch('/tables', { method: 'POST', body: JSON.stringify({ nameOrNumber, branchId, customHourlyRate: customHourlyRate === null ? '' : customHourlyRate }) });
        setTables(prev => [...prev, res].sort((a, b) => a.nameOrNumber.localeCompare(b.nameOrNumber)));
    };

    const handleEditTable = async (nameOrNumber: string, _branchId: string, customHourlyRate: number | null) => {
        const res = await apiFetch(`/tables/${editingTable!.id}`, { method: 'PUT', body: JSON.stringify({ nameOrNumber, customHourlyRate: customHourlyRate === null ? '' : customHourlyRate }) });
        setTables(prev => prev.map(t => t.id === res.id ? res : t));
    };

    const handleDeleteTable = async () => {
        await apiFetch(`/tables/${deletingTable!.id}`, { method: 'DELETE' });
        setTables(prev => prev.filter(t => t.id !== deletingTable!.id));
    };

    // ── Branch handlers ────────────────────────────────────────────────────────

    const handleAddBranch = async (name: string, address: string) => {
        const res = await apiFetch('/branches', { method: 'POST', body: JSON.stringify({ name, address }) });
        setBranches(prev => [...prev, res].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const handleEditBranch = async (name: string, address: string) => {
        const res = await apiFetch(`/branches/${editingBranch!.id}`, { method: 'PUT', body: JSON.stringify({ name, address }) });
        setBranches(prev => prev.map(b => b.id === res.id ? res : b));
    };

    const handleDeleteBranch = async () => {
        await apiFetch(`/branches/${deletingBranch!.id}`, { method: 'DELETE' });
        setBranches(prev => prev.filter(b => b.id !== deletingBranch!.id));
    };

    const filteredTables = selectedBranch === 'all' ? tables : tables.filter(t => t.branchId === selectedBranch);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 flex-1 px-2 lg:px-6">

            <AdBanner placement="dashboard_top" className="h-24 md:h-32 mb-6" />

            {/* Modals */}
            {showAddTable && <TableModal branches={branches} onClose={() => setShowAddTable(false)} onSave={handleAddTable} />}
            {editingTable && <TableModal branches={branches} table={editingTable} onClose={() => setEditingTable(null)} onSave={handleEditTable} />}
            {deletingTable && <DeleteConfirm label={`Table ${deletingTable.nameOrNumber}`} onConfirm={handleDeleteTable} onClose={() => setDeletingTable(null)} />}
            {showAddBranch && <BranchModal mode="add" onClose={() => setShowAddBranch(false)} onSave={handleAddBranch} />}
            {editingBranch && <BranchModal mode="edit" branch={editingBranch} onClose={() => setEditingBranch(null)} onSave={handleEditBranch} />}
            {deletingBranch && <DeleteConfirm label={`Branch "${deletingBranch.name}"`} onConfirm={handleDeleteBranch} onClose={() => setDeletingBranch(null)} />}
            {pricingBranch && <PricingModal branch={pricingBranch} onClose={() => setPricingBranch(null)} />}
            {showUpiModal && <UpiConfigModal required={upiConfigRequired} onClose={() => setShowUpiModal(false)} onSaveSuccess={() => { setShowUpiModal(false); setUpiConfigRequired(false); }} />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Workspace Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage your venue, branches, and tables</p>
                </div>
                <div className="flex items-center gap-2">
                    {tab === 'overview' && (
                        <>
                            <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-primary">
                                <option value="all">All Branches</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <button onClick={() => setShowAddTable(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-bold text-sm rounded-lg shadow-md shadow-primary/25 hover:bg-primary/90 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">add</span> Add Table
                            </button>
                        </>
                    )}
                    {tab === 'branches' && (
                        <button onClick={() => setShowAddBranch(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-bold text-sm rounded-lg shadow-md shadow-primary/25 hover:bg-primary/90 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">add</span> Add Branch
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1">
                {([['overview', 'grid_view', 'Overview'], ['branches', 'store', 'Branches']] as const).map(([key, icon, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>{label}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {tab === 'overview' && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: "Today's Revenue", value: `₹${(summary?.today_earnings ?? 0).toFixed(2)}`, icon: 'payments', color: 'primary', badge: 'Live' },
                            { label: 'Active Sessions', value: activeSessions.length.toString(), icon: 'timer', color: 'blue', badge: 'Live' },
                            { label: 'Pending Dues', value: `₹${(summary?.unpaid_dues ?? 0).toFixed(2)}`, icon: 'hourglass_empty', color: 'red', badge: 'Pending' },
                            { label: 'Total Tables', value: tables.length.toString(), icon: 'grid_view', color: 'slate', badge: `${Math.max(0, tables.length - activeSessions.length)} free` },
                        ].map(card => (
                            <div key={card.label} className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-lg transition-all">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-500">{card.label}</span>
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${card.color}-500/10 text-${card.color}-500`}>
                                        <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                                <span className={`text-xs font-bold text-${card.color}-500`}>{card.badge}</span>
                            </div>
                        ))}
                    </div>

                    {/* Live Floor — Staff-style card grid */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Floor Status</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Click available table to start session · Playing tables open live view</p>
                            </div>
                            <button onClick={() => loadData()} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-outlined text-sm">refresh</span>Refresh
                            </button>
                        </div>

                        {filteredTables.length === 0 ? (
                            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-800 block mb-2">table_bar</span>
                                <p className="text-slate-500 font-bold">No tables yet</p>
                                <button onClick={() => setShowAddTable(true)} className="mt-4 px-4 py-2 bg-primary text-white font-bold text-sm rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors">
                                    Add First Table
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {filteredTables.map(table => {
                                    const sess = activeSessions.find(s => s.tableId === table.id);
                                    const status: keyof typeof TABLE_STATUS_CONFIG = sess
                                        ? (sess.status === 'PAUSED' ? 'RESERVED' : 'PLAYING')
                                        : (table.status || 'AVAILABLE');
                                    const cfg = TABLE_STATUS_CONFIG[status] ?? TABLE_STATUS_CONFIG.AVAILABLE;
                                    const isPlaying = !!sess;
                                    return (
                                        <div key={table.id}
                                            onClick={() => handleTableClick(table)}
                                            className={`group relative rounded-2xl border-2 ${cfg.border} bg-white dark:bg-slate-900 p-4 flex flex-col items-center text-center transition-all hover:scale-105 hover:shadow-xl hover:${cfg.glow} shadow-sm cursor-pointer`}
                                        >
                                            {/* Status dot */}
                                            <div className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ${cfg.color} ${isPlaying ? 'animate-pulse' : ''}`} />
                                            {/* Edit/Delete on hover (available tables only) */}
                                            {!isPlaying && (
                                                <div className="absolute top-2.5 left-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button title="Edit" onClick={e => { e.stopPropagation(); setEditingTable(table); }}
                                                        className="size-6 bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white text-slate-500 rounded-lg flex items-center justify-center transition-colors">
                                                        <span className="material-symbols-outlined text-[13px]">edit</span>
                                                    </button>
                                                    <button title="Delete" onClick={e => { e.stopPropagation(); setDeletingTable(table); }}
                                                        className="size-6 bg-slate-100 dark:bg-slate-700 hover:bg-red-600 hover:text-white text-slate-500 rounded-lg flex items-center justify-center transition-colors">
                                                        <span className="material-symbols-outlined text-[13px]">delete</span>
                                                    </button>
                                                </div>
                                            )}
                                            {/* Icon */}
                                            <div className={`w-14 h-14 rounded-2xl ${cfg.bg} flex items-center justify-center mb-3 transition-transform group-hover:scale-110`}>
                                                <span className={`material-symbols-outlined text-3xl ${cfg.text}`}>table_bar</span>
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{table.nameOrNumber}</h3>
                                            <span className={`mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                                                {cfg.label}
                                            </span>
                                            {/* Session info if playing */}
                                            {isPlaying && sess && (
                                                <div className="mt-2.5 w-full border-t border-slate-100 dark:border-slate-800 pt-2.5 space-y-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                                                    <p className={`text-sm font-black ${cfg.text} flex items-center justify-center gap-1`}>
                                                        <LiveTimer
                                                            startedAt={sess.startedAt}
                                                            pausedSecs={(sess as any).pausedDurationSecs || 0}
                                                            activePauseAt={sess.status === 'PAUSED' ? ((sess as any).pauses?.[0]?.pausedAt || new Date().toISOString()) : undefined}
                                                        />
                                                        {sess.status === 'PAUSED' && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-bold">PAUSED</span>}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">₹{(sess as any).hourlyRateApplied ?? '—'}/hr</p>
                                                </div>
                                            )}
                                            {/* Status hint */}
                                            {status !== 'PLAYING' && (
                                                <p className="mt-2.5 text-[11px] font-bold text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">tune</span>Manage Status
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                                {/* Add table card */}
                                <div onClick={() => setShowAddTable(true)}
                                    className="group relative rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all opacity-60 hover:opacity-100 min-h-[160px]">
                                    <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/10 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined">add</span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-400 group-hover:text-primary transition-colors uppercase tracking-wider">Add Table</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table Status Modal (owner version) */}
                    {selectedTable && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTable(null)} />
                            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 w-full max-w-md">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-3xl">tune</span>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Manage Table</h2>
                                        <p className="text-slate-500 text-sm">Table {selectedTable.nameOrNumber}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Set Status</label>
                                    {[
                                        { val: 'AVAILABLE', label: 'Available', icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                                        { val: 'RESERVED', label: 'Reserved', icon: 'event', color: 'text-amber-600', bg: 'bg-amber-500/10' },
                                        { val: 'MAINTENANCE', label: 'Under Maintenance', icon: 'build', color: 'text-red-600', bg: 'bg-red-500/10' }
                                    ].map(opt => (
                                        <label key={opt.val} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${newStatus === opt.val ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                            <input type="radio" className="sr-only" name="status" value={opt.val} checked={newStatus === opt.val} onChange={e => setNewStatus(e.target.value)} />
                                            <div className={`size-8 rounded-lg ${opt.bg} flex items-center justify-center ${opt.color}`}>
                                                <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{opt.label}</span>
                                            {newStatus === opt.val && <span className="material-symbols-outlined ml-auto text-primary">check_circle</span>}
                                        </label>
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setSelectedTable(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">Cancel</button>
                                    <button onClick={handleStatusUpdate} disabled={updatingStatus || newStatus === selectedTable.status}
                                        className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-60">
                                        {updatingStatus ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <span className="material-symbols-outlined">save</span>}
                                        {updatingStatus ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mini Charts Row */}
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                            <h3 className="mb-3 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Revenue Over Time</h3>
                            <div className="relative h-40">
                                <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    <defs><linearGradient id="g1" x1="0%" x2="0%" y1="0%" y2="100%"><stop offset="0%" style={{ stopColor: '#059669', stopOpacity: 0.2 }} /><stop offset="100%" style={{ stopColor: '#059669', stopOpacity: 0 }} /></linearGradient></defs>
                                    <path d="M0 80 Q 20 60, 40 70 T 60 40 T 80 50 T 100 20 L 100 100 L 0 100 Z" fill="url(#g1)" />
                                    <path d="M0 80 Q 20 60, 40 70 T 60 40 T 80 50 T 100 20" fill="none" stroke="#059669" strokeWidth="2" />
                                </svg>
                            </div>
                            <div className="flex justify-between text-[10px] font-medium text-slate-400 mt-1">
                                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                            <h3 className="mb-3 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Branch Overview</h3>
                            <div className="space-y-3">
                                {branches.slice(0, 4).map(b => (
                                    <div key={b.id} className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{b.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                                {b._count?.tables ?? 0} tables
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {branches.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No branches yet</p>}
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                            <h3 className="mb-3 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Busy Hour Heatmap</h3>
                            <div className="grid grid-cols-6 gap-1">
                                {['bg-primary/5', 'bg-primary/10', 'bg-primary/20', 'bg-primary/20', 'bg-primary/30', 'bg-primary/40', 'bg-primary/50', 'bg-primary/60', 'bg-primary/70', 'bg-primary/80', 'bg-primary/90', 'bg-primary', 'bg-primary', 'bg-primary', 'bg-primary', 'bg-primary', 'bg-primary/80', 'bg-primary/50'].map((cls, i) => (
                                    <div key={i} className={`aspect-square rounded-sm ${cls} border border-slate-100 dark:border-slate-800`} />
                                ))}
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400">Quiet</span>
                                <div className="flex h-1.5 flex-1 mx-3 rounded-full bg-gradient-to-r from-primary/5 to-primary" />
                                <span className="text-[10px] text-slate-400">Peak</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── BRANCHES TAB ── */}
            {tab === 'branches' && (
                <div className="space-y-4">
                    {branches.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center shadow-sm">
                            <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-800 block mb-3">store</span>
                            <p className="text-slate-600 dark:text-slate-400 font-bold text-lg">No branches yet</p>
                            <p className="text-slate-400 text-sm mt-1 mb-6">Create your first branch to start managing tables and sessions.</p>
                            <button onClick={() => setShowAddBranch(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">add</span> Add Your First Branch
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {branches.map(branch => {
                                const tableCount = branch._count?.tables ?? 0;
                                const sessionCount = activeSessions.filter(s => tables.find(t => t.id === s.tableId && t.branchId === branch.id)).length;
                                return (
                                    <div key={branch.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                    <span className="material-symbols-outlined">store</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{branch.name}</h3>
                                                    <p className="text-xs text-slate-400 font-medium mt-0.5 max-w-[160px] truncate">
                                                        {branch.address || 'No address set'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button title="Set Pricing" onClick={() => setPricingBranch(branch)}
                                                    className="size-8 bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary rounded-lg flex items-center justify-center text-slate-500 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">payments</span>
                                                </button>
                                                <button onClick={() => setEditingBranch(branch)}
                                                    className="size-8 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 rounded-lg flex items-center justify-center text-slate-500 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                </button>
                                                <button onClick={() => setDeletingBranch(branch)}
                                                    className="size-8 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 rounded-lg flex items-center justify-center text-slate-500 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                                                <div className="text-2xl font-black text-slate-900 dark:text-white">{tableCount}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Tables</div>
                                            </div>
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                                                <div className="text-2xl font-black text-primary">{sessionCount}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Active</div>
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedBranch(branch.id); setTab('overview'); }}
                                            className="mt-3 w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors flex items-center justify-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">table_bar</span>
                                            View Tables
                                        </button>
                                    </div>
                                );
                            })}
                            {/* Add branch card */}
                            <div onClick={() => setShowAddBranch(true)}
                                className="group bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all opacity-50 hover:opacity-100 min-h-[160px]">
                                <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/10 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined">add</span>
                                </div>
                                <span className="text-xs font-bold text-slate-400 group-hover:text-primary transition-colors">ADD BRANCH</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
