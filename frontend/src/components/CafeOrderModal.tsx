import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    Search, ShoppingCart, Trash2, Plus, Minus, X, Coffee, Utensils, 
    Zap, ChevronDown, Tag, Clock, Check, Info, AlertTriangle, 
    ShieldCheck, AlertCircle, ShoppingBag, Sparkles, Layers, Receipt, CreditCard 
} from 'lucide-react';
import { useAlert } from '@/components/ui/AlertProvider';
import InputField from '@/components/ui/InputField';
import { inventorySocket, socket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { generateIdempotencyKey } from '@/utils/transactionUtils';

// ── Default icons mapping for dynamic categories ─────────────────────────────
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'FOOD': <Utensils className="w-3.5 h-3.5" />,
    'MAKANAN': <Utensils className="w-3.5 h-3.5" />,
    'DRINK': <Coffee className="w-3.5 h-3.5" />,
    'MINUMAN': <Coffee className="w-3.5 h-3.5" />,
    'SNACK': <Zap className="w-3.5 h-3.5" />,
    'BUNDLING': <Tag className="w-3.5 h-3.5" />,
    'ALL': <Sparkles className="w-3.5 h-3.5" />,
};

const getCategoryIcon = (name: string) => {
    const upper = (name || '').toUpperCase();
    for (const key in CATEGORY_ICONS) {
        if (upper.includes(key)) return CATEGORY_ICONS[key];
    }
    return <Layers className="w-3.5 h-3.5" />;
};

