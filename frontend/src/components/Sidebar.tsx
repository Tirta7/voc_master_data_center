'use client';

import React from 'react';
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
} from 'lucide-react';



const menuGroups = [
    {
        label: 'Operasional',
        items: [
            { name: 'Meja Billiard', icon: LayoutDashboard, path: '/', permission: 'BILLIARD_VIEW' },
            { name: 'Meja Cafe', icon: UtensilsCrossed, path: '/cafe', permission: 'CAFE_VIEW' },
            { name: 'Waiting List', icon: Users, path: '/admin/waiting-list', permission: 'WAITING_LIST_VIEW' },
            { name: 'Locker Penitipan', icon: Lock, path: '/admin/lockers', permission: 'LOCKER_MANAGE' },
            { name: 'Table Management', icon: Server, path: '/admin/tables', permission: 'SETTING_TABLES' },
            { name: 'Kitchen (KDS)', icon: Terminal, path: '/kds', permission: 'ACCESS_KDS' },
            { name: 'Bartender (BDS)', icon: Wine, path: '/bartender', permission: 'ACCESS_BDS' },
        ]
    },
    {
        label: 'Finance & Inventory',
        items: [
            { name: 'Inventory & Recipe', icon: Box, path: '/admin/inventory', permission: 'INV_VIEW' },
            { name: 'Finance & Ledger', icon: DollarSign, path: '/admin/finance/ledger', permission: 'FIN_REVENUE' },
            { name: 'Daftar Piutang', icon: History, path: '/admin/finance/debts', permission: 'FIN_DEBTS' },
            { name: 'Business Day Logic', icon: Calendar, path: '/admin/reports/business-day', permission: 'BUSINESS_DAY_VIEW' },
        ]
    },
    {
        label: 'Manajemen',
        items: [
            { name: 'Membership', icon: Users, path: '/admin/members', permission: 'MEMBER_VIEW' },
            { name: 'Laporan Owner', icon: BarChart3, path: '/admin/dashboard', permission: 'FIN_REVENUE' },
            { name: 'Audit Trail', icon: History, path: '/admin/audit', permission: 'USER_MONITOR' },
            { name: 'Kelola Karyawan', icon: Users, path: '/admin/employees', permission: 'USER_MANAGE' },
            { name: 'Penugasan Waiter', icon: Lock, path: '/admin/waiter-assignments', permission: 'USER_MANAGE' },
            { name: 'Manajemen Shift', icon: Clock, path: '/admin/shifts', permission: 'SHIFT_MANAGE' },
            { name: 'Katalog Reward', icon: Gift, path: '/admin/loyalty/rewards', permission: 'REWARDS_CATALOG' },
            { name: 'Scan Penukaran', icon: Scan, path: '/admin/loyalty/scanner', permission: 'SCAN_REDEMPTION' },
            { name: 'Gamification Analytics', icon: Target, path: '/admin/loyalty/analytics', permission: 'GAMIFICATION_ANALYTICS' },
            { name: 'AI ARME & Gamifikasi', icon: Orbit, path: '/admin/loyalty/arme', permission: 'AI_ARME_GAMIFICATION' },
        ]

    },
    {
        label: 'Konfigurasi',
        items: [
            { name: 'Billiard Pricing', icon: Settings, path: '/admin/settings/billiard', permission: 'BILLIARD_PRICING' },
            { name: 'Promo Bundling', icon: Gift, path: '/admin/promo-bundling', permission: 'PROMO_MANAGE' },
            { name: 'Panel Kontrol Meja', icon: Cpu, path: '/admin/settings/tables', permission: 'TABLE_CONTROL_PANEL' },
            { name: 'Settings', icon: Settings, path: '/admin/settings', permission: ['USER_MANAGE', 'SETTING_IDENTITY', 'SETTING_POLICY', 'SETTING_OPERATION', 'SETTING_HARDWARE', 'SETTING_INVOICE', 'SETTING_DATABASE', 'SETTING_GAMIFICATION', 'SETTING_DISPLAY', 'SETTING_PREFERENCES'] },
        ]
    }
];

