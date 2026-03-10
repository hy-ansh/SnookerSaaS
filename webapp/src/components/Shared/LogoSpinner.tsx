import React from 'react';
import logoImg from '../../assets/logo.png';

interface LogoSpinnerProps {
    size?: string;
    className?: string;
    light?: boolean;
}

export const LogoSpinner: React.FC<LogoSpinnerProps> = ({ size = 'size-8', className = '', light = false }) => {
    return (
        <div className={`relative flex items-center justify-center ${className} ${size}`}>
            {/* Outer spinning dashed ring */}
            <div className="absolute inset-[-4px] rounded-full border-[3px] border-dashed border-primary/30 animate-[spin_3s_linear_infinite]" />

            {/* Inner pulsing solid ring */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 bg-primary/5 animate-pulse" />

            {/* A modern ping effect behind the logo */}
            <div className="absolute inset-1 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />

            {/* The Logo itself with a subtle scale breathing effect */}
            <img
                src={logoImg}
                alt="Loading..."
                className="w-full h-full object-contain relative z-10 animate-[pulse_1.5s_ease-in-out_infinite] scale-90"
                style={{
                    filter: light ? 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.5))' : 'drop-shadow(0px 4px 6px rgba(5,148,103,0.3))',
                }}
            />
        </div>
    );
};

export const LoadingScreen: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-6">
            <LogoSpinner size="size-16" />
            <div className="flex flex-col items-center">
                <h2 className="text-2xl font-800 tracking-tight text-slate-900 dark:text-white">Cue<span className="text-primary">Manager</span></h2>
                <div className="flex gap-1 mt-2">
                    <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Initializing Session</p>
        </div>
    );
};
