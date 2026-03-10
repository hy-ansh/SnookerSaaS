import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../api/auth';
import { apiFetch } from '../../api/apiClient';
import FeatureGate from '../../components/FeatureGate';
import { LogoSpinner } from '../../components/Shared/LogoSpinner';

interface Branch {
    id: string;
    name: string;
}

function OnboardingContent() {
    const queryClient = useQueryClient();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);

    const { data: usersData, isLoading: isUsersLoading } = useQuery({
        queryKey: ['orgUsers'],
        queryFn: () => apiFetch('/owner/users')
    });

    const orgUsers = usersData?.users || [];

    // Form State
    const [role, setRole] = useState<'STAFF' | 'PLAYER'>('STAFF');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [branchId, setBranchId] = useState('');

    // Submission State
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await apiFetch('/branches');
                if (Array.isArray(res)) setBranches(res);
                if (res.length > 0) setBranchId(res[0].id);
            } catch (err) {
                console.error('Failed to load branches', err);
            } finally {
                setLoading(false);
            }
        };
        fetchBranches();
    }, []);

    const resetForm = () => {
        setFullName('');
        setEmail('');
        setPassword('');
        if (branches.length > 0) setBranchId(branches[0].id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!fullName || !email || !password || (role === 'STAFF' && !branchId)) {
            setError('Please fill out all required fields.');
            return;
        }

        setSubmitting(true);
        try {
            await authService.registerUserByAdmin({
                email,
                password,
                full_name: fullName,
                role,
                branch_id: role === 'PLAYER' ? undefined : (branchId || undefined)
            });
            setSuccess(`Success! ${role === 'STAFF' ? 'Staff member' : 'Player'} ${fullName} has been registered.`);
            queryClient.invalidateQueries({ queryKey: ['orgUsers'] });
            resetForm();
        } catch (err: any) {
            setError(err.message || 'Failed to create user. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <LogoSpinner size="size-12" />
                <p className="text-sm font-bold text-slate-400 animate-pulse">Preparing Roster...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 flex-1 px-4 lg:px-8 py-6">

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Team &amp; Player Onboarding</h1>
                <p className="text-slate-500 text-sm mt-1">Easily invite and provision accounts for your staff and regular players.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-8 md:p-10">

                    {/* Role Selector Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-8 border border-slate-200 dark:border-slate-700 w-full max-w-sm">
                        {(['STAFF', 'PLAYER'] as const).map(r => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => { setRole(r); setError(''); setSuccess(''); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${role === r
                                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    {r === 'STAFF' ? 'badge' : 'sports_golf'}
                                </span>
                                {r === 'STAFF' ? 'Add Staff' : 'Add Player'}
                            </button>
                        ))}
                    </div>

                    {/* Form Feedback */}
                    {error && (
                        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 text-red-600 font-medium">
                            <div className="size-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                            </div>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-600 font-medium">
                            <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            </div>
                            {success}
                        </div>
                    )}

                    {/* Form Fields */}
                    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">person</span>
                                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                                        placeholder={role === 'STAFF' ? 'John Manager' : 'Ronnie O\'Sullivan'}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">mail</span>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                        placeholder="user@example.com"
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">lock</span>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                                    placeholder="Minimum 6 characters"
                                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 mt-2 ml-1">
                                Secure password for this user's account. They can reset it later.
                            </p>
                        </div>

                        {/* Branch dropdown for STAFF only — players are auto-assigned to all branches */}
                        {role === 'STAFF' && branches.length > 1 && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Assign to Branch <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">store</span>
                                    <select value={branchId} onChange={e => setBranchId(e.target.value)} required
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none cursor-pointer">
                                        <option value="" disabled>Select a branch</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                            >
                                {submitting ? (
                                    <>
                                        <LogoSpinner size="size-5" light />
                                        <span>Provisioning Account...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[20px]">person_add</span>
                                        <span>Create {role === 'STAFF' ? 'Staff' : 'Player'} Account</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* //Visual Flair Sidebar (Desktop only)
                <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-1/3 bg-slate-50 dark:bg-slate-800/20 border-l border-slate-100 dark:border-slate-800 p-8">
                    <div className="h-full flex flex-col justify-center">
                        <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary shadow-inner">
                            <span className="material-symbols-outlined text-3xl">verified_user</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Secure Provisioning</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Adding a staff member grants them local access to track sessions and collect payments securely at their branch. Adding a player immediately enrolls them into your organization's CRM and loyalty system.
                        </p>
                    </div>
                </div> */}
            </div>

            {/* Existing Users List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden mt-8">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Organization Roster</h3>
                        <p className="text-sm text-slate-500 mt-1">Manage existing staff and players across your branches.</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4 pl-8">Name</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Branch</th>
                                <th className="p-4">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {isUsersLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500 font-bold animate-pulse">Loading roster...</td>
                                </tr>
                            ) : orgUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-4xl opacity-50">group_off</span>
                                        <p className="font-bold">No users found</p>
                                    </td>
                                </tr>
                            ) : (
                                orgUsers.map((user: any) => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4 pl-8">
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{user.fullName || 'Unknown'}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">{user.email}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase ${user.role === 'STAFF' || user.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{user.branchName}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-slate-500 text-sm">{new Date(user.createdAt).toLocaleDateString()}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function Onboarding() {
    return (
        <FeatureGate feature="team_management">
            <OnboardingContent />
        </FeatureGate>
    );
}
