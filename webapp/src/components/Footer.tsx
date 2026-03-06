import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12">
                <div className="col-span-2 flex flex-col gap-6">
                    <Link to="/" className="flex items-center gap-2 group cursor-pointer">
                        <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-2xl">pool</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-white">CueManager</h2>
                    </Link>
                    <p className="text-sm leading-relaxed max-w-xs">
                        The leading management platform for billiards and snooker establishments worldwide. Precision, reliability, and modern growth.
                    </p>
                    <div className="flex gap-4">
                        <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">public</span></a>
                        <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">alternate_email</span></a>
                        <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">forum</span></a>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <h4 className="text-white font-bold">Product</h4>
                    <a className="text-sm hover:text-white transition-colors" href="#">Features</a>
                    <a className="text-sm hover:text-white transition-colors" href="#">Pricing</a>
                    <a className="text-sm hover:text-white transition-colors" href="#">POS Integration</a>
                    <a className="text-sm hover:text-white transition-colors" href="#">Mobile App</a>
                </div>

                <div className="flex flex-col gap-4">
                    <h4 className="text-white font-bold">Company</h4>
                    <a className="text-sm hover:text-white transition-colors" href="#">About Us</a>
                    <a className="text-sm hover:text-white transition-colors" href="#">Careers</a>
                    <a className="text-sm hover:text-white transition-colors" href="#">Customers</a>
                    <Link to="/privacy" className="text-sm hover:text-white transition-colors">Privacy</Link>
                    <Link to="/refund" className="text-sm hover:text-white transition-colors">Refund Policy</Link>
                </div>

                <div className="flex flex-col gap-4">
                    <h4 className="text-white font-bold">Support</h4>
                    <a className="text-sm hover:text-white transition-colors" href="#">Help Center</a>
                    <a className="text-sm hover:text-white transition-colors" href="#">Tutorials</a>
                    <a className="text-sm hover:text-white transition-colors" href="#">Contact</a>
                    <a className="text-sm hover:text-white transition-colors" href="#">API Docs</a>
                </div>

                <div className="flex flex-col gap-4">
                    <h4 className="text-white font-bold">Community</h4>
                    <a className="text-sm hover:text-white transition-colors" href="#">Forum</a>
                    <a className="text-sm hover:text-white transition-colors" href="#">Events</a>
                    <a className="text-sm hover:text-white transition-colors" href="#">Partners</a>
                    <a className="text-sm hover:text-white transition-colors" href="#">Blog</a>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-800 text-xs flex flex-col md:flex-row justify-between gap-4">
                <p>© 2024 CueManager SaaS. All rights reserved.</p>
                <div className="flex gap-8">
                    <Link to="/terms" className="hover:text-white">Terms of Service</Link>
                    <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
                    <Link to="/refund" className="hover:text-white">Refund Policy</Link>
                </div>
            </div>
        </footer>
    );
}
