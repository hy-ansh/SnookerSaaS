import React from 'react';
import logoImg from '../../assets/logo.png';

type LogoSize = 'large' | 'medium' | 'small';

interface LogoProps {
    size?: LogoSize;
    className?: string;
    onClick?: () => void;
}

export function Logo({ size = 'medium', className = '', onClick }: LogoProps) {
    // Sizing maps exactly to requirements
    let sizeClasses = '';

    switch (size) {
        case 'large':
            // Landing Page: Hero / Navbar
            // Mobile: h 40-50, max-w 150
            // Tablet: h 50-65, max-w 200
            // Desktop: h 70-90, max-w 260
            sizeClasses = 'h-[40px] max-w-[150px] md:h-[55px] md:max-w-[200px] lg:h-[80px] lg:max-w-[260px]';
            break;
        case 'medium':
            // Login / Register
            // Centered above form, mb-24px (mb-6 in Tailwind)
            // Mobile: h 40-50, max-w 150
            // Tablet: h 50-65, max-w 200
            // Desktop: h 80-100, max-w 280
            sizeClasses = 'h-[45px] max-w-[150px] md:h-[60px] md:max-w-[200px] lg:h-[90px] lg:max-w-[280px] mb-6';
            break;
        case 'small':
            // Dashboards
            // h 36-48px, max-w 180px
            // Mobile: h 40-50, max-w 150 (We'll use standard small sizes to keep it tight in sidebar)
            sizeClasses = 'h-[36px] max-w-[140px] lg:h-[48px] lg:max-w-[180px]';
            break;
    }

    return (
        <div
            className={`flex items-center justify-center ${className}`}
            onClick={onClick}
            style={onClick ? { cursor: 'pointer' } : undefined}
        >
            <img
                src={logoImg}
                alt="CueManager logo"
                className={`w-full object-contain ${sizeClasses}`}
                style={{
                    // Optional fallback to handle potential checkered background 
                    // using CSS to remove light pixels if needed, but we rely on a clean PNG.
                    filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.05))'
                }}
                loading={size === 'large' ? 'eager' : 'lazy'}
            />
        </div>
    );
}
