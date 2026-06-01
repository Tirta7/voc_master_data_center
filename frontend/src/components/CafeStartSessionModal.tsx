'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, X, Check, Coffee, ArrowRight, Table, QrCode, AlertCircle } from 'lucide-react';
import axios from 'axios';
import QRScanner from './QRScanner';
import { useMqtt } from '@/context/MqttContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface CafeStartSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (customerName: string, memberId?: number) => void;
    tableName: string;
    initialCustomerName?: string;
}


const CafeStartSessionModal: React.FC<CafeStartSessionModalProps> = ({ isOpen, onClose, onStart, tableName, initialCustomerName = '' }) => {
    useBodyScrollLock(isOpen);
    const [customerName, setCustomerName] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [member, setMember] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleScanSuccess = async (decodedText: string) => {
        let memberCode = decodedText;
        let version: number | undefined;

        // 1. Check if it's a Signed Token (New secure format: payload.signature)
        if (decodedText.includes('.')) {
            memberCode = decodedText;
            version = undefined; // Version is inside the token, backend will extract it
        }
        // 2. Check if it's Legacy JSON
        else if (decodedText.startsWith('{')) {
            try {
                const data = JSON.parse(decodedText);
                if (data.type === 'MEMBERSHIP' && data.code) {
                    memberCode = data.code;
                    version = data.v;
                }
            } catch (e) { }
        }

        try {
            const url = version !== undefined
                ? `/members/scan/${encodeURIComponent(memberCode)}?v=${version}`
                : `/members/scan/${encodeURIComponent(memberCode)}`;

            const res = await axios.get(url);
            const memberData = res.data;
            setMember(memberData);
            setCustomerName(memberData.name);
            setIsScanning(false);
        } catch (err: any) {
            console.error('Scan Error:', err);
            const errorMessage = err.response?.data?.message || 'Gagal memproses QR Code. Silakan coba lagi.';
            alert(errorMessage);
        }
    };

    const { subscribe } = useMqtt();
    const memberRef = useRef<any>(null);
    useEffect(() => { memberRef.current = member; }, [member]);

    useEffect(() => {
        return subscribe('billiard/member/+/balance', (data: { memberId: number, balance: number }) => {
            if (memberRef.current && memberRef.current.id === data.memberId) {
                setMember((prev: any) => ({ ...prev, balance: data.balance }));
            }
        });
    }, [subscribe]);

    useEffect(() => {
        if (isOpen) {
            setCustomerName(initialCustomerName);
            setMember(null);
            setIsLoading(false);
        }
    }, [isOpen, initialCustomerName]);

    if (!isOpen) return null;

    const isBalanceSufficient = !member || Number(member.balance) > 0;

    const handleConfirm = async () => {
        if (customerName.trim() && isBalanceSufficient && !isLoading) {
            setIsLoading(true);
            try {
                await onStart(customerName.trim(), member?.id);
            } catch (error) {
                setIsLoading(false); // Re-enable on error, otherwise parent closes modal
            }
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden overscroll-contain animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 relative">
                {/* Full-screen Loading Overlay for Safety */}
                {isLoading && (
                    <div className="absolute inset-0 z-[110] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-stone-900 font-bold uppercase tracking-widest text-xs sm:text-sm">Membuka Meja...</p>
                    </div>
                )}

                {/* Header Section */}
                <div className="bg-slate-50 px-8 pt-8 pb-6 border-b border-slate-100 relative">
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 hover:shadow-md transition-all active:scale-90"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Coffee className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">Buka Meja Cafe</h2>
                            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] sm:text-[12px] uppercase tracking-widest mt-0.5">
                                <Table className="w-3 h-3" />
                                <span>Meja: <span className="text-indigo-600 font-black">{tableName}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body Section */}
                <div className="p-8 space-y-6">
                    <div className="space-y-3">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Nama Pelanggan <span className="text-rose-400">*</span>
                        </label>

                        <div className={`
                            group relative flex items-center gap-4 p-5 rounded-3xl border-2 transition-all duration-300
                            ${customerName
                                ? 'bg-white border-indigo-100 shadow-xl shadow-indigo-50/50'
                                : 'bg-slate-50 border-slate-100 hover:border-slate-200'}
                            focus-within:border-indigo-500 focus-within:bg-white focus-within:shadow-2xl focus-within:shadow-indigo-100/50
                        `}>
                            <div className={`
                                w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
                                ${customerName ? 'bg-indigo-600 text-white shadow-lg rotate-0 scale-110' : 'bg-white text-slate-300 -rotate-3 border border-slate-100'}
                                group-focus-within:bg-indigo-600 group-focus-within:text-white group-focus-within:rotate-0 group-focus-within:scale-110
                            `}>
                                <User className="w-7 h-7" />
                            </div>

                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Ketik nama tamu..."
                                    className="w-full bg-transparent border-none outline-none font-black text-slate-800 placeholder:text-slate-300 placeholder:font-bold text-xl p-0 uppercase"
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                                />
                                <p className="text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                                    {member ? `MEMBER: ${member.tier?.name || 'REGULAR'}` : (customerName ? 'Tamu sudah terdaftar' : 'Harap isi nama tamu')}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setIsScanning(true)}
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isScanning ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600 hover:bg-indigo-100 shadow-sm border border-indigo-50'}`}
                                    title="Scan QR Member"
                                    type="button"
                                >
                                    <QrCode className="w-6 h-6" />
                                </button>
                            </div>

                            {customerName && (
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-300 border-4 border-white">
                                    <Check className="w-4 h-4" strokeWidth={4} />
                                </div>
                            )}
                        </div>

                        {/* Member Profile Card */}
                        {member && (
                            <div className="p-5 rounded-[2rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-200 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                    <QrCode className="w-24 h-24" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] sm:text-[12px] font-black uppercase tracking-widest border border-white/30">
                                            {member.tier?.name || 'MEMBER'}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] sm:text-[10px] font-bold text-indigo-200 uppercase tracking-widest">ID Member</p>
                                            <p className="font-mono text-xs sm:text-sm font-black">{member.memberCode}</p>
                                        </div>
                                    </div>
                                    <h4 className="text-xl font-black uppercase tracking-tight mb-4">{member.name}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                                            <p className="text-[8px] sm:text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Saldo</p>
                                            <p className="text-sm font-black text-white/90">Rp {Number(member.balance).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                                            <p className="text-[8px] sm:text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Expiry</p>
                                            <p className="text-sm font-black text-white/90">{member.expiryDate ? new Date(member.expiryDate).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Lifetime'}</p>
                                        </div>
                                    </div>

                                    {!isBalanceSufficient && (
                                        <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl flex items-center gap-2 animate-pulse">
                                            <AlertCircle className="w-4 h-4 text-rose-200" />
                                            <p className="text-[10px] sm:text-[12px] font-black text-rose-100 uppercase tracking-tighter">Saldo Rp 0 - Harap Top Up Terlebih Dahulu</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setMember(null)}
                                        className="mt-4 w-full py-3 bg-white text-indigo-600 rounded-xl text-[10px] sm:text-[12px] font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-lg"
                                    >
                                        Hapus Membership
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-500 delay-200">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                            <Table className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm font-bold text-amber-900">Sesi Cafe Baru</p>
                            <p className="text-[10px] sm:text-[12px] text-amber-700 font-medium leading-relaxed opacity-80 uppercase tracking-tight">
                                Transaksi akan dimulai segera setelah nama customer dikonfirmasi.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="px-8 pb-8 pt-2">
                    <button
                        disabled={!customerName.trim() || !isBalanceSufficient || isLoading}
                        onClick={handleConfirm}
                        className={`
                            w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]
                            ${!customerName.trim() || !isBalanceSufficient || isLoading
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5'}
                        `}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>MEMPROSES...</span>
                            </>
                        ) : (
                            <>
                                <span>BUKA MEJA SEKARANG</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase mt-4 tracking-widest">
                        VOC Cafe Management System
                    </p>
                </div>
            </div>

            {isScanning && (
                <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => setIsScanning(false)}
                />
            )}
        </div>
    );
};

export default CafeStartSessionModal;
