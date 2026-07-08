'use client';

import Sidebar from './Sidebar';
import GlobalSidebarToggle from './GlobalSidebarToggle';
import ShiftSetupOverlay from './ShiftSetupOverlay';
import ShiftOvertimeNotifier from './ShiftOvertimeNotifier';
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
import SettlementWarningBanner from './SettlementWarningBanner';
import { InstallmentNotificationBanner } from './InstallmentNotificationBanner';
import { SWRConfig } from 'swr';

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
    const isActivatePage = pathname?.startsWith('/activate'); // ← halaman lisensi, tidak butuh login
    const isDashboard = pathname === '/'; // The Rental Station page
    const isCafePage = pathname === '/cafe'; // Cafe table management
    const isVibrантPage = isDashboard || isCafePage; // Pages with full-bleed purple header
    const isPublicPage = isAuthPage || isDisplayPage || isActivatePage;
    const hideSidebar = isDisplayPage || isBillingPage || isAuthPage || isActivatePage;
    
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
        <SWRConfig value={{
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 5000,
        }}>
            <AlertProvider>
                <MqttProvider>
                    <RealtimeDataProvider>
                        <MqttListeners />
                        <div className={`flex max-w-full overflow-x-clip w-full min-h-screen ${hideSidebar ? 'bg-[#020617]' : isVibrантPage ? 'bg-transparent' : 'bg-slate-50'} print:bg-white print:p-0`}>
                            {/* Smooth Gradient Blur for Dynamic Island (Mobile) - Hidden on vibrant pages */}
                            {!hideSidebar && !isVibrантPage && (
                                <div 
                                    className="fixed top-0 left-0 right-0 h-[calc(env(safe-area-inset-top)+40px)] z-[60] lg:hidden pointer-events-none"
                                    style={{
                                        background: 'linear-gradient(to bottom, rgba(248, 250, 252, 1) 0%, rgba(248, 250, 252, 0.8) 40%, rgba(248, 250, 252, 0) 100%)',
                                        backdropFilter: 'blur(8px)',
                                        WebkitBackdropFilter: 'blur(8px)',
                                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
                                        maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)'
                                    }}
                                />
                            )}
                            {/* Navigation feedback and Sidebar elements - Hidden on Display/Billing Page */}
                            {navigating && (
                                <div className="fixed top-0 left-0 right-0 z-[999] h-0.5 bg-indigo-600 animate-pulse print:hidden" />
                            )}
                            {user && !hideSidebar && <Sidebar />}
                            {user && !hideSidebar && <ShiftSetupOverlay />}
                            {user && !hideSidebar && <ShiftOvertimeNotifier />}
                            {user && <RedeemNotificationOverlay />}
                            <div className={`flex-1 min-w-0 max-w-full overflow-x-clip min-h-screen transition-all duration-300 print:m-0 print:p-0 print:bg-white ${(hideSidebar || isVibrантPage) ? '' : 'pt-[env(safe-area-inset-top)]'} lg:pt-0 ${user && isOpen && !hideSidebar ? 'lg:ml-72' : 'lg:ml-0'}`}>
                                {user && !hideSidebar && <InstallmentNotificationBanner />}
                                {user && !hideSidebar && <SettlementWarningBanner />}
                                {children}
                            </div>
                        </div>
                    </RealtimeDataProvider>
                </MqttProvider>
            </AlertProvider>
        </SWRConfig>
    );
}
