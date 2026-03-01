'use client';

import React from 'react';
import { PanelLeftOpen } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { usePathname } from 'next/navigation';

export default function GlobalSidebarToggle() {
    const { isOpen, toggle } = useSidebar();
    const pathname = usePathname();

    // Hide on specialized full-screen pages that have their own navigation
    const hiddenPaths = ['/kds', '/bartender', '/cafe'];
    if (hiddenPaths.includes(pathname)) return null;

    // Only show when the sidebar is closed (lg+ screens)
    if (isOpen) return null;

    return (
        <button
            onClick={toggle}
            aria-label="Buka navigasi"
            className={[
                // Position: aligned with normal header height
                'fixed top-4 left-4 z-[80]',
                // Size: elegant and premium
                'w-12 h-12',
                // Appearance
                'flex items-center justify-center',
                'bg-[#0F172A] text-slate-400',
                'rounded-2xl border border-slate-700/80',
                'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
                // States
                'hover:bg-slate-800 hover:text-white hover:border-slate-600',
                'active:scale-95',
                // Transitions
                'transition-all duration-300',
                // Only visible on desktop (mobile has its own top bar in Sidebar.tsx)
                'hidden lg:flex',
                // Entry animation
                'animate-in slide-in-from-left-4 fade-in duration-500 ease-out',
                // Hide on print
                'print:hidden',
            ].join(' ')}
        >
            <PanelLeftOpen className="w-5 h-5" />

            {/* Pulsing indicator for "Hidden" state elegance */}
            <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
        </button>
    );
}
