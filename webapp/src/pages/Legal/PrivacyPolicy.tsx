import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';

export default function PrivacyPolicy() {
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
                            <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-violet-500">lock</span>
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Privacy Policy</h1>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Effective Date: March 7, 2026</p>
                            </div>
                        </div>
                        <div className="h-1 w-24 bg-gradient-to-r from-violet-500 to-violet-500/40 rounded-full" />
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-10">
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-violet-500">info</span>
                                1. Introduction
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                CueManager ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our Platform and services. By using CueManager, you consent to the data practices described in this policy.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-violet-500">database</span>
                                2. Information We Collect
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">We collect several types of information:</p>

                            <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-3">a) Personal Information</h3>
                            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">data_object</span>Name, email address, phone number</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">data_object</span>Business/organization name and address</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">data_object</span>Payment information (UPI ID, transaction references)</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">data_object</span>Role-based access credentials (Owner, Staff, Player)</li>
                            </ul>

                            <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-3">b) Usage Data</h3>
                            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">data_object</span>Session logs, table usage history, and game statistics</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">data_object</span>Browser type, IP address, device information</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">data_object</span>Pages visited, time spent, and feature interaction patterns</li>
                            </ul>

                            <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-3">c) Financial Data</h3>
                            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">data_object</span>Transaction records, payment method preferences, invoice data</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">data_object</span>Subscription plan details and billing history</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-violet-500">settings</span>
                                3. How We Use Your Information
                            </h2>
                            <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">check_circle</span><strong>Service Delivery:</strong> To provide, operate, and maintain the Platform features including table management, billing, and analytics</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">check_circle</span><strong>Account Management:</strong> To manage user registration, authentication, and role-based access privileges</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">check_circle</span><strong>Communication:</strong> To send service-related notices, subscription reminders, and platform updates</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">check_circle</span><strong>Analytics:</strong> To generate business intelligence dashboards for store owners, including revenue trends and session metrics</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">check_circle</span><strong>Security:</strong> To detect and prevent fraud, unauthorized access, and suspicious behavior through our fraud alert system</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">check_circle</span><strong>Improvement:</strong> To enhance user experience, fix bugs, and develop new features</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-violet-500">share</span>
                                4. Information Sharing & Disclosure
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                We do not sell your personal information. We may share data only in the following circumstances:
                            </p>
                            <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">group</span><strong>Within Your Organization:</strong> Data is shared between users of the same organization (e.g., owner sees staff activity logs)</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">cloud</span><strong>Service Providers:</strong> Trusted third-party providers who assist in hosting, analytics, and payment processing</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">gavel</span><strong>Legal Requirements:</strong> When required by law, regulation, or legal proceedings</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-violet-500 text-sm mt-1">security</span><strong>Safety:</strong> To protect CueManager's rights, safety, and the integrity of the Platform</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-violet-500">enhanced_encryption</span>
                                5. Data Security
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                We implement industry-standard security measures to protect your data:
                            </p>
                            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">verified_user</span>TLS/SSL encryption for all data in transit</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">verified_user</span>Encrypted storage for sensitive data at rest</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">verified_user</span>Role-based access controls and JWT-based authentication</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">verified_user</span>Regular security audits and vulnerability assessments</li>
                            </ul>
                            <p className="text-slate-500 text-sm mt-4 italic">
                                While we strive to use commercially acceptable means to protect your data, no method of electronic transmission or storage is 100% secure.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-violet-500">tune</span>
                                6. Your Rights
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">Depending on your jurisdiction, you may have the following rights:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { icon: 'visibility', label: 'Right to Access', desc: 'Request a copy of your personal data' },
                                    { icon: 'edit', label: 'Right to Rectification', desc: 'Correct inaccurate or incomplete data' },
                                    { icon: 'delete', label: 'Right to Erasure', desc: 'Request deletion of your data' },
                                    { icon: 'download', label: 'Right to Portability', desc: 'Receive your data in a structured format' },
                                    { icon: 'do_not_disturb', label: 'Right to Restrict', desc: 'Limit how your data is processed' },
                                    { icon: 'cancel', label: 'Right to Object', desc: 'Object to certain data processing activities' },
                                ].map(r => (
                                    <div key={r.label} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                        <span className="material-symbols-outlined text-violet-500 mt-0.5">{r.icon}</span>
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-white">{r.label}</p>
                                            <p className="text-xs text-slate-500">{r.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-slate-500 text-sm mt-4">
                                To exercise any of these rights, contact us at <strong className="text-slate-700 dark:text-slate-300">privacy@cuemanager.com</strong>.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-violet-500">cookie</span>
                                7. Cookies & Tracking
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                CueManager uses essential cookies and local storage to maintain your authentication session, remember preferences, and provide a seamless experience across the Platform. We do not use third-party advertising cookies. Analytics cookies may be used to understand usage patterns and improve the service. You can configure your browser to refuse cookies, though this may affect Platform functionality.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-violet-500">child_care</span>
                                8. Children's Privacy
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                CueManager is not intended for individuals under the age of 18. We do not knowingly collect personal information from minors. If you are a parent or guardian and believe your child has provided us with personal data, please contact us and we will promptly take steps to remove that information from our systems.
                            </p>
                        </section>

                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-violet-500">mail</span>
                                9. Contact Us
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                For any privacy-related inquiries or requests, please reach out to us:
                            </p>
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <p className="font-bold text-slate-900 dark:text-white">CueManager Privacy Team</p>
                                <p className="text-sm text-slate-500 mt-1">Email: privacy@cuemanager.com</p>
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
