'use client';

import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { socket } from '@/lib/socket';
import { Timer, Coffee, CreditCard, Zap, Trophy, Percent, Monitor, Loader2, Star, CheckCircle2, Bomb, Sparkles, Target, Phone, X, Gift, BellRing, Users, AlertTriangle, Wrench, Wallet, History as HistoryIcon, QrCode, Calendar } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import QRScanner from '@/components/QRScanner';
import { getFullImageUrl /*, API_URL */ } from '@/utils/urlUtils';


const PROMOS = [
    {
        title: "Play & Win Points",
        desc: "Main & kumpulkan poin loyalty untuk ditukar dengan hadiah menarik!",
        tag: "PLAY & WIN",
        color: "from-indigo-600 to-blue-600",
        image: "/promos/happy_hour.png"
    },
    {
        title: "Happy Hour Special",
        desc: "Diskon 20% untuk semua Menu Cafe setiap jam 10:00 - 15:00",
        tag: "PROMO",
        color: "from-amber-500 to-orange-600",
        image: "/promos/membership.png"
    },
    {
        title: "Elite Tournament",
        desc: "Ikuti turnamen mingguan & menangkan hadiah jutaan rupiah",
        tag: "EVENT",
        color: "from-rose-600 to-purple-600",
        image: "/promos/tournament.png"
    }
];

// --- MINIFIED SCRATCH BOX ---
const ScratchBox = memo(({ index, value, isOpened, onClick }: any) => {
    const [localOpen, setLocalOpen] = useState(isOpened);
    useEffect(() => { setLocalOpen(isOpened); }, [isOpened]);

    const handleClick = () => {
        if (!localOpen) {
            setLocalOpen(true);
            onClick(index);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`relative w-full aspect-square rounded-xl border-2 transition-all duration-300 ${localOpen ? "bg-slate-800 border-indigo-500/50" : "bg-indigo-950 border-white/5 hover:border-white/20 cursor-pointer"
                }`}
        >
            {localOpen && (
                <div className="flex flex-col items-center justify-center h-full">
                    {value === "BOMB" ? (
                        <Bomb className="w-5 h-5 text-red-500 animate-bounce" />
                    ) : (
                        <div className="text-center translate-y-0.5">
                            <span className="text-lg font-black text-amber-400 leading-none">{value}</span>
                            <span className="block text-[6px] font-black text-amber-400/40 uppercase">PTS</span>
                        </div>
                    )}
                </div>
            )}
            {!localOpen && <div className="absolute inset-0 flex items-center justify-center opacity-5"><Target className="w-4 h-4" /></div>}
        </div>
    );
});
ScratchBox.displayName = 'ScratchBox';

export default function SmartDisplay() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8 text-center text-white"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" /><p className="font-black uppercase tracking-widest text-xs opacity-50">Initializing Terminal Display...</p></div>}>
            <SmartDisplayContent />
        </Suspense>
    );
}

