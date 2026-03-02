import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, ShoppingCart, Trash2, Plus, Minus, X, Coffee, Utensils, Zap, ChevronDown, Tag, Clock, Check, Info, AlertTriangle } from 'lucide-react';
import { useAlert } from '@/components/ui/AlertProvider';
import InputField from '@/components/ui/InputField';
import { inventorySocket, socket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Default icons mapping for dynamic categories
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'FOOD': <Utensils className="w-3.5 h-3.5" />,
    'MAKANAN': <Utensils className="w-3.5 h-3.5" />,
    'DRINK': <Coffee className="w-3.5 h-3.5" />,
    'MINUMAN': <Coffee className="w-3.5 h-3.5" />,
    'SNACK': <Zap className="w-3.5 h-3.5" />,
    'BUNDLING': <Tag className="w-3.5 h-3.5" />,
    'ALL': <Zap className="w-3.5 h-3.5" />,
};

const getCategoryIcon = (name: string) => {
    const upper = name.toUpperCase();
    for (const key in CATEGORY_ICONS) {
        if (upper.includes(key)) return CATEGORY_ICONS[key];
    }
    return <Zap className="w-3.5 h-3.5" />; // Fallback
};

interface CafeOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableId: number;
    tableName?: string;
    onSuccess?: () => void;
    /** When ordering from a cafe-only table, pass the active transaction ID directly */
    cafeTransactionId?: number;
}

