"use client";

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ScanLine, CheckCircle2, XCircle, Loader2, Camera, Keyboard, ShieldCheck, Terminal, HelpCircle, History, Orbit, Search, AlertCircle, ShoppingBag, User } from 'lucide-react';
import QRScanner from '@/components/QRScanner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function LoyaltyScannerPage() {
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

            const res = await axios.post(`${API_URL}/loyalty/redeem`, {
                memberId,
                rewardId
            });

            if (res.data.success) {
                setStatus("SUCCESS");
                setMessage(`VALIDASI BERHASIL! Sisa poin member: ${res.data.newBalance.toLocaleString()} Pts`);
                setLastScan({
                    memberName: res.data.memberName || "Member",
                    rewardName: res.data.rewardName || "Reward Item",
                    points: res.data.pointsDeducted,
                    timestamp: new Date().toLocaleTimeString()
                });
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
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                     <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
                        <div className="p-3 bg-slate-900 rounded-2xl shadow-xl shadow-slate-200">
                             <ShieldCheck className="w-8 h-8 text-indigo-400" />
                        </div>
                        REDEMPTION <span className="text-indigo-600">AUTH</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-bold uppercase tracking-[0.3em] text-[10px] sm:text-xs">
                        TERMINAL SCANNER // SYSTEM_ACCESS_LEVEL: ADMIN
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Auth Terminal */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl relative overflow-hidden group">
                        {/* Scanning Laser Decoration */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[scan_3s_ease-in-out_infinite] opacity-30"></div>
                        
                        <div className="relative mx-auto w-32 h-32 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
                            <div className={`absolute inset-0 rounded-[2.2rem] border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-indigo-500 animate-spin opacity-40 ${status !== 'LOADING' ? 'hidden' : ''}`}></div>
                            <ScanLine className={`w-14 h-14 ${status === 'LOADING' ? 'text-indigo-300' : 'text-indigo-600'}`} />
                        </div>

                        <div className="text-center mb-10">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase mb-2">SIAP AUTHENTIKASI</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tembakkan laser scanner ke smartphone member</p>
                        </div>

                        {useCamera ? (
                            <div className="max-w-md mx-auto relative mb-6 rounded-[2rem] overflow-hidden border-8 border-slate-50 h-72 bg-slate-950 shadow-2xl">
                                <QRScanner 
                                   onScanSuccess={(code) => processQR(code)} 
                                   onClose={() => setUseCamera(false)} 
                                />
                                <div className="absolute inset-0 pointer-events-none border-[1px] border-indigo-500/20"></div>
                            </div>
                        ) : (
                            <div className="max-w-md mx-auto relative mb-6">
                                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                    <Terminal className="w-5 h-5 text-indigo-300" />
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Listening for USB input..."
                                    className="w-full text-center text-xl font-mono tracking-[0.2em] p-6 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all shadow-xl bg-slate-50 text-slate-700 placeholder:text-slate-300"
                                    autoComplete="off"
                                    autoFocus
                                    disabled={status === "LOADING"}
                                />
                                <div className="mt-4 flex items-center justify-center gap-4">
                                     <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                                     <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Scanner Input Active</span>
                                </div>
                            </div>
                        )}

                        {/* Status Feedback */}
                        {status === "SUCCESS" && (
                            <div className="mt-10 p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] flex items-center gap-6 animate-in zoom-in-95 duration-300">
                                <div className="p-4 bg-white rounded-2xl shadow-lg border border-emerald-100">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="font-black text-emerald-800 text-xl tracking-tighter uppercase">ACCESS GRANTED</p>
                                    <p className="text-sm text-emerald-600 font-bold">{message}</p>
                                </div>
                            </div>
                        )}

                        {status === "ERROR" && (
                            <div className="mt-10 p-6 bg-rose-50 border-2 border-rose-100 rounded-[2rem] flex items-center gap-6 animate-in shake duration-300">
                                <div className="p-4 bg-white rounded-2xl shadow-lg border border-rose-100">
                                    <XCircle className="w-10 h-10 text-rose-500" />
                                </div>
                                <div>
                                    <p className="font-black text-rose-800 text-xl tracking-tighter uppercase">ACCESS DENIED</p>
                                    <p className="text-sm text-rose-600 font-bold">{message}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                             <Orbit className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:rotate-45 transition-transform" />
                             <h3 className="text-sm font-black uppercase tracking-widest opacity-80 mb-6 flex items-center gap-2">
                                <HelpCircle className="w-4 h-4" /> Bantuan Accounting
                             </h3>
                             <p className="text-xs leading-relaxed font-bold opacity-90">
                                Setiap penukaran poin akan otomatis memotong stok inventory dan mencatat HPP sebagai Biaya Marketing pada laporan laba rugi owner.
                             </p>
                        </div>
                        <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
                             <Terminal className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                             <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
                                <History className="w-4 h-4" /> Last Action System
                             </h3>
                             {lastScan ? (
                                <div className="space-y-2 animate-in fade-in">
                                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">[{lastScan.timestamp}]</p>
                                    <p className="text-xs font-black text-emerald-400 uppercase tracking-tighter">SUCCESS REDEEM</p>
                                    <p className="text-sm font-bold text-white">{lastScan.memberName} baru saja menukar <span className="text-amber-400">{lastScan.rewardName}</span></p>
                                </div>
                             ) : (
                                <p className="text-xs font-medium text-slate-500 italic">Menunggu aktifitas pemindaian...</p>
                             )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Feed & Stats */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl">
                        <h4 className="font-black text-slate-800 text-sm tracking-widest uppercase mb-6 flex items-center gap-3">
                             <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                             Live Instructions
                        </h4>
                        
                        <div className="space-y-6">
                            <InstructionStep icon={User} color="indigo" title="1. Identify Member" desc="Minta Member buka aplikasi HP-nya dan klik 'Tukar Poin'." />
                            <InstructionStep icon={Search} color="amber" title="2. Target QR" desc="Arahkan scanner ke kode QR yang muncul (REDEEM-XXXX)." />
                            <InstructionStep icon={ShoppingBag} color="emerald" title="3. Prepare Item" desc="Jika 'Access Granted', segera berikan item reward ke member." />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-[2rem] p-8 text-white border border-slate-700 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <AlertCircle className="w-20 h-20" />
                        </div>
                        <h4 className="font-black text-indigo-400 text-xs tracking-widest uppercase mb-4">Security Protocol</h4>
                        <p className="text-xs font-bold leading-relaxed opacity-70 mb-6">
                            Token QR bersifat sekali pakai (One-Time-OTP). Jika discan ulang, sistem akan otomatis menolak akses untuk mencegah penipuan ganda.
                        </p>
                        <div className="pt-6 border-t border-slate-700 flex items-center gap-3">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                             <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Auth Server: Online</span>
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
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `}</style>
        </div>
    );
}

function InstructionStep({ icon: Icon, color, title, desc }: any) {
    const colors: any = {
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
    }
    return (
        <div className="flex gap-4 group cursor-default">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all group-hover:scale-110 ${colors[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h5 className="font-black text-slate-800 text-sm tracking-tight mb-1">{title}</h5>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
