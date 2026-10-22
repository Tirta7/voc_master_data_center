'use client';

import React from 'react';
import axios from 'axios';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Coffee,
    Terminal,
    Box,
    DollarSign,
    Users,
    BarChart3,
    Settings,
    History,
    ChevronRight,
    LogOut,
    Server,
    Wine,
    Gift,
    ChevronLeft,
    Menu,
    X,
    UtensilsCrossed,
    Wallet,
    Calendar,
    Clock,
    Lock,
    Cpu,
    Target,
    Scan,
    Orbit,
    PanelLeftOpen,
    MessageSquare,
    Activity,
    ShieldCheck,
    Receipt,
} from 'lucide-react';





import { useSidebar } from './SidebarContext';
import { useAuth } from '@/context/AuthContext';
import ShiftHandoverModal from './ShiftHandoverModal';
import ShiftStartModal from './ShiftStartModal';
import { openCheckoutQr } from './CheckoutQrModal';
import { useToast } from "@/components/ui/ToastProvider";
import LoginApprovalCenter from './LoginApprovalCenter';
import TableApprovalCenter from './TableApprovalCenter';
import TableExpiryCenter from './TableExpiryCenter';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { useLanguage } from '@/context/LanguageContext';
// import { API_URL } from '@/utils/urlUtils';

