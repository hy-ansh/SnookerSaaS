import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';

// Basic Error Boundary to prevent full white screens
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 m-8 border-2 border-red-500 bg-red-50 text-red-900 rounded-2xl">
                    <h2 className="text-xl font-bold mb-4">Dashboard Component Crashed</h2>
                    <pre className="text-sm overflow-auto p-4 bg-white/50 rounded">{this.state.error?.message}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function DashboardLayout() {
    return (
        <div className="relative flex h-auto min-h-screen w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar />
            <main className="flex-1 ml-64 min-h-screen">
                <DashboardHeader />
                <div className="p-8">
                    <ErrorBoundary>
                        <Outlet />
                    </ErrorBoundary>
                </div>
            </main>
        </div>
    );
}
