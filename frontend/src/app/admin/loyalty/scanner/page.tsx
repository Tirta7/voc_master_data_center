"use client";

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ScanLine, CheckCircle2, XCircle, Loader2, Camera, Keyboard, ShieldCheck, Terminal, HelpCircle, History, Orbit, Search, AlertCircle, ShoppingBag, User, Gift } from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlert } from '@/components/ui/AlertProvider';


export default function LoyaltyScannerPage() {
    const { redeemQueue, setRedeemQueue } = useRealtimeData();
    const { terminalId: currentTerminalId } = useAuth();
    const { showAlert } = useAlert();
    const [inputValue, setInputValue] = useState("");
    const [status, setStatus] = useState<"IDLE" | "LOADING" | "SUCCESS" | "ERROR">("IDLE");
    const [message, setMessage] = useState("");
    const [useCamera, setUseCamera] = useState(false);
    const [lastScan, setLastScan] = useState<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep input focused automatically for USB Barcode Scanners
    useEffect(() => {
        if (!useCamera) {
            const handleClick = () => {
                if (inputRef.current) inputRef.current.focus();
            };
            window.addEventListener("click", handleClick);
            if (inputRef.current) inputRef.current.focus();
            return () => window.removeEventListener("click", handleClick);
        }
    }, [useCamera]);

    const processQR = async (code: string) => {
        if (!code) return;
        try {
            setStatus("LOADING");
            setMessage("Otentikasi Token...");

            const decoded = code.trim();
            const parts = decoded.split(/[-|]/);
            if (parts.length < 4 || parts[0].toUpperCase() !== 'REDEEM') {
                setStatus("ERROR");
                setMessage(`QR: "${decoded}" tidak valid. Pastikan discan dari menu Tukar Poin Member.`);
                return;
            }

            const memberId = parseInt(parts[1], 10);
            const rewardId = parseInt(parts[2], 10);
            const timestamp = parseInt(parts[3], 10);

            // Validate token age (optional, e.g. valid for 1 hour)
            if (Date.now() - timestamp > 3600000) {
                setStatus("ERROR");
                setMessage("QR Code kedaluwarsa. Token keamanan hanya berlaku 60 menit.");
                return;
            }

            const res = await axios.post(`/loyalty/redeem/confirm`, {
                redeemToken: decoded
            });

            if (res.data.success) {
                setStatus("SUCCESS");
                setMessage(`VALIDASI BERHASIL! ${res.data.itemName} untuk ${res.data.memberName}`);
                setLastScan({
                    memberName: res.data.memberName || "Member",
                    rewardName: res.data.itemName || "Reward Item",
                    points: res.data.pointsDeducted || 0,
                    timestamp: new Date().toLocaleTimeString()
                });
                // Remove from queue if it matches
                setRedeemQueue(prev => prev.filter(r => r.token !== decoded));
            } else {
                setStatus("ERROR");
                setMessage("Otentikasi Gagal: Respons tidak valid.");
            }
        } catch (error: any) {
            console.error(error);
            setStatus("ERROR");
            setMessage(error.response?.data?.message || "Otentikasi Ditolak: Poin tidak cukup atau sistem sibuk.");
        } finally {
            setInputValue("");
            if (useCamera) setUseCamera(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            processQR(inputValue);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                     <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-4 uppercase italic">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200">
                             <ScanLine className="w-8 h-8 text-white" />
                        </div>
                        Redemption <span className="text-indigo-600">Commander</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-bold uppercase tracking-[0.3em] text-[10px] sm:text-xs">
                        {currentTerminalId || 'GLOBAL'} TERMINAL // AUTH_LEVEL: AUTHORIZED_STAFF
                    </p>
                </div>
                
                <button 
                  onClick={() => setUseCamera(!useCamera)}
                  className={`flex items-center gap-3 px-6 py-4 font-black text-xs rounded-2xl border transition-all active:scale-95 shadow-xl ${useCamera ? 'bg-slate-900 text-white border-slate-700 shadow-slate-300' : 'bg-white text-indigo-600 border-slate-200 shadow-slate-100'}`}
                >
                    {useCamera ? <Keyboard className="w-5 h-5 animate-bounce"/> : <Camera className="w-5 h-5 animate-pulse"/>}
                    {useCamera ? "MODE: USB SCANNER" : "MODE: KAMERA HP"}
                </button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* Pending Requests List */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl min-h-[400px] md:min-h-[600px] flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-3">
                                <History className="w-5 h-5" /> 
                                Antrian Realtime
                            </h3>
                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black tracking-widest">
                                {redeemQueue.length} REQ
                            </span>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 max-h-[700px]">
                            <AnimatePresence mode="popLayout">
                                {redeemQueue.length === 0 ? (
                                    <motion.div 
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30 mt-10 md:mt-20"
                                    >
                                        <ShoppingBag className="w-16 h-16 mb-4" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Belum ada permintaan penukaran masuk</p>
                                    </motion.div>
                                ) : (
                                    redeemQueue.map((item) => (
                                        <motion.div
                                            key={item.token}
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className={`p-5 rounded-3xl border transition-all ${item.dismissed ? 'bg-white/5 border-white/5' : 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20'}`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                                        {new Date(item.createdAt).toLocaleTimeString()} • {item.terminalId || 'TRM'}
                                                    </p>
                                                    <p className="text-lg font-black uppercase text-white truncate max-w-[150px]">{item.memberName}</p>
                                                </div>
                                                <div className="bg-indigo-500 text-white rounded-xl px-3 py-1 text-[10px] font-black shadow-lg shadow-indigo-500/20">
                                                    {item.pointCost} PTS
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                                    <Gift className="w-4 h-4 text-indigo-400" />
                                                </div>
                                                <p className="text-sm font-bold text-slate-300 uppercase leading-tight truncate">{item.itemName}</p>
                                            </div>
                                            <button 
                                                onClick={() => processQR(item.token)}
                                                disabled={status === "LOADING"}
                                                className={`w-full py-3 ${status === 'LOADING' ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-500'} text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2`}
                                            >
                                                {status === "LOADING" ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                )}
                                                {status === "LOADING" ? "Memproses..." : "Konfirmasi"}
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Main Auth Terminal */}
                <div className="xl:col-span-8 space-y-6">
                    <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl relative overflow-hidden group min-h-[400px] md:min-h-[600px] flex flex-col justify-center">
                        {/* Scanning Laser Decoration */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[scan_3s_ease-in-out_infinite] opacity-30"></div>
                        
                        <div className="relative mx-auto w-32 h-32 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
                            <div className={`absolute inset-0 rounded-[2.2rem] border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-indigo-500 animate-spin opacity-40 ${status !== 'LOADING' ? 'hidden' : ''}`}></div>
                            <ScanLine className={`w-14 h-14 ${status === 'LOADING' ? 'text-indigo-300' : 'text-indigo-600'}`} />
                        </div>

                        <div className="text-center mb-10">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase mb-2 italic">Manual Authentication Terminal</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gunakan USB Barcode Laser atau Kamera HP untuk verifikasi Manual</p>
                        </div>

                        {useCamera ? (
                            <div className="max-w-md mx-auto w-full relative mb-6 rounded-[2rem] overflow-hidden border-8 border-slate-50 h-72 bg-slate-950 shadow-2xl">
                                <QRScanner 
                                   onScanSuccess={(code) => processQR(code)} 
                                   onClose={() => setUseCamera(false)} 
                                />
                            </div>
                        ) : (
                            <div className="max-w-md mx-auto w-full relative mb-6">
                                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                    <Terminal className="w-5 h-5 text-indigo-300" />
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Listening for laser input..."
                                    className="w-full text-center text-xl font-mono tracking-[0.2em] p-6 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all shadow-xl bg-slate-50 text-slate-700 placeholder:text-slate-300"
                                    autoComplete="off"
                                    autoFocus
                                    disabled={status === "LOADING"}
                                />
                            </div>
                        )}

                        {/* Status Feedback */}
                        <AnimatePresence>
                            {status === "SUCCESS" && (
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="mt-10 p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] flex items-center gap-6 max-w-lg mx-auto w-full shadow-xl shadow-emerald-500/5">
                                    <div className="p-4 bg-white rounded-2xl shadow-lg border border-emerald-100 shrink-0">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="font-black text-emerald-800 text-xl tracking-tighter uppercase leading-none mb-1">ACCESS GRANTED</p>
                                        <p className="text-sm text-emerald-600 font-bold">{message}</p>
                                    </div>
                                </motion.div>
                            )}

                            {status === "ERROR" && (
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="mt-10 p-6 bg-rose-50 border-2 border-rose-100 rounded-[2rem] flex items-center gap-6 max-w-lg mx-auto w-full shadow-xl shadow-rose-500/5">
                                    <div className="p-4 bg-white rounded-2xl shadow-lg border border-rose-100 shrink-0">
                                        <XCircle className="w-10 h-10 text-rose-500" />
                                    </div>
                                    <div>
                                        <p className="font-black text-rose-800 text-xl tracking-tighter uppercase leading-none mb-1">ACCESS DENIED</p>
                                        <p className="text-sm text-rose-600 font-bold">{message}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                         <div className="bg-slate-100 rounded-[2rem] p-8 text-slate-800 border-2 border-slate-200 relative overflow-hidden group">
                             <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                                <History className="w-4 h-4" /> Activity Journal
                             </h3>
                             {lastScan ? (
                                <div className="space-y-2 animate-in fade-in">
                                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">[{lastScan.timestamp}]</p>
                                    <p className="text-xs font-black text-emerald-600 uppercase tracking-tighter">SUCCESSFUL AUTH</p>
                                    <p className="text-sm font-bold text-slate-800">{lastScan.memberName} redeemed <span className="text-indigo-600">{lastScan.rewardName}</span></p>
                                </div>
                             ) : (
                                <p className="text-xs font-bold text-slate-400 italic">No recent activities found.</p>
                             )}
                        </div>
                        <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
                             <Orbit className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:rotate-45 transition-transform" />
                             <h3 className="text-sm font-black uppercase tracking-widest opacity-80 mb-6 flex items-center gap-2">
                                <HelpCircle className="w-4 h-4" /> System Integration
                             </h3>
                             <p className="text-xs leading-relaxed font-bold opacity-90">
                                Setiap konfirmasi akan otomatis mengirimkan print-command ke Kitchen/Bartender sesuai kategori menu yang ditukar.
                             </p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes scan {
                    0% { top: 0; }
                    50% { top: 100%; }
                    100% { top: 0; }
                }
            `}</style>
        </div>
    );
}