export default function Sidebar() {
    const pathname = usePathname();
    const [settings, setSettings] = React.useState<any>(null);
    const { isOpen, setIsOpen, toggle } = useSidebar();
    const { user, hasPermission, logout, activeShift, refetchShift } = useAuth();
    const { showToast } = useToast();
    const [isHandoverModalOpen, setIsHandoverModalOpen] = React.useState(false);
    const [isStartModalOpen, setIsStartModalOpen] = React.useState(false);

    const handleLogout = async () => {
        if (user?.requiresAttendance !== false) {
            try {
                const today = await axios.get('/attendance/today');
                if (today.data?.checkInTime && !today.data?.checkOutTime) {
                    openCheckoutQr();
                    return;
                }
            } catch (err) {
                console.error('Failed to check attendance before logout', err);
            }
        }
        logout();
    };
    const { 
        activeBilliardCount, 
        activeCafeCount, 
        pendingWaitingCount, 
        activeDebtCount, 
        redeemQueue, 
        unreadChatCount,
        upcomingInstallmentCount 
    } = useRealtimeData();
    const { t } = useLanguage();

    // Auto-collapse sidebar on specific full-screen pages
    React.useEffect(() => {
        if (pathname === '/kds' || pathname === '/bartender' || pathname === '/kitchen-bar') {
            setIsOpen(false);
        }
    }, [pathname, setIsOpen]);

    React.useEffect(() => {
        const handleOpenHandover = () => {
            setIsHandoverModalOpen(true);
        };
        window.addEventListener('openShiftHandover', handleOpenHandover);
        return () => window.removeEventListener('openShiftHandover', handleOpenHandover);
    }, []);

    // Build dynamic menu groups using translations
    const menuGroups = [
        {
            label: t('sidebar.operational'),
            items: [
                { name: t('sidebar.billiardTable'), icon: LayoutDashboard, path: '/', permission: 'BILLIARD_VIEW' },
                { name: t('sidebar.cafeTable'), icon: UtensilsCrossed, path: '/cafe', permission: 'CAFE_VIEW' },
                { name: t('sidebar.waitingList'), icon: Users, path: '/admin/waiting-list', permission: 'WAITING_LIST_VIEW' },
                { name: t('sidebar.lockers'), icon: Lock, path: '/admin/lockers', permission: 'LOCKER_MANAGE' },
                { name: t('sidebar.tableManagement'), icon: Server, path: '/admin/tables', permission: 'SETTING_TABLES' },
                { name: t('sidebar.kitchen'), icon: Terminal, path: '/kds', permission: 'ACCESS_KDS' },
                { name: t('sidebar.bartender'), icon: Wine, path: '/bartender', permission: 'ACCESS_BDS' },
                { name: 'Kitchen & Bar (Unified)', icon: LayoutDashboard, path: '/kitchen-bar', permission: 'ACCESS_KDS' },
                { name: 'Penugasan Waiter', icon: ShieldCheck, action: 'OPEN_SHIFT_SETUP', permission: 'SHIFT_START' },
            ]
        },
        {
            label: t('sidebar.financeInventory'),
            items: [
                { name: t('sidebar.inventory'), icon: Box, path: '/admin/inventory', permission: 'INV_VIEW' },
                { name: t('sidebar.finance'), icon: DollarSign, path: '/admin/finance/ledger', permission: 'FIN_REVENUE' },
                { name: t('sidebar.debts'), icon: History, path: '/admin/finance/debts', permission: 'FIN_DEBTS' },
                { name: t('sidebar.businessDay'), icon: Calendar, path: '/admin/reports/business-day', permission: 'BUSINESS_DAY_VIEW' },
                { name: t('sidebar.expenses'), icon: Receipt, path: '/admin/finance/expenses', permission: 'FIN_EXPENSES_VIEW' },
            ]
        },
        {
            label: t('sidebar.management'),
            items: [
                { name: t('sidebar.membership'), icon: Users, path: '/admin/members', permission: 'MEMBER_VIEW' },
                { name: t('sidebar.ownerReport'), icon: BarChart3, path: '/admin/dashboard', permission: 'FIN_REVENUE' },
                { name: t('sidebar.auditTrail'), icon: History, path: '/admin/audit', permission: 'USER_MONITOR' },
                { name: t('sidebar.employees'), icon: Users, path: '/admin/employees', permission: 'USER_MANAGE' },
                { name: t('sidebar.attendance'), icon: Calendar, path: '/admin/attendance', permission: 'USER_MANAGE' },
                { name: t('sidebar.waiterAssignment'), icon: Lock, path: '/admin/waiter-assignments', permission: 'USER_MANAGE' },
                { name: t('sidebar.shiftManagement'), icon: Clock, path: '/admin/shifts', permission: 'SHIFT_MANAGE' },
                { name: 'Katalog Rewards', icon: Gift, path: '/admin/loyalty/rewards', permission: 'REWARDS_CATALOG' },
                { name: 'Scan Penukaran', icon: Scan, path: '/admin/loyalty/scanner', permission: 'SCAN_REDEMPTION' },
                { name: 'Gamification Analytics', icon: Target, path: '/admin/loyalty/analytics', permission: 'GAMIFICATION_ANALYTICS' },
                { name: 'AI ARME & Gamifikasi', icon: Orbit, path: '/admin/loyalty/arme', permission: 'AI_ARME_GAMIFICATION' },
                ...(settings?.enableAISalesOrchestrator ? [{ name: 'AI Sales Orchestrator', icon: Cpu, path: '/admin/ai-orchestrator', permission: 'FIN_REVENUE' }] : []),
                { name: 'Approval Center', icon: ShieldCheck, path: '/admin/approvals', permission: 'APPROVAL_VIEW' },
            ]

        },
        {
            label: t('sidebar.configuration'),
            items: [
                { name: 'Master Kategori', icon: Box, path: '/admin/settings/categories', permission: 'SETTING_TABLES' },
                { name: t('sidebar.billiardPricing'), icon: Settings, path: '/admin/settings/billiard', permission: 'BILLIARD_PRICING' },
                { name: t('sidebar.promoBundling'), icon: Gift, path: '/admin/promo-bundling', permission: 'PROMO_MANAGE' },
                { name: 'Panel Kontrol Meja', icon: Settings, path: '/admin/settings/tables', permission: 'SETTING_TABLES' },
                { name: 'Layout Ruangan', icon: LayoutDashboard, path: '/admin/settings/floor-plan', permission: 'SETTING_LAYOUT' },
                { name: 'Hardware Health', icon: Activity, path: '/admin/hardware', permission: 'SETTING_HARDWARE' },
                { name: 'Kelola Voucher', icon: Receipt, path: '/admin/settings/vouchers', permission: 'PROMO_MANAGE' },
                { name: t('sidebar.settings'), icon: Settings, path: '/admin/settings', permission: ['USER_MANAGE', 'SETTING_IDENTITY', 'SETTING_POLICY', 'SETTING_OPERATION', 'SETTING_APPROVAL', 'SETTING_HARDWARE', 'SETTING_FIRMWARE', 'SETTING_WHATSAPP', 'SETTING_LICENSE', 'SETTING_INVOICE', 'SETTING_DATABASE', 'SETTING_GAMIFICATION', 'SETTING_DISPLAY', 'SETTING_PREFERENCES'] },
            ]
        }
    ];

    
    // Live badge map keyed by path
    const liveBadges: Record<string, number> = {
        '/': activeBilliardCount,
        '/cafe': activeCafeCount,
        '/admin/waiting-list': pendingWaitingCount,
        '/admin/loyalty/scanner': redeemQueue.filter(r => !r.dismissed).length,
        '/admin/ai-orchestrator': unreadChatCount,
        '/admin/finance/debts': activeDebtCount,
        '/admin/inventory': upcomingInstallmentCount,
        '/admin/approvals': 0, // Will be updated by state
    };

    const [pendingApprovalCount, setPendingApprovalCount] = React.useState(0);

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get('/settings');
                setSettings(response.data);
            } catch (error) {
                console.error('Failed to fetch sidebar settings:', error);
            }
        };
        fetchSettings();
    }, []);

    React.useEffect(() => {
        const fetchPendingApprovals = async () => {
            if (!user) return;
            try {
                const response = await axios.get('/approval/count/pending');
                setPendingApprovalCount(response.data.count || 0);
            } catch (e) {
                console.error('Failed to fetch approval count');
            }
        };
        fetchPendingApprovals();
        const interval = setInterval(fetchPendingApprovals, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, [user]);

    // Update liveBadges with actual count
    liveBadges['/admin/approvals'] = pendingApprovalCount;

    // Close sidebar when route changes
    React.useEffect(() => {
        const shouldCloseOnDesktop = pathname.includes('/admin/reports/business-day');
        
        if (isOpen && (window.innerWidth < 1024 || shouldCloseOnDesktop)) {
            setIsOpen(false);
        }
    }, [pathname]);

    // Lock body scroll on mobile when sidebar is open
    useBodyScrollLock(isOpen && typeof window !== 'undefined' && window.innerWidth < 1024);

    // Swipe gestures to open/close sidebar
    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        let touchStartX = 0;
        let touchEndX = 0;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.touches[0].clientX;
            touchEndX = e.touches[0].clientX; // Reset end x
        };

        const handleTouchMove = (e: TouchEvent) => {
            touchEndX = e.touches[0].clientX;
        };

        const handleTouchEnd = () => {
            if (window.innerWidth >= 1024) return; // Only apply on mobile

            const swipeDistance = touchEndX - touchStartX;

            // Open if swiped right from the left edge (start X < 40px, swipe > 50px)
            if (!isOpen && touchStartX < 40 && swipeDistance > 50) {
                setIsOpen(true);
            }

            // Close if swiped left (swipe < -50px)
            if (isOpen && swipeDistance < -50) {
                setIsOpen(false);
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isOpen, setIsOpen]);

    const businessTitle = settings?.businessName || '';
    const isLoading = !settings;
    const subTitle = 'Hybrid IoT Management';

    // Filter menu items by permission
    const filteredGroups = React.useMemo(() => {
        return menuGroups.map(group => ({
            ...group,
            items: group.items.filter((item: any) => {
                if (item.action && item.role) {
                    const userRole = user?.role?.toUpperCase() || '';
                    return item.role.some((r: string) => userRole.includes(r.toUpperCase()));
                }
                if (Array.isArray(item.permission)) {
                    return item.permission.some((p: string) => hasPermission(p));
                }
                return hasPermission(item.permission as string);
            })
        })).filter(group => group.items.length > 0);
    }, [user, hasPermission, t, settings?.enableAISalesOrchestrator]);

    return (
        <>


            {/* Backdrop Overlay (Mobile Only) */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 bg-slate-900/60 z-[99]  lg:hidden animate-in fade-in duration-300 print:hidden"
                />
            )}

            {/* Floating Mobile Menu Button (Only when closed) */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed left-0 top-1/2 -translate-y-1/2 z-[90] lg:hidden w-6 py-4 bg-[#0B0A1C] text-indigo-400 border-y border-r border-indigo-500/20 rounded-r-xl flex flex-col items-center justify-center active:scale-95 transition-all print:hidden"
                >
                    <span 
                        className="text-[7px] font-black tracking-widest uppercase opacity-80"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
                    >
                        MENU
                    </span>
                    <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-[1.5px] h-4 bg-indigo-500/40 rounded-full" />
                </button>
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed inset-y-0 left-0 bg-[#0B0A1C] text-indigo-100 flex flex-col z-[100] shadow-[4px_0_24px_rgba(0,0,0,0.2)] print:hidden transition-all duration-300 ease-in-out
                    ${isOpen ? 'w-52 translate-x-0' : 'w-52 -translate-x-full'}
                `}
            >
                {/* Brand Header */}
                <div 
                    className="px-3 pb-2.5 pt-2.5 relative shrink-0"
                    style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
                >
                    {/* Close Button for Mobile — sits in top-right of safe area */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute right-2.5 top-2.5 p-1 text-slate-500 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full border border-slate-700/50 transition-all active:scale-90 lg:hidden"
                        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Unified Toggle Button for Desktop - Centered Half-Circle Tab */}
                    <button
                        onClick={toggle}
                        aria-label={isOpen ? "Tutup navigasi" : "Buka navigasi"}
                        className={[
                            'absolute left-full top-1/2 -translate-y-1/2 z-[110]',
                            'w-7 h-14',
                            'flex items-center justify-center',
                            'bg-[#0F172A] text-slate-400',
                            'rounded-r-full border-y border-r border-slate-700/50',
                            'shadow-[2px_0_12px_rgba(0,0,0,0.5)]',
                            '',
                            'hover:bg-slate-800 hover:text-white hover:border-indigo-500/50 hover:w-9',
                            'active:scale-95 transition-all duration-300 ease-in-out',
                            'hidden lg:flex'
                        ].join(' ')}
                    >
                        {isOpen ? (
                            <ChevronLeft className="w-3.5 h-3.5 -ml-0.5" />
                        ) : (
                            <>
                                <PanelLeftOpen className="w-3.5 h-3.5 -ml-0.5" />
                                {/* Pulsing indicator when closed */}
                                <span className="absolute top-1/2 -translate-y-1/2 right-1 w-1 h-1 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                            </>
                        )}
                    </button>

                    {/* Brand Identity Row */}
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white ring-2 ring-indigo-600/20 shadow-md shadow-indigo-600/30 shrink-0 ${isLoading ? 'animate-pulse' : ''}`}>
                            <span className="text-sm font-black">{businessTitle ? businessTitle.charAt(0) : ''}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                            {isLoading ? (
                                <div className="space-y-1.5">
                                    <div className="h-3 w-20 bg-slate-700/50 rounded animate-pulse" />
                                    <div className="h-2 w-14 bg-slate-700/30 rounded animate-pulse" />
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-[11.5px] font-black text-white tracking-tight uppercase truncate leading-tight">{businessTitle}</h1>
                                    <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-[0.14em] mt-0.5 truncate">{subTitle}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <TableExpiryCenter />
                {['ADMIN', 'OWNER', 'CASHIER', 'KASIR', 'SUPERADMIN', 'SUPER ADMIN'].some((r: string) => user?.role?.toUpperCase().includes(r)) && (
                    <>
                        <LoginApprovalCenter />
                        <TableApprovalCenter />
                    </>
                )}

                {/* Navigation Menu */}
                <nav className="flex-1 px-2 space-y-3.5 overflow-y-auto overscroll-contain custom-scrollbar transition-all duration-300 py-1.5">
                    {filteredGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-1">
                            <p className="px-2 text-[8px] font-bold text-indigo-400/50 uppercase tracking-[0.12em] mb-1">
                                {group.label}
                            </p>

                            <div className="space-y-0.5">
                                {group.items.map((item: any) => {
                                    const isAction = !!item.action;
                                    const isActive = !isAction && pathname === item.path;
                                    const badge = !isAction ? liveBadges[item.path!] : 0;
                                    
                                    const content = (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <item.icon className={`w-3.5 h-3.5 shrink-0 transition-all duration-300 ${isActive ? 'text-white' : 'text-indigo-300/60 group-hover:text-indigo-300'}`} strokeWidth={isActive ? 2.5 : 2} />
                                            <span className={`text-[11px] font-semibold tracking-tight leading-tight truncate ${isActive ? 'text-white font-bold' : 'text-indigo-200/70 group-hover:text-white'}`}>{item.name}</span>
                                        </div>
                                    );

                                    const className = `flex items-center group transition-all duration-300 px-2 py-1.5 rounded-lg justify-between relative w-full border border-transparent
                                        ${isActive
                                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-900/50 active:scale-[0.98]'
                                            : 'hover:bg-white/5 text-indigo-200/70'
                                        }`;

                                    if (isAction) {
                                        return (
                                            <button
                                                key={item.name}
                                                onClick={() => {
                                                    if (item.action === 'OPEN_SHIFT_SETUP') {
                                                        window.dispatchEvent(new CustomEvent('openShiftSetup'));
                                                    }
                                                    if (window.innerWidth < 1024) setIsOpen(false);
                                                }}
                                                className={className}
                                            >
                                                {content}
                                            </button>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={item.path}
                                            href={item.path!}
                                            onClick={() => {
                                                if (window.innerWidth < 1024) {
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={className}
                                        >
                                            {content}

                                            <div className="flex items-center gap-1 shrink-0 ml-1">
                                                {badge > 0 && (
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[15px] text-center leading-none transition-all
                                                        ${isActive ? 'bg-white/25 text-white' : 'bg-indigo-500 text-white'}`}>
                                                        {badge}
                                                    </span>
                                                )}
                                                {isActive && <ChevronRight className="w-3 h-3 text-white/50" />}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer / User Profile */}
                <div className="p-2 border-t border-white/5 bg-white/5 shrink-0 mx-1.5 mb-3 mt-1 rounded-xl border border-white/10 transition-all duration-300 shadow-lg relative">
                    <div className="flex items-center gap-2">
                        <div className="shrink-0 w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-[11px] text-white border border-indigo-400 shadow-md shadow-indigo-600/20">
                            {user?.name.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-[9px] text-indigo-300/70 font-semibold uppercase tracking-tight truncate">
                                {activeShift ? (
                                    <span className="text-green-400 flex items-center gap-1 truncate">
                                        <Clock className="w-2.5 h-2.5 shrink-0" /> <span className="truncate">{activeShift.shiftName || 'Active Shift'}</span>
                                    </span>
                                ) : (
                                    user?.role || 'Staff'
                                )}
                            </p>
                        </div>
                        {activeShift ? (
                            !['KITCHEN', 'BARTENDER'].includes(user?.role?.toUpperCase() || '') && (
                                <button
                                    onClick={() => setIsHandoverModalOpen(true)}
                                    className="p-1 hover:bg-slate-700/80 rounded-md text-amber-400 hover:text-amber-300 transition-colors shrink-0"
                                    title="End Shift"
                                >
                                    <Wallet className="w-3 h-3" />
                                </button>
                            )
                        ) : (hasPermission('SHIFT_START') && !['KITCHEN', 'BARTENDER'].includes(user?.role?.toUpperCase() || '')) ? (
                            <button
                                onClick={() => setIsStartModalOpen(true)}
                                className="p-1 hover:bg-slate-700/80 rounded-lg text-indigo-300 hover:text-white transition-colors shrink-0"
                                title="Start Shift"
                            >
                                <Clock className="w-3 h-3" />
                            </button>
                        ) : null}
                        <button
                            onClick={handleLogout}
                            className="p-1 hover:bg-slate-700/80 rounded-md text-slate-400 hover:text-rose-400 transition-colors shrink-0"
                            title="Sign Out"
                        >
                            <LogOut className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Decorative Blur */}
                <div className="absolute top-0 right-0 w-32 h-64 bg-indigo-500/5 blur-[80px] pointer-events-none -mt-32 -mr-32" />
            </aside>

            {/* Handover Modal */}
            <ShiftHandoverModal
                isOpen={isHandoverModalOpen}
                onClose={() => setIsHandoverModalOpen(false)}
                onSuccess={() => refetchShift()}
                userId={user?.id || 0}
            />

            <ShiftStartModal
                isOpen={isStartModalOpen}
                onClose={() => setIsStartModalOpen(false)}
                onSuccess={() => {
                    showToast("Shift Dimulai", "Selamat bekerja!", "info");
                    refetchShift();
                }}
                user={user}
            />
        </>
    );
}
