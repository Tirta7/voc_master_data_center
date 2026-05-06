'use client';

import React from 'react';
import ShiftSetupOverlay from '@/components/ShiftSetupOverlay';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ShiftSetupPage() {
    const { user, activeShift, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && activeShift) {
            // If shift is already active, go to dashboard
            router.push('/');
        }
    }, [activeShift, loading, router]);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-[#0F172A]">
            <ShiftSetupOverlay forcedOpen={true} />
        </div>
    );
}