export default function CafeOrderModal({ isOpen, onClose, tableId, tableName, onSuccess, cafeTransactionId }: CafeOrderModalProps) {
    const { showAlert, showConfirm } = useAlert();
    const { user } = useAuth();
    useBodyScrollLock(isOpen);
    const [menu, setMenu] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string | number>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [availability, setAvailability] = useState<Record<number, number>>({});
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [showRecipeId, setShowRecipeId] = useState<number | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>(
        inventorySocket.connected ? 'connected' : 'connecting'
    );
    const [activeTransaction, setActiveTransaction] = useState<any>(null);
    const [financeSettings, setFinanceSettings] = useState<{ ppnPercentage: number; serviceChargePercentage: number }>({
        ppnPercentage: 0,
        serviceChargePercentage: 0,
    });


    useEffect(() => {
        if (isOpen) {
            fetchMenu();
            fetchAvailability();
            fetchIngredients();
            fetchTransaction();
            fetchFinanceSettings();
            setCart([]);
            setActiveCategory('ALL');
            setSearchQuery('');
            setIsCartOpen(false);

            // Sync connection status
            setConnectionStatus(inventorySocket.connected ? 'connected' : 'connecting');

            const onConnect = () => {
                console.log('Inventory socket connected');
                setConnectionStatus('connected');
            };

            const onConnectError = (err: any) => {
                console.error('Inventory socket connection error:', err);
                setConnectionStatus('error');
            };

            const onDisconnect = (reason: string) => {
                console.log('Inventory socket disconnected:', reason);
                setConnectionStatus('connecting');
            };

            const onMenuAvailability = (data: Record<number, number>) => {
                console.log('Real-time menu availability update received:', data);
                setAvailability(prev => ({ ...prev, ...data }));
            };

            const onInventoryUpdate = (updatedIngredient: any) => {
                console.log('Real-time ingredient update received:', updatedIngredient);
                setIngredients(prev =>
                    prev.map(ing => ing.id === updatedIngredient.id ? updatedIngredient : ing)
                );
            };

            // ── Real-time Member Balance Update (e.g. after top-up from Members page) ──
            const onMemberBalanceUpdated = (data: { memberId: number; balance: number }) => {
                setActiveTransaction((prev: any) => {
                    if (!prev || !prev.member || prev.member.id !== data.memberId) return prev;
                    return { ...prev, member: { ...prev.member, balance: data.balance } };
                });
            };

            inventorySocket.on('connect', onConnect);
            inventorySocket.on('connect_error', onConnectError);
            inventorySocket.on('disconnect', onDisconnect);
            inventorySocket.on('menuAvailability', onMenuAvailability);
            inventorySocket.on('inventoryUpdate', onInventoryUpdate);
            socket.on('memberBalanceUpdated', onMemberBalanceUpdated);

            return () => {
                inventorySocket.off('connect', onConnect);
                inventorySocket.off('connect_error', onConnectError);
                inventorySocket.off('disconnect', onDisconnect);
                inventorySocket.off('menuAvailability', onMenuAvailability);
                inventorySocket.off('inventoryUpdate', onInventoryUpdate);
                socket.off('memberBalanceUpdated', onMemberBalanceUpdated);
            };
        }
    }, [isOpen]);

    // ── Real-time Stock Conflict Detection ──────────────────────────────────
    useEffect(() => {
        if (!isOpen || cart.length === 0) return;

        let hasConflict = false;
        let conflictItemName = '';

        const adjustedCart = cart.map(item => {
            const stock = availability[item.id] ?? 999;
            if (item.quantity > stock) {
                hasConflict = true;
                conflictItemName = item.name;
                return { ...item, quantity: stock };
            }
            return item;
        }).filter(item => item.quantity > 0);

        if (hasConflict) {
            setCart(adjustedCart);
            showAlert(
                'Penyesuaian Stok',
                `Stok ${conflictItemName} berubah karena pesanan lain. Keranjang Anda telah disesuaikan.`,
                { variant: 'warning' }
            );
        }
    }, [availability, isOpen]);

    const fetchFinanceSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/settings`);
            setFinanceSettings({
                ppnPercentage: Number(res.data.ppnPercentage || 0),
                serviceChargePercentage: Number(res.data.serviceChargePercentage || 0),
            });
        } catch (error) {
            console.error('Failed to fetch finance settings:', error);
        }
    };

    const fetchAvailability = async () => {
        try {
            const res = await axios.get(`${API_URL}/inventory/menu-availability`);
            setAvailability(res.data);
        } catch (error) {
            console.error('Failed to fetch initial availability:', error);
        }
    };

    const fetchIngredients = async () => {
        try {
            const res = await axios.get(`${API_URL}/inventory/ingredients`);
            setIngredients(res.data);
        } catch (error) {
            console.error('Failed to fetch ingredients:', error);
        }
    };

    const fetchTransaction = async () => {
        try {
            const token = localStorage.getItem('token');
            // Use existing endpoint to get active transaction for table or specific cafe transaction
            const url = cafeTransactionId
                ? `${API_URL}/transactions/${cafeTransactionId}`
                : `${API_URL}/transactions/table/${tableId}`;

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveTransaction(res.data);
        } catch (error) {
            console.error('Failed to fetch transaction for balance guard:', error);
        }
    };

    const fetchMenu = async () => {
        setLoading(true);
        try {
            const [menuRes, promoRes, bestRes, catRes] = await Promise.all([
                axios.get(`${API_URL}/cafe/menu`),
                axios.get(`${API_URL}/admin/promos`),
                axios.get(`${API_URL}/reports/best-sellers`),
                axios.get(`${API_URL}/cafe/categories`)
            ]);

            const bestSellerList = bestRes.data;
            const regularMenu = menuRes.data;
            const dbCategories = catRes.data.filter((c: any) => c.isActive);

            // Construct dynamic categories list
            const dynamicCategories = [
                { id: 'ALL', label: 'Semua', icon: getCategoryIcon('ALL') },
                { id: 'BUNDLING', label: 'Paket Bundling', icon: getCategoryIcon('BUNDLING') },
                ...dbCategories.map((c: any) => ({
                    id: c.id,
                    label: c.name,
                    icon: getCategoryIcon(c.name)
                }))
            ];
            setCategories(dynamicCategories);
            const bundles = promoRes.data
                .filter((p: any) => p.isActive && p.type === 'BUNDLE')
                .map((p: any) => {
                    const rule = p.ruleJson || {};
                    const staticItems = rule.requireMenuItems || [];
                    const dynamicCount = rule.bestSellerCount || 0;

                    // Resolve dynamic best sellers
                    const dynamicItems = bestSellerList
                        .slice(0, dynamicCount)
                        .map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            quantity: 1,
                            isDynamicBestSeller: true
                        }));

                    return {
                        id: `PROMO_${p.id}`,
                        promoId: p.id,
                        name: p.name,
                        price: rule.fixedPrice || 0,
                        category: 'BUNDLING',
                        isPromo: true,
                        minutes: rule.requireBilliardMinutes || 0,
                        badge: rule.badge, // Pass badge
                        items: [...staticItems, ...dynamicItems]
                    };
                });



            setMenu([...regularMenu, ...bundles]);
        } catch (error) {
            console.error('Failed to fetch menu:', error);
            showAlert('Error', 'Gagal memuat menu cafe.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    /** Hitung estimasi grand total cart termasuk PPN & Service Charge */
    const calcCartGrandTotal = (cartItems: any[], extraItemPrice = 0): number => {
        const subtotal = cartItems.reduce((sum: number, c: any) => sum + (Number(c.price) * c.quantity), 0) + extraItemPrice;
        const scPercent = financeSettings.serviceChargePercentage / 100;
        const vatPercent = financeSettings.ppnPercentage / 100;
        const sc = Math.round(subtotal * scPercent);
        const vat = Math.round((subtotal + sc) * vatPercent);
        return subtotal + sc + vat;
    };

    const addToCart = (item: any) => {
        setCart(prev => {
            const currentInCart = prev.find((i: any) => i.id === item.id)?.quantity || 0;
            const itemStock = availability[item.id] ?? 999;

            if (currentInCart + 1 > itemStock) {
                setTimeout(() => showAlert('Stok Habis', `Stok ${item.name} tidak mencukupi untuk ditambah ke keranjang.`, { variant: 'warning' }), 0);
                return prev;
            }

            // Check balance INCLUDING PPN + SC
            if (isMemberSession) {
                const newEstimatedTotal = calcCartGrandTotal(prev, Number(item.price));
                if (newEstimatedTotal > remainingBalance) {
                    const scPct = financeSettings.serviceChargePercentage;
                    const vatPct = financeSettings.ppnPercentage;
                    setTimeout(() => showAlert(
                        'Saldo Tidak Cukup',
                        `Sisa saldo tidak mencukupi untuk menambah ${item.name}.\nEstimasi tagihan (incl. SC ${scPct}% + PPN ${vatPct}%): Rp ${newEstimatedTotal.toLocaleString()} > Saldo: Rp ${remainingBalance.toLocaleString()}.`,
                        { variant: 'warning' }
                    ), 0);
                    return prev;
                }
            }

            const existing = prev.find((i: any) => i.id === item.id);
            if (existing) return prev.map((i: any) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, {
                ...item,
                quantity: 1,
                note: item.isPromo ? `Bundle: ${item.name}` : ''
            }];
        });
    };

    const updateQuantity = (id: number, qt: number) => {
        setCart(prev => {
            if (qt <= 0) return prev.filter((i: any) => i.id !== id);

            const itemStock = availability[id] ?? 999;
            if (qt > itemStock) {
                setTimeout(() => showAlert('Stok Terbatas', 'Jumlah pesanan melebihi stok yang tersedia.', { variant: 'warning' }), 0);
                return prev;
            }

            const currentItem = prev.find((i: any) => i.id === id);
            if (currentItem && qt > currentItem.quantity) {
                // Simulate the new cart state to check estimated total incl. PPN+SC
                if (isMemberSession) {
                    const simulatedCart = prev.map((i: any) => i.id === id ? { ...i, quantity: qt } : i);
                    const newEstimatedTotal = calcCartGrandTotal(simulatedCart);
                    if (newEstimatedTotal > remainingBalance) {
                        const scPct = financeSettings.serviceChargePercentage;
                        const vatPct = financeSettings.ppnPercentage;
                        setTimeout(() => showAlert(
                            'Saldo Tidak Cukup',
                            `Menambah jumlah ini melebihi saldo.\nEstimasi tagihan (incl. SC ${scPct}% + PPN ${vatPct}%): Rp ${newEstimatedTotal.toLocaleString()} > Saldo: Rp ${remainingBalance.toLocaleString()}.`,
                            { variant: 'warning' }
                        ), 0);
                        return prev;
                    }
                }
            }

            return prev.map((i: any) => i.id === id ? { ...i, quantity: qt } : i);
        });
    };

    const updateNote = (id: number, note: string) =>
        setCart(prev => prev.map(i => i.id === id ? { ...i, note } : i));

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        const estimatedTotal = calcCartGrandTotal(cart);
        const scPct = financeSettings.serviceChargePercentage;
        const vatPct = financeSettings.ppnPercentage;
        const confirmed = await showConfirm(
            'Konfirmasi Pesanan',
            `Kirim ${cart.reduce((a, b) => a + b.quantity, 0)} item ke dapur untuk Meja ${tableId}?${isMemberSession ? `\n\nEstimasi tagihan (incl. SC ${scPct}% + PPN ${vatPct}%): Rp ${estimatedTotal.toLocaleString()}` : ''}`
        );
        if (!confirmed) return;
        try {
            await axios.post(`${API_URL}/cafe/order`, {
                items: cart.map(i => ({
                    id: i.isPromo ? undefined : i.id,
                    promoId: i.isPromo ? i.promoId : undefined,
                    quantity: i.quantity,
                    note: i.note
                })),
                // If cafeTransactionId is set, send it directly; otherwise use billiard tableId
                ...(cafeTransactionId ? { transactionId: cafeTransactionId } : { tableId: Number(tableId) }),
                userId: user?.id
            });
            await showAlert('Berhasil', 'Pesanan berhasil dikirim ke dapur!', { variant: 'success' });
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Checkout failed:', error);
            const serverMsg: string = error?.response?.data?.message || '';
            const isInsufficientBalance = serverMsg.toLowerCase().includes('saldo tidak cukup') || error?.response?.status === 402;
            if (isInsufficientBalance) {
                const cartSubtotal = cart.reduce((sum: number, c: any) => sum + (Number(c.price) * c.quantity), 0);
                const sc = Math.round(cartSubtotal * (scPct / 100));
                const vat = Math.round((cartSubtotal + sc) * (vatPct / 100));
                showAlert(
                    '⚠️ Saldo Tidak Mencukupi',
                    `Pesanan dibatalkan karena saldo member tidak cukup setelah pajak.\n\n` +
                    `Subtotal : Rp ${cartSubtotal.toLocaleString()}\n` +
                    `Service Charge (${scPct}%) : Rp ${sc.toLocaleString()}\n` +
                    `PPN (${vatPct}%) : Rp ${vat.toLocaleString()}\n` +
                    `────────────────\n` +
                    `Estimasi Total : Rp ${estimatedTotal.toLocaleString()}\n\n` +
                    `Sisa Saldo Member: Rp ${remainingBalance.toLocaleString()}\n` +
                    `Kekurangan: Rp ${Math.max(0, estimatedTotal - remainingBalance).toLocaleString()}\n\n` +
                    `Kurangi pesanan atau lakukan top-up saldo terlebih dahulu.`,
                    { variant: 'error' }
                );
            } else {
                showAlert('Gagal', serverMsg || 'Gagal memproses pesanan. Silakan coba lagi.', { variant: 'error' });
            }
        }
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalItems = cart.reduce((a, b) => a + b.quantity, 0);

    // ── Category filter: dynamic matching based on ID or BUNDLING type ──────────
    const filteredMenu = menu.filter(item => {
        // Real-time Disable Check: If availability is -1, it means the item is manually disabled
        if (availability[item.id] === -1) return false;

        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (item.isPromo && item.minutes > 0) return false;

        let matchesCategory = false;
        if (activeCategory === 'ALL') {
            matchesCategory = true;
        } else if (activeCategory === 'BUNDLING') {
            matchesCategory = !!item.isPromo;
        } else {
            matchesCategory = item.categoryId === activeCategory;
        }

        return matchesCategory && matchesSearch && !item.isSubRecipe;
    });

    // ── Membership Balance Calculation (PPN+SC aware) ────────────────────────
    // member.balance sudah dikurangi tagihan yang sudah terbayar (jika ada).
    // Saldo yang tersedia = member.balance dikurangi tagihan berjalan saat ini (termasuk Billiard).
    const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const member = activeTransaction?.member;
    const isMemberSession = !!member;

    // Live table liability calculation: total tagihan meja saat ini (Billiard + Cafe + Pajak - Diskon - Paid)
    const currentTableLiability = isMemberSession && activeTransaction
        ? Math.max(0, Number(activeTransaction.grandTotal || 0) - Number(activeTransaction.paidAmount || 0))
        : 0;

    const remainingBalance = isMemberSession ? Number(member.balance || 0) - currentTableLiability : 999999999;

    // Estimasi total cart TERMASUK PPN & Service Charge
    const estimatedCartTotal = (() => {
        if (cartTotal === 0) return 0;
        const scPct = financeSettings.serviceChargePercentage / 100;
        const vatPct = financeSettings.ppnPercentage / 100;
        const sc = Math.round(cartTotal * scPct);
        const vat = Math.round((cartTotal + sc) * vatPct);
        return cartTotal + sc + vat;
    })();
    const estimatedSC = Math.round(cartTotal * (financeSettings.serviceChargePercentage / 100));
    const estimatedVAT = Math.round((cartTotal + estimatedSC) * (financeSettings.ppnPercentage / 100));

    // Sisa saldo setelah membayar cart ini (incl. pajak)
    const potentialTotal = remainingBalance - estimatedCartTotal;
    const isBalanceInsufficient = isMemberSession && potentialTotal < 0;

    if (!isOpen) return null;

    return (
        /* ── BACKDROP ─────────────────────────────────────────────────────────── */
        <div
            className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-sm flex flex-col"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="
                flex flex-col
                w-full h-full
                md:w-[90vw] lg:w-[85vw] xl:w-[80vw]
                md:h-[90vh]
                md:m-auto
                bg-slate-50
                rounded-t-3xl md:rounded-3xl
                overflow-hidden
                shadow-2xl
                animate-in slide-in-from-bottom-6 md:zoom-in-95 duration-300
                relative
            ">
                {/* ── DRAG HANDLE (mobile) ──────────────────────────────────── */}
                <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0 bg-white">
                    <div className="w-10 h-1 bg-slate-300 rounded-full" />
                </div>

                {/* ── HEADER ────────────────────────────────────────────────── */}
                <div className="bg-white px-4 pt-2 pb-3 md:px-6 md:pt-4 md:pb-4 border-b border-slate-100 shadow-sm shrink-0 z-10">
                    <div className="flex justify-between items-center mb-2.5">
                        <div className="flex flex-col">
                            <h2 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <Utensils className="w-5 h-5 text-indigo-600 shrink-0" />
                                Menu Pesanan
                                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg text-xs font-bold">
                                    {tableName || `Meja ${tableId}`}
                                </span>
                                <div className="flex items-center gap-1.5 ml-1">
                                    <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${connectionStatus === 'connected' ? 'text-emerald-600' : connectionStatus === 'connecting' ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Sync Error'}
                                    </span>
                                </div>
                            </h2>
                            {isMemberSession && (
                                <div className="flex flex-col gap-1 mt-1">
                                    {/* Balance row */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Tersedia:</span>
                                        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                                            Rp {remainingBalance.toLocaleString()}
                                        </span>
                                    </div>
                                    {/* Active Liability row */}
                                    {currentTableLiability > 0 && (
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Tagihan Berjalan:</span>
                                            <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 leading-none">
                                                - Rp {currentTableLiability.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {/* Cart estimate row (shown only when cart has items) */}
                                    {cartTotal > 0 && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimasi Tagihan:</span>
                                            <span className="text-[10px] font-medium text-slate-500">
                                                Rp {cartTotal.toLocaleString()}
                                                {financeSettings.serviceChargePercentage > 0 && ` + SC Rp ${estimatedSC.toLocaleString()}`}
                                                {financeSettings.ppnPercentage > 0 && ` + PPN Rp ${estimatedVAT.toLocaleString()}`}
                                                {' = '}
                                            </span>
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg shadow-sm border ${potentialTotal < 0
                                                ? 'bg-rose-100 text-rose-600 border-rose-200 animate-pulse'
                                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                Rp {estimatedCartTotal.toLocaleString()}
                                            </span>
                                            {potentialTotal < 0 ? (
                                                <div className="flex items-center gap-1 text-rose-600 animate-bounce">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase">Saldo Tidak Cukup</span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-bold text-slate-400">
                                                    Sisa: Rp {potentialTotal.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { fetchAvailability(); fetchIngredients(); fetchMenu(); }}
                                className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors tooltip"
                                title="Refresh Menu"
                            >
                                <Plus className={`w-4 h-4 transition-transform ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 shrink-0 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                    </div>

                    {/* Category pills + Search */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide whitespace-nowrap transition-all shrink-0 ${activeCategory === cat.id
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {cat.icon}
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                        <div className="w-full sm:w-56 shrink-0">
                            <InputField
                                label=""
                                value={searchQuery}
                                onChange={(val) => setSearchQuery(val)}
                                placeholder="Cari menu..."
                                suffix={<Search className="w-4 h-4" />}
                                className="!py-2 !px-4"
                            />
                        </div>
                    </div>
                </div>

                {/* ── BODY (Menu list + Desktop Cart) ───────────────────────── */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto overscroll-contain p-3 md:p-5 no-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-600" />
                            </div>
                        ) : (
                            <div className={activeCategory === 'BUNDLING' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4" : "flex flex-col gap-2"}>
                                {filteredMenu.map(item => {
                                    const qty = cart.find(c => c.id === item.id)?.quantity || 0;
                                    const inCart = qty > 0;

                                    if (item.isPromo) {
                                        const promoStock = availability[item.id] ?? 999;
                                        const isOutOfStock = promoStock <= 0;
                                        const itemPrice = Number(item.price);
                                        // Disable if adding this item would push estimated total (incl. PPN+SC) over remaining balance
                                        const estimatedIfAdded = (() => { const s = itemPrice; const scPct = financeSettings.serviceChargePercentage / 100; const vPct = financeSettings.ppnPercentage / 100; const sc2 = Math.round(s * scPct); const v2 = Math.round((s + sc2) * vPct); return s + sc2 + v2; })();
                                        const isTooExpensive = isMemberSession && (estimatedCartTotal + estimatedIfAdded) > remainingBalance && qty === 0;

                                        return (
                                            <button
                                                key={item.id}
                                                disabled={isOutOfStock || isTooExpensive}
                                                onClick={() => addToCart(item)}
                                                className={`w-full flex flex-col p-0 rounded-[2.5rem] border-2 transition-all active:scale-[0.98] text-left relative overflow-hidden group h-full shadow-sm hover:shadow-2xl ${isOutOfStock || isTooExpensive
                                                    ? 'bg-slate-50 border-slate-100 opacity-60 grayscale cursor-not-allowed'
                                                    : inCart
                                                        ? 'bg-amber-50 border-amber-500 shadow-amber-100'
                                                        : 'bg-white border-slate-100 hover:border-amber-300'
                                                    }`}
                                            >
                                                {/* Out of Stock / Insufficient Balance Ribbon */}
                                                {(isOutOfStock || isTooExpensive) && (
                                                    <div className="absolute top-0 right-0 z-50 overflow-hidden w-24 h-24">
                                                        <div className={`absolute top-4 -right-8 w-[140%] py-1 ${isTooExpensive ? 'bg-rose-500' : 'bg-slate-400'} text-white text-[10px] font-black text-center uppercase tracking-widest rotate-45 shadow-sm`}>
                                                            {isTooExpensive ? 'SALDO KURANG' : 'HABIS'}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Premium Background Accent */}
                                                <div className={`absolute -right-12 -top-12 w-48 h-48 rounded-full opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700 ${inCart ? 'bg-amber-600' : 'bg-amber-400'}`} />

                                                <div className="p-6 flex-1 flex flex-col relative z-10">
                                                    <div className="flex justify-between items-start mb-5">
                                                        <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-xl font-black shrink-0 transition-all duration-300 ${inCart ? 'bg-amber-600 text-white shadow-xl shadow-amber-200' : 'bg-amber-100 text-amber-600 rotate-3 group-hover:rotate-0'}`}>
                                                            <Tag className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            {!isOutOfStock && Number(promoStock) < 10 && (
                                                                <span className="bg-rose-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-lg flex items-center gap-1">
                                                                    <AlertTriangle className="w-2.5 h-2.5" /> SISA {promoStock}
                                                                </span>
                                                            )}
                                                            {/* Badge Row */}
                                                            <div className="flex gap-1.5 flex-wrap">
                                                                {item.badge ? (
                                                                    <span className="bg-rose-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                                                        {item.badge}
                                                                    </span>
                                                                ) : (
                                                                    item.promoId % 2 === 0 && <span className="bg-rose-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg animate-bounce-subtle">BEST SELLER</span>
                                                                )}
                                                                {item.isPromo && <span className="bg-indigo-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">PACKAGE</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1">
                                                        <h4 className={`font-black text-xl mb-2 leading-tight tracking-tight ${inCart ? 'text-amber-900' : 'text-slate-800'}`}>{item.name}</h4>
                                                        <div className="flex items-baseline gap-2">
                                                            <p className="text-3xl font-black text-amber-600 tracking-tighter">Rp {Number(item.price).toLocaleString()}</p>
                                                            <span className="text-[10px] font-black text-amber-400/60 uppercase">Nett Price</span>
                                                        </div>
                                                    </div>

                                                    {/* Bundle items preview - Modern pill style */}
                                                    <div className={`mt-6 pt-5 border-t border-dashed ${inCart ? 'border-amber-200' : 'border-slate-100'}`}>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Termasuk dalam paket:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.items.map((sub: any, i: number) => (
                                                                <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${inCart ? 'bg-amber-200/30 text-amber-900 border-amber-200 italic' : 'bg-slate-50 text-slate-500 border-slate-100'} ${sub.isDynamicBestSeller ? (inCart ? 'bg-amber-400/20' : 'bg-amber-50 border-amber-100') : ''}`}>
                                                                    <span className="font-black text-amber-600">{sub.quantity}x</span>
                                                                    <span className="truncate max-w-[120px]">{sub.name || `Item #${sub.id}`}</span>
                                                                    {sub.isDynamicBestSeller && <Zap className="w-2 h-2 text-amber-500" strokeWidth={4} />}
                                                                </div>

                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Selection Action Area */}
                                                <div className={`p-5 flex items-center justify-between mt-auto transition-all duration-300 ${inCart ? 'bg-amber-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-amber-600 group-hover:text-white'}`}>
                                                    <div className="flex items-center gap-3">
                                                        {inCart ? (
                                                            <>
                                                                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                                                                    <Check className="w-4 h-4" strokeWidth={4} />
                                                                </div>
                                                                <span className="text-xs font-black uppercase tracking-[0.2em]">Terpilih</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                                                <span className="text-xs font-black uppercase tracking-[0.2em]">Pilih Paket</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {inCart && (
                                                        <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/30">
                                                            <span className="text-sm font-black">{qty}×</span>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    }

                                    const itemStock = availability[item.id] ?? 999;
                                    const isOutOfStock = !item.isPromo && itemStock <= 0;
                                    const itemPrice = Number(item.price);
                                    // Disable if adding this item would push estimated total (incl. PPN+SC) over remaining balance
                                    const estimatedIfAdded = (() => { const s = itemPrice; const scPct = financeSettings.serviceChargePercentage / 100; const vPct = financeSettings.ppnPercentage / 100; const sc2 = Math.round(s * scPct); const v2 = Math.round((s + sc2) * vPct); return s + sc2 + v2; })();
                                    const isTooExpensive = isMemberSession && (estimatedCartTotal + estimatedIfAdded) > remainingBalance && qty === 0;

                                    return (
                                        <button
                                            key={item.id}
                                            disabled={isOutOfStock || isTooExpensive}
                                            onClick={() => addToCart(item)}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] text-left group ${isOutOfStock || isTooExpensive
                                                ? 'bg-slate-50 border-slate-100 opacity-60 grayscale cursor-not-allowed'
                                                : inCart
                                                    ? 'bg-indigo-50 border-indigo-200 shadow-md shadow-indigo-100'
                                                    : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-lg hover:shadow-slate-100'
                                                }`}
                                        >
                                            {/* Category Avatar */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-black shrink-0 transition-colors ${inCart || isTooExpensive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'} ${isTooExpensive ? '!bg-rose-500' : ''}`}>
                                                {isTooExpensive ? <AlertTriangle className="w-5 h-5" /> : (typeof item.category === 'string'
                                                    ? item.category.charAt(0).toUpperCase()
                                                    : item.category?.name?.charAt(0).toUpperCase() || 'M')}
                                            </div>
                                            {/* Name & Price */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-black text-sm truncate ${inCart ? 'text-indigo-900' : 'text-slate-800'} ${isTooExpensive ? 'text-rose-900' : ''}`}>{item.name}</p>
                                                    {!isOutOfStock && !isTooExpensive && Number(itemStock) < 50 && (
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${Number(itemStock) < 10 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
                                                            SISA {itemStock}
                                                        </span>
                                                    )}
                                                    {isOutOfStock && (
                                                        <span className="bg-slate-200 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">HABIS</span>
                                                    )}
                                                    {isTooExpensive && (
                                                        <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm animate-pulse">Saldo Kurang</span>
                                                    )}
                                                </div>
                                                <p className={`text-xs font-bold ${inCart ? 'text-indigo-500' : 'text-slate-400'}`}>Rp {Number(item.price).toLocaleString()}</p>

                                                {/* Recipe / Ingredient Breakdown - Real-time Stock Info */}
                                                {!item.isPromo && item.recipes?.length > 0 && !isOutOfStock && (
                                                    <div className="mt-2 space-y-1">
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); setShowRecipeId(showRecipeId === item.id ? null : item.id); }}
                                                            className="flex items-center gap-1 text-[9px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest transition-colors cursor-pointer"
                                                        >
                                                            <Info className="w-2.5 h-2.5" />
                                                            {showRecipeId === item.id ? 'Tutup Detail Stok' : 'Cek Stok Bahan'}
                                                        </div>

                                                        {showRecipeId === item.id && (
                                                            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 animate-in slide-in-from-top-1 duration-200">
                                                                {item.recipes.map((re: any, idx: number) => {
                                                                    const ing = ingredients.find(i => i.id === re.ingredientId);
                                                                    const currentStock = ing ? Number(ing.stockQuantity) : 0;
                                                                    const isLow = currentStock < (Number(re.quantity) * 5); // Arbitrary low threshold
                                                                    return (
                                                                        <div key={idx} className="flex justify-between text-[8px] font-bold">
                                                                            <span className="text-slate-500">{re.ingredient?.name || 'Bahan'}:</span>
                                                                            <span className={isLow ? 'text-rose-600' : 'text-slate-700'}>
                                                                                {currentStock.toFixed(1)} {re.ingredient?.unit || re.unit}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Qty badge or + */}
                                            {inCart ? (
                                                <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-xl shadow-lg shadow-indigo-100">
                                                    <span className="text-xs font-black">{qty}×</span>
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 group-hover:bg-white group-hover:border-indigo-600 group-hover:text-indigo-600 transition-all">
                                                    <Plus className="w-5 h-5" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                {filteredMenu.length === 0 && (
                                    <div className="py-16 text-center flex flex-col items-center opacity-40">
                                        <Search className="w-10 h-10 text-slate-300 mb-2" />
                                        <p className="font-bold text-slate-400 text-sm">Menu tidak ditemukan</p>
                                        <p className="text-xs text-slate-400 mt-1">Coba kategori lain atau ubah kata kunci.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Desktop Cart Sidebar */}
                    <div className="hidden md:flex flex-col w-[320px] lg:w-[360px] bg-white border-l border-slate-100 shrink-0 overflow-hidden">
                        <CartContent
                            cart={cart}
                            total={total}
                            updateQuantity={updateQuantity}
                            updateNote={updateNote}
                            onCheckout={handleCheckout}
                            isBalanceInsufficient={isBalanceInsufficient}
                            potentialBalance={potentialTotal}
                            scPercent={financeSettings.serviceChargePercentage}
                            vatPercent={financeSettings.ppnPercentage}
                            scAmount={estimatedSC}
                            vatAmount={estimatedVAT}
                            grandEstimate={estimatedCartTotal}
                        />
                    </div>
                </div>

                {/* ── MOBILE BOTTOM BAR ─────────────────────────────────────── */}
                <div className="md:hidden shrink-0 z-20">
                    {/* Cart Drawer (slides up when open) */}
                    {isCartOpen && (
                        <>
                            {/* Dimmer */}
                            <div
                                className="fixed inset-0 bg-black/40 z-30"
                                onClick={() => setIsCartOpen(false)}
                            />
                            {/* Drawer */}
                            <div className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[80dvh]">
                                <div className="flex justify-center pt-3 pb-2 shrink-0" onClick={() => setIsCartOpen(false)}>
                                    <div className="w-10 h-1 bg-slate-200 rounded-full" />
                                </div>
                                <div className="px-5 pb-3 flex justify-between items-center border-b border-slate-100 shrink-0">
                                    <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4 text-indigo-600" />
                                        Keranjang
                                    </h2>
                                    <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                                        {totalItems} Item
                                    </span>
                                </div>
                                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                    <CartContent
                                        cart={cart}
                                        total={total}
                                        updateQuantity={updateQuantity}
                                        updateNote={updateNote}
                                        onCheckout={() => { setIsCartOpen(false); handleCheckout(); }}
                                        isBalanceInsufficient={isBalanceInsufficient}
                                        potentialBalance={potentialTotal}
                                        scPercent={financeSettings.serviceChargePercentage}
                                        vatPercent={financeSettings.ppnPercentage}
                                        scAmount={estimatedSC}
                                        vatAmount={estimatedVAT}
                                        grandEstimate={estimatedCartTotal}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Sticky bottom action bar */}
                    <div className="bg-white border-t border-slate-100 px-4 py-3 flex items-center gap-3">
                        {cart.length > 0 ? (
                            <>
                                <button
                                    onClick={() => setIsCartOpen(true)}
                                    className="flex items-center gap-2 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 transition-all active:scale-[0.98]"
                                >
                                    <ShoppingCart className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-xs font-black text-slate-800 truncate">{totalItems} Item</p>
                                        <p className="text-[10px] text-indigo-600 font-bold">Rp {total.toLocaleString()}</p>
                                    </div>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 rotate-180" />
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    disabled={isBalanceInsufficient}
                                    className={`shrink-0 text-white font-black text-xs px-5 py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 ${isBalanceInsufficient ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                                >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    {isBalanceInsufficient ? 'Saldo Kurang' : 'Proses'}
                                </button>
                            </>
                        ) : (
                            <div className="flex-1 py-2.5 text-center text-xs font-bold text-slate-400">
                                Pilih menu untuk memulai pesanan
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── CART CONTENT (shared: desktop sidebar + mobile drawer) ────────────────── */
function CartContent({ cart, total, updateQuantity, updateNote, onCheckout, isBalanceInsufficient, potentialBalance, scPercent, vatPercent, scAmount, vatAmount, grandEstimate }: any) {
    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Items list */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 no-scrollbar">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3 py-12">
                        <ShoppingCart className="w-10 h-10" />
                        <p className="font-bold text-xs uppercase tracking-widest text-center">Keranjang Kosong</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cart.map((item: any) => {
                            const isIncreaseDisabled = potentialBalance < Number(item.price);

                            return (
                                <div key={item.id} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex gap-2 items-start">
                                        {/* Qty controls */}
                                        <div className="flex flex-col items-center bg-white rounded-lg border border-slate-100 shadow-sm w-7 py-1 shrink-0">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                disabled={isIncreaseDisabled}
                                                className={`p-0.5 transition-colors ${isIncreaseDisabled ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600'}`}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <span className="text-[10px] font-black text-slate-800 py-0.5">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-0.5 text-slate-400 hover:text-rose-500 transition-colors"><Minus className="w-3 h-3" /></button>
                                        </div>
                                        {/* Name & price */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-xs leading-tight line-clamp-2">{item.name}</p>
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Rp {Number(item.price).toLocaleString()}</p>
                                        </div>
                                        {/* Subtotal & delete */}
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className="font-black text-slate-800 text-xs">Rp {(item.price * item.quantity).toLocaleString()}</span>
                                            <button onClick={() => updateQuantity(item.id, 0)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Bundle details in cart */}
                                    {item.isPromo && item.items?.length > 0 && (
                                        <div className="bg-white/50 rounded-lg p-2 border border-slate-100 flex flex-col gap-1">
                                            {item.items.map((sub: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center text-[9px] font-bold text-slate-500 italic">
                                                    <span className="flex items-center gap-1">
                                                        • {sub.quantity}x {sub.name || `Item #${sub.id}`}
                                                        {sub.isDynamicBestSeller && <Zap className="w-2 h-2 text-amber-500" />}
                                                    </span>
                                                </div>

                                            ))}
                                        </div>
                                    )}

                                    {/* Note */}
                                    <InputField
                                        label=""
                                        value={item.note || ''}
                                        onChange={(val) => updateNote(item.id, val)}
                                        placeholder="Catatan (e.g. Kurang Gula)..."
                                        className="!py-2 !px-3 !text-[10px]"
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Desktop Checkout Area */}
            {cart.length > 0 && (
                <div className="p-4 bg-white border-t border-slate-100 sticky bottom-0">
                    {/* Tax Breakdown */}
                    <div className="mb-3 rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400">Subtotal</span>
                            <span className="text-[10px] font-black text-slate-600">Rp {total.toLocaleString()}</span>
                        </div>
                        {scPercent > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400">Service Charge ({scPercent}%)</span>
                                <span className="text-[10px] font-black text-amber-600">+ Rp {scAmount.toLocaleString()}</span>
                            </div>
                        )}
                        {vatPercent > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400">PPN ({vatPercent}%)</span>
                                <span className="text-[10px] font-black text-amber-600">+ Rp {vatAmount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                            <span className="text-xs font-black text-slate-600 uppercase">Estimasi Total</span>
                            <div className="flex flex-col items-end">
                                <span className={`text-base font-black ${isBalanceInsufficient ? 'text-rose-600' : 'text-indigo-600'}`}>Rp {grandEstimate.toLocaleString()}</span>
                                {isBalanceInsufficient && (
                                    <span className="text-[9px] font-black text-rose-500 uppercase animate-pulse">Melebihi Saldo Rp {potentialBalance?.toLocaleString()}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onCheckout}
                        disabled={isBalanceInsufficient}
                        className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${isBalanceInsufficient ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'}`}
                    >
                        <ShoppingCart className="w-4 h-4" />
                        {isBalanceInsufficient ? 'Saldo Tidak Cukup' : 'Kirim Pesanan ke Dapur'}
                    </button>
                    {isBalanceInsufficient && (
                        <p className="text-[9px] text-center text-rose-400 font-bold mt-3 animate-bounce">
                            Harap kurangi pesanan atau top up saldo member.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
