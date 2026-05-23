'use client';

import React from 'react';
import { PanelLeftOpen } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { usePathname } from 'next/navigation';

export default function GlobalSidebarToggle() {
    const { isOpen, toggle } = useSidebar();
    const pathname = usePathname();

    // Hide on specialized full-screen pages that have their own navigation
    const hiddenPaths = ['/kds', '/bartender', '/cafe', '/kitchen-bar'];
    if (hiddenPaths.includes(pathname)) return null;

    // Only show when the sidebar is closed (lg+ screens)
    if (isOpen) return null;

    return (
        <button
            onClick={toggle}
            aria-label="Buka navigasi"
            className={[
                // Position: Centered on the left edge
                'fixed left-0 top-1/2 -translate-y-1/2 z-[80]',
                // Size: Precise 2:1 ratio for a perfect half-circle
                'w-8 h-16',
                // Appearance: Half-circle flush with left edge
                'flex items-center justify-center',
                'bg-[#0F172A] text-slate-400',
                'rounded-r-full border-y border-r border-slate-700/50',
                'shadow-[2px_0_12px_rgba(0,0,0,0.5)]',
                'backdrop-blur-md',
                // States
                'hover:bg-slate-800 hover:text-white hover:border-indigo-500/50 hover:w-10',
                'active:scale-95',
                // Transitions
                'transition-all duration-300 ease-in-out',
                // Only visible on desktop
                'hidden lg:flex',
                // Entry animation: slide out from edge
                'animate-in slide-in-from-left fade-in duration-500 ease-out',
                // Hide on print
                'print:hidden',
            ].join(' ')}
        >
            <PanelLeftOpen className="w-3.5 h-3.5 -ml-0.5" />

            {/* Pulsing indicator - tucked elegantly near the curve */}
            <span className="absolute top-1/2 -translate-y-1/2 right-1 w-1 h-1 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
        </button>
    );
}
