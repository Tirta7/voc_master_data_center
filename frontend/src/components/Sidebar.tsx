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
                { name: 'AI Sales Orchestrator', icon: Cpu, path: '/admin/ai-orchestrator', permission: 'FIN_REVENUE' },
                { name: 'Approval Center', icon: ShieldCheck, path: '/admin/approvals', permission: 'APPROVAL_VIEW' },
            ]

        },
        {
            label: t('sidebar.configuration'),
            items: [
                { name: 'Master Kategori', icon: Box, path: '/admin/settings/categories', permission: 'SETTING_TABLES' },
                { name: t('sidebar.billiardPricing'), icon: Settings, path: '/admin/settings/billiard', permission: 'BILLIARD_PRICING' },
                { name: t('sidebar.promoBundling'), icon: Gift, path: '/admin/promo-bundling', permission: 'PROMO_MANAGE' },
                { name: t('sidebar.tableControl'), icon: Cpu, path: '/admin/settings/tables', permission: 'TABLE_CONTROL_PANEL' },
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

    // Close sidebar when route changes only on mobile
    React.useEffect(() => {
        if (window.innerWidth < 1024 && isOpen) {
            setIsOpen(false);
        }
    }, [pathname]);

    // Lock body scroll on mobile when sidebar is open
    useBodyScrollLock(isOpen && typeof window !== 'undefined' && window.innerWidth < 1024);

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
    }, [user, hasPermission, t]);

    return (
        <>
            {/* Floating Sidebar Toggle Button (Mobile Only) */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed top-[env(safe-area-inset-top,16px)] left-4 z-[90] p-3 bg-[#0F172A]/80 backdrop-blur-md rounded-xl border border-slate-700 shadow-lg lg:hidden print:hidden text-white transition-all duration-300 hover:bg-[#0F172A] ${isOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
                style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
            >
                <Menu className="w-6 h-6" />
            </button>

            {/* Backdrop Overlay (Mobile Only) */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 bg-slate-900/60 z-[99] backdrop-blur-sm lg:hidden animate-in fade-in duration-300 print:hidden"
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed inset-y-0 left-0 bg-[#0F172A] text-slate-300 flex flex-col z-[100] shadow-2xl border-r border-slate-800 print:hidden transition-all duration-300 ease-in-out
                    ${isOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full'}
                `}
            >
                {/* Brand Header */}
                <div 
                    className="px-5 pb-5 pt-4 relative shrink-0"
                    style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
                >
                    {/* Close Button for Mobile — sits in top-right of safe area */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute right-4 top-4 p-1.5 text-slate-500 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full border border-slate-700/50 transition-all active:scale-90 lg:hidden"
                        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Unified Toggle Button for Desktop - Centered Half-Circle Tab */}
                    <button
                        onClick={toggle}
                        aria-label={isOpen ? "Tutup navigasi" : "Buka navigasi"}
                        className={[
                            'absolute left-full top-1/2 -translate-y-1/2 z-[110]',
                            'w-8 h-16',
                            'flex items-center justify-center',
                            'bg-[#0F172A] text-slate-400',
                            'rounded-r-full border-y border-r border-slate-700/50',
                            'shadow-[2px_0_12px_rgba(0,0,0,0.5)]',
                            'backdrop-blur-md',
                            'hover:bg-slate-800 hover:text-white hover:border-indigo-500/50 hover:w-10',
                            'active:scale-95 transition-all duration-300 ease-in-out',
                            'hidden lg:flex'
                        ].join(' ')}
                    >
                        {isOpen ? (
                            <ChevronLeft className="w-3.5 h-3.5 -ml-1" />
                        ) : (
                            <>
                                <PanelLeftOpen className="w-3.5 h-3.5 -ml-0.5" />
                                {/* Pulsing indicator when closed */}
                                <span className="absolute top-1/2 -translate-y-1/2 right-1 w-1 h-1 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                            </>
                        )}
                    </button>

                    {/* Brand Identity Row */}
                    <div className="flex items-center gap-3.5 mt-3">
                        <div className={`w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white ring-4 ring-indigo-600/20 shadow-xl shadow-indigo-600/30 shrink-0 ${isLoading ? 'animate-pulse' : ''}`}>
                            <span className="text-xl font-black">{businessTitle ? businessTitle.charAt(0) : ''}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                            {isLoading ? (
                                <div className="space-y-1.5">
                                    <div className="h-4 w-28 bg-slate-700/50 rounded animate-pulse" />
                                    <div className="h-2.5 w-20 bg-slate-700/30 rounded animate-pulse" />
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-base font-black text-white tracking-tight uppercase truncate leading-tight">{businessTitle}</h1>
                                    <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-0.5">{subTitle}</p>
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
                <nav className="flex-1 px-4 space-y-8 overflow-y-auto overscroll-contain custom-scrollbar transition-all duration-300">
                    {filteredGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-2">
                            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                                {group.label}
                            </p>

                            <div className="space-y-1">
                                {group.items.map((item: any) => {
                                    const isAction = !!item.action;
                                    const isActive = !isAction && pathname === item.path;
                                    const badge = !isAction ? liveBadges[item.path!] : 0;
                                    
                                    const content = (
                                        <div className="flex items-center gap-4">
                                            <item.icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'text-white' : 'group-hover:text-indigo-400'}`} />
                                            <span className="font-bold text-sm leading-none">{item.name}</span>
                                        </div>
                                    );

                                    const className = `flex items-center group transition-all duration-300 px-4 py-3.5 rounded-2xl justify-between relative w-full
                                        ${isActive
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
                                            : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
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

                                            <div className="flex items-center gap-1.5">
                                                {badge > 0 && (
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none transition-all
                                                        ${isActive ? 'bg-white/25 text-white' : 'bg-indigo-500 text-white'}`}>
                                                        {badge}
                                                    </span>
                                                )}
                                                {isActive && <ChevronRight className="w-4 h-4 text-white/50" />}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer / User Profile */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0 m-4 rounded-3xl mb-8 border transition-all duration-300">
                    <div className="flex items-center gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xs text-white border border-indigo-400 shadow-lg shadow-indigo-600/20">
                            {user?.name.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                {activeShift ? (
                                    <span className="text-green-400 flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" /> {activeShift.shiftName || 'Active Shift'}
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
                                    className="p-2 hover:bg-slate-700 rounded-lg text-amber-500 hover:text-amber-400 transition-colors"
                                    title="End Shift"
                                >
                                    <Wallet className="w-4 h-4" />
                                </button>
                            )
                        ) : (hasPermission('SHIFT_START') && !['KITCHEN', 'BARTENDER'].includes(user?.role?.toUpperCase() || '')) ? (
                            <button
                                onClick={() => setIsStartModalOpen(true)}
                                className="p-2 hover:bg-slate-700 rounded-lg text-indigo-400 hover:text-white transition-colors"
                                title="Start Shift"
                            >
                                <Clock className="w-4 h-4" />
                            </button>
                        ) : null}
                        <button
                            onClick={logout}
                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
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
