import { Link } from 'react-router-dom';

export default function TopNavBar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 group cursor-pointer">
                    <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-2xl">pool</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">CueManager</h2>
                </Link>
                <nav className="hidden md:flex items-center gap-10">
                    <a className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors" href="#features">Features</a>
                    <a className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors" href="#pricing">Pricing</a>
                    <a className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors" href="#">Resources</a>
                    <a className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors" href="#">Support</a>
                </nav>
                <div className="flex items-center gap-4">
                    <Link to="/login" className="hidden sm:block px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-primary transition-colors">Log In</Link>
                    <Link to="/register" className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all">
                        Start Free Trial
                    </Link>
                </div>
            </div>
        </header>
    );
}