import { useSidebar } from './SidebarContext';
import { useAuth } from '@/context/AuthContext';
import ShiftHandoverModal from './ShiftHandoverModal';
import ShiftStartModal from './ShiftStartModal';
import { useToast } from "@/components/ui/ToastProvider";
import LoginApprovalCenter from './LoginApprovalCenter';
import TableExpiryCenter from './TableExpiryCenter';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { useLanguage } from '@/context/LanguageContext';

export default function Sidebar() {
    const pathname = usePathname();
    const [settings, setSettings] = React.useState<any>(null);
    const { isOpen, setIsOpen, toggle } = useSidebar();
    const { user, hasPermission, logout, activeShift, refetchShift } = useAuth();
    const { showToast } = useToast();
    const [isHandoverModalOpen, setIsHandoverModalOpen] = React.useState(false);
    const [isStartModalOpen, setIsStartModalOpen] = React.useState(false);
    const { activeBilliardCount, activeCafeCount, pendingWaitingCount, redeemQueue, unreadChatCount } = useRealtimeData();
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
            ]
        },
        {
            label: t('sidebar.financeInventory'),
            items: [
                { name: t('sidebar.inventory'), icon: Box, path: '/admin/inventory', permission: 'INV_VIEW' },
                { name: t('sidebar.finance'), icon: DollarSign, path: '/admin/finance/ledger', permission: 'FIN_REVENUE' },
                { name: t('sidebar.debts'), icon: History, path: '/admin/finance/debts', permission: 'FIN_DEBTS' },
                { name: t('sidebar.businessDay'), icon: Calendar, path: '/admin/reports/business-day', permission: 'BUSINESS_DAY_VIEW' },
            ]
        },
        {
            label: t('sidebar.management'),
            items: [
                { name: t('sidebar.membership'), icon: Users, path: '/admin/members', permission: 'MEMBER_VIEW' },
                { name: t('sidebar.ownerReport'), icon: BarChart3, path: '/admin/dashboard', permission: 'FIN_REVENUE' },
                { name: t('sidebar.auditTrail'), icon: History, path: '/admin/audit', permission: 'USER_MONITOR' },
                { name: t('sidebar.employees'), icon: Users, path: '/admin/employees', permission: 'USER_MANAGE' },
                { name: t('sidebar.waiterAssignment'), icon: Lock, path: '/admin/waiter-assignments', permission: 'USER_MANAGE' },
                { name: t('sidebar.shiftManagement'), icon: Clock, path: '/admin/shifts', permission: 'SHIFT_MANAGE' },
                { name: 'Katalog Rewards', icon: Gift, path: '/admin/loyalty/rewards', permission: 'REWARDS_CATALOG' },
                { name: 'Scan Penukaran', icon: Scan, path: '/admin/loyalty/scanner', permission: 'SCAN_REDEMPTION' },
                { name: 'Gamification Analytics', icon: Target, path: '/admin/loyalty/analytics', permission: 'GAMIFICATION_ANALYTICS' },
                { name: 'AI ARME & Gamifikasi', icon: Orbit, path: '/admin/loyalty/arme', permission: 'AI_ARME_GAMIFICATION' },
                { name: 'AI Sales Orchestrator', icon: Cpu, path: '/admin/ai-orchestrator', permission: 'FIN_REVENUE' },
            ]

        },
        {
            label: t('sidebar.configuration'),
            items: [
                { name: t('sidebar.billiardPricing'), icon: Settings, path: '/admin/settings/billiard', permission: 'BILLIARD_PRICING' },
                { name: t('sidebar.promoBundling'), icon: Gift, path: '/admin/promo-bundling', permission: 'PROMO_MANAGE' },
                { name: t('sidebar.tableControl'), icon: Cpu, path: '/admin/settings/tables', permission: 'TABLE_CONTROL_PANEL' },
                { name: t('sidebar.settings'), icon: Settings, path: '/admin/settings', permission: ['USER_MANAGE', 'SETTING_IDENTITY', 'SETTING_POLICY', 'SETTING_OPERATION', 'SETTING_HARDWARE', 'SETTING_INVOICE', 'SETTING_DATABASE', 'SETTING_GAMIFICATION', 'SETTING_DISPLAY', 'SETTING_PREFERENCES'] },
            ]
        }
    ];

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Live badge map keyed by path
    const liveBadges: Record<string, number> = {
        '/': activeBilliardCount,
        '/cafe': activeCafeCount,
        '/admin/waiting-list': pendingWaitingCount,
        '/admin/loyalty/scanner': redeemQueue.filter(r => !r.dismissed).length,
        '/admin/ai-orchestrator': unreadChatCount,
    };

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch(`${API_URL}/settings`);
                const data = await response.json();
                setSettings(data);
            } catch (error) {
                console.error('Failed to fetch sidebar settings:', error);
            }
        };
        fetchSettings();
    }, []);

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
            items: group.items.filter(item => {
                if (Array.isArray(item.permission)) {
                    return item.permission.some(p => hasPermission(p));
                }
                return hasPermission(item.permission);
            })
        })).filter(group => group.items.length > 0);
    }, [user, hasPermission, t]);

    return (
        <>
            {/* Mobile Top Bar - Visible only when sidebar is closed on mobile */}
            <div className={`fixed top-0 left-0 right-0 h-16 bg-[#0F172A] z-[90] flex items-center justify-between px-4 shadow-md lg:hidden print:hidden border-b border-slate-800 transition-transform duration-300 ${isOpen ? '-translate-y-full' : 'translate-y-0'}`}>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm ring-2 ring-indigo-600/20 ${isLoading ? 'animate-pulse' : ''}`}>
                        {businessTitle ? businessTitle.charAt(0) : ''}
                    </div>
                    <span className="text-white font-bold tracking-tight">
                        {isLoading ? <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse" /> : businessTitle}
                    </span>
                </div>

                <div className="w-10"></div>
            </div>

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
                <div className="p-8 pb-10 relative shrink-0 flex items-center gap-4">

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

                    {/* Close Button for Mobile */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-full border border-slate-700 lg:hidden"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className={`w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white ring-4 ring-indigo-600/20 shadow-xl shadow-indigo-600/30 shrink-0 ${isLoading ? 'animate-pulse' : ''}`}>
                        <span className="text-2xl font-black">{businessTitle ? businessTitle.charAt(0) : ''}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-5 w-32 bg-slate-700/50 rounded animate-pulse" />
                                <div className="h-3 w-20 bg-slate-700/30 rounded animate-pulse" />
                            </div>
                        ) : (
                            <>
                                <h1 className="text-xl font-black text-white tracking-tight uppercase truncate">{businessTitle}</h1>
                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em]">{subTitle}</p>
                            </>
                        )}
                    </div>
                </div>

                <TableExpiryCenter />
                {['ADMIN', 'OWNER', 'CASHIER', 'KASIR', 'SUPERADMIN'].includes(user?.role?.toUpperCase() || '') && (
                    <LoginApprovalCenter />
                )}

                {/* Navigation Menu */}
                <nav className="flex-1 px-4 space-y-8 overflow-y-auto overscroll-contain custom-scrollbar transition-all duration-300">
                    {filteredGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-2">
                            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                                {group.label}
                            </p>

                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.path;
                                    const badge = liveBadges[item.path];
                                    return (
                                        <Link
                                            key={item.path}
                                            href={item.path}
                                            onClick={() => {
                                                if (window.innerWidth < 1024) {
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={`flex items-center group transition-all duration-300 px-4 py-3.5 rounded-2xl justify-between relative
                                                ${isActive
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
                                                    : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <item.icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'text-white' : 'group-hover:text-indigo-400'}`} />
                                                <span className="font-bold text-sm leading-none">{item.name}</span>
                                            </div>

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
                                    user?.role || 'Member'
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
