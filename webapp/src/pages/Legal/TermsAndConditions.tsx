import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';

export default function TermsAndConditions() {
    return (
        <>
            {/* Top Navigation Bar */}
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-xl">pool</span>
                        </div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">CueManager</h1>
                    </Link>
                    <Link to="/" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Back to Home
                    </Link>
                </div>
            </nav>

            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
                <div className="max-w-4xl mx-auto px-6 py-16">
                    {/* Header */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-primary">gavel</span>
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Terms & Conditions</h1>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Last Updated: March 7, 2026</p>
                            </div>
                        </div>
                        <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary/40 rounded-full" />
                    </div>

                    {/* Content */}
                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-10">
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">handshake</span>
                                1. Acceptance of Terms
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                By accessing or using CueManager ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our services. These terms apply to all visitors, users, and others who access or use the Platform, including store owners, staff members, and players.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">description</span>
                                2. Description of Service
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                CueManager is a cloud-based Software-as-a-Service (SaaS) platform designed for managing billiards, snooker, and pool establishments. The Platform provides:
                            </p>
                            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>Real-time table and session management</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>Payment processing (Cash, UPI, Card, Wallet)</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>Point of Sale (POS) inventory management</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>Player profiles, ELO rating, and leaderboard tracking</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>Revenue analytics and financial reporting</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>Staff shift reconciliation and dues management</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">person</span>
                                3. User Accounts & Registration
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                To use the Platform, you must create an account providing accurate, current, and complete information. You are responsible for:
                            </p>
                            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-amber-500 text-sm mt-1">warning</span>Maintaining the confidentiality of your password and login credentials</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-amber-500 text-sm mt-1">warning</span>All activities that occur under your account</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-amber-500 text-sm mt-1">warning</span>Immediately notifying CueManager of any unauthorized use</li>
                            </ul>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
                                CueManager reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or remain inactive for prolonged periods.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">payments</span>
                                4. Subscription & Payment Terms
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                CueManager offers subscription-based pricing plans. By selecting a plan, you agree to:
                            </p>
                            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>Pay the applicable fees according to the billing cycle (monthly/yearly)</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>All prices are displayed in Indian Rupees (₹) and are exclusive of applicable taxes</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>Subscriptions automatically renew unless cancelled before the billing cycle ends</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>A free trial period is provided for new registrations, the duration of which is set by the platform administrator</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">shield</span>
                                5. Intellectual Property
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                All content, features, and functionality of the Platform — including but not limited to text, graphics, logos, icons, images, software code, and design elements — are owned by CueManager and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without explicit written permission.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">block</span>
                                6. Prohibited Activities
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">You agree not to:</p>
                            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-red-500 text-sm mt-1">close</span>Use the Platform for any illegal or unauthorized purpose</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-red-500 text-sm mt-1">close</span>Attempt to reverse-engineer, decompile, or hack the Platform</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-red-500 text-sm mt-1">close</span>Introduce malicious code, viruses, or disruptive technologies</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-red-500 text-sm mt-1">close</span>Use automated systems (bots, scrapers) to access the Platform without permission</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-red-500 text-sm mt-1">close</span>Share, resell, or sublicense your account to third parties</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">balance</span>
                                7. Limitation of Liability
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                To the maximum extent permitted by applicable law, CueManager shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of profits, data, or business opportunities — arising from your use of or inability to use the Platform. Our total liability shall not exceed the amount paid by you in the twelve (12) months preceding the event giving rise to the claim.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">update</span>
                                8. Changes to These Terms
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                CueManager reserves the right to modify these Terms and Conditions at any time. Material changes will be communicated through in-app notifications or email. Continued use of the Platform after changes constitute acceptance of the revised terms. We encourage you to review this page periodically.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">mail</span>
                                9. Contact Us
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                If you have any questions about these Terms and Conditions, please contact us at:
                            </p>
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <p className="font-bold text-slate-900 dark:text-white">CueManager Support</p>
                                <p className="text-sm text-slate-500 mt-1">Email: support@cuemanager.com</p>
                                <p className="text-sm text-slate-500">Website: www.cuemanager.com</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            <Footer />
        </>
    );
}
