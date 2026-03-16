import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, ShoppingCart, Trash2, Plus, Minus, X, Coffee, Utensils, Zap, ChevronDown, Tag, Clock, Check, Info, AlertTriangle } from 'lucide-react';
import { useAlert } from '@/components/ui/AlertProvider';
import InputField from '@/components/ui/InputField';
import { inventorySocket, socket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { generateIdempotencyKey } from '@/utils/transactionUtils';

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
        if (!confirmed || isSubmitting) return;

        setIsSubmitting(true);
        const idempotencyKey = generateIdempotencyKey('cafe_order', user?.id);
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
                userId: user?.id,
                idempotencyKey
            });
            setIsSubmitting(false);
            await showAlert('Berhasil', 'Pesanan berhasil dikirim ke dapur!', { variant: 'success' });
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            setIsSubmitting(false);
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
            className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-md flex flex-col"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="
                flex flex-col
                w-full h-full
                md:w-[90vw] lg:w-[85vw] xl:w-[80vw]
                md:h-[90vh]
                md:m-auto
                bg-[#FAFAF9]
                rounded-t-3xl md:rounded-2xl
                overflow-hidden
                shadow-2xl shadow-black/20
                animate-in slide-in-from-bottom-6 md:zoom-in-95 duration-300
                relative
            ">
                {/* ── SUBMISSION OVERLAY (Safety Protection) ── */}
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

                {/* ── DRAG HANDLE (mobile) ──────────────────────────────────── */}
                <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0 bg-white">
                    <div className="w-10 h-1 bg-stone-200 rounded-full" />
                </div>

                {/* ── HEADER ────────────────────────────────────────────────── */}
                <div className="bg-white px-4 pt-3 pb-3 md:px-6 md:pt-5 md:pb-4 border-b border-stone-100 shrink-0 z-10">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex flex-col">
                            <h2 className="text-lg md:text-xl font-bold text-stone-800 tracking-tight flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center">
                                    <Utensils className="w-4 h-4 text-stone-500" />
                                </div>
                                Menu Pesanan
                                <span className="bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold tracking-wide">
                                    {tableName || `Meja ${tableId}`}
                                </span>
                                <div className="flex items-center gap-1.5 ml-0.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400' : connectionStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'}`} />
                                    <span className={`text-[9px] font-medium tracking-wide ${connectionStatus === 'connected' ? 'text-emerald-500' : connectionStatus === 'connecting' ? 'text-amber-500' : 'text-rose-500'}`}>
                                        {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Sync Error'}
                                    </span>
                                </div>
                            </h2>
                            {isMemberSession && (
                                <div className="flex flex-col gap-1 mt-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Saldo Tersedia:</span>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-stone-50 text-stone-700 border border-stone-150">
                                            Rp {remainingBalance.toLocaleString()}
                                        </span>
                                    </div>
                                    {currentTableLiability > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-medium text-stone-400 uppercase tracking-wider leading-none">Tagihan Berjalan:</span>
                                            <span className="text-[9px] font-medium text-rose-500/80 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 leading-none">
                                                - Rp {currentTableLiability.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {cartTotal > 0 && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Estimasi:</span>
                                            <span className="text-[10px] text-stone-500">
                                                Rp {cartTotal.toLocaleString()}
                                                {financeSettings.serviceChargePercentage > 0 && ` + SC Rp ${estimatedSC.toLocaleString()}`}
                                                {financeSettings.ppnPercentage > 0 && ` + PPN Rp ${estimatedVAT.toLocaleString()}`}
                                                {' = '}
                                            </span>
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${potentialTotal < 0
                                                ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                Rp {estimatedCartTotal.toLocaleString()}
                                            </span>
                                            {potentialTotal < 0 ? (
                                                <div className="flex items-center gap-1 text-rose-500">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    <span className="text-[9px] font-semibold">Saldo Tidak Cukup</span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-stone-400">
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
                                className="w-8 h-8 flex items-center justify-center bg-stone-50 hover:bg-stone-100 rounded-xl text-stone-400 transition-colors border border-stone-100"
                                title="Refresh Menu"
                            >
                                <Plus className={`w-3.5 h-3.5 transition-transform ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center bg-stone-50 hover:bg-stone-100 rounded-xl text-stone-400 shrink-0 transition-colors border border-stone-100"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                    </div>

                    {/* Category pills + Search */}
                    <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between">
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all shrink-0 ${activeCategory === cat.id
                                        ? 'bg-stone-800 text-white shadow-sm'
                                        : 'bg-white text-stone-500 border border-stone-150 hover:bg-stone-50 hover:text-stone-700'
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
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-stone-200 border-t-stone-600" />
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
                                                className={`w-full flex flex-col p-0 rounded-2xl border transition-all active:scale-[0.99] text-left relative overflow-hidden group h-full ${isOutOfStock || isTooExpensive
                                                    ? 'bg-stone-50 border-stone-100 opacity-50 cursor-not-allowed'
                                                    : inCart
                                                        ? 'bg-stone-900 border-stone-800 shadow-md'
                                                        : 'bg-white border-stone-100 hover:border-stone-200 hover:shadow-sm'
                                                    }`}
                                            >
                                                {/* Out of Stock / Insufficient Balance Ribbon */}
                                                {(isOutOfStock || isTooExpensive) && (
                                                    <div className="absolute top-0 right-0 z-50 overflow-hidden w-24 h-24">
                                                        <div className={`absolute top-4 -right-8 w-[140%] py-1 ${isTooExpensive ? 'bg-rose-400' : 'bg-stone-400'} text-white text-[10px] font-semibold text-center uppercase tracking-wider rotate-45`}>
                                                            {isTooExpensive ? 'SALDO KURANG' : 'HABIS'}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="p-5 flex-1 flex flex-col relative z-10">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${inCart ? 'bg-white/15 text-white' : 'bg-stone-50 text-stone-400'}`}>
                                                            <Tag className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            {!isOutOfStock && Number(promoStock) < 10 && (
                                                                <span className="bg-rose-50 text-rose-500 text-[9px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                    <AlertTriangle className="w-2.5 h-2.5" /> SISA {promoStock}
                                                                </span>
                                                            )}
                                                            <div className="flex gap-1.5 flex-wrap">
                                                                {item.badge ? (
                                                                    <span className="bg-stone-800 text-white text-[9px] font-semibold px-2 py-0.5 rounded-md">
                                                                        {item.badge}
                                                                    </span>
                                                                ) : (
                                                                    item.promoId % 2 === 0 && <span className="bg-amber-50 text-amber-600 text-[9px] font-semibold px-2 py-0.5 rounded-md border border-amber-100">BEST SELLER</span>
                                                                )}
                                                                {item.isPromo && <span className="bg-stone-100 text-stone-500 text-[9px] font-semibold px-2 py-0.5 rounded-md border border-stone-150">PACKAGE</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1">
                                                        <h4 className={`font-bold text-lg mb-1.5 leading-tight tracking-tight ${inCart ? 'text-white' : 'text-stone-800'}`}>{item.name}</h4>
                                                        <div className="flex items-baseline gap-2">
                                                            <p className={`text-2xl font-bold tracking-tight ${inCart ? 'text-white/80' : 'text-stone-700'}`}>Rp {Number(item.price).toLocaleString()}</p>
                                                        </div>
                                                    </div>

                                                    {/* Bundle items */}
                                                    <div className={`mt-4 pt-4 border-t border-dashed ${inCart ? 'border-white/10' : 'border-stone-100'}`}>
                                                        <p className={`text-[10px] font-medium uppercase tracking-wider mb-2.5 ${inCart ? 'text-white/30' : 'text-stone-400'}`}>Termasuk dalam paket:</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {item.items.map((sub: any, i: number) => (
                                                                <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] border transition-all ${inCart ? 'bg-white/10 text-white/70 border-white/10' : 'bg-stone-50 text-stone-500 border-stone-100'} ${sub.isDynamicBestSeller ? (inCart ? 'bg-white/15' : 'bg-amber-50 border-amber-100') : ''}`}>
                                                                    <span className={`font-semibold ${inCart ? 'text-white/50' : 'text-stone-600'}`}>{sub.quantity}x</span>
                                                                    <span className="truncate max-w-[120px]">{sub.name || `Item #${sub.id}`}</span>
                                                                    {sub.isDynamicBestSeller && <Zap className="w-2 h-2 text-amber-400" strokeWidth={4} />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Selection Footer */}
                                                <div className={`px-5 py-3.5 flex items-center justify-between mt-auto transition-all ${inCart ? 'bg-white/10 text-white' : 'bg-stone-50 text-stone-400 group-hover:bg-stone-800 group-hover:text-white'}`}>
                                                    <div className="flex items-center gap-2.5">
                                                        {inCart ? (
                                                            <>
                                                                <Check className="w-4 h-4" strokeWidth={3} />
                                                                <span className="text-xs font-semibold uppercase tracking-wider">Terpilih</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                                                <span className="text-xs font-semibold uppercase tracking-wider">Pilih Paket</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {inCart && (
                                                        <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg">
                                                            <span className="text-sm font-semibold">{qty}×</span>
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
                                            className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border transition-all active:scale-[0.99] text-left group ${isOutOfStock || isTooExpensive
                                                ? 'bg-stone-50 border-stone-100 opacity-50 cursor-not-allowed'
                                                : inCart
                                                    ? 'bg-stone-900 border-stone-800 shadow-md'
                                                    : 'bg-white border-stone-100 hover:border-stone-200 hover:shadow-sm'
                                                }`}
                                        >
                                            {/* Category Avatar */}
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${inCart ? 'bg-white/15 text-white' :
                                                isTooExpensive ? 'bg-rose-50 text-rose-400' :
                                                    'bg-stone-50 text-stone-400 group-hover:bg-stone-100'
                                                }`}>
                                                {isTooExpensive ? <AlertTriangle className="w-4 h-4" /> : (typeof item.category === 'string'
                                                    ? item.category.charAt(0).toUpperCase()
                                                    : item.category?.name?.charAt(0).toUpperCase() || 'M')}
                                            </div>
                                            {/* Name & Price */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-semibold text-sm truncate ${inCart ? 'text-white' : 'text-stone-800'} ${isTooExpensive ? 'text-stone-400' : ''}`}>{item.name}</p>
                                                    {!isOutOfStock && !isTooExpensive && Number(itemStock) < 50 && (
                                                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md ${Number(itemStock) < 10 ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-600'}`}>
                                                            SISA {itemStock}
                                                        </span>
                                                    )}
                                                    {isOutOfStock && (
                                                        <span className="bg-stone-100 text-stone-400 text-[8px] font-semibold px-1.5 py-0.5 rounded-md">HABIS</span>
                                                    )}
                                                    {isTooExpensive && (
                                                        <span className="bg-rose-50 text-rose-500 text-[8px] font-semibold px-1.5 py-0.5 rounded-md">Saldo Kurang</span>
                                                    )}
                                                </div>
                                                <p className={`text-xs mt-0.5 ${inCart ? 'text-white/50' : 'text-stone-400'}`}>Rp {Number(item.price).toLocaleString()}</p>

                                                {/* Recipe / Ingredient Breakdown */}
                                                {!item.isPromo && item.recipes?.length > 0 && !isOutOfStock && (
                                                    <div className="mt-2 space-y-1">
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); setShowRecipeId(showRecipeId === item.id ? null : item.id); }}
                                                            className={`flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider transition-colors cursor-pointer ${inCart ? 'text-white/40 hover:text-white/60' : 'text-stone-400 hover:text-stone-600'}`}
                                                        >
                                                            <Info className="w-2.5 h-2.5" />
                                                            {showRecipeId === item.id ? 'Tutup Detail Stok' : 'Cek Stok Bahan'}
                                                        </div>

                                                        {showRecipeId === item.id && (
                                                            <div className={`rounded-lg p-2 border animate-in slide-in-from-top-1 duration-200 ${inCart ? 'bg-white/10 border-white/10' : 'bg-stone-50 border-stone-100'}`}>
                                                                {item.recipes.map((re: any, idx: number) => {
                                                                    const ing = ingredients.find(i => i.id === re.ingredientId);
                                                                    const currentStock = ing ? Number(ing.stockQuantity) : 0;
                                                                    const isLow = currentStock < (Number(re.quantity) * 5);
                                                                    return (
                                                                        <div key={idx} className="flex justify-between text-[8px] font-medium">
                                                                            <span className={inCart ? 'text-white/50' : 'text-stone-400'}>{re.ingredient?.name || 'Bahan'}:</span>
                                                                            <span className={isLow ? 'text-rose-500' : inCart ? 'text-white/70' : 'text-stone-600'}>
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
                                                <div className="flex items-center gap-1.5 bg-white/15 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold">
                                                    {qty}×
                                                </div>
                                            ) : (
                                                <div className="w-9 h-9 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-300 group-hover:bg-stone-800 group-hover:border-stone-800 group-hover:text-white transition-all">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                {filteredMenu.length === 0 && (
                                    <div className="py-16 text-center flex flex-col items-center">
                                        <Search className="w-8 h-8 text-stone-200 mb-2" />
                                        <p className="font-medium text-stone-400 text-sm">Menu tidak ditemukan</p>
                                        <p className="text-xs text-stone-300 mt-1">Coba kategori lain atau ubah kata kunci.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Desktop Cart Sidebar */}
                    <div className="hidden md:flex flex-col w-[320px] lg:w-[360px] bg-white border-l border-stone-100 shrink-0 overflow-hidden">
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
                            isSubmitting={isSubmitting}
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
                            <div className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[80dvh]">
                                <div className="flex justify-center pt-3 pb-2 shrink-0" onClick={() => setIsCartOpen(false)}>
                                    <div className="w-10 h-1 bg-stone-200 rounded-full" />
                                </div>
                                <div className="px-5 pb-3 flex justify-between items-center border-b border-stone-100 shrink-0">
                                    <h2 className="text-base font-bold text-stone-800 flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4 text-stone-500" />
                                        Keranjang
                                    </h2>
                                    <span className="text-[11px] font-medium bg-stone-50 text-stone-600 px-2 py-1 rounded-lg border border-stone-100">
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
                                        isSubmitting={isSubmitting}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Sticky bottom action bar */}
                    <div className="bg-white border-t border-stone-100 px-4 py-3 flex items-center gap-3">
                        {cart.length > 0 ? (
                            <>
                                <button
                                    onClick={() => setIsCartOpen(true)}
                                    className="flex items-center gap-2 flex-1 bg-stone-50 border border-stone-100 rounded-xl px-3 py-2.5 transition-all active:scale-[0.98]"
                                >
                                    <ShoppingCart className="w-4 h-4 text-stone-500 shrink-0" />
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-xs font-semibold text-stone-800 truncate">{totalItems} Item</p>
                                        <p className="text-[10px] text-stone-500">Rp {total.toLocaleString()}</p>
                                    </div>
                                    <ChevronDown className="w-3.5 h-3.5 text-stone-300 shrink-0 rotate-180" />
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    disabled={isBalanceInsufficient || isSubmitting}
                                    className={`shrink-0 text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 ${isBalanceInsufficient || isSubmitting ? 'bg-stone-300 cursor-not-allowed' : 'bg-stone-800 hover:bg-stone-900 shadow-sm'}`}
                                >
                                    {isSubmitting ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <ShoppingCart className="w-3.5 h-3.5" />
                                    )}
                                    {isSubmitting ? 'Mempersiapkan...' : isBalanceInsufficient ? 'Saldo Kurang' : 'Proses'}
                                </button>
                            </>
                        ) : (
                            <div className="flex-1 py-2.5 text-center text-xs text-stone-400">
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
function CartContent({ cart, total, updateQuantity, updateNote, onCheckout, isBalanceInsufficient, potentialBalance, scPercent, vatPercent, scAmount, vatAmount, grandEstimate, isSubmitting }: any) {
    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Items list */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 no-scrollbar">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-300 space-y-3 py-12">
                        <ShoppingCart className="w-8 h-8" />
                        <p className="text-xs uppercase tracking-wider text-center">Keranjang Kosong</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {cart.map((item: any) => {
                            const isIncreaseDisabled = potentialBalance < Number(item.price);

                            return (
                                <div key={item.id} className="flex flex-col gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100">
                                    <div className="flex gap-2 items-start">
                                        {/* Qty controls */}
                                        <div className="flex flex-col items-center bg-white rounded-lg border border-stone-100 w-7 py-1 shrink-0">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                disabled={isIncreaseDisabled}
                                                className={`p-0.5 transition-colors ${isIncreaseDisabled ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400 hover:text-stone-700'}`}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <span className="text-[10px] font-semibold text-stone-800 py-0.5">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-0.5 text-stone-400 hover:text-rose-500 transition-colors"><Minus className="w-3 h-3" /></button>
                                        </div>
                                        {/* Name & price */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-stone-800 text-xs leading-tight line-clamp-2">{item.name}</p>
                                            <p className="text-[10px] text-stone-400 mt-0.5">Rp {Number(item.price).toLocaleString()}</p>
                                        </div>
                                        {/* Subtotal & delete */}
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className="font-semibold text-stone-800 text-xs">Rp {(item.price * item.quantity).toLocaleString()}</span>
                                            <button onClick={() => updateQuantity(item.id, 0)} className="text-stone-300 hover:text-rose-400 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Bundle details in cart */}
                                    {item.isPromo && item.items?.length > 0 && (
                                        <div className="bg-white rounded-lg p-2 border border-stone-100 flex flex-col gap-1">
                                            {item.items.map((sub: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center text-[9px] text-stone-400">
                                                    <span className="flex items-center gap-1">
                                                        • {sub.quantity}x {sub.name || `Item #${sub.id}`}
                                                        {sub.isDynamicBestSeller && <Zap className="w-2 h-2 text-amber-400" />}
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

            {/* Checkout Area */}
            {cart.length > 0 && (
                <div className="p-4 bg-white border-t border-stone-100 sticky bottom-0">
                    {/* Tax Breakdown */}
                    <div className="mb-3 rounded-xl bg-stone-50 border border-stone-100 p-3 space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-stone-400">Subtotal</span>
                            <span className="text-[10px] font-semibold text-stone-600">Rp {total.toLocaleString()}</span>
                        </div>
                        {scPercent > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-stone-400">Service Charge ({scPercent}%)</span>
                                <span className="text-[10px] font-medium text-stone-500">+ Rp {scAmount.toLocaleString()}</span>
                            </div>
                        )}
                        {vatPercent > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-stone-400">PPN ({vatPercent}%)</span>
                                <span className="text-[10px] font-medium text-stone-500">+ Rp {vatAmount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1.5 border-t border-stone-200">
                            <span className="text-xs font-semibold text-stone-600">Estimasi Total</span>
                            <div className="flex flex-col items-end">
                                <span className={`text-base font-bold ${isBalanceInsufficient ? 'text-rose-500' : 'text-stone-800'}`}>Rp {grandEstimate.toLocaleString()}</span>
                                {isBalanceInsufficient && (
                                    <span className="text-[9px] font-medium text-rose-400">Melebihi Saldo Rp {potentialBalance?.toLocaleString()}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onCheckout}
                        disabled={isBalanceInsufficient || isSubmitting}
                        className={`w-full py-3 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isBalanceInsufficient || isSubmitting ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-stone-800 hover:bg-stone-900 text-white shadow-sm'}`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
                                <span>MEMPROSES...</span>
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="w-4 h-4" />
                                {isBalanceInsufficient ? 'Saldo Tidak Cukup' : 'Kirim Pesanan ke Dapur'}
                            </>
                        )}
                    </button>
                    {isBalanceInsufficient && (
                        <p className="text-[9px] text-center text-rose-400 mt-2">
                            Harap kurangi pesanan atau top up saldo member.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