function SmartDisplayContent() {
    const { billiardTables, cafeTables } = useRealtimeData();
    const searchParams = useSearchParams();
    const urlTerminalId = searchParams.get('terminalId');
    const [terminalId, setTerminalId] = useState<string | null>(null);

    // Persistence Logic
    useEffect(() => {
        if (urlTerminalId) {
            localStorage.setItem('display_terminal_id', urlTerminalId);
            setTerminalId(urlTerminalId);
            // Clean up URL without reload (optional, but cleaner)
            window.history.replaceState({}, '', window.location.pathname);
        } else {
            const saved = localStorage.getItem('display_terminal_id');
            if (saved) setTerminalId(saved);
        }
    }, [urlTerminalId]);

    const [focusedTableInfo, setFocusedTableInfo] = useState<{ tableId: number, type: string } | null>(null);
    const [table, setTable] = useState<any>(null);
    const [standaloneTransaction, setStandaloneTransaction] = useState<any>(null);
    const [promoIndex, setPromoIndex] = useState(0);
    const [paymentState, setPaymentState] = useState<any>(null);
    const [splitState, setSplitState] = useState<any>(null);

    // Member Identification State
    const [phoneNumber, setPhoneNumber] = useState('');
    const [member, setMember] = useState<any>(null);
    const [isIdentifying, setIsIdentifying] = useState(false);

    // Scanned Member Info (Check Balance/Points)
    const [scannedMember, setScannedMember] = useState<any>(null);
    const [memberLogs, setMemberLogs] = useState<any[]>([]);

    // Topup Success Notification
    const [topupSuccess, setTopupSuccess] = useState<any>(null);

    // Empty State View Management
    const [emptyView, setEmptyView] = useState<'PROMO' | 'TABLES' | 'WAITING_LIST' | 'WAITING_FORM' | 'ATTENDANCE'>('PROMO');
    const [attendancePin, setAttendancePin] = useState('');
    const [attendanceStatus, setAttendanceStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [attendanceMsg, setAttendanceMsg] = useState('');
    const [attendanceAction, setAttendanceAction] = useState<'CHECKIN' | 'CHECKOUT' | null>(null);
    const [waitingName, setWaitingName] = useState('');
    const [waitingPhone, setWaitingPhone] = useState('');
    const [isSubmittingWaiting, setIsSubmittingWaiting] = useState(false);
    const [regSuccess, setRegSuccess] = useState(false);
    const { waitingList } = useRealtimeData();
    const [settings, setSettings] = useState<any>(null);

    // Remote Scanner Flow for Topup/Check
    const [scanRequestId, setScanRequestId] = useState<string | null>(null);
    const [scanRequestType, setScanRequestType] = useState<'CHECK_BALANCE' | 'TOPUP_VALIDATION' | 'TOPUP_COMMITMENT' | 'REWARD_CLAIM' | null>(null);
    const [validationAlert, setValidationAlert] = useState<{ name: string; active: boolean } | null>(null);

    // Redeem/Loyalty Flow
    const [redeemMember, setRedeemMember] = useState<any>(null);
    const [rewardCatalog, setRewardCatalog] = useState<any[]>([]);
    const [redeemCategory, setRedeemCategory] = useState("SEMUA");
    const [selectedReward, setSelectedReward] = useState<any>(null);
    const [redeemToken, setRedeemToken] = useState("");
    const [redeemStatus, setRedeemStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS'>('IDLE');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Add cache buster to bypass browser cache
                const res = await axios.get(`/settings?_t=${Date.now()}`);
                setSettings(res.data);
            } catch (err) {
                console.error("Failed to fetch settings", err);
            }
        };
        fetchSettings();
    }, []);

    // --- PREMIUM PARTICLES COMPONENT ---
    const BackgroundParticles = memo(() => (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {[...Array(15)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ 
                        opacity: Math.random() * 0.3, 
                        x: Math.random() * 100 + "%", 
                        y: Math.random() * 100 + "%",
                        scale: Math.random() * 0.5 + 0.5
                    }}
                    animate={{ 
                        y: ["-10%", "110%"],
                        opacity: [0, 0.3, 0],
                        rotate: [0, 360]
                    }}
                    transition={{ 
                        duration: Math.random() * 20 + 20, 
                        repeat: Infinity, 
                        ease: "linear",
                        delay: Math.random() * 10
                    }}
                    className="absolute w-1 h-1 bg-white rounded-full blur-[1px]"
                />
            ))}
        </div>
    ));
    BackgroundParticles.displayName = 'BackgroundParticles';

    // Optimized Background Component (Memoized)
    const BackgroundAnimation = memo(() => (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 transform-gpu bg-[#020617]">
            <BackgroundParticles />
            <motion.div
                animate={{ 
                    x: [0, 50, -50, 0], 
                    y: [0, 30, 60, 0],
                    scale: [1, 1.1, 0.9, 1]
                }}
                transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-indigo-600/10 blur-[150px] rounded-full will-change-transform"
            />
            <motion.div
                animate={{ 
                    x: [0, -40, 40, 0], 
                    y: [0, 60, -30, 0],
                    scale: [1, 0.9, 1.2, 1]
                }}
                transition={{ duration: 35, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[-25%] left-[-15%] w-[70%] h-[70%] bg-rose-600/10 blur-[150px] rounded-full will-change-transform"
            />
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3C%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        </div>
    ));
    BackgroundAnimation.displayName = 'BackgroundAnimation';

    // Global Ticker for optimized time calculations (Prevents thousands of Date() calls)
    const [currentTime, setCurrentTime] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 30000); // Sync every 30s
        return () => clearInterval(interval);
    }, []);

    // Optimized Helper: Calculate Duration using cached timestamp
    const getDuration = useCallback((startTime: string) => {
        if (!startTime) return '0m';
        const start = new Date(startTime).getTime();
        const diff = Math.floor((currentTime - start) / 60000); // in minutes
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }, [currentTime]);

    // Scratch Game State
    const [showScratch, setShowScratch] = useState(false);
    const [scratchMatrix, setScratchMatrix] = useState<any[]>([]);
    const [openedIndexes, setOpenedIndexes] = useState<number[]>([]);
    const [scratchResult, setScratchResult] = useState<any>(null);
    const [isScratchedAll, setIsScratchedAll] = useState(false);


    // Dynamic Promos Logic - Only fallback to PROMOS if settings loaded and empty
    const activePromos = (settings && settings.displayPromotions?.length > 0)
        ? settings.displayPromotions
        : (settings ? PROMOS : []); // Show nothing or a loader if settings not yet loaded

    const currentPromo = activePromos.length > 0
        ? activePromos[promoIndex % activePromos.length]
        : null;

    // Rating & Notification Post-Flow
    const [showRating, setShowRating] = useState(false);
    const [rating, setRating] = useState<number | null>(null);
    const [isCalling, setIsCalling] = useState(false);

    // Initial and Reconnect Sync
    const syncFocus = useCallback(() => {
        if (socket.connected) {
            if (terminalId) {
                socket.emit('join_terminal_room', terminalId);
                socket.emit('request_display_focus', { terminalId });
            } else {
                socket.emit('request_display_focus');
            }
        }
        else socket.connect();
    }, [terminalId]);

    useEffect(() => {
        syncFocus();
        const handleFocusChange = (data: { tableId: number, type: string } | null) => {
            setFocusedTableInfo(data);
            if (!data) {
                setShowRating(false);
                setShowScratch(false);
                setMember(null);
                setPhoneNumber('');
                setPaymentState(null);
                setSplitState(null);
            }
        };

        const handlePaymentState = (data: any) => {
            console.log('[CFD] Received billing_payment_state:', data);
            setPaymentState(data);
        };

        const handleSplitState = (data: any) => {
            console.log('[CFD] Received billing_split_state:', data);
            setSplitState(data);
        };

        socket.on('display_focus_change', handleFocusChange);
        socket.on('billing_payment_state', handlePaymentState);
        socket.on('billing_split_state', handleSplitState);

        const handleTopupSuccess = (data: any) => {
            setTopupSuccess(data);
            setTimeout(() => setTopupSuccess(null), 8000); // Hide after 8s
        };

        const handleRequestScan = (data: { terminalId?: string, uuid: string, type?: 'CHECK_BALANCE' | 'TOPUP_VALIDATION' | 'TOPUP_COMMITMENT' }) => {
            if (!data.terminalId || data.terminalId === terminalId) {
                setScanRequestId(data.uuid);
                setScanRequestType(data.type || 'CHECK_BALANCE');
            }
        };

        const handleCancelScan = (data: { terminalId?: string, uuid: string }) => {
            if (!data.terminalId || data.terminalId === terminalId) {
                setScanRequestId(prev => prev === data.uuid ? null : prev);
                if (scanRequestId === data.uuid) setScanRequestType(null);
            }
        };

        const handleScanResult = async (data: { terminalId?: string, uuid: string, code: string | null, type?: string }) => {
            if (data.code && (!data.terminalId || data.terminalId === terminalId)) {
                // If this display was the one scanning, or it's a broadcast for this terminal
                if (data.type === 'CHECK_BALANCE') {
                    try {
                        const res = await axios.get(`/members/scan/${encodeURIComponent(data.code)}`);
                        setScannedMember(res.data);

                        // Fetch logs for this member
                        try {
                            const logsRes = await axios.get(`/members/${res.data.id}/logs`);
                            setMemberLogs(logsRes.data.slice(0, 5)); // Show last 5
                        } catch (e) { console.error("Failed to fetch member logs", e); }

                        // Auto close after 30 seconds of inactivity
                        setTimeout(() => setScannedMember(null), 30000);
                    } catch (err) {
                        console.error("Failed to fetch member info from scan result", err);
                    }
                } else if (data.type === 'TOPUP_VALIDATION') {
                    try {
                        const res = await axios.get(`/members/scan/${encodeURIComponent(data.code)}`);
                        setValidationAlert({ name: res.data.name, active: res.data.isActive });
                        setTimeout(() => setValidationAlert(null), 5000);
                    } catch (err) {
                        console.error("Failed to fetch validation info", err);
                    }
                } else if (data.type === 'TOPUP_COMMITMENT') {
                    // Just show a small subtle feedback or nothing, success will come from 'display_topup_success'
                } else if (data.type === 'REWARD_CLAIM') {
                    try {
                        const res = await axios.get(`/members/scan/${encodeURIComponent(data.code)}`);
                        setRedeemMember(res.data);
                        setRedeemStatus('IDLE');
                        setSelectedReward(null);

                        // Fetch catalog
                        const catRes = await axios.get(`/loyalty/catalog`);
                        setRewardCatalog(catRes.data);
                    } catch (err) {
                        console.error("Failed to fetch member for reward claim", err);
                    }
                }
            }
        };

        const handleRedeemConfirmed = (data: { memberId: number, itemName: string, memberName: string }) => {
            if (redeemMember && redeemMember.id === data.memberId) {
                setRedeemStatus('SUCCESS');
                // Refresh member points if possible or just rely on success screen
                setTimeout(() => {
                    setRedeemMember(null);
                    setRedeemStatus('IDLE');
                }, 8000);
            }
        };

        const handleRedeemReset = (data: any) => {
            if (data.memberId === redeemMember?.id) {
                setRedeemStatus('IDLE');
                // selectedReward and redeemMember are NOT cleared so they can try again or check other items
            }
        };

        socket.on('redeem_confirmed', handleRedeemConfirmed);
        socket.on('redeem_reset', handleRedeemReset);

        const handleMemberBalanceUpdated = (data: { memberId: number, balance: number, points: number }) => {
            setScannedMember((prev: any) => {
                if (prev && prev.id === data.memberId) {
                    return { ...prev, balance: data.balance, points: data.points };
                }
                return prev;
            });
            setRedeemMember((prev: any) => {
                if (prev && prev.id === data.memberId) {
                    return { ...prev, balance: data.balance, points: data.points };
                }
                return prev;
            });
        };

        socket.on('request_display_scan', handleRequestScan);
        socket.on('cancel_display_scan', handleCancelScan);
        socket.on('display_scan_result', handleScanResult);
        socket.on('memberBalanceUpdated', handleMemberBalanceUpdated);
        socket.on('display_topup_success', handleTopupSuccess);
        socket.on('redeem_confirmed', handleRedeemConfirmed); // Add this
        socket.on('connect', syncFocus);

        return () => {
            socket.off('display_focus_change', handleFocusChange);
            socket.off('billing_payment_state', handlePaymentState);
            socket.off('billing_split_state', handleSplitState);
            socket.off('request_display_scan', handleRequestScan);
            socket.off('cancel_display_scan', handleCancelScan);
            socket.off('display_scan_result', handleScanResult);
            socket.off('memberBalanceUpdated', handleMemberBalanceUpdated);
            socket.off('display_topup_success', handleTopupSuccess);
            socket.off('redeem_confirmed', handleRedeemConfirmed); // Add this
            socket.off('redeem_reset', handleRedeemReset);
            socket.off('connect', syncFocus);
        };
    }, [terminalId, scanRequestId, scanRequestType, redeemMember, syncFocus]); // Add redeemMember to deps

    // Marketing Loop
    useEffect(() => {
        const timer = setInterval(() => setPromoIndex(prev => (prev + 1) % activePromos.length), 8000);
        return () => clearInterval(timer);
    }, [activePromos.length]);

    // Sync state with the focused table
    useEffect(() => {
        const syncTableOrTransaction = async () => {
            if (focusedTableInfo) {
                const list = focusedTableInfo.type === 'cafe' ? cafeTables : billiardTables;
                const found = list.find(t => t.id === focusedTableInfo.tableId);

                // Logic for "Just Paid" -> Show Scratch Game if member linked
                if (table && found) {
                    const oldTx = table.activeTransaction;
                    const newTx = found.activeTransaction;
                    if (oldTx && !oldTx.isPaid && newTx?.isPaid) {
                        if (member) startFreeScratch();
                        else setShowRating(true); // Default to rating if no member
                    }
                }

                if (found) {
                    setTable(found);
                    setStandaloneTransaction(null);
                } else if ((focusedTableInfo as any).transactionId) {
                    // No table found, but we have a transactionId (likely Piutang/Debt settlement)
                    try {
                        const res = await axios.get(`/transactions/${(focusedTableInfo as any).transactionId}`);
                        if (res.data) {
                            setTable(null);
                            setStandaloneTransaction(res.data);
                        }
                    } catch (e) {
                        console.error("Failed to fetch standalone transaction", e);
                        setStandaloneTransaction(null);
                    }
                } else {
                    setTable(null);
                    setStandaloneTransaction(null);
                }
            } else {
                setTable(null);
                setStandaloneTransaction(null);
            }
        };

        syncTableOrTransaction();
    }, [billiardTables, cafeTables, focusedTableInfo, member]);

    const identifyMember = async () => {
        if (!phoneNumber || phoneNumber.length < 10) return;
        setIsIdentifying(true);
        try {
            const res = await axios.get(`/members/scan/${phoneNumber}`);
            if (res.data) {
                setMember(res.data);
                setPhoneNumber('');
            }
        } catch (e) {
            alert('Nomor tidak terdaftar atau bermasalah.');
        } finally {
            setIsIdentifying(false);
        }
    };

    const startFreeScratch = async () => {
        if (!member) return;
        try {
            const res = await axios.post(`/loyalty/game/scratch`, { memberId: member.id, betAmount: 0 });
            setScratchMatrix(res.data.matrix_map);
            setScratchResult(res.data.win_validation);
            setOpenedIndexes([]);
            setShowScratch(true);
            setIsScratchedAll(false);
        } catch (e) {
            setShowRating(true);
        }
    };

    const handleBoxScratch = (idx: number) => {
        const val = scratchMatrix[idx];
        const newOpened = [...openedIndexes, idx];
        setOpenedIndexes(newOpened);

        if (val === "BOMB" || scratchResult.is_winner && newOpened.filter(i => scratchMatrix[i] === scratchResult.matching_symbol).length === 4) {
            setTimeout(() => {
                setIsScratchedAll(true);
                // Auto-claim if winner
                if (scratchResult.is_winner) {
                    axios.post(`/loyalty/game/scratch/claim`, {
                        memberId: member.id,
                        referenceId: scratchResult.session_id,
                        security_hash: scratchResult.secure_hash
                    });
                }
            }, 1000);
        }
    };

    const finishScratch = () => {
        setShowScratch(false);
        setShowRating(true);
    };

    const handleCallWaiter = () => {
        setIsCalling(true);
        socket.emit('waiter_call', { tableId: table?.id, tableName: table?.tableName });
        setTimeout(() => setIsCalling(false), 5000);
    };

    // --- SUB-RENDERERS ---

    const renderScratchOverlay = () => (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-8">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-2xl rounded-[3.5rem] p-12 border-white/10 flex flex-col items-center">
                <div className="flex items-center gap-4 mb-8">
                    <Sparkles className="w-10 h-10 text-amber-500 animate-pulse" />
                    <h2 className="text-4xl font-black text-white tracking-widest uppercase">GOSOK HADIAH!</h2>
                </div>

                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] mb-10">Temukan 4 Nilai yang Sama untuk Menang</p>

                <div className="grid grid-cols-5 gap-3 w-full max-w-[450px] mb-12">
                    {scratchMatrix.map((v, i) => (
                        <ScratchBox key={i} index={i} value={v} isOpened={openedIndexes.includes(i)} onClick={handleBoxScratch} />
                    ))}
                </div>

                <AnimatePresence>
                    {isScratchedAll && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center gap-6">
                            <h3 className={`text-5xl font-black uppercase italic tracking-tighter ${scratchResult?.is_winner ? 'text-amber-500' : 'text-slate-500'}`}>
                                {scratchResult?.is_winner ? 'BOMBASTIC WIN!' : 'BETTER LUCK NEXT TIME'}
                            </h3>
                            {scratchResult?.is_winner && (
                                <p className="text-2xl font-black text-white">+{scratchResult.payout_amount} POINTS TERKIRIM!</p>
                            )}
                            <button onClick={finishScratch} className="mt-6 px-12 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all active:scale-95">
                                SELESAI
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );

    const renderSplitSection = () => {
        const isAllPaid = splitState.payers?.length > 0 && splitState.payers.every((p: any) => p.isPaid);

        return (
            <div className="glass-card rounded-[2.5rem] p-6 text-white shadow-2xl relative h-full flex flex-col overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[80px]"></div>

                {/* Success Overlay for all paid */}
                {isAllPaid && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[100] premium-gradient flex flex-col items-center justify-center p-8 text-center">
                        <CheckCircle2 className="w-20 h-20 text-white mb-4 animate-bounce" />
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">COMPLETE</h2>
                        <p className="text-white/60 font-bold uppercase tracking-widest text-[9px]">All bills settled</p>
                    </motion.div>
                )}

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400">Multi-Payment Area</p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-2 noscrollbar relative z-10">
                    {(splitState.payers || []).map((p: any, i: number) => (
                        <div key={i} className="space-y-2">
                            <div className={`p-4 rounded-xl flex justify-between items-center transition-all ${p.isActive ? 'bg-indigo-600 shadow-xl shadow-indigo-900/40 translate-x-1' : 'bg-white/5 border border-white/5'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${p.isPaid ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                                    <div>
                                        <p className={`text-xs font-black uppercase ${p.isActive ? 'text-white' : 'text-slate-400'}`}>{p.name}</p>
                                        <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">{p.isPaid ? 'Lunas' : (p.isActive ? 'Paying Now' : 'Queue')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-black font-mono ${p.isActive ? 'text-white' : 'text-slate-200'}`}>Rp {p.total.toLocaleString()}</p>
                                </div>
                            </div>
                            {/* Show items for active or paid payers */}
                            {p.isActive && p.items?.length > 0 && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-6 py-2 space-y-1 overflow-hidden">
                                    {p.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-[9px] text-indigo-200">
                                            <span className="opacity-60">• {item.qty}x {item.name}</span>
                                            <span>Rp {(item.qty * item.price).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {p.billiardPortion > 0 && (
                                        <div className="flex justify-between items-center text-[9px] text-indigo-300 italic">
                                            <span className="opacity-60">• Share Billiard</span>
                                            <span>Rp {p.billiardPortion.toLocaleString()}</span>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-end relative z-10">
                    <div>
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Bill</p>
                        <p className="text-xl font-black text-white">Rp {splitState.totalBill?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-1">Active Now</p>
                        <p className="text-[10px] font-black text-white uppercase italic">{splitState.activePayer || 'Waiting...'}</p>
                    </div>
                </div>
            </div>
        );
    };

    const renderIdentifySection = () => (
        <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] flex flex-col items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-[40px] pointer-events-none"></div>
            {member ? (
                <div className="w-full flex items-center gap-4 p-1 text-indigo-400">
                    <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40"
                    >
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </motion.div>
                    <div className="flex-1">
                        <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest opacity-40">Elite Member Verified</p>
                        <p className="text-sm sm:text-xl font-black uppercase tracking-tighter text-white truncate max-w-[120px] sm:max-w-none">{member.name}</p>
                    </div>
                    <button onClick={() => setMember(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all group">
                        <X className="w-3 h-3 text-slate-500 group-hover:text-rose-400" />
                    </button>
                </div>
            ) : (
                <div className="w-full space-y-4">
                    <div className="flex items-center gap-3">
                        <p className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Patron ID</p>
                        <div className="h-[1px] flex-1 bg-white/5"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                            <input
                                type="tel"
                                placeholder="Phone number..."
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500/40 focus:bg-white/10 font-bold text-xs sm:text-sm text-white transition-all placeholder:text-slate-800"
                            />
                        </div>
                        <button
                            onClick={identifyMember}
                            disabled={isIdentifying || phoneNumber.length < 10}
                            className="px-4 sm:px-6 bg-indigo-600 text-white rounded-xl font-black text-[8px] sm:text-[10px] uppercase tracking-widest disabled:opacity-20 transition-all hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-900/20"
                        >
                            {isIdentifying ? 'Wait' : 'LINK'}
                        </button>
                    </div>
                    {/* Compact Tablet-friendly Quick Buttons */}
                    <div className="grid grid-cols-4 gap-1.5 opacity-40">
                        {['081', '082', '085', '087'].map(prefix => (
                            <button key={prefix} onClick={() => setPhoneNumber(prefix)} className="py-1 bg-white/5 rounded-md text-[8px] font-black text-slate-500 hover:bg-white/10 transition-colors">{prefix}</button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderTableStatus = () => {
        const busyTables = billiardTables.filter((t: any) => t.status !== 'available' && t.status !== 'maintenance').length;
        const availableTables = billiardTables.filter((t: any) => t.status === 'available').length;
        const maintenanceTables = billiardTables.filter((t: any) => t.status === 'maintenance').length;
        const billingTables = billiardTables.filter((t: any) => t.status?.toLowerCase() === 'billing' || t.status?.toLowerCase() === 'waiting_payment').length;

        return (
            <div className="fixed inset-0 z-10 py-6 sm:py-10 flex flex-col overflow-hidden bg-[#020617] animate-in fade-in zoom-in-95 duration-700">
                {/* Header - Fixed with Intelligence */}
                <div className="flex justify-between items-end px-8 sm:px-14 mb-8 sm:mb-12 shrink-0 py-8 bg-[#020617]/40 backdrop-blur-3xl border-b border-white/5 shadow-2xl z-20">
                    <div className="flex flex-col text-left space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_#10b981]"></div>
                            <p className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-[0.5em] italic">System Terminal Monitor</p>
                        </div>
                        <h2 className="text-3xl sm:text-6xl font-black text-white uppercase tracking-tighter italic leading-none">Tables Floor</h2>
                        <div className="flex items-center gap-6 sm:gap-8">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">In Use</span>
                                <span className="text-xl font-black text-indigo-400">{busyTables - billingTables}</span>
                            </div>
                            <div className="w-[1px] h-6 bg-white/5"></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Waiting Payment</span>
                                <span className="text-xl font-black text-amber-500">{billingTables}</span>
                            </div>
                            <div className="w-[1px] h-6 bg-white/5"></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Available</span>
                                <span className="text-xl font-black text-emerald-500">{availableTables}</span>
                            </div>
                            {maintenanceTables > 0 && (
                                <>
                                    <div className="w-[1px] h-6 bg-white/5"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Maint.</span>
                                        <span className="text-xl font-black text-rose-500">{maintenanceTables}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-6 sm:gap-10 items-center">
                        <button
                            onClick={() => setEmptyView('PROMO')}
                            className="bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 rounded-2xl px-8 py-5 flex items-center gap-4 text-white transition-all active:scale-95 group shadow-2xl backdrop-blur-3xl"
                        >
                            <X className="w-5 h-5 text-slate-500 group-hover:text-rose-400 transition-colors" />
                            <span className="text-xs font-black uppercase tracking-[0.3em] italic">Close</span>
                        </button>
                        <div className="hidden sm:flex w-20 h-20 bg-white/5 backdrop-blur-3xl rounded-[2rem] border border-white/5 shadow-2xl items-center justify-center overflow-hidden p-4 group hover:scale-105 transition-transform">
                            {settings?.logoPath ? (
                                <img src={getFullImageUrl(settings.logoPath)} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <Zap className="w-10 h-10 text-indigo-400" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Scrollable Area - Premium Grid */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-14 noscrollbar pb-32">
                    <div className={`grid gap-4 sm:gap-8 ${billiardTables.length > 32
                        ? 'grid-cols-6 sm:grid-cols-8 lg:grid-cols-10'
                        : billiardTables.length > 15
                            ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8'
                            : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
                        }`}>
                        {billiardTables.map((t: any, idx: number) => {
                            const status = t.status?.toLowerCase() || 'available';
                            const isOccupied = status === 'occupied' || status === 'in_session' || (status !== 'available' && status !== 'maintenance' && status !== 'billing' && status !== 'waiting_payment');
                            const isBilling = status === 'billing' || status === 'waiting_payment';
                            const isMaintenance = status === 'maintenance';
                            const isAvailable = status === 'available';

                            const isSplit = t.activeTransaction?.isSplit;
                            const customerName = t.activeTransaction?.customerName || t.currentCustomer;
                            const startTime = t.activeTransaction?.startTime;

                            let statusLabel = 'Available';
                            let statusColor = 'emerald';
                            let cardStyle = 'bg-white/[0.02] border-white/5';
                            let glowStyle = 'bg-emerald-500/10';

                            if (isOccupied) {
                                statusLabel = 'IN USE';
                                statusColor = 'indigo';
                                cardStyle = 'bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border-indigo-500/30 shadow-indigo-950/20';
                                glowStyle = 'bg-indigo-500/20 animate-pulse';
                            } else if (isBilling) {
                                statusLabel = 'WAITING PAYMENT';
                                statusColor = 'amber';
                                cardStyle = 'bg-gradient-to-br from-amber-600/20 to-amber-900/20 border-amber-500/30 shadow-amber-950/20';
                                glowStyle = 'bg-amber-500/20 animate-pulse';
                            } else if (isMaintenance) {
                                statusLabel = 'MAINTENANCE';
                                statusColor = 'rose';
                                cardStyle = 'bg-gradient-to-br from-slate-700/20 to-rose-900/20 border-rose-500/20 grayscale opacity-60';
                                glowStyle = 'bg-rose-500/10';
                            }

                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.01 }}
                                    key={t.id}
                                    className={`relative group rounded-[3rem] p-1 transition-all duration-500 shadow-2xl active:scale-95 cursor-pointer ${cardStyle}`}
                                >
                                    <div className={`relative h-full w-full rounded-[2.9rem] p-6 flex flex-col items-center justify-between gap-6 overflow-hidden border bg-[#0F172A]/80 backdrop-blur-xl ${!isAvailable ? '' : 'bg-transparent border-white/5'}`}>

                                        {/* Status Glow */}
                                        <div className={`absolute -top-10 -right-10 w-24 h-24 blur-3xl rounded-full ${glowStyle}`}></div>

                                        <div className="flex justify-between items-center w-full relative z-10">
                                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg bg-${statusColor}-500/10 text-${statusColor}-500 ${!isAvailable && !isMaintenance ? 'bg-' + statusColor + '-500 text-white animate-pulse' : ''}`}>
                                                {statusLabel}
                                            </div>
                                            {isSplit && (
                                                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
                                                    <Users className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                            {isMaintenance && <Wrench className="w-4 h-4 text-rose-500/40" />}
                                        </div>

                                        <div className="flex flex-col items-center py-2 relative z-10">
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] font-black text-white/[0.02] select-none pointer-events-none italic">
                                                {t.tableName.replace(/[^0-9]/g, '')}
                                            </div>
                                            <h3 className={`text-4xl sm:text-6xl font-black italic tracking-tighter leading-none transition-all duration-500 relative z-10 ${!isAvailable ? 'text-white' : 'text-slate-800'}`}>
                                                {t.tableName.replace(/[^0-9]/g, '')}
                                            </h3>
                                            <p className={`text-[8px] font-black uppercase tracking-[0.5em] mt-3 whitespace-nowrap transition-colors ${!isAvailable ? 'text-indigo-400' : 'text-slate-600/40'}`}>
                                                Station Monitor
                                            </p>
                                        </div>

                                        <div className={`w-full pt-6 border-t relative z-10 ${!isAvailable ? 'border-white/10' : 'border-white/[0.03]'}`}>
                                            {(isOccupied || isBilling) ? (
                                                <div className="space-y-3 text-center">
                                                    <p className={`text-[10px] font-black uppercase italic truncate px-2 leading-none ${isBilling ? 'text-amber-400' : 'text-indigo-400'}`}>
                                                        {customerName || 'GUEST'}
                                                    </p>
                                                    <div className="flex items-center justify-center gap-2 group/time">
                                                        <Timer className={`w-3.5 h-3.5 ${isBilling ? 'text-amber-400' : 'text-indigo-400'} group-hover/time:rotate-12 transition-transform`} />
                                                        <span className="text-lg sm:text-xl font-black text-white tracking-tighter tabular-nums">{getDuration(startTime)}</span>
                                                    </div>
                                                </div>
                                            ) : isMaintenance ? (
                                                <div className="text-center py-2">
                                                    <p className="text-[10px] font-black text-rose-500/60 uppercase tracking-widest italic">Out of Service</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <p className="text-[8px] font-black text-emerald-500/40 uppercase tracking-widest">Ready</p>
                                                    <div className="flex gap-1.5 focus-circle">
                                                        {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-emerald-500/20" />)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend & Stats Overlay - Subtle glass */}
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 px-10 py-4 bg-white/[0.02] border border-white/5 rounded-[2.5rem] backdrop-blur-3xl flex items-center gap-8 shadow-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Available</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_15px_#6366f1] animate-pulse"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">In Use</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_15px_#f59e0b] animate-pulse"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Waiting Payment</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-500/40"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Maint.</span>
                    </div>
                    <div className="w-[1px] h-4 bg-white/10"></div>
                    <div className="flex items-center gap-3">
                        <Users className="w-3 h-3 text-indigo-400" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Wait: {waitingList.length}</span>
                    </div>
                </div>

                {/* Footer - Consistent with Waitlist */}
                <div className="px-6 sm:px-20 pb-8 pt-4 shrink-0 bg-transparent z-40">
                    <div className="flex gap-6 p-3 bg-white/[0.02] backdrop-blur-3xl rounded-[3rem] border border-white/5 shadow-2xl max-w-lg mx-auto">
                        <button
                            onClick={() => setEmptyView('WAITING_FORM')}
                            className="flex-1 py-4 sm:py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl sm:rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            <Zap className="w-5 h-5 fill-white/20" />
                            Pre-Check List
                        </button>
                        <button
                            onClick={() => setEmptyView('WAITING_LIST')}
                            className="flex-1 py-4 sm:py-5 bg-white/5 hover:bg-white/10 border border-white/5 text-white rounded-2xl sm:rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            <Users className="w-5 h-5 text-indigo-400" />
                            Waitlist Monitor
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderWaitingListView = () => {
        const activeQueue = waitingList.filter(e => (e.status === 'PENDING' || e.status === 'pending') && e.type === 'BILLIARD');

        return (
            <div className="w-full max-w-5xl space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 relative z-10 px-4">
                <div className="flex justify-between items-end mb-8 sm:mb-12 border-b border-white/5 pb-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_#6366f1]"></div>
                            <p className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-[0.5em] italic">Live System Monitor</p>
                        </div>
                        <h2 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter italic leading-none">Waiting List</h2>
                        <div className="flex items-center gap-4 text-slate-500">
                            <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{activeQueue.length} Members in line</span>
                            </div>
                            <div className="w-1 h-1 bg-white/10 rounded-full"></div>
                            <p className="text-[10px] font-bold uppercase tracking-widest">Est. Wait: {activeQueue.length * 10}m</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setEmptyView('PROMO')}
                            className="bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 rounded-2xl px-8 py-5 flex items-center gap-4 text-white transition-all active:scale-95 group shadow-2xl backdrop-blur-3xl"
                        >
                            <X className="w-5 h-5 text-slate-500 group-hover:text-rose-400 transition-colors" />
                            <span className="text-xs font-black uppercase tracking-[0.3em] italic">Close</span>
                        </button>
                        <div className="hidden sm:flex w-20 h-20 bg-white/5 backdrop-blur-3xl rounded-[2rem] border border-white/5 shadow-2xl items-center justify-center overflow-hidden p-4 group hover:scale-105 transition-transform">
                            {settings?.logoPath ? (
                                <img src={getFullImageUrl(settings.logoPath)} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <Zap className="w-10 h-10 text-indigo-400 group-hover:animate-bounce" />
                            )}
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-[4rem] p-1 shadow-3xl bg-white/[0.01] backdrop-blur-3xl border-white/5 w-full flex flex-col max-h-[60vh] overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-[#020617] to-transparent z-10 opacity-50 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#020617] to-transparent z-10 opacity-50 pointer-events-none"></div>

                    {activeQueue.length > 0 ? (
                        <div className="space-y-4 overflow-y-auto p-6 sm:p-10 noscrollbar pb-20">
                            {activeQueue.map((entry, idx) => {
                                const waitMinutes = Math.floor((currentTime - new Date(entry.createdAt ?? Date.now()).getTime()) / 60000);
                                const statusColor = waitMinutes > 30 ? 'bg-rose-500' : waitMinutes > 15 ? 'bg-amber-500' : 'bg-emerald-500';

                                return (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={entry.id}
                                        className="relative group bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-[2.5rem] p-5 sm:p-7 flex flex-col sm:flex-row justify-between items-center gap-6 transition-all duration-500 hover:translate-y-[-2px] shadow-lg"
                                    >
                                        <div className="flex items-center gap-6 sm:gap-10 w-full sm:w-auto">
                                            {/* Queue Number Badge */}
                                            <div className="relative">
                                                <div className={`absolute inset-0 ${statusColor} blur-2xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 border border-white/10 rounded-[1.75rem] flex flex-col items-center justify-center relative z-10 shadow-inner group-hover:border-white/20 transition-colors">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">POS</span>
                                                    <span className="text-2xl sm:text-3xl font-black text-white leading-none">#{idx + 1}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-left flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl sm:text-3xl font-black text-white tracking-tighter italic uppercase group-hover:text-indigo-400 transition-colors">
                                                        {entry.customerName}
                                                    </h3>
                                                    {waitMinutes > 30 && <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[8px] font-black uppercase tracking-widest rounded-full animate-pulse">Long Wait</span>}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                                    <div className="flex items-center gap-2 opacity-40">
                                                        <Timer className="w-3.5 h-3.5 text-indigo-400" />
                                                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
                                                            Booked {new Date(entry.createdAt ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Zap className={`w-3.5 h-3.5 ${statusColor} text-white p-0.5 rounded-sm`} />
                                                        <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                                                            Waiting for <span className="text-white">{waitMinutes}m</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${statusColor} shadow-[0_0_10px_${statusColor}]`}></div>
                                                <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-[0.2em] italic">
                                                    {waitMinutes > 30 ? 'HIGH PRIORITY' : waitMinutes > 15 ? 'STANDBY' : 'READY SOON'}
                                                </span>
                                            </div>
                                            <div className="px-5 py-2 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Assigned To</p>
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase italic truncate max-w-[120px]">
                                                    {entry.handledByName || 'Floor Manager'}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-8">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-20"></div>
                                <div className="w-32 h-32 bg-white/5 rounded-[4rem] flex items-center justify-center border border-white/10 relative z-10 shadow-2xl">
                                    <Users className="w-16 h-16 text-slate-800" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-4xl font-black text-white uppercase tracking-widest italic leading-none">ALL CLEAR</h3>
                                <p className="text-slate-500 max-w-xs mx-auto text-[10px] font-black uppercase tracking-[0.5em] opacity-60 italic leading-relaxed">
                                    The floor is currently available.<br />No pending waitlist requests found.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row justify-center items-center gap-10 pt-6">
                    <div className="flex items-center gap-8 px-10 py-5 bg-white/[0.02] border border-white/5 rounded-[2.5rem] shadow-inner backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">0-15m</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]"></div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">15-30m</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]"></div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">30m+</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setEmptyView('WAITING_FORM')}
                        className="group relative px-12 py-7 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2.5rem] font-black uppercase tracking-[0.4em] shadow-[0_20px_60px_-10px_rgba(79,70,229,0.5)] transition-all active:scale-95 italic overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        <div className="flex items-center gap-6 relative z-10">
                            <Zap className="w-8 h-8 fill-white/20 group-hover:rotate-12 transition-transform" />
                            <span>Join The Waitlist</span>
                        </div>
                    </button>
                </div>
            </div>
        );
    };

    const renderWaitingListForm = () => {

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!waitingName || waitingPhone.length < 10) return;
            setIsSubmittingWaiting(true);
            try {
                await axios.post(`/waiting-list/public`, {
                    customerName: waitingName,
                    customerPhone: waitingPhone,
                    type: 'BILLIARD'
                });
                setRegSuccess(true);
                setTimeout(() => {
                    setWaitingName('');
                    setWaitingPhone('');
                    setRegSuccess(false);
                    setEmptyView('WAITING_LIST');
                }, 2200);
            } catch (err) {
                alert('Gagal mendaftar. Silakan coba lagi.');
            } finally {
                setIsSubmittingWaiting(false);
            }
        };

        if (regSuccess) {
            return (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-12 sm:p-20 rounded-[3rem] sm:rounded-[5rem] text-center space-y-8 z-10 mx-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                        <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter italic">CONCIERGE READY</h2>
                        <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] sm:text-xs">Your VIP session is being prepared.</p>
                    </div>
                </motion.div>
            );
        }

        return (
            <div className="w-full max-w-lg glass-card p-8 sm:p-14 rounded-[2.5rem] sm:rounded-[4rem] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-700 z-10 mx-4">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 blur-[110px]"></div>

                <div className="relative z-10 text-center space-y-4 mb-8 sm:mb-12">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 shadow-2xl">
                        <Users className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter italic">WAITING LIST</h2>
                    <p className="text-slate-500 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.5em] opacity-80">Join the Elite Waiting List</p>
                </div>

                <form onSubmit={handleSubmit} className="relative z-10 space-y-6 sm:space-y-8">
                    <div className="space-y-3 sm:space-y-4">
                        <label className="text-[8px] sm:text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.4em] ml-4 sm:ml-8">Guest Name</label>
                        <input
                            type="text"
                            placeholder="Enter your name..."
                            value={waitingName}
                            onChange={(e) => setWaitingName(e.target.value)}
                            className="w-full px-6 sm:px-10 py-4 sm:py-6 bg-white/[0.03] border border-white/5 rounded-2xl sm:rounded-[2rem] text-white font-black text-lg sm:text-xl focus:border-indigo-600 focus:bg-white/[0.06] outline-none transition-all placeholder:text-slate-800"
                            required
                        />
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                        <label className="text-[8px] sm:text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.4em] ml-4 sm:ml-8">WhatsApp Number</label>
                        <input
                            type="tel"
                            placeholder="08xxxxxxxxx"
                            value={waitingPhone}
                            onChange={(e) => setWaitingPhone(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-6 sm:px-10 py-4 sm:py-6 bg-white/[0.03] border border-white/5 rounded-2xl sm:rounded-[2rem] text-white font-black text-lg sm:text-xl focus:border-indigo-600 focus:bg-white/[0.06] outline-none transition-all placeholder:text-slate-800 tracking-widest"
                            required
                        />
                    </div>
                    <div className="pt-4 sm:pt-8 flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <button
                            type="button"
                            onClick={() => setEmptyView('WAITING_LIST')}
                            className="order-2 sm:order-1 flex-1 py-4 sm:py-6 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl sm:rounded-[1.5rem] font-black uppercase tracking-widest transition-all text-[9px] sm:text-[10px]"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingWaiting || !waitingName || waitingPhone.length < 10}
                            className="order-1 sm:order-2 flex-[2] py-4 sm:py-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white rounded-xl sm:rounded-[1.5rem] font-black uppercase tracking-widest shadow-2lx shadow-indigo-900/40 transition-all flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-[11px]"
                        >
                            {isSubmittingWaiting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            Secure My Slot
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    const renderAttendanceView = () => {
        const handleAttendance = async (action: 'CHECKIN' | 'CHECKOUT') => {
            if (attendancePin.length < 4) return;
            setAttendanceStatus('LOADING');
            setAttendanceAction(action);
            try {
                const endpoint = action === 'CHECKIN' ? 'public/checkin' : 'public/checkout';
                const res = await axios.post(`/attendance/${endpoint}`, {
                    pin: attendancePin
                });
                setAttendanceStatus('SUCCESS');
                setAttendanceMsg(`Berhasil ${action === 'CHECKIN' ? 'Check-in' : 'Check-out'}: ${res.data.user?.name || 'Karyawan'}`);
                
                setTimeout(() => {
                    setAttendancePin('');
                    setAttendanceStatus('IDLE');
                    setEmptyView('PROMO');
                }, 3000);
            } catch (err: any) {
                setAttendanceStatus('ERROR');
                setAttendanceMsg(err.response?.data?.message || 'PIN SALAH / GAGAL ABSEN');
                setTimeout(() => {
                    setAttendanceStatus('IDLE');
                }, 3000);
            }
        };

        const addDigit = (digit: string | number) => {
            if (attendancePin.length < 6) setAttendancePin(prev => prev + digit.toString());
        };

        return (
            <div className="w-full max-w-lg glass-card p-10 rounded-[4rem] shadow-3xl animate-in zoom-in-95 duration-700 z-10 mx-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[80px]" />
                
                <div className="relative z-10 text-center space-y-6 mb-10">
                    <div className="w-20 h-20 bg-emerald-600/10 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/20 shadow-2xl">
                        <Calendar className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">PRESENSI KARYAWAN</h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] opacity-80 mt-2">Masukan PIN untuk Check-in/out</p>
                    </div>
                </div>

                {attendanceStatus === 'SUCCESS' ? (
                   <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center space-y-6">
                       <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                           <CheckCircle2 className="w-10 h-10 text-white animate-bounce" />
                       </div>
                       <p className="text-emerald-400 font-black uppercase tracking-widest leading-relaxed text-sm">
                           {attendanceMsg}
                       </p>
                   </motion.div>
                ) : (
                    <div className="space-y-8 relative z-10">
                        {/* PIN Display */}
                        <div className="flex justify-center gap-4 py-4">
                            {[...Array(6)].map((_, i) => (
                                <motion.div 
                                    key={i} 
                                    animate={attendancePin.length > i ? { scale: [1, 1.2, 1], backgroundColor: '#6366f1' } : { scale: 1, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                    className={`w-4 h-4 rounded-full border border-white/10 transition-colors`} 
                                />
                            ))}
                        </div>

                        {attendanceStatus === 'ERROR' && (
                            <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">{attendanceMsg}</p>
                        )}

                        {/* Numeric Keypad */}
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'DEL'].map((btn) => (
                                <button
                                    key={btn.toString()}
                                    onClick={() => {
                                        if (btn === 'C') setAttendancePin('');
                                        else if (btn === 'DEL') setAttendancePin(prev => prev.slice(0, -1));
                                        else addDigit(btn);
                                    }}
                                    className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-white font-black text-xl transition-all active:scale-90 shadow-lg"
                                >
                                    {btn}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-6">
                            <button
                                onClick={() => {
                                    setAttendancePin('');
                                    setEmptyView('PROMO');
                                }}
                                className="order-2 sm:order-1 flex-1 py-5 bg-white/5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all border border-white/5"
                            >
                                Keluar
                            </button>
                            <div className="order-1 sm:order-2 flex-[2] flex gap-3">
                                <button
                                    disabled={attendancePin.length < 4 || attendanceStatus === 'LOADING'}
                                    onClick={() => handleAttendance('CHECKIN')}
                                    className="flex-1 py-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {attendanceStatus === 'LOADING' && attendanceAction === 'CHECKIN' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CHECK IN'}
                                </button>
                                <button
                                    disabled={attendancePin.length < 4 || attendanceStatus === 'LOADING'}
                                    onClick={() => handleAttendance('CHECKOUT')}
                                    className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-xl shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {attendanceStatus === 'LOADING' && attendanceAction === 'CHECKOUT' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CHECK OUT'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };


    const renderRedeemView = () => {
        if (!redeemMember) return null;

        const handleTukar = (item: any) => {
            if (redeemMember.points >= item.pointCost) {
                setSelectedReward(item);
                const token = `REDEEM-${redeemMember.id}-${item.id}-${Date.now()}`;
                setRedeemToken(token);
                setRedeemStatus('PENDING');

                // Alert cashier via socket if needed, although user said "show QR to cashier"
                // But we can be proactive:
                socket.emit('redeem_request', {
                    token,
                    memberId: redeemMember.id,
                    rewardId: item.id,
                    memberName: redeemMember.name,
                    itemName: item.name,
                    pointCost: item.pointCost,
                    terminalId: terminalId
                });
            } else {
                alert('Loyalty point Anda tidak mencukupi untuk item ini.');
            }
        };

        const filteredCatalog = redeemCategory === "SEMUA"
            ? rewardCatalog
            : rewardCatalog.filter((c: any) => c.category === redeemCategory);

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-12 bg-[#020617]/95 backdrop-blur-3xl overflow-y-auto"
            >
                <div className="w-full max-w-6xl min-h-[80vh] bg-white/[0.02] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col relative">
                    {/* Header */}
                    <header className="p-8 sm:p-12 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-8 bg-gradient-to-br from-amber-600/10 to-orange-600/10">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/20">
                                <Gift className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl sm:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">Redeem Reward</h1>
                                <div className="flex items-center gap-4 mt-3">
                                    <p className="text-amber-400 font-black text-xs uppercase tracking-widest">{redeemMember.name}</p>
                                    <div className="w-1 h-1 bg-white/20 rounded-full" />
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                        <Trophy className="w-3 h-3 text-amber-500" />
                                        <span className="text-xs font-black text-white">{Math.round(redeemMember.points)} PTS</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => { setRedeemMember(null); setRedeemStatus('IDLE'); }}
                            className="w-16 h-16 rounded-[2rem] bg-white/5 hover:bg-rose-500/10 border border-white/5 flex items-center justify-center text-white transition-all group"
                        >
                            <X className="w-6 h-6 group-hover:text-rose-500 transition-colors" />
                        </button>
                    </header>

                    {/* Catalog Content */}
                    <div className="flex-1 p-8 sm:p-12 overflow-y-auto custom-scrollbar">
                        <div className="flex gap-4 mb-10 overflow-x-auto pb-4 scb-hide">
                            {["SEMUA", "BILLIARD", "FOOD", "DRINK", "BOTTLE", "CIGARETTE", "OTHER"].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setRedeemCategory(cat)}
                                    className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap ${redeemCategory === cat ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredCatalog.map((item: any) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 flex flex-col gap-6 hover:bg-white/[0.05] transition-all group relative overflow-hidden"
                                >
                                    <div className="w-full aspect-square bg-white/[0.02] rounded-3xl overflow-hidden relative">
                                        {item.image ? (
                                            <img src={item.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" alt={item.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-10">
                                                <Gift className="w-20 h-20 text-white" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
                                            <span className="text-amber-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                                <Trophy className="w-3 h-3" /> {item.pointCost} Pts
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-2 leading-tight h-12 overflow-hidden">{item.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest line-clamp-2">{item.description || 'No description available'}</p>
                                    </div>
                                    <button
                                        onClick={() => handleTukar(item)}
                                        disabled={redeemMember.points < item.pointCost}
                                        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all ${redeemMember.points >= item.pointCost ? 'bg-amber-500 text-white hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/10' : 'bg-white/5 text-slate-700 cursor-not-allowed'}`}
                                    >
                                        {redeemMember.points >= item.pointCost ? 'Tukar Poin' : 'Poin Kurang'}
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* REDEEM OVERLAY */}
                    <AnimatePresence>
                        {redeemStatus !== 'IDLE' && selectedReward && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl"
                            >
                                <div className="max-w-md w-full text-center space-y-10">
                                    {redeemStatus === 'PENDING' ? (
                                        <>
                                            <div className="space-y-4">
                                                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Konfirmasi Penukaran</h2>
                                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">
                                                    Tunjukkan QR ini ke kasir atau waiter untuk menukar <span className="text-amber-400">{selectedReward.name}</span>
                                                </p>
                                            </div>

                                            <div className="bg-white p-8 rounded-[3rem] shadow-[0_0_80px_rgba(255,255,255,0.1)] inline-block relative group">
                                                <div className="absolute inset-0 bg-amber-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                                                <QRCodeSVG value={redeemToken} size={280} className="relative z-10" />
                                            </div>

                                            <div className="space-y-6">
                                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl font-mono text-amber-400 tracking-widest text-lg font-black">
                                                    {redeemToken}
                                                </div>
                                                <div className="flex items-center justify-center gap-3 px-6 py-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500 animate-pulse">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Menunggu Konfirmasi Kasir...</span>
                                                </div>
                                                <button
                                                    onClick={() => setRedeemStatus('IDLE')}
                                                    className="w-full py-4 bg-white/5 text-slate-600 font-black rounded-2xl text-[10px] uppercase tracking-widest border border-white/5 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                                                >
                                                    Batalkan Penukaran
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="space-y-10"
                                        >
                                            <div className="w-32 h-32 bg-emerald-500 rounded-[3rem] flex items-center justify-center mx-auto shadow-[0_30px_60px_-15px_rgba(16,185,129,0.5)]">
                                                <CheckCircle2 className="w-16 h-16 text-white animate-bounce" />
                                            </div>
                                            <div className="space-y-4">
                                                <h2 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">REDEEM BERHASIL!</h2>
                                                <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">Konfirmasi {selectedReward.name} Berhasil. Silakan Menunggu.</p>
                                            </div>
                                            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 text-left">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Hadiah</span>
                                                    <span className="text-lg font-black text-white italic uppercase tracking-tighter">{selectedReward.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Poin Terpotong</span>
                                                    <span className="text-lg font-black text-amber-400 italic">-{selectedReward.pointCost} Pts</span>
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] italic">Terima kasih atas loyalitas Anda.</p>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        );
    };

    const renderMemberInfoView = () => {
        if (!scannedMember) return null;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-8 bg-[#020617]/90 backdrop-blur-2xl"
            >
                <div className="w-full max-w-4xl bg-white/[0.03] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative">
                    <div className="p-8 sm:p-12 border-b border-white/5 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex flex-col sm:flex-row justify-between items-center gap-8 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl">
                                {scannedMember.name?.charAt(0)}
                            </div>
                            <div>
                                <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.4em] mb-2 italic">Member Passport</p>
                                <h2 className="text-3xl sm:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">{scannedMember.name}</h2>
                                <div className="flex items-center gap-3 mt-4 justify-center sm:justify-start">
                                    <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-white/60 tracking-widest uppercase">{scannedMember.memberCode}</span>
                                    <span className="px-3 py-1 bg-indigo-500 rounded-full text-[10px] font-black text-white tracking-widest uppercase">{scannedMember.tier?.name || 'Reguler'}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setScannedMember(null)}
                            className="w-16 h-16 rounded-[2rem] bg-white/5 hover:bg-rose-500/10 border border-white/5 flex items-center justify-center text-white transition-all group"
                        >
                            <X className="w-6 h-6 group-hover:text-rose-500 transition-colors" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div className="p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-white/5 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.04] transition-all group">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Wallet className="w-4 h-4 text-emerald-400" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">E-Wallet Balance</span>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">Rp {Number(scannedMember.balance).toLocaleString()}</p>
                                </div>
                                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.04] transition-all group">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Trophy className="w-4 h-4 text-amber-400" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loyalty Points</span>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">{Math.round(scannedMember.points || 0)} pts</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Member Privileges</p>
                                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6 space-y-3">
                                    <div className="flex items-center gap-3 text-indigo-300">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Priority Table Booking</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-indigo-300">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">{scannedMember.tier?.pointMultiplier || 1}x Point Multiplier</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-indigo-300">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Special F&B Discounts</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 sm:p-12 bg-black/20">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <HistoryIcon className="w-4 h-4 text-indigo-400" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Activity</span>
                                </div>
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Last 5 Transactions</span>
                            </div>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto noscrollbar">
                                {memberLogs.length === 0 ? (
                                    <div className="py-12 text-center opacity-30">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Records...</p>
                                    </div>
                                ) : (
                                    memberLogs.map((log: any, i: number) => (
                                        <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex justify-between items-center group hover:bg-white/[0.04] transition-all">
                                            <div>
                                                <p className="text-[10px] font-black text-white/80 uppercase tracking-tight">{log.type === 'TOPUP' ? 'Wallet Intake' : 'Service Usage'}</p>
                                                <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{new Date(log.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {log.invoiceNumber}</p>
                                            </div>
                                            <p className={`font-black text-sm tracking-tighter ${log.type === 'TOPUP' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {log.type === 'TOPUP' ? '+' : '-'} Rp{Number(log.grandTotal).toLocaleString()}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    // --- MAIN RENDER LOGIC ---
    if (!focusedTableInfo || (!table && !standaloneTransaction)) {
        return (
            <div className="h-screen w-full bg-[#020617] flex flex-col items-center justify-center text-center relative overflow-hidden select-none">
                <style jsx global>{` 
                    body { overflow: hidden; background: #020617; font-family: var(--font-plus-jakarta-sans), sans-serif; } 
                    .glass-card { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.04); }
                    .terminal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
                    .text-fluid-h1 { font-size: clamp(1.75rem, 8vw, 4rem); }
                    .promo-gradient { background: radial-gradient(circle at center, rgba(79, 70, 229, 0.15) 0%, transparent 70%); }
                `}</style>

                <BackgroundAnimation />

                {/* Global Remote Scanner Overlay */}
                {scanRequestId && (
                    <div className="fixed inset-0 z-[300]">
                        <QRScanner
                            title={
                                scanRequestType === 'TOPUP_VALIDATION' ? 'INISIASI TOPUP' :
                                    scanRequestType === 'TOPUP_COMMITMENT' ? 'VERIFIKASI TRANSAKSI' :
                                        scanRequestType === 'REWARD_CLAIM' ? 'TUKAR POIN HADIAH' :
                                            'CEK SALDO & POIN'
                            }
                            subtitle={
                                scanRequestType === 'TOPUP_VALIDATION' ? 'Scan untuk mulai pengisian saldo' :
                                    scanRequestType === 'TOPUP_COMMITMENT' ? 'Scan lagi untuk sinkronisasi' :
                                        'Scan QR Member Anda'
                            }
                            onScanSuccess={(code) => {
                                socket.emit('display_scan_result', {
                                    terminalId,
                                    uuid: scanRequestId,
                                    code,
                                    type: scanRequestType
                                });
                                setScanRequestId(null);
                                setScanRequestType(null);
                            }}
                            onClose={() => {
                                socket.emit('display_scan_result', { terminalId, uuid: scanRequestId, code: null });
                                setScanRequestId(null);
                                setScanRequestType(null);
                            }}
                        />
                    </div>
                )}

                <AnimatePresence>
                    {scannedMember && renderMemberInfoView()}
                </AnimatePresence>

                {/* Topup Success Global Notification Overlay */}
                <AnimatePresence>
                    {topupSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[500] w-full max-w-lg p-6"
                        >
                            <div className="bg-emerald-500 rounded-[2.5rem] p-10 shadow-[0_30px_60px_-15px_rgba(16,185,129,0.5)] border border-white/20 relative overflow-hidden group">
                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"
                                />

                                <div className="relative z-10 text-center space-y-6">
                                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-xl group-hover:scale-110 transition-transform duration-500">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                    </div>

                                    <div>
                                        <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Topup Success!</h3>
                                        <p className="text-white/80 font-black text-[10px] uppercase tracking-[0.4em] mt-3">Ref: {topupSuccess.memberName}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-black/10 rounded-2xl p-4 text-left border border-white/10">
                                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Amount</p>
                                            <p className="text-lg font-black text-white">Rp {topupSuccess.amount.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-black/10 rounded-2xl p-4 text-left border border-white/10">
                                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Method</p>
                                            <p className="text-lg font-black text-white uppercase">{topupSuccess.method}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/10 rounded-2xl p-6 text-center border border-white/20 backdrop-blur-sm">
                                        <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em] mb-2 text-center">Current Balance</p>
                                        <p className="text-4xl font-black text-white tabular-nums tracking-tighter">Rp {topupSuccess.newBalance.toLocaleString()}</p>
                                    </div>

                                    <div className="pt-2">
                                        <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.5em] italic">Pentagon Billiard Loyalty & System</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Validation Success Alert */}
                <AnimatePresence>
                    {validationAlert && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 20 }}
                            className="fixed top-10 left-1/2 -translate-x-1/2 z-[501]"
                        >
                            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex items-center gap-6 min-w-[320px]">
                                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <CheckCircle2 className="w-8 h-8 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Scan Berhasil</p>
                                    <h4 className="text-xl font-black text-white leading-tight uppercase tracking-tighter italic">Member: {validationAlert.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-2 h-2 rounded-full ${validationAlert.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Status: {validationAlert.active ? 'Active Member' : 'Inactive Member'}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {redeemMember && renderRedeemView()}
                </AnimatePresence>

                {/* TERMINAL SELECTION OVERLAY */}
                {!terminalId && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center p-8 sm:p-20"
                    >
                        <BackgroundAnimation />
                        <div className="relative z-10 w-full max-w-4xl space-y-12">
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 shadow-2xl">
                                    <Monitor className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter italic">Terminal Setup</h1>
                                <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-xs">Pilih atau Masukkan ID Terminal Display</p>
                            </div>

                            <div className="glass-card p-8 sm:p-12 rounded-[3.5rem] space-y-10">
                                {/* Common Locations Suggested by User */}
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] ml-2">Quick Locations</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {['BAR', 'VIP', 'LOBBY'].map(loc => (
                                            <button
                                                key={loc}
                                                onClick={() => {
                                                    const id = `DISPLAY-${loc}`;
                                                    localStorage.setItem('display_terminal_id', id);
                                                    setTerminalId(id);
                                                }}
                                                className="px-6 py-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl text-white font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-3 group"
                                            >
                                                <Zap className="w-4 h-4 text-indigo-400 group-hover:animate-pulse" />
                                                DISPLAY-{loc}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Numerical IDs</p>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                        {[1, 2, 3, 4, 5, 8, 10, 12, 318, 319].map(num => (
                                            <button
                                                key={num}
                                                onClick={() => {
                                                    const id = `T-${num}`;
                                                    localStorage.setItem('display_terminal_id', id);
                                                    setTerminalId(id);
                                                }}
                                                className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-1 group"
                                            >
                                                <span className="opacity-30 group-hover:opacity-60 transition-opacity">T-</span>{num}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/5">
                                    <div className="flex-1 relative">
                                        <Monitor className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                                        <input
                                            type="text"
                                            placeholder="Custom ID (e.g. MEJA-01)"
                                            onKeyDown={(e: any) => {
                                                if (e.key === 'Enter' && e.target.value) {
                                                    const val = e.target.value.toUpperCase();
                                                    localStorage.setItem('display_terminal_id', val);
                                                    setTerminalId(val);
                                                }
                                            }}
                                            className="w-full pl-16 pr-8 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-white font-black uppercase tracking-widest placeholder:text-slate-800 transition-all font-mono"
                                        />
                                    </div>
                                    <button
                                        onClick={(e: any) => {
                                            const input = e.currentTarget.previousSibling.querySelector('input');
                                            if (input?.value) {
                                                const val = input.value.toUpperCase();
                                                localStorage.setItem('display_terminal_id', val);
                                                setTerminalId(val);
                                            }
                                        }}
                                        className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/40"
                                    >
                                        Connect
                                    </button>
                                </div>
                            </div>

                            <p className="text-center text-slate-700 font-bold text-[10px] uppercase tracking-[0.5em]">VOC System Integrated Engine v3.5</p>
                        </div>
                    </motion.div>
                )}

                {/* Status Overlay: Setup Warning - REFINED */}
                {terminalId && !socket.connected && (
                    <div className="absolute top-10 left-10 z-50 animate-pulse">
                        <div className="bg-rose-500/10 backdrop-blur-3xl border border-rose-500/30 px-6 py-3 rounded-[1.5rem] flex items-center gap-4 shadow-[0_20px_50px_-15px_rgba(244,63,94,0.3)]">
                            <div className="w-3 h-3 bg-rose-500 rounded-full shadow-[0_0_15px_#f43f5e]"></div>
                            <span className="text-[11px] font-black text-rose-500 uppercase tracking-[0.5em] italic">Connecting...</span>
                        </div>
                    </div>
                )}

                {emptyView === 'PROMO' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-10 w-full h-full flex flex-col p-10 sm:p-20"
                    >
                        {/* TOP-RIGHT: BRANDING */}
                        <div className="absolute top-10 right-10 sm:top-16 sm:right-16 flex items-center gap-4 flex-row-reverse">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-500 rounded-full flex items-center justify-center p-1.5 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                                {settings?.logoPath ? (
                                    <img src={getFullImageUrl(settings.logoPath)} alt="Logo" className="w-full h-full object-contain filter brightness-0 invert" />
                                ) : (
                                    <Zap className="w-full h-full text-white fill-white" />
                                )}
                            </div>
                            <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tighter text-right">
                                {settings?.businessName || "PAKTEKA 88"}
                            </h2>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row items-center justify-between gap-12 sm:gap-20">
                            {/* LEFT SIDE: PROMO HEADING & LARGE HERO IMAGE */}
                            <div className="flex-1 flex flex-col items-start gap-8 sm:gap-12 w-full lg:max-w-[800px]">
                                <AnimatePresence mode="wait">
                                    {currentPromo && (
                                        <motion.div
                                            key={promoIndex}
                                            initial={{ opacity: 0, x: -30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 30 }}
                                            className="space-y-2"
                                        >
                                            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white uppercase tracking-tighter italic leading-none">
                                                {currentPromo.title}
                                            </h1>
                                            <p className="text-lg sm:text-2xl text-slate-400 font-bold uppercase tracking-widest pl-2">
                                                {currentPromo.desc}
                                            </p>
                                        </motion.div>
                                    )}
                                    {!settings && (
                                        <div className="space-y-4 animate-pulse">
                                            <div className="h-16 w-64 bg-white/5 rounded-2xl"></div>
                                            <div className="h-6 w-48 bg-white/5 rounded-xl"></div>
                                        </div>
                                    )}
                                </AnimatePresence>

                                <div className="w-full aspect-[16/9] relative group perspective-2000">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={promoIndex}
                                            initial={{ opacity: 0, scale: 0.95, rotateX: 5 }}
                                            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                                            exit={{ opacity: 0, scale: 1.05, rotateX: -5 }}
                                            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                                            className="absolute inset-0 rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden border border-white/5 shadow-[0_60px_120px_-20px_rgba(0,0,0,0.8)] bg-slate-900"
                                        >
                                            {currentPromo?.image ? (
                                                <img
                                                    src={getFullImageUrl(currentPromo.image)}
                                                    alt={currentPromo.title}
                                                    className="w-full h-full object-cover transition-transform duration-[20s] ease-linear group-hover:scale-110"
                                                    onError={(e) => {
                                                        // If dynamic image fails, try a fallback unsplash image
                                                        (e.target as any).src = 'https://images.unsplash.com/photo-1544178178-50348c32d847?auto=format&fit=crop&q=80&w=1920';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-slate-900 to-black flex items-center justify-center">
                                                    {settings ? (
                                                        <Zap className="w-32 h-32 text-indigo-500 opacity-20 animate-pulse" />
                                                    ) : (
                                                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                                                    )}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* RIGHT SIDE: INTERACTION PANEL */}
                            <div className="w-full lg:w-[400px] flex flex-col items-center lg:items-end gap-10">
                                <div className="text-center lg:text-right space-y-2">
                                    <p className="text-3xl sm:text-5xl font-black italic tracking-tighter leading-none flex flex-wrap justify-center lg:justify-end gap-3 uppercase">
                                        <span className="text-indigo-500">CEK</span>
                                        <span className="text-white">RESERVASI</span>
                                    </p>
                                    <p className="text-3xl sm:text-5xl font-black italic tracking-tighter leading-none flex flex-wrap justify-center lg:justify-end gap-3 uppercase">
                                        <span className="text-white">TABLE</span>
                                        <span className="text-violet-500">BILLIARD</span>
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4 w-full">
                                    <button
                                        onClick={() => setEmptyView('TABLES')}
                                        className="w-full px-8 py-6 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-4 group"
                                    >
                                        <Monitor className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        Table Status Monitoring
                                    </button>

                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button
                                            onClick={() => setEmptyView('WAITING_FORM')}
                                            className="flex-1 px-8 py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-4 group"
                                        >
                                            <Zap className="w-6 h-6 fill-white/20 group-hover:rotate-12 transition-transform" />
                                            WAITING LIST
                                        </button>
                                        <button
                                            onClick={() => {
                                                const uuid = Math.random().toString(36).substring(7);
                                                setScanRequestId(uuid);
                                                setScanRequestType('REWARD_CLAIM');
                                            }}
                                            className="flex-1 px-8 py-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-4 group"
                                        >
                                            <Gift className="w-6 h-6 group-hover:animate-bounce" />
                                            REWARD
                                        </button>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button
                                            onClick={() => setEmptyView('WAITING_LIST')}
                                            className="flex-1 px-8 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-4"
                                        >
                                            <Users className="w-5 h-5 text-indigo-400" />
                                            Check Waiting List
                                        </button>
                                        <button
                                            onClick={() => setEmptyView('ATTENDANCE')}
                                            className="flex-1 px-8 py-5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 rounded-2xl text-emerald-400 font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-4"
                                        >
                                            <Calendar className="w-5 h-5 text-emerald-500" />
                                            Absensi Karyawan
                                        </button>
                                    </div>
                                </div>


                            </div>
                        </div>

                        {/* BOTTOM-RIGHT: DIGITAL CLOCK - SUBTLE */}
                        <div className="absolute bottom-10 right-10 flex items-baseline gap-3 opacity-30">
                            <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tighter">
                                {new Date(currentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                            <span className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-[0.3em] italic">
                                {new Date(currentTime).toLocaleDateString([], { weekday: 'short' })}
                            </span>
                        </div>
                    </motion.div>
                )}

                {emptyView === 'TABLES' && renderTableStatus()}
                {emptyView === 'WAITING_LIST' && renderWaitingListView()}
                {emptyView === 'WAITING_FORM' && renderWaitingListForm()}
                {emptyView === 'ATTENDANCE' && renderAttendanceView()}

                {emptyView === 'PROMO' && (
                    <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center bg-[#020617] border-t border-white/5 relative z-50 gap-4">
                        <p className="text-[7px] font-black text-slate-700 tracking-[0.3em] sm:tracking-[0.5em] uppercase">VOC System Integrated Display v3.5</p>
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => {
                                    localStorage.removeItem('display_terminal_id');
                                    window.location.reload();
                                }}
                                className="px-4 py-2 bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 rounded-lg text-[8px] font-black text-slate-700 hover:text-rose-500 uppercase tracking-widest transition-all"
                            >
                                Reset Terminal Configuration
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-[7px] font-black text-slate-700 uppercase italic">{terminalId} Connected</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (showRating) {
        return (
            <div className="h-screen w-screen bg-indigo-600 flex flex-col items-center justify-center p-12 text-center text-white select-none relative overflow-hidden">
                <style jsx global>{` body { overflow: hidden; } `}</style>
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_white/10,_transparent)]"></div>
                <div className="relative z-10 space-y-12 max-w-xl">
                    <div className="p-8 bg-white/10 backdrop-blur-xl rounded-[3rem] inline-block mb-4">
                        <CheckCircle2 className="w-20 h-20 text-white animate-bounce" />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-5xl font-black tracking-tighter uppercase">Terima Kasih!</h1>
                        <p className="text-indigo-100 text-xl font-medium">Layanan kami bagaimana hari ini?</p>
                    </div>
                    <div className="flex justify-center gap-4">
                        {[1, 2, 3, 4, 5].map(v => (
                            <button key={v} onClick={() => { setRating(v); setTimeout(() => setShowRating(false), 2000); }} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${rating === v ? 'bg-amber-400 scale-110 shadow-xl shadow-amber-900/20' : 'bg-white/10 hover:bg-white/20'}`}>
                                <Star className={`w-6 h-6 ${rating === v ? 'fill-indigo-900 text-indigo-900' : ''}`} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const tx = table?.activeTransaction || standaloneTransaction;
    if (!tx) return null; // Safety check

    return (
        <div className="h-screen w-screen bg-[#020617] flex flex-col select-none relative overflow-hidden text-white font-sans">
            <style jsx global>{` 
                    :root { --p-bg: #020617; }
                    body { overflow: hidden; background: var(--p-bg); font-family: var(--font-plus-jakarta-sans), sans-serif; color: white; } 
                    ::-webkit-scrollbar { display: none; } 
                    .glass-card { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.04); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                    .item-card { background: rgba(255, 255, 255, 0.015); border: 1px solid rgba(255, 255, 255, 0.03); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                    .item-card:hover { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.08); transform: translateY(-2px); }
                    .text-clamp-title { font-size: clamp(2rem, 5vw, 4rem); }
                    .text-clamp-body { font-size: clamp(0.875rem, 1.5vw, 1.125rem); }
                `}</style>

            {showScratch && renderScratchOverlay()}

            {/* Float Call Waiter */}
            <div className="fixed bottom-10 left-10 z-[100]">
                <button
                    onClick={handleCallWaiter}
                    disabled={isCalling}
                    className={`px-6 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-4 shadow-2xl transition-all border ${isCalling ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                >
                    <BellRing className={`w-4 h-4 ${isCalling ? 'animate-bounce' : 'text-indigo-400'}`} />
                    {isCalling ? 'Waiter Notified' : 'Panggil Waiter'}
                </button>
            </div>

            <div className="h-24 px-10 flex justify-between items-center border-b border-white/5 relative z-50 bg-[#020617]/60 backdrop-blur-3xl shadow-2xl">
                <div className="flex flex-col text-left">
                    <span className="text-base font-black tracking-tighter text-white uppercase italic leading-none">{settings?.businessName || "VOC SYSTEM PREMIUM"}</span>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_#6366f1]"></div>
                        <span className="text-[9px] font-black tracking-[0.4em] text-slate-500 uppercase italic">
                            {terminalId ? `TERMINAL ${terminalId}` : 'ELITE TERMINAL'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="flex flex-col items-end gap-1">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] italic">Accessing</p>
                        <span className="px-5 py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl text-[11px] font-black uppercase tracking-tighter italic shadow-inner">
                            {table?.tableName || tx?.invoiceNumber || 'GUEST-01'}
                        </span>
                    </div>
                    <div className="w-12 h-12 bg-white/5 rounded-[1.25rem] border border-white/5 flex items-center justify-center overflow-hidden p-2 backdrop-blur-3xl shadow-2xl">
                        {settings?.logoPath ? (
                            <img src={getFullImageUrl(settings.logoPath)} alt="Logo" className="w-full h-full object-contain" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                        ) : (
                            <Zap className="w-5 h-5 text-indigo-400" />
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
                {/* Left side: Bill Details */}
                <div className="w-full lg:w-[58%] h-auto lg:h-full p-6 sm:p-10 flex flex-col gap-6 sm:gap-8 border-b lg:border-b-0 lg:border-r border-white/5 overflow-visible lg:overflow-hidden relative">
                    <div className="flex items-end justify-between relative z-10">
                        <div className="space-y-1 sm:space-y-2">
                            <p className="text-[8px] sm:text-[10px] text-indigo-400 font-black uppercase tracking-[0.5em]">Current Session</p>
                            <h3 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter leading-none italic truncate max-w-[180px] sm:max-w-none">
                                {paymentState?.customerName || member?.name || tx?.member?.name || tx?.customerName || 'Walk-in Guest'}
                            </h3>
                        </div>
                        <div className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 glass-card border ${tx?.isPaid ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}`}>
                            <div className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${tx?.isPaid ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}></div>
                            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">{tx?.isPaid ? 'Paid' : 'Unpaid'}</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 flex flex-col relative z-10 lg:overflow-hidden">
                        <div className="flex-1 lg:overflow-y-auto noscrollbar space-y-3">
                            {Number(tx?.billiardTotal) > 0 && (
                                <div className="p-5 sm:p-6 rounded-[2rem] item-card flex justify-between items-center bg-indigo-500/[0.02]">
                                    <div className="flex gap-4 sm:gap-6 items-center">
                                        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-indigo-500/10 text-indigo-400 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner"><Timer className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                                        <div className="space-y-0.5 sm:space-y-1">
                                            <p className="font-black text-white text-sm sm:text-lg uppercase tracking-tight italic">{tx.fareName || 'Billiard Session'}</p>
                                            <p className="text-slate-500 font-black text-[8px] sm:text-[10px] uppercase tracking-[0.2em]">{tx.sessionDuration || '00:00:00'} Playing</p>
                                        </div>
                                    </div>
                                    <p className="text-lg sm:text-2xl font-black text-white font-mono tracking-tighter">Rp {Number(tx.billiardTotal).toLocaleString()}</p>
                                </div>
                            )}

                            {(tx?.orderItems || []).filter((i: any) => i.status?.toUpperCase() !== 'CANCELLED' && i.status?.toUpperCase() !== 'CANCEL_REQUESTED').map((item: any, idx: number) => (
                                <div key={idx} className="p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] item-card flex justify-between items-center">
                                    <div className="flex gap-4 sm:gap-6 items-center">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/[0.03] text-slate-500 rounded-lg sm:rounded-xl flex items-center justify-center"><Coffee className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                        <div className="space-y-0.5">
                                            <p className="font-bold text-slate-200 text-xs sm:text-sm uppercase tracking-wide italic truncate max-w-[140px] sm:max-w-none">{item.menuItem?.name || 'Cafe Order'}</p>
                                            <p className="text-slate-600 font-black text-[8px] sm:text-[9px] uppercase tracking-widest">{item.quantity}x @ {item.priceAtOrder.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <p className="font-black text-slate-300 text-sm sm:text-lg font-mono tracking-tighter">Rp {Number(item.priceAtOrder * item.quantity).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right side: Summary & Dynamic */}
                <div className="w-full lg:w-[42%] h-auto lg:h-full bg-[#030712]/40 backdrop-blur-md flex flex-col p-6 sm:p-10 gap-6 sm:gap-8 relative">
                    {/* Summary Card */}
                    <div className="glass-card rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 space-y-4 sm:space-y-6 relative z-10 overflow-hidden">
                        {tx?.isPaid && (
                            <div className="absolute top-4 right-4 z-20">
                                <span className="px-3 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]">SETTLED</span>
                            </div>
                        )}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex justify-between items-center text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                <span>Subtotal</span>
                                <span className="text-slate-300">Rp {Number((tx?.billiardTotal || 0) + (tx?.cafeTotal || 0)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-3 sm:pb-5">
                                <span>Taxes & Service</span>
                                <span className="text-slate-300">Rp {Number((tx?.vatAmount || 0) + (tx?.serviceChargeAmount || 0)).toLocaleString()}</span>
                            </div>
                            <div className="pt-2 sm:pt-4 space-y-1 sm:space-y-2">
                                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.5em] text-indigo-400 italic">Grand Total</p>
                                <div className="flex items-baseline gap-2 sm:gap-3">
                                    <span className="text-sm sm:text-xl font-black text-white/10 italic">IDR</span>
                                    <h1 className={`text-3xl sm:text-6xl font-black tracking-tighter italic origin-left transition-colors ${tx?.isPaid ? 'text-emerald-400' : 'text-white'}`}>
                                        {Number(splitState?.totalBill || tx?.grandTotal || 0).toLocaleString()}
                                    </h1>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 lg:overflow-hidden min-h-[350px] lg:min-h-0">
                        <AnimatePresence mode="wait">
                            {splitState && Number(splitState.tableId) === Number(table?.id || 0) ? (
                                <motion.div key="split" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full">
                                    {renderSplitSection()}
                                </motion.div>
                            ) : (paymentState && (paymentState.transactionId?.toString() === tx?.id?.toString() || (paymentState.tableId?.toString() === table?.id?.toString() && paymentState.tableId !== null))) ? (
                                <motion.div key="payment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
                                    <div className="p-6 sm:p-8 bg-indigo-600 rounded-[2rem] text-white shadow-2xl h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-4">
                                            <CreditCard className="w-4 h-4 opacity-50" />
                                            <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Payment Process</p>
                                        </div>
                                        <div className="flex-1 overflow-hidden flex flex-col gap-4">
                                            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight italic">
                                                {paymentState.paymentMethod || 'Processing...'}
                                                {paymentState.isPartial && <span className="ml-2 text-[8px] bg-white/20 px-2 py-1 rounded-full align-middle font-black">PARTIAL</span>}
                                            </h3>

                                            <div className="mt-2 sm:mt-4 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[7px] font-black uppercase opacity-60 mb-1">Amount Paid</p>
                                                    <motion.p 
                                                        key={paymentState.paymentAmount}
                                                        initial={{ y: 5, opacity: 0 }}
                                                        animate={{ y: 0, opacity: 1 }}
                                                        className="text-sm sm:text-lg font-black font-mono"
                                                    >
                                                        Rp {paymentState.paymentAmount.toLocaleString()}
                                                    </motion.p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[7px] font-black uppercase opacity-60 mb-1">Change</p>
                                                    <motion.p 
                                                        key={paymentState.changeAmount}
                                                        initial={{ scale: 1.1, color: '#fff' }}
                                                        animate={{ scale: 1, color: '#6ee7b7' }}
                                                        className="text-lg sm:text-2xl font-black font-mono"
                                                    >
                                                        Rp {paymentState.changeAmount.toLocaleString()}
                                                    </motion.p>
                                                </div>
                                            </div>

                                            {paymentState.isPartial && paymentState.items?.length > 0 && (
                                                <div className="mt-4 flex-1 overflow-y-auto noscrollbar bg-black/10 rounded-xl p-3 border border-white/5">
                                                    <p className="text-[7px] font-black uppercase opacity-30 mb-2">Item Split</p>
                                                    <div className="space-y-1">
                                                        {paymentState.items.map((it: any, k: number) => (
                                                            <div key={k} className="flex justify-between text-[9px] font-bold">
                                                                <span className="truncate max-w-[140px]">{it.qty}x {it.name}</span>
                                                                <span>Rp {(it.qty * it.price).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="id-qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col gap-4">
                                    {renderIdentifySection()}
                                    <div className="flex-1 glass-card rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4">
                                        <div className="p-3 bg-white rounded-2xl shadow-xl shadow-indigo-500/10">
                                            <QRCodeSVG value={`/transactions/${tx?.id}/pay-qris`} size={130} />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-white font-black uppercase text-[9px] tracking-widest">Scan to Pay</h4>
                                            <p className="text-slate-500 text-[6px] sm:text-[8px] font-bold uppercase tracking-widest mt-1 opacity-60 italic">E-Wallet & Mobile Banking Ready</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="px-6 sm:px-10 py-3 flex flex-col sm:flex-row justify-between items-center bg-[#020617] border-t border-white/5 relative z-50 gap-4">
                <p className="text-[7px] font-black text-slate-700 tracking-[0.3em] sm:tracking-[0.5em] uppercase">VOC Integrated Display v3.5</p>
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => {
                            localStorage.removeItem('display_terminal_id');
                            window.location.reload();
                        }}
                        className="px-4 py-2 bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 rounded-lg text-[8px] font-black text-slate-700 hover:text-rose-500 uppercase tracking-widest transition-all"
                    >
                        Reset Display Config
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-[7px] font-black text-slate-700 uppercase italic">{terminalId} Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
