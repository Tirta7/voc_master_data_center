import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, ShoppingCart, Trash2, Plus, Minus, X, Coffee, Utensils, Zap, ChevronDown, Tag, Clock, Check, Info, AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAlert } from '@/components/ui/AlertProvider';
import InputField from '@/components/ui/InputField';
import { inventorySocket, socket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { generateIdempotencyKey } from '@/utils/transactionUtils';


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

const getCategoryColor = (name: string) => {
    const upper = (name || '').toUpperCase();
    if (upper.includes('FOOD') || upper.includes('MAKANAN')) return 'bg-emerald-500';
    if (upper.includes('DRINK') || upper.includes('MINUMAN')) return 'bg-sky-500';
    if (upper.includes('SNACK')) return 'bg-violet-500';
    if (upper.includes('BUNDLING') || upper.includes('PROMO')) return 'bg-amber-500';
    return 'bg-stone-300';
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
    const [isSubmitting, setIsSubmitting] = useState(false);


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

            // ── Real-time Member Balance Update ──
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

    // ── Real-time Stock Conflict Detection ──
    useEffect(() => {
        if (!isOpen || cart.length === 0) return;

        let hasConflict = false;
        let conflictItemName = '';

        const adjustedCart = cart.map((item: any) => {
            const stock = availability[item.id] ?? 999;
            if (item.quantity > stock) {
                hasConflict = true;
                conflictItemName = item.name;
                return { ...item, quantity: stock };
            }
            return item;
        }).filter((item: any) => item.quantity > 0);

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
            const res = await axios.get(`/settings`);
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
            const res = await axios.get(`/inventory/menu-availability`);
            setAvailability(res.data);
        } catch (error) {
            console.error('Failed to fetch initial availability:', error);
        }
    };

    const fetchIngredients = async () => {
        try {
            const res = await axios.get(`/inventory/ingredients`);
            setIngredients(res.data);
        } catch (error) {
            console.error('Failed to fetch ingredients:', error);
        }
    };

    const fetchTransaction = async () => {
        try {
            const url = cafeTransactionId
                ? `/transactions/${cafeTransactionId}`
                : `/transactions/table/${tableId}`;

            const res = await axios.get(url);
            setActiveTransaction(res.data);
        } catch (error) {
            console.error('Failed to fetch transaction for balance guard:', error);
        }
    };

    const fetchMenu = async () => {
        setLoading(true);
        try {
            const [menuRes, promoRes, bestRes, catRes] = await Promise.all([
                axios.get(`/cafe/menu`),
                axios.get(`/admin/promos`),
                axios.get(`/reports/best-sellers`),
                axios.get(`/cafe/categories`)
            ]);

            const bestSellerList = bestRes.data;
            const regularMenu = menuRes.data;
            const dbCategories = catRes.data.filter((c: any) => c.isActive && c.type !== 'INGREDIENT');

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
                        badge: rule.badge,
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
                setTimeout(() => showAlert('Stok Habis', `Stok ${item.name} tidak mencukupi.`, { variant: 'warning' }), 0);
                return prev;
            }

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
                setTimeout(() => showAlert('Stok Terbatas', 'Jumlah pesanan melebihi stok.', { variant: 'warning' }), 0);
                return prev;
            }

            const currentItem = prev.find((i: any) => i.id === id);
            if (currentItem && qt > currentItem.quantity) {
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

        const hasKitchenItems = cart.some((item: any) => {
            const catName = (typeof item.category === 'object' ? item.category?.name : item.category) || '';
            const upper = catName.toUpperCase();
            return !upper.includes('STORE') && !upper.includes('TOKO') && !upper.includes('PERBAIKAN');
        });

        const actionVerb = hasKitchenItems ? 'Kirim ke Dapur' : 'Simpan Pesanan';
        const successMsg = hasKitchenItems ? 'Pesanan berhasil dikirim ke dapur!' : 'Pesanan berhasil disimpan!';

        const estimatedTotal = calcCartGrandTotal(cart);
        const scPct = financeSettings.serviceChargePercentage;
        const vatPct = financeSettings.ppnPercentage;
        const confirmed = await showConfirm(
            'Konfirmasi Pesanan',
            `${hasKitchenItems ? 'Kirim' : 'Simpan'} ${cart.reduce((a, b) => a + b.quantity, 0)} item ${hasKitchenItems ? 'ke dapur ' : ''}untuk Meja ${tableId}?${isMemberSession ? `\n\nEstimasi tagihan (incl. pajak): Rp ${estimatedTotal.toLocaleString()}` : ''}`
        );
        if (!confirmed || isSubmitting) return;

        setIsSubmitting(true);
        const idempotencyKey = generateIdempotencyKey('cafe_order', user?.id);
        try {
            await axios.post(`/cafe/order`, {
                items: cart.map(i => ({
                    id: i.isPromo ? undefined : i.id,
                    promoId: i.isPromo ? i.promoId : undefined,
                    quantity: i.quantity,
                    note: i.note
                })),
                ...(cafeTransactionId ? { transactionId: cafeTransactionId } : { tableId: Number(tableId) }),
                userId: user?.id,
                idempotencyKey
            });
            setIsSubmitting(false);
            await showAlert('Berhasil', successMsg, { variant: 'success' });
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            setIsSubmitting(false);
            console.error('Checkout failed:', error);
            const serverMsg: string = error?.response?.data?.message || '';
            const isInsufficientBalance = serverMsg.toLowerCase().includes('saldo tidak cukup') || error?.response?.status === 402;
            if (isInsufficientBalance) {
                const scPct = financeSettings.serviceChargePercentage;
                const vatPct = financeSettings.ppnPercentage;
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
                showAlert('Gagal', serverMsg || 'Gagal memproses pesanan.', { variant: 'error' });
            }
        }
    };

    const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const totalItems = cart.reduce((a, b) => a + b.quantity, 0);

    const filteredMenu = menu.filter((item: any) => {
        if (availability[item.id] === -1) return false;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (item.isPromo && item.minutes > 0) return false;

        let matchesCategory = false;
        if (activeCategory === 'ALL') matchesCategory = true;
        else if (activeCategory === 'BUNDLING') matchesCategory = !!item.isPromo;
        else matchesCategory = item.categoryId === activeCategory;

        return matchesCategory && matchesSearch && !item.isSubRecipe;
    });

    const activeTransactionMember = activeTransaction?.member;
    const isMemberSession = !!activeTransactionMember;

    // Accurate Current Debt: includes duration + already committed cafe items
    const currentTableLiability = isMemberSession && activeTransaction
        ? Number(activeTransaction.grandTotal || 0)
        : 0;

    const totalMemberBalance = isMemberSession ? Number(activeTransactionMember.balance || 0) : 999999999;
    const remainingBalance = totalMemberBalance - currentTableLiability;

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

    const potentialTotal = remainingBalance - estimatedCartTotal;
    const isBalanceInsufficient = isMemberSession && potentialTotal < 0;

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-md flex flex-col"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="flex flex-col w-full h-full md:w-[96vw] lg:w-[93vw] xl:w-[89vw] md:h-[90vh] md:m-auto bg-[#FAFAF9] rounded-t-3xl md:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 duration-300 relative">

                {/* ── SUBMISSION OVERLAY ────────────────────────────────────── */}
                {isSubmitting && (
                    <div className="absolute inset-0 z-[9000] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-stone-100 border-t-stone-800 rounded-full animate-spin shadow-2xl" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ShoppingCart className="w-8 h-8 text-stone-300 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-stone-900 font-black uppercase tracking-[0.2em] text-lg">Mengirim Pesanan...</p>
                            <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Sinkronisasi dapur sedang berjalan</p>
                        </div>
                    </div>
                )}

                {/* ── DRAG HANDLE (mobile) ── */}
                <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0 bg-white">
                    <div className="w-10 h-1 bg-stone-200 rounded-full" />
                </div>

                {/* ── HEADER ────────────────────────────────────────────────── */}
                <div className="bg-white/80 backdrop-blur-md px-4 pt-3 pb-3 md:px-6 md:pt-5 md:pb-4 border-b border-stone-100 shrink-0 z-20 sticky top-0">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                            <h2 className="text-xl md:text-2xl font-black text-stone-900 tracking-tighter flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-stone-900 flex items-center justify-center shadow-lg shadow-stone-900/10">
                                    <Utensils className="w-5 h-5 text-white" />
                                </div>
                                <span>Menu Pesanan</span>
                                <div className="bg-stone-100 text-stone-600 px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase ml-1">
                                    {tableName || `Meja ${tableId}`}
                                </div>
                                <div className="flex items-center gap-2 ml-1">
                                    <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${connectionStatus === 'connected' ? 'text-emerald-600' : connectionStatus === 'connecting' ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Wait' : 'Offline'}
                                    </span>
                                </div>
                            </h2>
                            {isMemberSession && (
                                <div className="flex flex-col gap-1.5 mt-3">
                                    <div className="flex items-center gap-3">
                                        {/* PILLAR 1: TOTAL SALDO */}
                                        <div className="flex flex-col px-3 py-1.5 rounded-xl border bg-stone-50 border-stone-100 h-full justify-center">
                                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.1em]">Total Saldo</span>
                                            <span className="text-xs font-black text-stone-800 tabular-nums">
                                                Rp {totalMemberBalance.toLocaleString('id-ID')}
                                            </span>
                                        </div>

                                        <div className="text-stone-300 font-light text-xl">−</div>

                                        {/* PILLAR 2: HUTANG LIVE */}
                                        <div className="flex flex-col px-3 py-1.5 rounded-xl border bg-rose-50/50 border-rose-100 h-full justify-center">
                                            <span className="text-[9px] font-black text-rose-400 uppercase tracking-[0.1em]">Tagihan Meja</span>
                                            <span className="text-xs font-black text-rose-500 tabular-nums">
                                                Rp {currentTableLiability.toLocaleString('id-ID')}
                                            </span>
                                        </div>

                                        <div className="text-stone-300 font-light text-xl">=</div>

                                        {/* PILLAR 3: SISA BUDGET (EFFECTIVE) */}
                                        <div className={`flex flex-col px-4 py-1.5 rounded-xl border transition-all duration-300 h-full justify-center min-w-[120px] ${remainingBalance < 50000 ? 'bg-rose-50 border-rose-200 animate-pulse' : 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-100'}`}>
                                            <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${remainingBalance < 50000 ? 'text-rose-500' : 'text-indigo-100'}`}>
                                                {remainingBalance < 0 ? 'Hutang Melebih Saldo' : 'Sisa Budget'}
                                            </span>
                                            <span className={`text-sm font-black tabular-nums ${remainingBalance < 50000 ? 'text-rose-600' : 'text-white'}`}>
                                                Rp {Math.max(0, remainingBalance).toLocaleString('id-ID')}
                                            </span>
                                        </div>

                                        {cartTotal > 0 && (
                                            <>
                                                <div className="w-px h-6 bg-stone-200 mx-1" />
                                                <div className="flex flex-col px-3 py-1.5 rounded-xl border bg-emerald-50 border-emerald-100 h-full justify-center">
                                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.1em]">Estimasi Baru</span>
                                                    <span className={`text-xs font-black tabular-nums ${remainingBalance < estimatedCartTotal ? 'text-rose-600 animate-pulse' : 'text-emerald-700'}`}>
                                                        Rp {estimatedCartTotal.toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {potentialTotal < 0 && (
                                        <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 w-fit">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Peringatan: Saldo Tidak Mencukupi</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={() => { fetchAvailability(); fetchIngredients(); fetchMenu(); }}
                                className="w-10 h-10 flex items-center justify-center bg-stone-50 hover:bg-stone-100 rounded-2xl text-stone-400 transition-all border border-stone-200 active:scale-90"
                                title="Refresh Menu"
                            >
                                <Clock className={`w-4 h-4 transition-transform ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center bg-stone-50 hover:bg-rose-50 hover:text-rose-500 rounded-2xl text-stone-400 shrink-0 transition-all border border-stone-200 active:scale-90"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${activeCategory === cat.id
                                        ? 'bg-stone-900 text-white shadow-xl shadow-stone-900/20 translate-y-[-1px]'
                                        : 'bg-white text-stone-500 border border-stone-200 hover:border-stone-400 hover:text-stone-800'
                                        }`}
                                >
                                    {cat.icon}
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                        <div className="relative flex-1 md:max-w-[300px]">
                            <InputField
                                label=""
                                value={searchQuery}
                                onChange={(val) => setSearchQuery(val)}
                                placeholder="Cari menu favorit..."
                                suffix={<Search className="w-4 h-4 text-stone-400" />}
                                className="!py-3 !px-6 !bg-stone-50 !border-stone-200 focus:!bg-white focus:!border-stone-900 !rounded-2xl !text-xs !font-bold transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* ── BODY ──────────────────────────────────────────────────── */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Menu Area */}
                    <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 no-scrollbar bg-stone-50/10">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-stone-300">
                                <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-stone-100 border-t-stone-900" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Memuat Menu...</span>
                            </div>
                        ) : (
                            <div className={activeCategory === 'BUNDLING' ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5" : "grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2.5"}>
                                {filteredMenu.map((item: any) => {
                                    const qty = cart.find(c => c.id === item.id)?.quantity || 0;
                                    const inCart = qty > 0;
                                    const itemPrice = Number(item.price);
                                    const isPromo = !!item.isPromo;
                                    const itemStock = availability[item.id] ?? 999;
                                    const isOutOfStock = !isPromo && itemStock <= 0;

                                    const catName = (typeof item.category === 'object' ? item.category?.name : item.category) || '';
                                    const catColor = getCategoryColor(catName);

                                    const estimatedIfAdded = (() => { const s = itemPrice; const scPct = financeSettings.serviceChargePercentage / 100; const vPct = financeSettings.ppnPercentage / 100; const sc2 = Math.round(s * scPct); const v2 = Math.round((s + sc2) * vPct); return s + sc2 + v2; })();
                                    const isTooExpensive = isMemberSession && (estimatedCartTotal + estimatedIfAdded) > remainingBalance && qty === 0;

                                    return (
                                        <button
                                            key={item.id}
                                            disabled={isOutOfStock || isTooExpensive}
                                            onClick={() => addToCart(item)}
                                            className={`group relative flex flex-col w-full text-left rounded-xl border transition-all duration-300 overflow-hidden ${isOutOfStock || isTooExpensive
                                                ? 'bg-stone-50 border-stone-100 opacity-60'
                                                : inCart
                                                    ? 'bg-stone-900 border-stone-800 shadow-lg ring-2 ring-stone-900/10 translate-y-[-2px]'
                                                    : 'bg-white border-stone-100 hover:border-stone-400 hover:shadow-md hover:translate-y-[-1px]'
                                                }`}
                                        >
                                            {/* Category Color Bar */}
                                            <div className={`absolute top-0 left-0 bottom-0 w-1 ${catColor} ${inCart ? 'opacity-100' : 'opacity-40'}`} />

                                            <div className="p-2.5 pl-3.5 flex flex-col h-full flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[7px] font-black uppercase tracking-widest ${inCart ? 'text-white/40' : 'text-stone-400'}`}>
                                                            {catName}
                                                        </span>
                                                        <div className={`mt-0.5 flex items-center gap-1.5 transition-colors duration-300 ${inCart ? 'text-white' : 'text-stone-400'}`}>
                                                            {isPromo ? <Tag className="w-2.5 h-2.5" /> : (typeof item.category === 'string' ? getCategoryIcon(item.category) : getCategoryIcon(item.category?.name || 'ALL'))}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        {isOutOfStock ? (
                                                            <span className="bg-rose-50 text-rose-500 text-[6px] font-black px-1.5 py-0.5 rounded border border-rose-100 uppercase">SOLDOUT</span>
                                                        ) : isTooExpensive ? (
                                                            <span className="bg-rose-100 text-rose-600 text-[6px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">NO BAL</span>
                                                        ) : (
                                                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${inCart ? 'bg-white/10 border-white/5 text-white/60' : (Number(itemStock) < 10 ? 'bg-rose-50 border-rose-100 text-rose-500 animate-pulse' : 'bg-stone-50 border-stone-100 text-stone-400')}`}>
                                                                <span className="text-[6px] font-black uppercase">STK:</span>
                                                                <span className="text-[7px] font-black tabular-nums">{itemStock}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {isTooExpensive && (
                                                    <div className="absolute top-0 right-0 z-50 overflow-hidden w-24 h-24 pointer-events-none">
                                                        <div className="absolute top-4 -right-8 w-[140%] py-1 bg-rose-500 text-white text-[7px] font-black text-center uppercase tracking-widest rotate-45 shadow-lg animate-pulse">
                                                            SALDO KURANG
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex-1 min-h-[32px]">
                                                    <h4 className={`text-[11px] font-bold leading-tight mb-1 line-clamp-2 transition-colors duration-300 ${inCart ? 'text-white' : 'text-stone-800'}`}>
                                                        {item.name}
                                                    </h4>
                                                </div>

                                                <div className="flex items-baseline justify-between mt-auto mb-1">
                                                    <div className={`flex items-baseline gap-0.5 ${inCart ? 'text-white' : 'text-stone-900'}`}>
                                                        <span className={`text-[8px] font-black ${inCart ? 'text-white/40' : 'text-stone-400'}`}>Rp</span>
                                                        <span className="text-[12px] font-black tabular-nums tracking-tighter">{itemPrice.toLocaleString()}</span>
                                                    </div>
                                                    {inCart && (
                                                        <div className="text-[10px] font-black tabular-nums bg-white/20 text-white px-1.5 rounded-lg">
                                                            {qty}x
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Recipe / Ingredient Breakdown */}
                                                {!item.isPromo && item.recipes?.length > 0 && !isOutOfStock && (
                                                    <div className="mt-2.5 pt-2 border-t border-dashed border-stone-100 flex flex-col gap-1.5">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setShowRecipeId(showRecipeId === item.id ? null : item.id); }}
                                                            className={`flex items-center gap-1 text-[7px] font-black uppercase tracking-widest transition-colors ${inCart ? 'text-white/60 hover:text-white' : 'text-stone-400 hover:text-stone-600'}`}
                                                        >
                                                            <Info className="w-2.5 h-2.5 text-stone-300" />
                                                            {showRecipeId === item.id ? 'Tutup Detail' : 'Stok Bahan'}
                                                        </button>

                                                        {showRecipeId === item.id && (
                                                            <div className={`rounded-lg p-2 border animate-in slide-in-from-top-1 duration-200 ${inCart ? 'bg-white/10 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                                                                {item.recipes.map((re: any, idx: number) => {
                                                                    const ing = ingredients.find(i => i.id === re.ingredientId);
                                                                    const currentStock = ing ? Number(ing.stockQuantity) : 0;
                                                                    const isLow = currentStock < (Number(re.quantity) * 5);
                                                                    return (
                                                                        <div key={idx} className="flex justify-between text-[7px] font-black items-center py-0.5">
                                                                            <span className={inCart ? 'text-white/50 uppercase tracking-tighter' : 'text-stone-400 uppercase tracking-tighter'}>{re.ingredient?.name || 'Bahan'}:</span>
                                                                            <span className={`tabular-nums ${isLow ? 'text-rose-500' : inCart ? 'text-white/70' : 'text-stone-600'}`}>
                                                                                {currentStock.toFixed(1)} <span className="text-[6px] opacity-70">{re.ingredient?.unit || re.unit}</span>
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {isPromo && item.items?.length > 0 && (
                                                    <div className={`mt-2 pt-2 border-t border-dashed ${inCart ? 'border-white/10' : 'border-stone-100'}`}>
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.items.slice(0, 3).map((sub: any, idx: number) => (
                                                                <div key={idx} className={`px-2 py-0.5 rounded-lg text-[8px] font-bold border transition-colors ${inCart ? 'bg-white/10 border-white/5 text-white/60' : 'bg-stone-50 border-stone-100 text-stone-500'}`}>
                                                                    {sub.quantity}x {sub.name}
                                                                </div>
                                                            ))}
                                                            {item.items.length > 3 && <div className="text-[8px] text-stone-400 font-bold px-1">+{item.items.length - 3}</div>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </button>

                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Desktop Sidebar */}
                    <div className="hidden md:flex flex-col w-[320px] lg:w-[350px] bg-white border-l border-stone-100 shrink-0 overflow-hidden relative">
                        <CartContent
                            cart={cart}
                            total={cartTotal}
                            updateQuantity={updateQuantity}
                            updateNote={updateNote}
                            onCheckout={handleCheckout}
                            isBalanceInsufficient={isBalanceInsufficient}
                            potentialBalance={remainingBalance}
                            scPercent={financeSettings.serviceChargePercentage}
                            vatPercent={financeSettings.ppnPercentage}
                            scAmount={estimatedSC}
                            vatAmount={estimatedVAT}
                            grandEstimate={estimatedCartTotal}
                            isSubmitting={isSubmitting}
                        />
                    </div>
                </div>

                {/* ── MOBILE ACTIONS ────────────────────────────────────────── */}
                <div className="md:hidden shrink-0 z-20">
                    {/* Cart Drawer */}
                    {isCartOpen && (
                        <>
                            <div className="fixed inset-0 bg-black/40 z-[120]" onClick={() => setIsCartOpen(false)} />
                            <div className="fixed inset-x-0 bottom-0 z-[130] bg-white rounded-t-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-full duration-500 flex flex-col h-[85dvh] overflow-hidden">
                                <div className="flex justify-center pt-4 pb-2 shrink-0" onClick={() => setIsCartOpen(false)}>
                                    <div className="w-12 h-1.5 bg-stone-100 rounded-full" />
                                </div>
                                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                    <CartContent
                                        cart={cart}
                                        total={cartTotal}
                                        updateQuantity={updateQuantity}
                                        updateNote={updateNote}
                                        onCheckout={() => { setIsCartOpen(false); handleCheckout(); }}
                                        isBalanceInsufficient={isBalanceInsufficient}
                                        potentialBalance={remainingBalance}
                                        scPercent={financeSettings.serviceChargePercentage}
                                        vatPercent={financeSettings.ppnPercentage}
                                        scAmount={estimatedSC}
                                        vatAmount={estimatedVAT}
                                        grandEstimate={estimatedCartTotal}
                                        isSubmitting={isSubmitting}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="bg-white/80 backdrop-blur-md border-t border-stone-100 px-6 py-5 flex items-center gap-4">
                        {cart.length > 0 ? (
                            <>
                                <button
                                    onClick={() => setIsCartOpen(true)}
                                    className="flex items-center gap-3 flex-1 bg-stone-50 border border-stone-100 rounded-[1.5rem] px-5 py-3 transition-all active:scale-95"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center relative">
                                        <ShoppingCart className="w-4 h-4 text-stone-900" />
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-stone-900 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">{totalItems}</span>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Total Bill</p>
                                        <p className="text-sm font-black text-stone-900 tabular-nums">Rp {estimatedCartTotal.toLocaleString()}</p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-stone-300 rotate-180" />
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    disabled={isBalanceInsufficient || isSubmitting}
                                    className={`shrink-0 h-14 px-8 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3 ${isBalanceInsufficient ? 'bg-rose-100 text-rose-400 cursor-not-allowed' : isSubmitting ? 'bg-stone-100 text-stone-300' : 'bg-stone-900 text-white shadow-lg shadow-stone-900/20'}`}
                                >
                                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : isBalanceInsufficient ? <AlertCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                    <span>{isBalanceInsufficient ? 'Saldo Kurang' : 'Lanjut'}</span>
                                </button>
                            </>
                        ) : (
                            <div className="flex-1 py-4 text-center text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                                Pilih menu untuk memesan
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── CART CONTENT ────────────────────────────────────────────────────────── */
function CartContent({ cart, total, updateQuantity, updateNote, onCheckout, isBalanceInsufficient, potentialBalance, scPercent, vatPercent, scAmount, vatAmount, grandEstimate, isSubmitting }: any) {
    const hasKitchenItems = cart.some((item: any) => {
        const catName = (typeof item.category === 'object' ? item.category?.name : item.category) || '';
        const upper = catName.toUpperCase();
        return !upper.includes('STORE') && !upper.includes('TOKO') && !upper.includes('PERBAIKAN');
    });

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            {/* Header: Order Ticket Style */}
            <div className="px-4 py-4 bg-white border-b border-stone-100 shrink-0 relative z-30">
                <div className="flex justify-between items-center mb-0.5">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-900">Order Tiket</h2>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-stone-400">{cart.length} Unit</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
                    </div>
                </div>
                <p className="text-[8px] font-bold text-stone-400 flex items-center gap-1.5 uppercase tracking-tighter">
                    <Clock className="w-2.5 h-2.5" />
                    PESANAN BARU • {new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>

            {/* Main Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 md:p-4 no-scrollbar z-10 bg-stone-50/10">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-4 opacity-40">
                        <ShoppingCart className="w-10 h-10 stroke-[1px]" />
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-center">Keranjang Kosong</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {cart.map((item: any) => {
                            const isIncreaseDisabled = potentialBalance < Number(item.price);
                            return (
                                <div key={item.id} className="flex flex-col gap-1.5 bg-white p-2.5 rounded-xl border border-stone-100 shadow-sm group animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex gap-2.5 items-start">
                                        {/* Qty Controls */}
                                        <div className="flex flex-col items-center bg-stone-50 rounded-lg border border-stone-100 w-7.5 py-1 shrink-0">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                disabled={isIncreaseDisabled}
                                                className={`p-0.5 transition-all active:scale-90 ${isIncreaseDisabled ? 'text-stone-200 cursor-not-allowed' : 'text-stone-900 hover:text-emerald-600'}`}
                                            >
                                                <Plus className="w-3 h-3" strokeWidth={3} />
                                            </button>
                                            <span className="text-[10px] font-black text-stone-900 tabular-nums py-0.5">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="p-0.5 text-stone-400 hover:text-rose-500 transition-all active:scale-90"
                                            >
                                                <Minus className="w-3 h-3" strokeWidth={3} />
                                            </button>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <p className="font-bold text-stone-900 text-[10px] leading-tight mb-0.5 truncate">{item.name}</p>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] font-bold text-stone-400">@ {Number(item.price).toLocaleString()}</span>
                                                {item.isPromo && <span className="text-[6px] font-black bg-stone-100 px-1 py-0.5 rounded uppercase">PKG</span>}
                                            </div>

                                            <div className="mt-1.5 text-left">
                                                <InputField
                                                    label=""
                                                    value={item.note || ''}
                                                    onChange={(val) => updateNote(item.id, val)}
                                                    placeholder="Catatan..."
                                                    className="!py-1 !px-2 !text-[7px] !font-bold !bg-stone-50/50 !border-dashed !rounded-md"
                                                />
                                            </div>
                                        </div>

                                        {/* Sum & Delete */}
                                        <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[6px] font-black text-stone-300 uppercase tracking-tighter">Subtotal</span>
                                                <span className="font-black text-stone-900 text-[10px] tabular-nums">{(item.price * item.quantity).toLocaleString()}</span>
                                            </div>
                                            <button
                                                onClick={() => updateQuantity(item.id, 0)}
                                                className="w-5 h-5 flex items-center justify-center rounded-lg text-stone-200 hover:text-rose-500 hover:bg-rose-50 transition-all border border-stone-100"
                                            >
                                                <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {item.isPromo && item.items?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1 border-t border-stone-50 pt-3">
                                            {item.items.map((sub: any, idx: number) => (
                                                <span key={idx} className="text-[8px] font-bold text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-100">
                                                    {sub.quantity}x {sub.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Summary */}
            {cart.length > 0 && (
                <div className="px-5 py-6 bg-white border-t border-stone-100 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] z-30">
                    <div className="space-y-3 mb-6 bg-stone-50 p-4 rounded-3xl border border-stone-100">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-none">Estimasi Bill:</span>
                                <span className="text-[9px] text-stone-500 font-bold tabular-nums">
                                    Rp {total.toLocaleString()}
                                    {scPercent > 0 && ` + SC Rp ${scAmount.toLocaleString()}`}
                                    {vatPercent > 0 && ` + PPN Rp ${vatAmount.toLocaleString()}`}
                                    {' = '}
                                </span>
                            </div>
                            <div className={`flex justify-between items-center p-3 rounded-2xl border transition-all ${isBalanceInsufficient
                                ? 'bg-rose-50 border-rose-200 animate-pulse'
                                : 'bg-white border-stone-100 shadow-sm'
                                }`}>
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isBalanceInsufficient ? 'text-rose-500' : 'text-stone-900'}`}>Total Akhir</span>
                                <div className="flex flex-col items-end">
                                    <span className={`text-xl font-black tabular-nums ${isBalanceInsufficient ? 'text-rose-600' : 'text-stone-900'}`}>
                                        Rp {grandEstimate.toLocaleString()}
                                    </span>
                                    {isBalanceInsufficient && (
                                        <div className="flex items-center gap-1 text-rose-500">
                                            <AlertTriangle className="w-2.5 h-2.5" />
                                            <span className="text-[8px] font-black uppercase tracking-tighter">Saldo Tidak Cukup</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onCheckout}
                        disabled={isBalanceInsufficient || isSubmitting}
                        className={`w-full py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.95] flex items-center justify-center gap-3 shadow-xl ${isBalanceInsufficient || isSubmitting
                            ? 'bg-stone-100 text-stone-300 cursor-not-allowed border border-stone-100'
                            : 'bg-stone-900 hover:bg-stone-800 text-white shadow-stone-900/20 active:shadow-none'}`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-4 h-4" />
                                <span>{isBalanceInsufficient ? 'Saldo Tidak Cukup' : (hasKitchenItems ? 'Kirim Ke Dapur' : 'Simpan Pesanan')}</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
