'use client';

import Sidebar from './Sidebar';
import GlobalSidebarToggle from './GlobalSidebarToggle';
import ShiftSetupOverlay from './ShiftSetupOverlay';
import RedeemNotificationOverlay from './RedeemNotificationOverlay';
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
        const unsubWarning = subscribe('billiard/notifications/warning', (data) => {
            showToastRef.current(data.title, data.message, 'warning', data.tableId);
        });

        const unsubWaiter = subscribe('billiard/waiter/call', (data) => {
            showToastRef.current('PANGGILAN WAITER', `Meja ${data.tableName} memanggil pelayan!`, 'info', data.tableId);
        });

        return () => {
            unsubWarning();
            unsubWaiter();
        };
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
            
            // WATCHDOG: Force navigation to end after 5s if stuck
            const watchdog = setTimeout(() => {
                setNavigating(false);
            }, 5000);

            return () => {
                clearTimeout(timer);
                clearTimeout(watchdog);
            };
        }
    }, [pathname, prevPath]);

    const isAuthPage = pathname === '/login';
    const isDisplayPage = pathname?.startsWith('/display');
    const isBillingPage = pathname === '/billing';
    const isPublicPage = isAuthPage || isDisplayPage;
    const hideSidebar = isDisplayPage || isBillingPage;
    
    // As long as they are logged in (or public), let them render.
    // Specific page permissions are handled by their respective components or the Sidebar.
    const isAuthorized = isPublicPage || !!user;

    useEffect(() => {
        if (!loading) {
            if (!user && !isPublicPage) {
                router.push('/login');
            }
        }
    }, [user, loading, pathname, router, isPublicPage]);

    const [showRetry, setShowRetry] = useState(false);

    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => setShowRetry(true), 7000); // 7s timeout
            return () => clearTimeout(timer);
        } else {
            setShowRetry(false);
        }
    }, [loading]);

    // BLOCK RENDERING: If loading or not authorized for the current route
    if (loading || !isAuthorized) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] p-6 text-center">
                <div className="relative mb-8">
                    <div className="w-16 h-16 border-4 border-indigo-200/20 border-t-indigo-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                    </div>
                </div>
                <h2 className="text-white text-sm font-black uppercase tracking-[0.3em] mb-2">Sinkronisasi Data</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Mohon tunggu sebentar...</p>

                {showRetry && (
                    <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <p className="text-slate-500 text-[9px] font-bold uppercase mb-4">Koneksi tampaknya lambat?</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-700 shadow-lg active:scale-95"
                        >
                            RELOAD HALAMAN
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <AlertProvider>
            <MqttProvider>
                <RealtimeDataProvider>
                    <MqttListeners />
                    <div className={`flex w-full min-h-screen ${hideSidebar ? 'bg-[#020617]' : 'bg-slate-50'} print:bg-white print:p-0`}>
                        {/* Navigation feedback and Sidebar elements - Hidden on Display/Billing Page */}
                        {navigating && (
                            <div className="fixed top-0 left-0 right-0 z-[999] h-0.5 bg-indigo-600 animate-pulse print:hidden" />
                        )}
                        {user && !hideSidebar && <Sidebar />}
                        {user && !hideSidebar && <ShiftSetupOverlay />}
                        {user && <RedeemNotificationOverlay />}
                        <div className={`flex-1 min-h-screen transition-all duration-300 print:m-0 print:p-0 print:bg-white ${!hideSidebar ? 'pt-16 lg:pt-0' : 'pt-0'} ${user && isOpen && !hideSidebar ? 'lg:ml-72' : 'lg:ml-0'}`}>
                            {children}
                        </div>
                    </div>
                </RealtimeDataProvider>
            </MqttProvider>
        </AlertProvider>
    );
}