const getCategoryTheme = (name: string) => {
    const upper = (name || '').toUpperCase();
    if (upper.includes('FOOD') || upper.includes('MAKANAN')) {
        return {
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
            activeRing: 'border-emerald-500 ring-emerald-500/10',
            dot: 'bg-emerald-500'
        };
    }
    if (upper.includes('DRINK') || upper.includes('MINUMAN')) {
        return {
            badge: 'bg-sky-50 text-sky-700 border-sky-200/80',
            activeRing: 'border-sky-500 ring-sky-500/10',
            dot: 'bg-sky-500'
        };
    }
    if (upper.includes('SNACK')) {
        return {
            badge: 'bg-violet-50 text-violet-700 border-violet-200/80',
            activeRing: 'border-violet-500 ring-violet-500/10',
            dot: 'bg-violet-500'
        };
    }
    if (upper.includes('BUNDLING') || upper.includes('PROMO')) {
        return {
            badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
            activeRing: 'border-amber-500 ring-amber-500/10',
            dot: 'bg-amber-500'
        };
    }
    return {
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        activeRing: 'border-indigo-500 ring-indigo-500/10',
        dot: 'bg-slate-400'
    };
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
    const [lowBalanceWarning, setLowBalanceWarning] = useState<{
        show: boolean;
        newBalance: number;
        remainingMinutes: number;
        cartTotal: number;
    } | null>(null);

    // ── Derived Variables ────────────────────────────────────────────────────
    const cartTotal = cart.reduce((sum, item) => sum + (Number(item.isDiscountActive ? item.discountPrice : item.price) * item.quantity), 0);
    const totalItems = cart.reduce((a, b) => a + b.quantity, 0);
    const activeTransactionMember = activeTransaction?.member;
    const isMemberSession = !!activeTransactionMember;

    // ✅ FIX: Calculate TRUE pending liability (avoid double-counting already-paid billiard)
    // member.balance is already deducted when billiard session was paid via MEMBER payment.
    // We subtract the already-paid MEMBER amounts from grandTotal to get what's still owed.
    //
    // TransactionPayment entity field: totalPaid (NOT amount!)
    const alreadyPaidByMember = isMemberSession && activeTransaction
        ? (activeTransaction.payments || [])
            .filter((p: any) => p.paymentMethod === 'MEMBER' || p.paymentMethod === 'MEMBERSHIP')
            .reduce((sum: number, p: any) => sum + Number(p.totalPaid || 0), 0)
        : 0;

    // pendingCafeTotal = unpaid cafe order items total (before tax/SC)
    const pendingCafeItemsTotal = isMemberSession && activeTransaction
        ? (activeTransaction.orderItems || [])
            .filter((item: any) =>
                item.status !== 'CANCELLED' &&
                item.status !== 'CANCEL_REQUESTED' &&
                !item.isPaid
            )
            .reduce((sum: number, item: any) => {
                const price = Number(item.priceAtOrder || item.price || 0);
                const qty = Number(item.quantity || 1);
                const discount = Number(item.discountAmount || 0);
                return sum + Math.max(0, price * qty - discount);
            }, 0)
        : 0;

    // currentTableLiability = what member STILL NEEDS to pay
    // = grandTotal - alreadyPaidByMember (remaining unpaid portion of this session)
    // For Duration mode (fully pre-paid): grandTotal=31000, alreadyPaid=31000 → liability=0 ✅
    // For Open mode (mid-session): alreadyPaid=0, liability=running total ✅
    // For Open mode (partially paid): liability=remaining ✅
    const currentTableLiability = isMemberSession && activeTransaction
        ? Math.max(0, Number(activeTransaction.grandTotal || 0) - alreadyPaidByMember)
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

            setConnectionStatus(inventorySocket.connected ? 'connected' : 'connecting');

            const onConnect = () => setConnectionStatus('connected');
            const onConnectError = (err: any) => {
                console.error('Inventory socket connection error:', err);
                setConnectionStatus('error');
            };
            const onDisconnect = () => setConnectionStatus('connecting');

            const onMenuAvailability = (data: Record<number, number>) => {
                setAvailability(prev => ({ ...prev, ...data }));
            };

            const onInventoryUpdate = (updatedIngredient: any) => {
                setIngredients(prev =>
                    prev.map(ing => ing.id === updatedIngredient.id ? updatedIngredient : ing)
                );
            };

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

    // ── Real-time Stock Conflict Detection ───────────────────────────────────
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

    // ── Recalculate Low Balance Warning ─────────────────────────────────────
    useEffect(() => {
        if (!isOpen || !lowBalanceWarning?.show || !isMemberSession) return;

        let playedMinutes = 0;
        if (activeTransaction?.startTime) {
            const diff = new Date().getTime() - new Date(activeTransaction.startTime).getTime();
            playedMinutes = Math.max(1, Math.floor(diff / 60000));
        }
        const billiardOnly = Number(activeTransaction?.billiardTotal || 0);
        const pricePerMinute = (playedMinutes > 0 && billiardOnly > 0) ? (billiardOnly / playedMinutes) : 500;
        
        const newRemainingBalance = remainingBalance - lowBalanceWarning.cartTotal;
        const estimatedRemainingMinutes = Math.floor(newRemainingBalance / pricePerMinute);
        const thresholdMinutes = 30;

        if (newRemainingBalance >= 0 && estimatedRemainingMinutes >= thresholdMinutes) {
            setLowBalanceWarning(null);
            showAlert('Saldo Bertambah', 'Top-up berhasil terdeteksi. Silahkan lanjutkan pesanan.', { variant: 'success' });
        } else {
            setLowBalanceWarning(prev => prev ? {
                ...prev,
                newBalance: newRemainingBalance,
                remainingMinutes: estimatedRemainingMinutes
            } : null);
        }
    }, [remainingBalance, isOpen]);

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
                ...dbCategories.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    label: c.name,
                    icon: getCategoryIcon(c.name)
                }))
            ];
            setCategories(dynamicCategories);
            const bundles = promoRes.data
                .filter((p: any) => p.isActive && (p.type === 'BUNDLE' || p.type === 'PACKAGE'))
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
        const subtotal = cartItems.reduce((sum: number, c: any) => sum + (Number(c.isDiscountActive ? c.discountPrice : c.price) * c.quantity), 0) + extraItemPrice;
        const scPercent = financeSettings.serviceChargePercentage / 100;
        const vatPercent = financeSettings.ppnPercentage / 100;
        const sc = Math.round(subtotal * scPercent);
        const vat = Math.round((subtotal + sc) * vatPercent);
        return subtotal + sc + vat;
    };

    const getItemStock = (item: any) => {
        if (!item) return 999;
        let stock = availability[item.id] ?? 999;
        if (item.isPromo && item.items?.length > 0) {
            let minStock = 999;
            item.items.forEach((sub: any) => {
                const subId = typeof sub.id === 'string' && sub.id.includes('_') ? parseInt(sub.id.split('_')[1], 10) : Number(sub.id);
                const s = availability[subId] ?? 999;
                const reqQty = sub.quantity || 1;
                const possible = Math.floor(s / reqQty);
                if (possible < minStock) minStock = possible;
            });
            stock = minStock;
        }
        return stock;
    };

    const addToCart = (item: any) => {
        setCart(prev => {
            const currentInCart = prev.find((i: any) => i.id === item.id)?.quantity || 0;
            const itemStock = getItemStock(item);

            if (currentInCart + 1 > itemStock) {
                setTimeout(() => showAlert('Stok Habis', `Stok ${item.name} tidak mencukupi.`, { variant: 'warning' }), 0);
                return prev;
            }

            if (isMemberSession) {
                const newEstimatedTotal = calcCartGrandTotal(prev, Number(item.isDiscountActive ? item.discountPrice : item.price));
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
            if (existing) return prev.map((i: any) => i.id === item.id ? { ...i, quantity: Number(i.quantity || 0) + 1 } : i);
            return [...prev, {
                ...item,
                quantity: 1,
                note: item.isPromo ? `Bundle: ${item.name}` : ''
            }];
        });
    };

    const updateQuantity = (id: string | number, qt: number) => {
        setCart(prev => {
            if (qt <= 0) return prev.filter((i: any) => i.id !== id);

            const item = menu.find((m: any) => m.id === id);
            const itemStock = getItemStock(item);
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

    const handleCheckout = async (forceBypassWarning = false) => {
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

        if (isMemberSession && !forceBypassWarning) {
            let playedMinutes = 0;
            if (activeTransaction.startTime) {
                const diff = new Date().getTime() - new Date(activeTransaction.startTime).getTime();
                playedMinutes = Math.max(1, Math.floor(diff / 60000));
            }
            const billiardOnly = Number(activeTransaction.billiardTotal || 0);
            const pricePerMinute = (playedMinutes > 0 && billiardOnly > 0) ? (billiardOnly / playedMinutes) : 500;
            
            const newRemainingBalance = remainingBalance - estimatedTotal;
            const estimatedRemainingMinutes = Math.floor(newRemainingBalance / pricePerMinute);
            const thresholdMinutes = 30;

            if (newRemainingBalance >= 0 && estimatedRemainingMinutes < thresholdMinutes) {
                setLowBalanceWarning({
                    show: true,
                    newBalance: newRemainingBalance,
                    remainingMinutes: estimatedRemainingMinutes,
                    cartTotal: estimatedTotal
                });
                return;
            }
        }

        const confirmed = forceBypassWarning || await showConfirm(
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
                const cartSubtotal = cart.reduce((sum: number, c: any) => sum + (Number(c.isDiscountActive ? c.discountPrice : c.price) * c.quantity), 0);
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

    const filteredMenu = menu.filter((item: any) => {
        if (availability[item.id] === -1) return false;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        let matchesCategory = false;
        if (activeCategory === 'ALL') matchesCategory = true;
        else if (activeCategory === 'BUNDLING') matchesCategory = !!item.isPromo;
        else matchesCategory = item.categoryId === activeCategory;

        return matchesCategory && matchesSearch && !item.isSubRecipe;
    });

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 p-0 md:p-4 lg:p-6"
            style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
        <div
            className="relative w-full h-full md:h-auto md:max-h-[92vh] md:max-w-5xl lg:max-w-6xl md:rounded-3xl overflow-hidden flex flex-col bg-white shadow-2xl"
        >
            {/* ── SUBMISSION OVERLAY ────────────────────────────────────── */}
            {isSubmitting && (
                <div className="absolute inset-0 z-[9000] bg-slate-900/80 flex flex-col items-center justify-center gap-6">
                    <div className="w-16 h-16 border-4 border-slate-600 border-t-white rounded-full animate-spin" />
                    <div className="flex flex-col items-center gap-1.5 text-center">
                        <p className="text-white font-black uppercase tracking-[0.2em] text-base">Mengirim Pesanan...</p>
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Memproses ke dapur</p>
                    </div>
                </div>
            )}

            {/* ── LOW BALANCE WARNING OVERLAY ───────────────────────────── */}
            {lowBalanceWarning?.show && (
                <div className="absolute inset-0 z-[9000] bg-slate-900/80 flex flex-col items-center justify-center p-6">
                    <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden border border-slate-200">
                        <div className="bg-rose-50 p-6 flex flex-col items-center text-center border-b border-rose-100">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 border border-rose-100">
                                <AlertTriangle className="w-7 h-7 text-rose-600" />
                            </div>
                            <h3 className="text-lg font-black text-rose-600 tracking-tight uppercase mb-1">Peringatan Saldo Kritis!</h3>
                            <p className="text-xs font-semibold text-rose-800 leading-relaxed">
                                Pesanan sebesar <strong className="text-rose-950 font-black">Rp {lowBalanceWarning.cartTotal.toLocaleString()}</strong> akan mengurangi saldo member secara signifikan.
                            </p>
                        </div>
                        <div className="p-4 space-y-2 bg-slate-50">
                            <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-200">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sisa Saldo Akhir</span>
                                <span className="text-sm font-black text-slate-900 tabular-nums">Rp {lowBalanceWarning.newBalance.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-rose-50 rounded-xl border border-rose-200">
                                <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Estimasi Sisa Main</span>
                                <span className="text-sm font-black text-rose-700 tabular-nums">Sisa {lowBalanceWarning.remainingMinutes} Menit</span>
                            </div>
                        </div>
                        <div className="p-4 grid gap-2 border-t border-slate-100">
                            <button
                                onClick={() => { window.open(`/admin/members`, '_blank'); setLowBalanceWarning(null); }}
                                className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Top-Up Saldo Member
                            </button>
                            <button
                                onClick={() => { setLowBalanceWarning({ ...lowBalanceWarning, show: false }); handleCheckout(true); }}
                                className="w-full py-3 bg-slate-100 text-slate-800 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200"
                            >
                                Lanjutkan Pesanan (Tempo)
                            </button>
                            <button
                                onClick={() => setLowBalanceWarning(null)}
                                className="w-full py-3 bg-white text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest border border-rose-200"
                            >
                                Batal Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── HEADER BAR ────────────────────────────────────────────── */}
            <div className="shrink-0 bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                        <Utensils className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-black text-white tracking-tight">Menu Pesanan</h2>
                            <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase">
                                {tableName || `Meja ${tableId}`}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400' : connectionStatus === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${connectionStatus === 'connected' ? 'text-emerald-400' : connectionStatus === 'connecting' ? 'text-amber-400' : 'text-rose-400'}`}>
                                {connectionStatus === 'connected' ? 'LIVE SYSTEM' : connectionStatus === 'connecting' ? 'WAIT' : 'OFFLINE'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Member Balance */}
                    {isMemberSession && (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0 ${remainingBalance < 50000 ? 'bg-rose-900 border-rose-700 text-rose-300' : 'bg-slate-800 border-slate-700 text-white'}`}>
                            <CreditCard className="w-3.5 h-3.5 opacity-70" />
                            <span className="text-[10px] font-black tabular-nums">Rp {remainingBalance.toLocaleString()}</span>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-700"
                    >
                        <X className="w-4 h-4 text-slate-300" />
                    </button>
                </div>
            </div>

            {/* Member balance row (mobile) */}
            {isMemberSession && (
                <div className="shrink-0 bg-slate-800 px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-700">
                    <div className="flex items-center gap-1.5 bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-600 shrink-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Saldo</span>
                        <span className="text-[10px] font-black text-white tabular-nums">Rp {totalMemberBalance.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-600 shrink-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Tagihan</span>
                        <span className="text-[10px] font-black text-amber-400 tabular-nums">Rp {currentTableLiability.toLocaleString('id-ID')}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shrink-0 ${remainingBalance < 50000 ? 'bg-rose-900 border-rose-700' : 'bg-slate-700 border-slate-600'}`}>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Sisa</span>
                        <span className={`text-[10px] font-black tabular-nums ${remainingBalance < 50000 ? 'text-rose-300' : 'text-emerald-400'}`}>Rp {remainingBalance.toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* ── CATEGORY TABS ─────────────────────────────────────────── */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-3 py-2">
                <div
                    className="flex gap-1.5 overflow-x-auto no-scrollbar"
                    style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    {[{ id: 'ALL', name: 'Semua Menu' }, { id: 'BUNDLING', name: 'Paket Bundling' }, ...categories].map((cat: any) => {
                        const isActive = activeCategory === cat.id;
                        const displayName = cat.name || cat.label || '';
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide border whitespace-nowrap ${
                                    isActive
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}
                            >
                                {cat.id === 'ALL' ? <Sparkles className="w-3 h-3" /> : cat.id === 'BUNDLING' ? <Tag className="w-3 h-3" /> : getCategoryIcon(displayName)}
                                {displayName}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── SEARCH BAR ────────────────────────────────────────────── */}
            <div className="shrink-0 bg-white border-b border-slate-100 px-3 py-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari menu favorit..."
                        className="w-full pl-9 pr-9 py-2.5 bg-slate-100 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[9px] font-bold"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* ── BODY (MENU GRID + DESKTOP SIDEBAR) ────────────────────── */}
            <div className="flex flex-1 min-h-0 bg-slate-50">
                {/* Menu Grid */}
                <div
                    className="flex-1 overflow-y-auto p-3 no-scrollbar"
                    style={{ overscrollBehavior: 'contain' }}
                >
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
                            <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Memuat Menu...</span>
                        </div>
                    ) : filteredMenu.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 py-20">
                            <Utensils className="w-10 h-10 text-slate-300 stroke-[1.5px]" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tidak ada menu ditemukan</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2.5">
                            {filteredMenu.map((item: any) => {
                                const qty = cart.find(c => c.id === item.id)?.quantity || 0;
                                const inCart = qty > 0;
                                const isDiscounted = item.isDiscountActive && item.discountPrice !== null;
                                const itemPrice = isDiscounted ? Number(item.discountPrice) : Number(item.price);
                                const originalPrice = Number(item.price);
                                const isPromo = !!item.isPromo;
                                const itemStock = getItemStock(item);
                                const isOutOfStock = itemStock <= 0;
                                const catName = (typeof item.category === 'object' ? item.category?.name : item.category) || '';
                                const theme = getCategoryTheme(catName);
                                const estimatedIfAdded = (() => { const s = itemPrice; const scPct = financeSettings.serviceChargePercentage / 100; const vPct = financeSettings.ppnPercentage / 100; const sc2 = Math.round(s * scPct); const v2 = Math.round((s + sc2) * vPct); return s + sc2 + v2; })();
                                const isTooExpensive = isMemberSession && (estimatedCartTotal + estimatedIfAdded) > remainingBalance && qty === 0;

                                return (
                                    <button
                                        key={item.id}
                                        disabled={isOutOfStock || isTooExpensive}
                                        onClick={() => addToCart(item)}
                                        className={`flex flex-col justify-between text-left p-3 rounded-2xl transition-all ${isOutOfStock || isTooExpensive
                                            ? 'bg-slate-100 opacity-50 cursor-not-allowed'
                                            : inCart
                                                ? 'bg-indigo-50 ring-2 ring-indigo-500 shadow-md shadow-indigo-100'
                                                : 'bg-white shadow-sm hover:shadow-md'
                                            }`}
                                    >
                                        {/* Header: Category Badge & Stock */}
                                        <div className="flex justify-between items-center w-full min-w-0 mb-1.5 gap-1 overflow-hidden">
                                            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight border min-w-0 shrink ${theme.badge}`}>
                                                {isPromo ? <Tag className="w-2.5 h-2.5 text-amber-600 shrink-0" /> : getCategoryIcon(catName)}
                                                <span className="truncate max-w-[65px]">{isPromo ? 'BUNDLING' : catName || 'MENU'}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {isOutOfStock ? (
                                                    <span className="bg-rose-50 text-rose-600 text-[7px] font-black px-1.5 py-0.5 rounded-md border border-rose-200 uppercase">HABIS</span>
                                                ) : isTooExpensive ? (
                                                    <span className="bg-rose-100 text-rose-700 text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase">SALDO</span>
                                                ) : (
                                                    <div className={`px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase tabular-nums shrink-0 ${Number(itemStock) < 10 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                                        STK: {itemStock}
                                                    </div>
                                                )}
                                                {inCart && (
                                                    <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md border border-indigo-500 shrink-0">
                                                        {qty}x
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Item Name */}
                                        <div className="min-h-[2.25rem] my-1 flex items-center">
                                            <h4 className="text-xs font-bold text-slate-900 leading-tight line-clamp-2">
                                                {item.name}
                                            </h4>
                                        </div>

                                        {/* Price & Add Button */}
                                        <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-slate-100 gap-1">
                                            <div className="flex flex-col justify-center min-w-0">
                                                {isDiscounted ? (
                                                    <>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[7px] font-black text-rose-500 uppercase bg-rose-50 px-1 py-0.5 rounded-sm">PROMO</span>
                                                            <span className="text-[8px] font-bold text-slate-400 line-through tabular-nums truncate">Rp {originalPrice.toLocaleString('id-ID')}</span>
                                                        </div>
                                                        <span className="text-xs font-black text-emerald-600 tabular-nums">Rp {itemPrice.toLocaleString('id-ID')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-[7px] font-black text-slate-400 uppercase">Rp</span>
                                                        <span className="text-xs font-black text-slate-900 tabular-nums truncate">{itemPrice.toLocaleString('id-ID')}</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${inCart ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                            </div>
                                        </div>

                                        {/* Recipe toggle */}
                                        {!item.isPromo && item.recipes?.length > 0 && !isOutOfStock && (
                                            <div className="mt-1.5 pt-1.5 border-t border-dashed border-slate-200">
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => { e.stopPropagation(); setShowRecipeId(showRecipeId === item.id ? null : item.id); }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setShowRecipeId(showRecipeId === item.id ? null : item.id); } }}
                                                    className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-400 hover:text-slate-600 tracking-wider cursor-pointer"
                                                >
                                                    <Info className="w-3 h-3 text-slate-400" />
                                                    {showRecipeId === item.id ? 'Tutup Detail' : 'Stok Bahan'}
                                                </div>
                                                {showRecipeId === item.id && (
                                                    <div className="mt-1 rounded-lg p-1.5 bg-slate-50 border border-slate-200 text-[8px] font-bold space-y-0.5">
                                                        {item.recipes.map((re: any, idx: number) => {
                                                            const ing = ingredients.find(i => i.id === re.ingredientId);
                                                            const currentStock = ing ? Number(ing.stockQuantity) : 0;
                                                            const isLow = currentStock < (Number(re.quantity) * 5);
                                                            return (
                                                                <div key={idx} className="flex justify-between items-center text-slate-600">
                                                                    <span className="uppercase truncate max-w-[80px]">{re.ingredient?.name || 'Bahan'}:</span>
                                                                    <span className={`tabular-nums font-black ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                                                                        {currentStock.toFixed(1)} {re.ingredient?.unit || re.unit}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Promo items preview */}
                                        {isPromo && item.items?.length > 0 && (
                                            <div className="mt-1.5 pt-1 border-t border-dashed border-slate-200 flex flex-wrap gap-1">
                                                {item.items.slice(0, 2).map((sub: any, idx: number) => (
                                                    <span key={idx} className="px-1 py-0.5 rounded bg-slate-100 text-slate-600 text-[7px] font-bold">
                                                        {sub.quantity}x {sub.name}
                                                    </span>
                                                ))}
                                                {item.items.length > 2 && <span className="text-[7px] text-slate-400 font-bold">+{item.items.length - 2}</span>}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Desktop Cart Sidebar */}
                <div className="hidden md:flex flex-col w-[280px] lg:w-[320px] bg-white border-l border-slate-200 shrink-0 overflow-hidden">
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

            {/* ── MOBILE BOTTOM BAR ─────────────────────────────────────── */}
            <div className="md:hidden shrink-0 bg-white border-t border-slate-200 px-3 pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))]">
                {cart.length > 0 ? (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="flex items-center gap-2.5 flex-1 h-12 bg-slate-100 border border-slate-200 rounded-xl px-3 min-w-0"
                        >
                            <div className="relative shrink-0">
                                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                                    <ShoppingBag className="w-4 h-4 text-slate-800" />
                                </div>
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                                    {totalItems}
                                </span>
                            </div>

                            <div className="flex-1 text-left min-w-0 flex flex-col justify-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">TOTAL ESTIMASI</p>
                                <p className="text-sm font-black text-slate-900 tabular-nums leading-tight mt-0.5">Rp {estimatedCartTotal.toLocaleString('id-ID')}</p>
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-500 rotate-180 shrink-0" />
                        </button>

                        <button
                            onClick={() => handleCheckout()}
                            disabled={isBalanceInsufficient || isSubmitting}
                            className={`shrink-0 h-12 px-5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 ${isBalanceInsufficient ? 'bg-rose-50 text-rose-600 border border-rose-200' : isSubmitting ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white'}`}
                        >
                            {isSubmitting ? <Clock className="w-4 h-4" /> : isBalanceInsufficient ? <AlertCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                            <span>{isBalanceInsufficient ? 'KURANG' : 'LANJUT'}</span>
                        </button>
                    </div>
                ) : (
                    <div className="h-12 flex items-center justify-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-100 rounded-xl border border-dashed border-slate-300">
                        Pilih menu untuk memesan
                    </div>
                )}
            </div>

            {/* ── MOBILE CART DRAWER ────────────────────────────────────── */}
            {isCartOpen && (
                <div className="md:hidden absolute inset-0 z-[120] bg-white flex flex-col">
                    <div className="bg-white px-4 pt-3 pb-2.5 flex items-center justify-between border-b border-slate-200">
                        <button
                            onClick={() => setIsCartOpen(false)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-slate-800 font-black text-[11px] uppercase tracking-wider"
                        >
                            <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                            <span>Pilih Menu</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                            <ShoppingCart className="w-4 h-4 text-indigo-600" />
                            <span className="font-black text-slate-900 tracking-widest uppercase text-xs">KERANJANG</span>
                        </div>
                        <div className="w-[78px]" />
                    </div>
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden">
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
            )}
        </div>
        </div>
    );
}
function CartContent({ cart, total, updateQuantity, updateNote, onCheckout, isBalanceInsufficient, potentialBalance, scPercent, vatPercent, scAmount, vatAmount, grandEstimate, isSubmitting }: any) {
    const hasKitchenItems = cart.some((item: any) => {
        const catName = (typeof item.category === 'object' ? item.category?.name : item.category) || '';
        const upper = catName.toUpperCase();
        return !upper.includes('STORE') && !upper.includes('TOKO') && !upper.includes('PERBAIKAN');
    });

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 bg-white relative">
            {/* Header Ticket POS */}
            <div className="hidden md:flex px-4 py-3.5 bg-slate-900 text-white justify-between items-center shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                        <Receipt className="w-3.5 h-3.5 text-indigo-300" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">Detail Pesanan</h3>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> PESANAN BARU
                        </p>
                    </div>
                </div>

                <div className="bg-indigo-600/80 text-white px-2 py-0.5 rounded-lg text-xs font-black border border-indigo-400/40">
                    {cart.reduce((a: number, b: any) => a + b.quantity, 0)} Item
                </div>
            </div>

            {/* Scrollable Cart Items List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-slate-50/60">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2.5 py-12">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-slate-200/80 shadow-2xs">
                            <ShoppingCart className="w-5 h-5 text-slate-300 stroke-[1.5px]" />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-center text-slate-400">Keranjang Kosong</p>
                    </div>
                ) : (
                    cart.map((item: any) => {
                        const isIncreaseDisabled = potentialBalance < Number(item.isDiscountActive ? item.discountPrice : item.price);
                        return (
                            <div key={item.id} className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5 group hover:border-indigo-200 transition-all">
                                {/* Row 1: Name & Subtotal */}
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">{item.name}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] font-bold text-slate-400 tabular-nums">@ {Number(item.isDiscountActive ? item.discountPrice : item.price).toLocaleString('id-ID')}</span>
                                            {item.isPromo && (
                                                <span className="text-[7px] font-black bg-amber-50 text-amber-700 px-1 py-0.5 rounded border border-amber-200">PROMO</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Subtotal Tag */}
                                    <div className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/80 text-right shrink-0">
                                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 block leading-none">Subtotal</span>
                                        <span className="text-[11px] font-black text-slate-900 tabular-nums">
                                            {(Number(item.isDiscountActive ? item.discountPrice : item.price) * item.quantity).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>

                                {/* Row 2: Note Field & Stepper Controls */}
                                <div className="pt-1.5 border-t border-slate-100 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1">
                                            <InputField
                                                label=""
                                                value={item.note || ''}
                                                onChange={(val) => updateNote(item.id, val)}
                                                placeholder="Tambah catatan..."
                                                className="!py-1 !px-2.5 !text-[10px] !font-semibold !bg-slate-50 hover:!bg-white focus:!bg-white !border-slate-200/80 focus:!border-indigo-400 !rounded-xl placeholder:!text-slate-400 transition-all"
                                            />
                                        </div>

                                        {/* Stepper Buttons */}
                                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl shrink-0">
                                            {item.quantity === 1 ? (
                                                <button
                                                    onClick={() => updateQuantity(item.id, 0)}
                                                    className="w-6 h-6 flex items-center justify-center text-rose-600 hover:bg-rose-500 hover:text-white bg-white rounded-lg transition-all active:scale-90 shadow-2xs"
                                                    title="Hapus Item"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-6 h-6 flex items-center justify-center text-slate-700 hover:bg-slate-200 bg-white rounded-lg transition-all active:scale-90 shadow-2xs"
                                                >
                                                    <Minus className="w-3 h-3" strokeWidth={2.5} />
                                                </button>
                                            )}

                                            <span className="w-7 text-center text-xs font-black text-slate-900 tabular-nums">
                                                {item.quantity}
                                            </span>

                                            <button
                                                onClick={() => updateQuantity(item.id, Number(item.quantity) + 1)}
                                                disabled={isIncreaseDisabled}
                                                className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all shadow-2xs ${isIncreaseDisabled ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white hover:bg-slate-200 text-slate-800 active:scale-90'}`}
                                            >
                                                <Plus className="w-3 h-3" strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>

                                    {item.isPromo && item.items?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                            {item.items.map((sub: any, idx: number) => (
                                                <span key={idx} className="text-[7px] font-semibold text-slate-600 bg-slate-50 px-1 py-0.5 rounded border border-slate-200">
                                                    {sub.quantity}x {sub.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Financial Summary & Action Footer */}
            {cart.length > 0 && (
                <div 
                    className="px-4 pt-3 pb-4 bg-white border-t border-slate-200/80 shrink-0 shadow-lg space-y-2.5 z-20"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}
                >
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Subtotal:</span>
                            <span className="font-bold text-slate-800 tabular-nums">Rp {total.toLocaleString('id-ID')}</span>
                        </div>

                        {(scPercent > 0 || vatPercent > 0) && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Pajak & SC:</span>
                                <span className="font-bold text-slate-800 tabular-nums">Rp {(scAmount + vatAmount).toLocaleString('id-ID')}</span>
                            </div>
                        )}

                        <div className={`flex justify-between items-center p-2.5 rounded-xl border mt-1 ${isBalanceInsufficient ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-900 text-white border-slate-800 shadow-xs'}`}>
                            <span className="text-[9px] font-black uppercase tracking-widest">TOTAL AKHIR</span>
                            <div className="flex flex-col items-end">
                                <span className="text-sm sm:text-base font-black tabular-nums">
                                    Rp {grandEstimate.toLocaleString('id-ID')}
                                </span>
                                {isBalanceInsufficient && (
                                    <span className="text-[7px] font-black uppercase text-rose-600 tracking-tight">Saldo Tidak Cukup</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onCheckout}
                        disabled={isBalanceInsufficient || isSubmitting}
                        className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md ${isBalanceInsufficient || isSubmitting
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                            : 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/25'}`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-4 h-4" />
                                <span>{isBalanceInsufficient ? 'Saldo Tidak Cukup' : (hasKitchenItems ? 'Kirim Pesanan Ke Dapur' : 'Simpan Pesanan')}</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
