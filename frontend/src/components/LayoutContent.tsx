'use client';

import Sidebar from './Sidebar';
import GlobalSidebarToggle from './GlobalSidebarToggle';
import ShiftSetupOverlay from './ShiftSetupOverlay';
import { AlertProvider } from './ui/AlertProvider';
import { useSidebar } from './SidebarContext';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';
import { useToast } from './ui/ToastProvider';
import { useState } from 'react';
import { MqttProvider, useMqtt } from '@/context/MqttContext';
import { RealtimeDataProvider } from '@/context/RealtimeDataContext';

function MqttListeners() {
    const { subscribe } = useMqtt();
    const { showToast } = useToast();
    const showToastRef = useRef(showToast);

    // Keep ref in sync without triggering effect re-runs
    useEffect(() => { showToastRef.current = showToast; });

    useEffect(() => {
        return subscribe('billiard/notifications/warning', (data) => {
            showToastRef.current(data.title, data.message, 'warning', data.tableId);
        });
    }, [subscribe]); // subscribe is stable — never recreated

    return null;
}

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const { isOpen } = useSidebar();
    const { user, loading } = useAuth();
    const { showToast } = useToast();
    const pathname = usePathname();
    const router = useRouter();
    const [prevPath, setPrevPath] = useState(pathname);
    const [navigating, setNavigating] = useState(false);

    useEffect(() => {
        if (pathname !== prevPath) {
            setNavigating(true);
            const timer = setTimeout(() => {
                setNavigating(false);
                setPrevPath(pathname);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [pathname, prevPath]);

    useEffect(() => {
        if (!loading && !user && pathname !== '/login') {
            router.push('/login');
        }
    }, [user, loading, pathname, router]);

    const isAuthPage = pathname === '/login';

    if (loading || (!user && !isAuthPage)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (isAuthPage) return (
        <AlertProvider>
            <MqttProvider>
                {children}
            </MqttProvider>
        </AlertProvider>
    );

    return (
        <MqttProvider>
            <RealtimeDataProvider>
                <MqttListeners />
                <div className="flex bg-slate-50 w-full min-h-screen">
                    {/* Top progress bar for navigation feedback */}
                    {navigating && (
                        <div className="fixed top-0 left-0 right-0 z-[999] h-0.5 bg-indigo-600 animate-pulse" />
                    )}
                    {user && <Sidebar />}
                    {user && <GlobalSidebarToggle />}
                    {user && <ShiftSetupOverlay />}
                    <div className={`flex-1 min-h-screen print:ml-0 transition-all duration-300 pt-16 lg:pt-0 print:pt-0 ${user && isOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
                        <AlertProvider>
                            {children}
                        </AlertProvider>
                    </div>
                </div>
            </RealtimeDataProvider>
        </MqttProvider>
    );
}

