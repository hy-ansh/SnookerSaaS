import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';

export default function RefundPolicy() {
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
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-amber-500">currency_exchange</span>
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Refund Policy</h1>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Last Updated: March 7, 2026</p>
                            </div>
                        </div>
                        <div className="h-1 w-24 bg-gradient-to-r from-amber-500 to-amber-500/40 rounded-full" />
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-10">
                        {/* Refund Overview */}
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-amber-500">receipt_long</span>
                                1. Overview
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                At CueManager, we strive to deliver an exceptional experience for all our users. This Refund Policy outlines the terms under which you may request a refund for subscription payments. All refund amounts are processed in Indian Rupees (₹). We believe in transparency and fairness — if you're not satisfied, we want to make it right.
                            </p>
                        </section>

                        {/* Free Trial */}
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-amber-500">timer</span>
                                2. Free Trial Period
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                All new organizations receive a free trial period upon registration. During this period:
                            </p>
                            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">check_circle</span>Full access to all features is provided at no cost</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">check_circle</span>No credit card or payment information is required to start the trial</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">check_circle</span>You will not be charged during the trial period</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm mt-1">check_circle</span>At the end of the trial, you will be prompted to choose a subscription plan to continue using the Platform</li>
                            </ul>
                            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300 flex items-start gap-3">
                                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
                                <p>Since no payment is collected during the free trial, no refund is applicable for this period. If you decide not to continue, your account will simply be deactivated after the trial expires.</p>
                            </div>
                        </section>

                        {/* Subscription Refunds */}
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-amber-500">credit_card</span>
                                3. Subscription Refunds
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                                The following refund eligibility applies to paid subscription plans:
                            </p>

                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                    <h3 className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        Within 7 Days of Purchase — Full Refund
                                    </h3>
                                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                        If you are dissatisfied with the Platform within the first 7 days of a new subscription or renewal, you may request a full refund. The refund will be processed to your original payment method within 5–10 business days.
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                    <h3 className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-sm">schedule</span>
                                        8–30 Days After Purchase — Pro-Rated Refund
                                    </h3>
                                    <p className="text-sm text-amber-600 dark:text-amber-400">
                                        Requests made between 8 and 30 days after the payment date are eligible for a pro-rated refund based on the unused portion of the billing period. Administrative fees may apply.
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <h3 className="font-bold text-red-700 dark:text-red-300 flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                        After 30 Days — No Refund
                                    </h3>
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        Refund requests made more than 30 days after the payment date will not be eligible for a refund. However, you can cancel your subscription to prevent future charges. Your access will continue until the end of the current billing period.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* How to Request */}
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-amber-500">support_agent</span>
                                4. How to Request a Refund
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                                To initiate a refund, please follow these steps:
                            </p>
                            <div className="space-y-4">
                                {[
                                    { step: '1', title: 'Contact Support', desc: 'Email us at billing@cuemanager.com with your organization name, registered email, and reason for the refund request.' },
                                    { step: '2', title: 'Verification', desc: 'Our team will verify your account details and subscription history within 1–2 business days.' },
                                    { step: '3', title: 'Approval & Processing', desc: 'Once approved, the refund will be processed within 5–10 business days to your original payment method.' },
                                    { step: '4', title: 'Confirmation', desc: 'You will receive an email confirmation once the refund has been successfully initiated.' },
                                ].map(s => (
                                    <div key={s.step} className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-lg flex items-center justify-center shrink-0">
                                            {s.step}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">{s.title}</h3>
                                            <p className="text-sm text-slate-500 mt-0.5">{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Non-Refundable Items */}
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-amber-500">money_off</span>
                                5. Non-Refundable Items
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                The following are not eligible for refunds:
                            </p>
                            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-red-500 text-sm mt-1">close</span>Free trial periods (since no payment is charged)</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-red-500 text-sm mt-1">close</span>Subscription fees for periods where the service was actively used and then cancelled after the refund window</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-red-500 text-sm mt-1">close</span>Custom implementation or onboarding services (if applicable)</li>
                                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-red-500 text-sm mt-1">close</span>Accounts terminated due to violations of Terms and Conditions</li>
                            </ul>
                        </section>

                        {/* Disputes */}
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-amber-500">forum</span>
                                6. Disputes & Escalation
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                If you are unsatisfied with the outcome of your refund request, you may escalate the matter by contacting our disputes team at <strong className="text-slate-700 dark:text-slate-300">disputes@cuemanager.com</strong>. We aim to resolve all disputes amicably within 15 business days. CueManager's decision on refund disputes shall be considered final.
                            </p>
                        </section>

                        {/* Changes */}
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-amber-500">update</span>
                                7. Changes to This Policy
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                CueManager reserves the right to modify this Refund Policy at any time. Changes will take effect immediately upon being posted on this page. We recommend reviewing this page periodically to stay informed of any updates. Continued use of the Platform after modifications constitutes acceptance of the revised policy.
                            </p>
                        </section>

                        {/* Contact */}
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-amber-500">mail</span>
                                8. Contact Us
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                For any billing or refund inquires, please reach out to:
                            </p>
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <p className="font-bold text-slate-900 dark:text-white">CueManager Billing Support</p>
                                <p className="text-sm text-slate-500 mt-1">Email: billing@cuemanager.com</p>
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
