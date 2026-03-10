import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HeroScene from '../components/Hero';
import { Logo } from '../components/Shared/Logo';

export default function LandingPage() {
    const { session, appUser } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const getDashboardPath = () => {
        if (!appUser) return '/login';
        if (appUser.role === 'ADMIN' || appUser.role === 'SUPER_ADMIN') return '/admin';
        if (appUser.role === 'STORE_OWNER') return '/owner';
        if (appUser.role === 'STAFF') return '/staff';
        return '/player';
    };

    return (
        <div className="bg-background-light text-slate-900 font-display min-h-screen">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 bg-background-light/80 backdrop-blur-md border-b border-primary/10">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Logo size="large" className="transform hover:scale-105 transition duration-300" />
                        <span className="text-2xl font-800 tracking-tight text-slate-900">Cue<span className="text-primary">Manager</span></span>
                    </div>
                    
                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        <a className="text-sm font-semibold text-slate-custom hover:text-primary transition-colors" href="#features">Features</a>
                        <a className="text-sm font-semibold text-slate-custom hover:text-primary transition-colors" href="#dashboard">Analytics</a>
                        <a className="text-sm font-semibold text-slate-custom hover:text-primary transition-colors" href="#pricing">Pricing</a>
                        {session ? (
                            <button onClick={() => navigate(getDashboardPath())} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2">
                                Go to Dashboard <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        ) : (
                            <>
                                <Link to="/login" className="bg-primary/10 text-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/20 transition-all">Login</Link>
                                <Link to="/register" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all">Start Free Trial</Link>
                            </>
                        )}
                    </nav>

                    {/* Mobile Menu Button */}
                    <button 
                        className="md:hidden text-slate-900 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>

                {/* Mobile Nav Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-slate-200 shadow-xl py-4 px-6 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200 z-40">
                        <a className="text-base font-semibold text-slate-700 py-2 border-b border-slate-100" href="#features" onClick={() => setIsMenuOpen(false)}>Features</a>
                        <a className="text-base font-semibold text-slate-700 py-2 border-b border-slate-100" href="#dashboard" onClick={() => setIsMenuOpen(false)}>Analytics</a>
                        <a className="text-base font-semibold text-slate-700 py-2 border-b border-slate-100" href="#pricing" onClick={() => setIsMenuOpen(false)}>Pricing</a>
                        <div className="flex flex-col gap-3 pt-2">
                            {session ? (
                                <button onClick={() => { setIsMenuOpen(false); navigate(getDashboardPath()); }} className="w-full bg-primary text-white px-6 py-3 rounded-xl font-bold text-base hover:shadow-lg transition-all flex justify-center items-center gap-2">
                                    Go to Dashboard <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            ) : (
                                <>
                                    <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full text-center bg-primary/10 text-primary px-5 py-3 rounded-xl font-bold text-base hover:bg-primary/20 transition-all">Login</Link>
                                    <Link to="/register" onClick={() => setIsMenuOpen(false)} className="w-full text-center bg-primary text-white px-6 py-3 rounded-xl font-bold text-base hover:shadow-lg transition-all">Start Free Trial</Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            <main>
                {/* Hero Section */}
                <section className="relative overflow-hidden min-h-[90vh] flex items-center justify-center pt-1">
                    {/* Interactive 3D Hero Scene as Background */}
                    <div className="absolute inset-0 z-0 w-full h-full opacity-80">
                        <HeroScene />
                    </div>

                    <div className="max-w-7xl mx-auto px-6 relative z-10 w-full flex justify-center text-center">
                        <div className="max-w-3xl p-10 md:p-14 flex flex-col items-center">
                            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-5 py-2.5 rounded-full mb-8 font-bold border border-primary/20 backdrop-blur-md">
                                <span className="material-symbols-outlined text-sm">bolt</span>
                                <span className="text-xs uppercase tracking-widest">The New Standard in Hall Management</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-800 text-slate-900 leading-[1.1] tracking-tight mb-8">
                                Smart Management for <span className="text-primary drop-shadow-sm">Pool & Snooker</span> Halls
                            </h1>
                            <p className="text-lg md:text-xl text-slate-800 font-medium mb-12 leading-relaxed max-w-2xl">
                                Streamline your tables, track live earnings, and manage bookings with the industry's most intuitive floor plan. Designed for the modern hall owner.
                            </p>
                            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
                                {session ? (
                                    <button onClick={() => navigate(getDashboardPath())} className="bg-primary text-white px-8 py-4 rounded-2xl font-800 text-lg hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                                        Go to Dashboard <span className="material-symbols-outlined font-bold">arrow_forward</span>
                                    </button>
                                ) : (
                                    <>
                                        <Link to="/register" className="bg-primary text-white px-8 py-4 rounded-2xl font-800 text-lg hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                                            Start Free Trial <span className="material-symbols-outlined font-bold">arrow_forward</span>
                                        </Link>
                                        <button className="bg-white/80 backdrop-blur border border-slate-200/50 text-slate-900 px-8 py-4 rounded-2xl font-800 text-lg hover:bg-white hover:-translate-y-1 hover:shadow-xl transition-all">
                                            Book a Demo
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature 1: Visual Floor Layout */}
                <section className="py-24 bg-white" id="features">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-20 items-center">
                            <div className="order-2 lg:order-1">
                                <div className="bg-background-light p-4 rounded-xl border border-slate-100 soft-shadow">
                                    <div className="bg-white rounded-lg p-8 h-[400px] flex items-center justify-center relative overflow-hidden">
                                        <div className="grid grid-cols-4 gap-4 w-full h-full opacity-20 absolute top-0 left-0 p-4">
                                            <div className="border border-dashed border-primary/40 rounded-lg"></div>
                                            <div className="border border-dashed border-primary/40 rounded-lg"></div>
                                            <div className="border border-dashed border-primary/40 rounded-lg"></div>
                                            <div className="border border-dashed border-primary/40 rounded-lg"></div>
                                        </div>
                                        <div className="z-10 bg-primary/10 border-2 border-primary border-dashed p-6 rounded-xl flex flex-col items-center gap-4 cursor-move transform hover:scale-105 transition-transform">
                                            <span className="material-symbols-outlined text-primary text-4xl">open_with</span>
                                            <p className="text-xs font-bold text-primary uppercase">Drag to reposition</p>
                                        </div>
                                        <div className="absolute top-10 right-10 bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">view_quilt</span>
                                            <span className="text-sm font-bold">Snap to Grid</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="order-1 lg:order-2">
                                <span className="text-primary font-bold text-sm tracking-widest uppercase">Management</span>
                                <h2 className="text-4xl font-800 text-slate-900 mt-4 mb-6">Visual Floor Layout Preview</h2>
                                <p className="text-lg text-slate-custom leading-relaxed mb-8">
                                    Design your hall's layout in seconds. Use our drag-and-drop interface to position tables, bars, and seating areas. Changes reflect instantly on your live dashboard.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-primary">check_circle</span>
                                        <span className="font-semibold text-slate-900">Custom table sizing (7ft, 8ft, 9ft, Snooker)</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-primary">check_circle</span>
                                        <span className="font-semibold text-slate-900">Real-time occupancy visualization</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-primary">check_circle</span>
                                        <span className="font-semibold text-slate-900">One-click session initiation</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature 2: Revenue Dashboard */}
                <section className="py-24 bg-background-light" id="dashboard">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <span className="text-primary font-bold text-sm tracking-widest uppercase">Analytics</span>
                            <h2 className="text-4xl font-800 text-slate-900 mt-4 mb-6">Real-Time Revenue Insights</h2>
                            <p className="text-slate-custom">Monitor your hall's performance with live updates. Watch your earnings grow as games conclude.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="bg-white p-8 rounded-xl border border-slate-200 soft-shadow">
                                <p className="text-sm font-bold text-slate-custom mb-2">LIVE EARNINGS (TODAY)</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-4xl font-800 text-slate-900">$1,452.20</h3>
                                    <span className="text-primary text-sm font-bold flex items-center">
                                        <span className="material-symbols-outlined text-xs">trending_up</span> 12%
                                    </span>
                                </div>
                                <div className="mt-6 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[75%]"></div>
                                </div>
                                <p className="mt-2 text-xs text-slate-custom font-medium italic">75% of daily goal reached</p>
                            </div>
                            <div className="bg-white p-8 rounded-xl border border-slate-200 soft-shadow">
                                <p className="text-sm font-bold text-slate-custom mb-2">ACTIVE TABLES</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-4xl font-800 text-slate-900">14<span className="text-slate-300">/20</span></h3>
                                    <span className="text-orange-500 text-sm font-bold flex items-center">
                                        Peak Hours
                                    </span>
                                </div>
                                <div className="mt-6 flex gap-1">
                                    <div className="h-8 flex-1 bg-primary/20 rounded-sm"></div>
                                    <div className="h-8 flex-1 bg-primary/30 rounded-sm"></div>
                                    <div className="h-8 flex-1 bg-primary/40 rounded-sm"></div>
                                    <div className="h-8 flex-1 bg-primary/60 rounded-sm"></div>
                                    <div className="h-8 flex-1 bg-primary rounded-sm"></div>
                                </div>
                            </div>
                            <div className="bg-white p-8 rounded-xl border border-slate-200 soft-shadow">
                                <p className="text-sm font-bold text-slate-custom mb-2">AVG. SESSION TIME</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-4xl font-800 text-slate-900">82 <span className="text-slate-300 text-2xl uppercase">min</span></h3>
                                </div>
                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-slate-400">POOL</p>
                                        <p className="text-sm font-bold">45m</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-slate-400">SNOOKER</p>
                                        <p className="text-sm font-bold">124m</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature 3: Split Billing */}
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-20 items-center">
                            <div>
                                <span className="text-primary font-bold text-sm tracking-widest uppercase">Payments</span>
                                <h2 className="text-4xl font-800 text-slate-900 mt-4 mb-6">Split Billing Made Effortless</h2>
                                <p className="text-lg text-slate-custom leading-relaxed mb-8">
                                    Group of four splitting the bill? No problem. Use our 'drag-to-split' interface to distribute costs across players in seconds.
                                </p>
                                <div className="flex gap-4 p-4 bg-background-light rounded-xl border border-slate-100">
                                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                                        $
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">Total: $45.00</h4>
                                        <p className="text-sm text-slate-custom">3 Players active</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-background-light p-10 rounded-xl border border-slate-100 soft-shadow relative">
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-lg flex items-center justify-between border border-primary/20 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">JS</div>
                                            <span className="font-bold">John Smith</span>
                                        </div>
                                        <span className="font-800 text-primary">$15.00</span>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg flex items-center justify-between border border-primary/20 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">AW</div>
                                            <span className="font-bold">Alex Wong</span>
                                        </div>
                                        <span className="font-800 text-primary">$15.00</span>
                                    </div>
                                    <div className="bg-white/50 p-4 rounded-lg flex items-center justify-between border border-dashed border-slate-300">
                                        <div className="flex items-center gap-3 opacity-40">
                                            <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">?</div>
                                            <span className="font-bold">Drop here to add player</span>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-300">add</span>
                                    </div>
                                </div>
                                {/* Drag Metaphor Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-primary text-white p-2 rounded-lg shadow-xl animate-bounce">
                                        <span className="material-symbols-outlined">touch_app</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature 4: Pricing Timeline */}
                <section className="py-24 bg-background-light" id="pricing">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <span className="text-primary font-bold text-sm tracking-widest uppercase">Flexibility</span>
                            <h2 className="text-4xl font-800 text-slate-900 mt-4 mb-6">Peak & Off-Peak Pricing</h2>
                            <p className="text-slate-custom">Set automated price shifts throughout the day to maximize revenue during your busiest hours.</p>
                        </div>
                        <div className="bg-white p-8 rounded-xl border border-slate-200 soft-shadow overflow-hidden">
                            <div className="flex justify-between items-end mb-4">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="size-3 rounded-full bg-primary/20 border border-primary"></div>
                                        <span className="text-xs font-bold text-slate-custom">OFF-PEAK ($12/hr)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="size-3 rounded-full bg-primary shadow-sm shadow-primary/40"></div>
                                        <span className="text-xs font-bold text-slate-custom">PEAK ($22/hr)</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-400">MONDAY - FRIDAY</span>
                            </div>
                            <div className="relative h-48 flex items-end gap-1">
                                {/* Timeline bars */}
                                <div className="flex-1 h-12 bg-primary/10 rounded-t-md hover:bg-primary/20 transition-all group relative">
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100">09:00</div>
                                </div>
                                <div className="flex-1 h-12 bg-primary/10 rounded-t-md hover:bg-primary/20 transition-all"></div>
                                <div className="flex-1 h-12 bg-primary/10 rounded-t-md hover:bg-primary/20 transition-all"></div>
                                <div className="flex-1 h-12 bg-primary/10 rounded-t-md hover:bg-primary/20 transition-all"></div>
                                <div className="flex-1 h-24 bg-primary rounded-t-md shadow-lg shadow-primary/10"></div>
                                <div className="flex-1 h-32 bg-primary rounded-t-md shadow-lg shadow-primary/15"></div>
                                <div className="flex-1 h-40 bg-primary rounded-t-md shadow-lg shadow-primary/20"></div>
                                <div className="flex-1 h-44 bg-primary rounded-t-md shadow-lg shadow-primary/25"></div>
                                <div className="flex-1 h-48 bg-primary rounded-t-md shadow-lg shadow-primary/30 relative">
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded">20:00 (Peak)</div>
                                </div>
                                <div className="flex-1 h-40 bg-primary rounded-t-md shadow-lg shadow-primary/20"></div>
                                <div className="flex-1 h-24 bg-primary/10 rounded-t-md hover:bg-primary/20 transition-all"></div>
                                <div className="flex-1 h-12 bg-primary/10 rounded-t-md hover:bg-primary/20 transition-all"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-24 bg-primary">
                    <div className="max-w-4xl mx-auto px-6 text-center text-white">
                        <h2 className="text-4xl font-800 mb-8 leading-tight">Ready to modernize your pool hall?</h2>
                        <p className="text-xl text-primary/10 opacity-90 mb-10 text-white/80">Join 500+ pool halls worldwide that use CueManager to run their business more efficiently.</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to="/register" className="bg-white text-primary px-10 py-5 rounded-xl font-800 text-xl shadow-2xl hover:bg-slate-50 transition-all">
                                Get Started Free
                            </Link>
                            <button className="bg-transparent border-2 border-white/30 text-white px-10 py-5 rounded-xl font-800 text-xl hover:bg-white/10 transition-all">
                                Talk to Sales
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-background-dark py-16 text-white/60">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <Logo size="small" />
                        </div>
                        <p className="max-w-sm">The world's most advanced management software for pool halls, snooker clubs, and billiard rooms.</p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-6">Product</h4>
                        <ul className="space-y-4 text-sm">
                            <li><a className="hover:text-primary transition-colors" href="#">Floor Plan</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Point of Sale</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Analytics</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Mobile App</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-6">Company</h4>
                        <ul className="space-y-4 text-sm">
                            <li><a className="hover:text-primary transition-colors" href="#">About</a></li>
                            <li><a className="hover:text-primary transition-colors" href="/privacy">Privacy Policy</a></li>
                            <li><a className="hover:text-primary transition-colors" href="/terms">Terms of Service</a></li>
                            <li><a className="hover:text-primary transition-colors" href="/refund">Refund policies</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 pt-16 mt-16 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
                    <p>© 2024 CueManager Inc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a className="hover:text-primary transition-colors" href="#">Twitter</a>
                        <a className="hover:text-primary transition-colors" href="#">LinkedIn</a>
                        <a className="hover:text-primary transition-colors" href="#">Instagram</a>
                    </div>
                </div>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
                .soft-shadow { box-shadow: 0 10px 25px -5px rgba(5, 148, 103, 0.05), 0 8px 10px -6px rgba(5, 148, 103, 0.05); }
            `}} />
        </div>
    );
}
