'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Users,
    Search,
    ShieldCheck,
    Wallet,
    UserPlus,
    History,
    DollarSign,
    ShieldOff,
    MoreVertical,
    SearchX,
    QrCode,
    CheckCircle2,
    Download,
    RefreshCw,
    Edit2,
    Trash2,
    Award,
    Save,
    Printer,
    Smartphone,
    PlusCircle,
    ArrowUpRight,
    ArrowDownLeft,
    Utensils,
    Trophy,
    Timer,
    Coffee,
    X,
    ExternalLink,
    Monitor,
    Gift,
    Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import QRScanner from '@/components/QRScanner';
import ThermalReceipt from '@/components/ThermalReceipt';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useMqtt } from '@/context/MqttContext';
import { socket } from '@/lib/socket';
import { AnimatePresence, motion } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Tier {
    id: number;
    name: string;
    pointMultiplier?: number;
}

interface Member {
    id: number;
    name: string;
    phone: string;
    rfidUid?: string;
    memberCode: string;
    balance: number;
    isActive: boolean;
    expiryDate?: string;
    tierId?: number;
    tier?: Tier;
    createdAt: string;
    securityVersion: number;
    points: number;
    cardUrl?: string;
}

export default function MembershipPage() {
    const { terminalId: currentTerminalId } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [tiers, setTiers] = useState<Tier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { hasPermission } = useAuth();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [topupAmount, setTopupAmount] = useState(0);
    const [topupPaymentMethod, setTopupPaymentMethod] = useState('CASH');
    const [topupStep, setTopupStep] = useState<'IDLE' | 'SCAN_VALIDATION' | 'INPUT_AMOUNT' | 'SCAN_COMMIT'>('IDLE');
    const [lastTransaction, setLastTransaction] = useState<any>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    const [displayScanUuid, setDisplayScanUuidState] = useState<string | null>(null);
    const displayScanUuidRef = useRef<string | null>(null);
    const setDisplayScanUuid = (uuid: string | null) => {
        displayScanUuidRef.current = uuid;
        setDisplayScanUuidState(uuid);
    };

    const [showLogModal, setShowLogModal] = useState(false);
    const [memberLogs, setMemberLogs] = useState<any[]>([]);
    const [fetchingLogs, setFetchingLogs] = useState(false);
    const handleQrScanTopupRef = useRef<any>(null);

    const [newMember, setNewMember] = useState({
        name: '',
        phone: '',
        balance: 0,
        tierId: '',
        expiryDate: '',
        expiryTemplate: 'never',
        birthDate: ''
    });

    const [registrationResult, setRegistrationResult] = useState<any | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [fetchingCard, setFetchingCard] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { subscribe } = useMqtt();

    useBodyScrollLock(showAddModal || showTopupModal || showReceiptModal || showSuccessModal || showLogModal);

    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            try {
                // Parallelize all initial data fetching
                await Promise.all([
                    fetchMembers(false), // pass false to skip independent loading state
                    fetchTiers(),
                    fetchSettings()
                ]);
            } catch (err) {
                console.error("Initialization failed", err);
            } finally {
                setLoading(false);
            }
        };

        initData();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(res.data);
        } catch (err) {
            console.error('Failed to fetch settings', err);
        }
    };

    const fetchMembers = async (shouldSetLoading = true) => {
        if (shouldSetLoading) setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/members`);
            setMembers(response.data);
        } catch (error) {
            console.error('Failed to fetch members:', error);
        } finally {
            if (shouldSetLoading) setLoading(false);
        }
    };

    const fetchTiers = async () => {
        try {
            const res = await axios.get(`${API_URL}/members/tiers`);
            setTiers(res.data);
        } catch (err) {
            console.error('Failed to fetch tiers', err);
        }
    };

    // ── Real-time Subscriptions (Hybrid: MQTT + WebSockets) ──────────────────
    useEffect(() => {
        const unsubs: (() => void)[] = [];

        // MQTT Channel
        unsubs.push(subscribe('billiard/member/update', () => fetchMembers(false)));
        unsubs.push(subscribe('billiard/member/+/balance', (data: any) => {
            setMembers(prev => prev.map(m => m.id === data.memberId ? { ...m, balance: data.balance } : m));
        }));

        // WebSocket Channel
        const onMemberUpdate = () => fetchMembers(false);
        const onMemberBalance = (data: any) => {
            setMembers(prev => prev.map(m => m.id === data.memberId ? { ...m, balance: data.balance } : m));
        };

        socket.on('memberUpdate', onMemberUpdate);
        socket.on('memberBalanceUpdated', onMemberBalance);

        const onDisplayScanResult = (data: { uuid: string, code: string | null }) => {
            if (displayScanUuidRef.current === data.uuid) {
                if (data.code) {
                    if (handleQrScanTopupRef.current) {
                        handleQrScanTopupRef.current(data.code, true);
                    }
                } else {
                    alert('Scan dibatalkan dari layar Display.');
                }
                setDisplayScanUuid(null);
            }
        };
        socket.on('display_scan_result', onDisplayScanResult);


        return () => {
            unsubs.forEach(u => u());
            socket.off('memberUpdate', onMemberUpdate);
            socket.off('memberBalanceUpdated', onMemberBalance);
            socket.off('display_scan_result', onDisplayScanResult);
        };
    }, [subscribe, topupStep, currentTerminalId]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            let finalExpiry = null;
            if (newMember.expiryTemplate === 'custom') {
                finalExpiry = newMember.expiryDate ? new Date(newMember.expiryDate).toISOString() : null;
            } else if (newMember.expiryTemplate !== 'never') {
                const date = new Date();
                if (newMember.expiryTemplate === '1m') date.setMonth(date.getMonth() + 1);
                if (newMember.expiryTemplate === '6m') date.setMonth(date.getMonth() + 6);
                if (newMember.expiryTemplate === '1y') date.setFullYear(date.getFullYear() + 1);
                finalExpiry = date.toISOString();
            }

            const payload = {
                ...newMember,
                phone: newMember.phone.startsWith('0') ? `62${newMember.phone.substring(1)}` : newMember.phone,
                tierId: newMember.tierId ? Number(newMember.tierId) : undefined,
                expiryDate: finalExpiry
            };

            let response;
            if (selectedMember) {
                response = await axios.patch(`${API_URL}/members/${selectedMember.id}`, payload);
            } else {
                response = await axios.post(`${API_URL}/members`, payload);
            }

            setShowAddModal(false);
            setRegistrationResult(response.data);
            setShowSuccessModal(true);
            fetchMembers();
            setNewMember({ name: '', phone: '', balance: 0, tierId: '', expiryDate: '', expiryTemplate: 'never', birthDate: '' });
            setSelectedMember(null);
        } catch (error) {
            alert('Gagal menyimpan member');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus member ini secara permanen?')) return;
        try {
            await axios.delete(`${API_URL}/members/${id}`);
            fetchMembers();
        } catch (err) {
            alert('Gagal menghapus member');
        }
    };

    const handleRegenerateQr = async (id: number) => {
        if (!confirm('Hasilkan ulang QR Code? QR Code lama tidak akan berlaku lagi untuk alasan keamanan.')) return;
        try {
            const res = await axios.post(`${API_URL}/members/${id}/regenerate-qr`);
            setRegistrationResult(res.data);
            setShowSuccessModal(true);
            fetchMembers();
        } catch (err) {
            alert('Gagal menghasilkan ulang QR');
        }
    };

    const handleTopup = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedMember || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.patch(`${API_URL}/members/${selectedMember.id}/topup`,
                { amount: topupAmount, paymentMethod: topupPaymentMethod },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const updatedMember: Member = res.data.member;
            setLastTransaction(res.data.transaction);
            setShowTopupModal(false);
            setTopupStep('IDLE');
            setShowReceiptModal(true);
            // Update local members state immediately with new balance (no need to wait for socket/fetch)
            setMembers(prev => prev.map(m => m.id === updatedMember.id ? { ...m, balance: updatedMember.balance } : m));
            setSelectedMember(updatedMember);
            fetchMembers();
            setTopupAmount(0);
            setTopupPaymentMethod('CASH');

            // Emit to display for success notification
            socket.emit('display_topup_success', {
                memberName: updatedMember.name,
                amount: topupAmount,
                method: topupPaymentMethod,
                newBalance: updatedMember.balance
            });
        } catch (error) {
            alert('Gagal topup saldo');
            setTopupStep('INPUT_AMOUNT');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchMemberLogs = async (member: Member) => {
        setFetchingLogs(true);
        setSelectedMember(member);
        setShowLogModal(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/members/${member.id}/logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMemberLogs(res.data);
        } catch (err) {
            console.error('Failed to fetch logs', err);
        } finally {
            setFetchingLogs(false);
        }
    };

    const downloadQRCode = () => {
        if (!registrationResult) return;
        const svg = document.getElementById('member-qr-code') as unknown as SVGGraphicsElement;
        if (!svg) return;

        const canvas = document.createElement('canvas');
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            canvas.width = 1000; // High res
            canvas.height = 1000;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 50, 50, 900, 900);

                // Add member info text at bottom
                ctx.fillStyle = '#4f46e5'; // Indigo-600
                ctx.font = 'bold 40px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(registrationResult.name.toUpperCase(), 500, 920);
                ctx.font = 'bold 30px monospace';
                ctx.fillText(registrationResult.memberCode, 500, 970);

                const pngUrl = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.href = pngUrl;
                downloadLink.download = `QR_Member_${registrationResult.name.replace(/\s+/g, '_')}_${registrationResult.memberCode}.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
            URL.revokeObjectURL(url);
        };
        img.src = url;
    };

    const handleQrScanTopup = async (decodedText: string, isFromDisplay = false) => {
        if (!decodedText || isSubmitting) return;

        if (decodedText.startsWith('REDEEM-')) {
            setIsSubmitting(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.post(`${API_URL}/loyalty/redeem/confirm`, { 
                    redeemToken: decodedText
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert(`Redeem Berhasil! ${res.data.itemName} untuk ${res.data.memberName}`);
                fetchMembers(false);
                return;
            } catch (err: any) {
                alert(err.response?.data?.message || 'Gagal konfirmasi redeem.');
                return;
            } finally {
                setIsSubmitting(false);
            }
        }

        let memberCode = decodedText;
        let version: number | undefined;

        // 1. Check if it's a Signed Token (New secure format: payload.signature)
        if (decodedText.includes('.')) {
            memberCode = decodedText;
            version = undefined;
        }
        // 2. Check if it's Legacy JSON
        else if (decodedText.startsWith('{')) {
            try {
                const data = JSON.parse(decodedText);
                if (data.type === 'MEMBERSHIP' && data.code) {
                    memberCode = data.code;
                    version = data.v;
                }
            } catch (e) {
                // Not valid JSON, use raw text
            }
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const url = version !== undefined
                ? `${API_URL}/members/scan/${encodeURIComponent(memberCode)}?v=${version}`
                : `${API_URL}/members/scan/${encodeURIComponent(memberCode)}`;

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const foundMember = res.data;

            if (topupStep === 'SCAN_COMMIT') {
                if (selectedMember && foundMember.id === selectedMember.id) {
                    handleTopup();
                } else {
                    alert('QR Code tidak cocok dengan member yang sedang di-topup.');
                }
            } else if (topupStep === 'SCAN_VALIDATION' || isFromDisplay) {
                if (!isFromDisplay && selectedMember && foundMember.id !== selectedMember.id) {
                    alert(`QR Code ini milik ${foundMember.name.toUpperCase()}, bukan ${selectedMember.name.toUpperCase()}. Silakan scan QR yang sesuai.`);
                    setIsSubmitting(false);
                    return;
                }
                setSelectedMember(foundMember);
                setTopupStep('INPUT_AMOUNT');
                if (isFromDisplay) setShowTopupModal(true);
            }
        } catch (err: any) {
            console.error('Scan Error:', err);
            const errorMessage = err.response?.data?.message || 'Gagal memproses QR Code. Silakan coba lagi.';
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        handleQrScanTopupRef.current = handleQrScanTopup;
    }, [handleQrScanTopup]);

    const filteredMembers = members.filter(m =>
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.memberCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone?.includes(searchTerm.toLowerCase())
    );

    if (!hasPermission('MEMBER_VIEW')) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-rose-100 shadow-xl shadow-rose-100/50">
                    <ShieldOff className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Akses Terbatas</h2>
                <p className="text-slate-500 max-w-sm font-medium">Anda tidak memiliki izin untuk melihat data membership.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/40">
            <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-8">

                <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    .print-area, .print-area * {
                        visibility: visible !important;
                    }
                    .print-area {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        z-index: 9999 !important;
                    }
                }
            `}</style>

                {/* ── Hero Header ── */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200">
                    {/* BG decoration */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />

                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Management System</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Membership</h1>
                            <p className="text-white/60 text-sm font-semibold mt-1">Kelola loyalitas & royalty tier pelanggan</p>
                            {/* Quick stats in header */}
                            <div className="flex flex-wrap gap-3 mt-5">
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    👥 {members.length} Member
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    ✅ {members.filter(m => m.isActive).length} Aktif
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    💰 Rp {(members.reduce((a, c) => a + Number(c.balance), 0)).toLocaleString('id-ID')}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            {hasPermission('MEMBER_MANAGE') && (
                                <Link href="/admin/members/tiers"
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-5 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all text-xs border border-white/20">
                                    <Award className="w-4 h-4" /> KELOLA TIER
                                </Link>
                            )}
                            {hasPermission('MEMBER_TOPUP') && (
                                <button
                                    onClick={() => {
                                        const uuid = Math.random().toString(36).substring(7);
                                        setDisplayScanUuid(uuid);
                                        socket.emit('request_display_scan', { uuid, type: 'CHECK_BALANCE' });
                                    }}
                                    className="bg-white/20 hover:bg-indigo-500/80 backdrop-blur-sm text-white px-5 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all text-xs border border-white/20 active:scale-95 shadow-lg shadow-indigo-900/30">
                                    <Monitor className="w-4 h-4" /> SCAN DISPLAY
                                </button>
                            )}
                            {hasPermission('MEMBER_MANAGE') && (
                                <button
                                    onClick={() => { setSelectedMember(null); setNewMember({ name: '', phone: '', balance: 0, tierId: '', expiryDate: '', expiryTemplate: 'never', birthDate: '' }); setShowAddModal(true); }}
                                    className="bg-white text-indigo-700 px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30 active:scale-95 text-xs hover:shadow-xl">
                                    <UserPlus className="w-4 h-4" /> TAMBAH MEMBER
                                </button>
                            )}
                        </div>
                    </div>
                </div>


                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Member', value: members.length, icon: '👥', gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' },
                        { label: 'Member Aktif', value: members.filter(m => m.isActive).length, icon: '✅', gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700' },
                        { label: 'Total Saldo E-Wallet', value: `Rp ${(members.reduce((a, c) => a + Number(c.balance), 0)).toLocaleString('id-ID')}`, icon: '💰', gradient: 'from-amber-500 to-orange-500', light: 'bg-amber-50', text: 'text-amber-700' },
                        { label: 'Kategori Tier', value: tiers.length, icon: '🏆', gradient: 'from-purple-500 to-purple-600', light: 'bg-purple-50', text: 'text-purple-700' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-100 shadow-lg shadow-slate-100/60 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 ${s.light} rounded-2xl flex items-center justify-center text-lg`}>{s.icon}</div>
                                <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${s.gradient}`} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className={`text-xl lg:text-2xl font-black ${s.text} leading-tight`}>{s.value}</p>
                        </div>
                    ))}
                </div>


                {/* ── Member Table ── */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/60 border border-slate-100 overflow-hidden">
                    {/* Table toolbar */}
                    <div className="p-5 lg:p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="relative w-full sm:max-w-sm">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Cari nama, ID, atau HP..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-300 font-semibold text-slate-900 text-sm outline-none transition-all"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        {/* Tier filter pills */}
                        <div className="flex gap-2 overflow-x-auto pb-0.5 flex-nowrap">
                            <button onClick={() => setSearchTerm('')}
                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${searchTerm === '' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-indigo-300'
                                    }`}>Semua</button>
                            {tiers.map(t => (
                                <button key={t.id} onClick={() => setSearchTerm(t.name)}
                                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${searchTerm === t.name ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-indigo-300'
                                        }`}>{t.name}</button>
                            ))}
                        </div>
                    </div>


                    {loading ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-50">
                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                            <th key={i} className="px-10 py-6 text-left text-[10px] font-black text-slate-200 uppercase tracking-widest">
                                                <div className="h-2 w-16 bg-slate-100 rounded animate-skeleton" />
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <tr key={i}>
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-100 rounded-xl animate-skeleton" />
                                                    <div className="space-y-2">
                                                        <div className="h-3 w-32 bg-slate-100 rounded animate-skeleton" />
                                                        <div className="h-2 w-20 bg-slate-100 rounded animate-skeleton" />
                                                    </div>
                                                </div>
                                            </td>
                                            {[1, 2, 3, 4, 5].map(j => (
                                                <td key={j} className="px-10 py-6">
                                                    <div className="h-3 w-20 bg-slate-100 rounded animate-skeleton" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full hidden lg:table">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-50">
                                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Profil</th>
                                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo</th>
                                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Poin Royalty</th>
                                        <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredMembers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                <SearchX className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold">Member tidak ditemukan</p>
                                            </td>
                                        </tr>
                                    ) : filteredMembers.map((member) => (
                                        <tr key={member.id} className="group hover:bg-slate-50/70 transition-all">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div className="cursor-pointer group/name" onClick={() => fetchMemberLogs(member)}>
                                                        <p className="font-extrabold text-slate-900 leading-none mb-1 group-hover/name:text-indigo-600 transition-colors uppercase tracking-tight">{member.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg inline-block">{member.memberCode}</p>
                                                            <p className="text-[10px] font-bold text-slate-400">{member.phone}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="font-black text-[10px] text-slate-600 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-widest">
                                                    {member.tier?.name || 'REGULER'}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`w-fit px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${member.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                        {member.isActive ? 'AKTIF' : 'INAKTIF'}
                                                    </span>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Exp: {member.expiryDate ? new Date(member.expiryDate).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}</p>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 font-black text-indigo-600">Rp {Number(member.balance).toLocaleString()}</td>
                                            <td className="px-10 py-6 font-black text-amber-600">{Math.round(member.points || 0)} pts</td>
                                            <td className="px-10 py-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    {hasPermission('MEMBER_TOPUP') && (
                                                        <button onClick={() => { 
                                                            setSelectedMember(member); 
                                                            setTopupStep('SCAN_VALIDATION'); 
                                                            setShowTopupModal(true); 
                                                            // Trigger scan on display too
                                                            const uuid = Math.random().toString(36).substring(7);
                                                            setDisplayScanUuid(uuid);
                                                            socket.emit('request_display_scan', { uuid, type: 'TOPUP_VALIDATION' });
                                                        }} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shadow-sm active:scale-90" title="Topup Saldo">
                                                            <DollarSign className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        disabled={fetchingCard}
                                                        onClick={async () => {
                                                            setFetchingCard(true);
                                                            try {
                                                                const token = localStorage.getItem('token');
                                                                const res = await axios.get(`${API_URL}/members/${member.id}/card-url`, {
                                                                    headers: { Authorization: `Bearer ${token}` }
                                                                });
                                                                setRegistrationResult({ ...member, cardUrl: res.data.cardUrl });
                                                                setShowSuccessModal(true);
                                                            } catch (err) {
                                                                alert('Gagal memuat kartu member');
                                                            } finally {
                                                                setFetchingCard(false);
                                                            }
                                                        }}
                                                        className={`p-2 rounded-xl transition-all border shadow-sm active:scale-90 ${fetchingCard ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border-indigo-100'}`}
                                                        title="Lihat QR Code"
                                                    >
                                                        {fetchingCard ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                                                    </button>
                                                    <Link href={`/member/dashboard?id=${member.id}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all border border-purple-100 shadow-sm active:scale-90" title="Buka Portal Member">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Link>
                                                    <button onClick={() => {
                                                        setSelectedMember(member);
                                                        setNewMember({
                                                            ...member,
                                                            tierId: member.tierId?.toString() || '',
                                                            expiryTemplate: member.expiryDate ? 'custom' : 'never',
                                                            expiryDate: member.expiryDate ? new Date(member.expiryDate).toISOString().slice(0, 16) : '',
                                                            phone: member.phone.startsWith('62') ? `0${member.phone.substring(2)}` : member.phone
                                                        } as any);
                                                        setShowAddModal(true);
                                                    }} className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all border border-slate-100 shadow-sm active:scale-90" title="Edit Data">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <div className="relative group/more">
                                                        <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-200 transition-all border border-slate-100">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-[1.25rem] shadow-2xl border border-slate-100 overflow-hidden opacity-0 invisible group-hover/more:opacity-100 group-hover/more:visible transition-all z-20 translate-y-2 group-hover/more:translate-y-0 text-left">
                                                            <button onClick={() => handleRegenerateQr(member.id)} className="w-full text-left px-5 py-3.5 text-[10px] font-black text-amber-600 hover:bg-amber-50 flex items-center gap-3 uppercase tracking-widest transition-colors">
                                                                <RefreshCw className="w-4 h-4" /> Regenerasi QR
                                                            </button>
                                                            <button onClick={() => handleDelete(member.id)} className="w-full text-left px-5 py-3.5 text-[10px] font-black text-rose-600 hover:bg-rose-50 flex items-center gap-3 uppercase tracking-widest transition-colors border-t border-slate-50">
                                                                <Trash2 className="w-4 h-4" /> Hapus Member
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Mobile List View */}
                            <div className="lg:hidden p-4 space-y-4">
                                {filteredMembers.map((member) => (
                                    <div key={member.id} className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                                        <div className="flex justify-between items-start" onClick={() => fetchMemberLogs(member)}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black">{member.name.charAt(0)}</div>
                                                <div>
                                                    <p className="font-black text-slate-900 leading-tight uppercase">{member.name}</p>
                                                    <p className="text-[10px] font-black text-indigo-600">{member.memberCode}</p>
                                                </div>
                                            </div>
                                            <span className="font-black text-[8px] bg-slate-100 px-2 py-0.5 rounded uppercase">{member.tier?.name || 'REGULER'}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                disabled={fetchingCard}
                                                onClick={async () => {
                                                    setFetchingCard(true);
                                                    try {
                                                        const token = localStorage.getItem('token');
                                                        const res = await axios.get(`${API_URL}/members/${member.id}/card-url`, {
                                                            headers: { Authorization: `Bearer ${token}` }
                                                        });
                                                        setRegistrationResult({ ...member, cardUrl: res.data.cardUrl });
                                                        setShowSuccessModal(true);
                                                    } catch (err) {
                                                        alert('Gagal memuat kartu member');
                                                    } finally {
                                                        setFetchingCard(false);
                                                    }
                                                }}
                                                className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 py-3 rounded-xl text-[10px] font-black uppercase disabled:opacity-50"
                                            >
                                                {fetchingCard ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />} QR Code
                                            </button>
                                            <button onClick={() => { 
                                                setSelectedMember(member); 
                                                setTopupStep('SCAN_VALIDATION'); 
                                                setShowTopupModal(true); 
                                                // Trigger scan on display too
                                                const uuid = Math.random().toString(36).substring(7);
                                                setDisplayScanUuid(uuid);
                                                socket.emit('request_display_scan', { uuid, type: 'TOPUP_VALIDATION' });
                                            }} className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-black uppercase">
                                                <Wallet className="w-3.5 h-3.5" /> Topup
                                            </button>
                                            <Link href={`/member/dashboard?id=${member.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-purple-50 text-purple-600 py-3 rounded-xl text-[10px] font-black uppercase col-span-2">
                                                <ExternalLink className="w-3.5 h-3.5" /> Buka Portal Member
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modals */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e => { if (e.target === e.currentTarget) { setShowAddModal(false); setSelectedMember(null); } }}>
                        <div className="bg-white rounded-t-[2rem] sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

                            {/* Gradient Header */}
                            <div className={`p-6 text-white bg-gradient-to-br ${selectedMember ? 'from-slate-700 to-indigo-800' : 'from-indigo-600 to-purple-700'} flex-shrink-0`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.3em]">{selectedMember ? 'Edit Member' : 'Pendaftaran Baru'}</p>
                                        <h2 className="text-xl font-black mt-0.5">{selectedMember ? selectedMember.name : 'Member Baru'}</h2>
                                    </div>
                                    <button type="button" onClick={() => { setShowAddModal(false); setSelectedMember(null); }} className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Form Body */}
                            <div className="overflow-y-auto flex-1">
                                <form id="member-form" onSubmit={handleAddMember} className="p-6 space-y-5">

                                    {/* Nama & WhatsApp */}
                                    <div className="grid grid-cols-1 gap-4">
                                        <InputField label="Nama Lengkap" value={newMember.name} onChange={v => setNewMember({ ...newMember, name: v })} placeholder="Andi Wijaya" required />
                                        <InputField label="WhatsApp (Aktif)" value={newMember.phone} onChange={v => setNewMember({ ...newMember, phone: v })} placeholder="081234..." required />
                                        <InputField label="Tanggal Lahir (untuk Birthday Reward)" type="date" value={(newMember as any).birthDate || ''} onChange={v => setNewMember({ ...newMember, birthDate: v } as any)} />
                                    </div>

                                    {/* Saldo Awal — hanya saat create */}
                                    {!selectedMember && (
                                        <InputField label="Saldo Awal (Rp)" type="number" value={newMember.balance === 0 ? '' : newMember.balance} onChange={v => setNewMember({ ...newMember, balance: Number(v) })} placeholder="0" />
                                    )}

                                    {/* Kategori Member — Visual tier cards */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Kategori Member *</label>
                                        {tiers.length === 0 ? (
                                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                                                <p className="text-amber-600 font-black text-[10px] uppercase tracking-widest">⚠️ Belum ada tier terdaftar.</p>
                                                <p className="text-amber-500 text-[9px] font-bold mt-0.5">Buat tier di Kategori Member terlebih dahulu.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {/* No tier option */}
                                                <button type="button" onClick={() => setNewMember({ ...newMember, tierId: '' })}
                                                    className={`p-3.5 rounded-2xl border-2 text-left transition-all ${newMember.tierId === '' ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-300'}`}>
                                                    <p className="text-sm">🚫</p>
                                                    <p className="font-black text-[10px] uppercase mt-1">Tanpa Tier</p>
                                                </button>
                                                {tiers.map(t => {
                                                    const tierColors: Record<string, string> = {
                                                        PLATINUM: 'from-slate-800 to-indigo-900',
                                                        GOLD: 'from-amber-500 to-yellow-400',
                                                        SILVER: 'from-slate-400 to-slate-600',
                                                        BRONZE: 'from-orange-500 to-amber-700',
                                                    };
                                                    const tierIcons: Record<string, string> = { PLATINUM: '💎', GOLD: '🥇', SILVER: '🥈', BRONZE: '🥉' };
                                                    const gradient = tierColors[t.name?.toUpperCase()] || 'from-indigo-600 to-purple-700';
                                                    const icon = tierIcons[t.name?.toUpperCase()] || '⭐';
                                                    const isSelected = String(newMember.tierId) === String(t.id);
                                                    return (
                                                        <button type="button" key={t.id} onClick={() => setNewMember({ ...newMember, tierId: String(t.id) })}
                                                            className={`p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${isSelected ? 'border-transparent shadow-lg' : 'border-slate-100 bg-slate-50 hover:border-indigo-200'}`}>
                                                            {isSelected && <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-100`} />}
                                                            <div className="relative">
                                                                <p className="text-sm">{icon}</p>
                                                                <p className={`font-black text-[10px] uppercase mt-1 ${isSelected ? 'text-white' : 'text-slate-700'}`}>{t.name}</p>
                                                                {(t.pointMultiplier ?? 0) > 1 && <p className={`text-[8px] font-bold ${isSelected ? 'text-white/70' : 'text-indigo-500'}`}>×{t.pointMultiplier} POIN</p>}
                                                                {(t as any).autoUpgradeSpend && <p className={`text-[8px] font-bold ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>Auto ≥Rp{((t as any).autoUpgradeSpend / 1_000_000).toFixed(0)}Jt</p>}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Masa Berlaku */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Masa Berlaku</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[{ id: '1m', label: '1 Bulan', icon: '📅' }, { id: '6m', label: '6 Bulan', icon: '📆' }, { id: '1y', label: '1 Tahun', icon: '🗓️' }, { id: 'custom', label: 'Kustom', icon: '✏️' }, { id: 'never', label: 'Selamanya', icon: '♾️' }].map(t => (
                                                <button key={t.id} type="button" onClick={() => setNewMember({ ...newMember, expiryTemplate: t.id })}
                                                    className={`py-3 px-2 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1 border-2 ${newMember.expiryTemplate === t.id
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-indigo-300'
                                                        }`}>
                                                    <span className="text-base">{t.icon}</span>{t.label}
                                                </button>
                                            ))}
                                        </div>
                                        {newMember.expiryTemplate === 'custom' && (
                                            <div className="mt-3">
                                                <InputField label="Tanggal Berakhir" type="datetime-local" value={newMember.expiryDate} onChange={v => setNewMember({ ...newMember, expiryDate: v })} required />
                                            </div>
                                        )}
                                    </div>

                                </form>
                            </div>

                            {/* Footer Buttons */}
                            <div className="p-5 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-slate-50/50">
                                <button type="button" onClick={() => { setShowAddModal(false); setSelectedMember(null); }}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-2 border-slate-100 rounded-2xl hover:border-slate-300 transition-all disabled:opacity-50">
                                    BATAL
                                </button>
                                <button form="member-form" type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-gradient-to-br from-indigo-600 to-purple-700 text-white py-3.5 px-8 rounded-2xl font-black text-[10px] shadow-lg shadow-indigo-200 active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-80">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN DATA'}
                                </button>
                            </div>
                            {isSubmitting && (
                                <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-[200]">
                                    <div className="bg-slate-900/90 text-white px-6 py-4 rounded-3xl flex items-center gap-3 shadow-2xl animate-in zoom-in-95 duration-200">
                                        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                                        <span className="text-xs font-black uppercase tracking-widest">Memproses...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showTopupModal && (topupStep !== 'IDLE') && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain">
                        <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md p-8 lg:p-10 shadow-3xl animate-in fade-in slide-in-from-bottom-full sm:zoom-in duration-300 text-center relative overflow-hidden max-h-[95vh] sm:max-h-none">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-600"></div>
                            {topupStep === 'SCAN_VALIDATION' && (
                                <div className="space-y-6">
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100"><QrCode className="w-8 h-8" /></div>
                                    <h2 className="text-2xl font-black text-slate-900">Validasi Member</h2>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Scan QR Code member untuk memulai Top-up</p>
                                    <div className="h-64 rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 relative"><QRScanner onScanSuccess={handleQrScanTopup} onClose={() => { setShowTopupModal(false); setTopupStep('IDLE'); }} /></div>
                                    <button type="button" onClick={() => { setShowTopupModal(false); setTopupStep('IDLE'); }} className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-2 border-slate-100 rounded-2xl">BATALKAN</button>
                                </div>
                            )}
                            {topupStep === 'INPUT_AMOUNT' && selectedMember && (
                                <div className="space-y-6">
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100"><Wallet className="w-8 h-8" /></div>
                                    <h2 className="text-2xl font-black text-slate-900">Input Nominal</h2>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Member: {selectedMember.name}</p>

                                    {/* Inactive Member Warning */}
                                    {!selectedMember.isActive && (
                                        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-left">
                                            <ShieldOff className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Member Tidak Aktif</p>
                                                <p className="text-[10px] font-bold text-rose-500 mt-1">Member ini sudah tidak aktif. Top-up tidak akan diproses oleh sistem.</p>
                                            </div>
                                        </div>
                                    )}

                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        if (topupAmount < 1000) {
                                            alert('Nominal top-up minimum Rp 1.000');
                                            return;
                                        }
                                        if (topupAmount > 5_000_000) {
                                            alert('Nominal top-up maksimum Rp 5.000.000 per transaksi');
                                            return;
                                        }
                                        setTopupStep('SCAN_COMMIT');

                                        // Trigger scan on display again for commitment
                                        const uuid = Math.random().toString(36).substring(7);
                                        setDisplayScanUuid(uuid);
                                        socket.emit('request_display_scan', { uuid, type: 'TOPUP_COMMITMENT' });
                                    }} className="space-y-6 mt-4 text-left">
                                        <InputField label="Jumlah Topup" type="number" value={topupAmount === 0 ? '' : topupAmount} onChange={v => setTopupAmount(Number(v))} className="!text-3xl !font-black !text-emerald-600 !text-center !py-6 font-sans" required autoFocus />
                                        {topupAmount > 0 && (
                                            <p className="text-center text-[10px] font-black text-slate-400 -mt-4">
                                                = <span className="text-slate-700">Rp {topupAmount.toLocaleString('id-ID')}</span>
                                            </p>
                                        )}
                                        <div className="grid grid-cols-3 gap-2">
                                            {[20000, 50000, 100000, 200000, 500000, 1000000].map(amt => (
                                                <button key={amt} type="button" onClick={() => setTopupAmount(amt)} className={`py-2.5 rounded-xl text-[10px] font-black transition-all border ${topupAmount === amt ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-slate-50 hover:bg-indigo-600 hover:text-white border-slate-100'}`}>
                                                    {amt >= 1000000 ? `${amt / 1000000} Jt` : amt >= 1000 ? `${amt / 1000}K` : amt.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="space-y-2 mt-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Metode Pembayaran</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(settings?.availablePaymentMethods || ['CASH', 'DEBIT', 'TRANSFER', 'QRIS']).map((m: string) => (
                                                    <button key={m} type="button" onClick={() => setTopupPaymentMethod(m)} className={`p-3 rounded-xl text-[10px] font-black transition-all border ${topupPaymentMethod === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-indigo-600'}`}>{m}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            <button type="button" onClick={() => { setTopupStep('SCAN_VALIDATION'); setSelectedMember(null); }} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">KEMBALI</button>
                                            <button type="submit" disabled={!selectedMember.isActive} className="flex-2 bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] shadow-lg shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">LANJUTKAN SCAN</button>
                                        </div>
                                    </form>
                                </div>
                            )}
                            {topupStep === 'SCAN_COMMIT' && selectedMember && (
                                <div className="space-y-6">
                                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100"><RefreshCw className="w-8 h-8" /></div>
                                    <h2 className="text-2xl font-black text-slate-900">Konfirmasi Sinkron</h2>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Scan QR member sekali lagi untuk sinkronisasi saldo</p>
                                    <div className="h-64 rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 relative"><QRScanner onScanSuccess={handleQrScanTopup} onClose={() => setTopupStep('INPUT_AMOUNT')} /></div>
                                    <div className="p-4 bg-slate-50 rounded-2xl text-left border border-slate-100 space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ringkasan Top-up</p>
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Member</span><span className="font-black text-slate-900">{selectedMember.name}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Metode</span><span className="font-black text-indigo-600 uppercase">{topupPaymentMethod}</span></div>
                                        <div className="h-px bg-slate-200" />
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Nominal</span><span className="font-black text-emerald-600 text-lg">Rp {topupAmount.toLocaleString('id-ID')}</span></div>
                                    </div>
                                    <button type="button" onClick={() => setTopupStep('INPUT_AMOUNT')} className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-2 border-slate-100 rounded-2xl">KEMBALI</button>
                                 </div>
                             )}

                            {/* Safety overlay for Topup process */}
                            {isSubmitting && (
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-[200]">
                                    <div className="bg-slate-900/90 text-white px-8 py-6 rounded-[2.5rem] flex flex-col items-center gap-4 shadow-3xl animate-in zoom-in-95 duration-300">
                                        <div className="relative">
                                            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                            <Wallet className="w-5 h-5 text-white absolute inset-0 m-auto" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black uppercase tracking-[0.2em]">Sinkronisasi Saldo</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Harap Tunggu Sebentar...</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showReceiptModal && lastTransaction && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain">
                        <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md p-8 lg:p-10 shadow-3xl animate-in fade-in slide-in-from-bottom-full sm:zoom-in duration-300 text-center relative overflow-hidden max-h-[95vh] sm:max-h-none">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-100 shadow-sm"><CheckCircle2 className="w-10 h-10" /></div>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">Top-up Berhasil!</h2>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Saldo telah tersinkronisasi</p>
                            <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-3">
                                <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nama Member</span><span className="font-black text-slate-900 truncate ml-2">{(lastTransaction.customerName || 'MEMBER').toUpperCase()}</span></div>
                                <div className="h-px bg-slate-200" />
                                {lastTransaction.paymentDetails?.[0]?.method && (
                                    <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Metode</span><span className="font-black text-indigo-600 uppercase">{lastTransaction.paymentDetails[0].method}</span></div>
                                )}
                                <div className="h-px bg-slate-200" />
                                <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nominal Top-up</span><span className="font-black text-emerald-600 text-xl">Rp {Number(lastTransaction.grandTotal).toLocaleString('id-ID')}</span></div>
                                {lastTransaction.member && (
                                    <><div className="h-px bg-slate-200" /><div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Saldo Baru</span><span className="font-black text-indigo-600">Rp {Number(lastTransaction.member.balance).toLocaleString('id-ID')}</span></div></>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <button onClick={() => { setShowReceiptModal(false); setLastTransaction(null); }} className="w-full py-4 bg-slate-50 text-slate-500 font-black rounded-2xl text-[10px] hover:bg-slate-100 active:scale-95 transition-all uppercase tracking-widest">SELESAI</button>
                                <button onClick={() => window.print()} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest"><Printer className="w-4 h-4" /> CETAK STRUK</button>
                            </div>
                            <div className="print-area hidden"><ThermalReceipt tx={lastTransaction} settings={settings} /></div>
                        </div>
                    </div>
                )}

                {showSuccessModal && registrationResult && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[101] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain">
                        <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-md p-8 lg:p-10 shadow-3xl animate-in fade-in slide-in-from-bottom-full sm:zoom-in duration-300 text-center relative overflow-hidden max-h-[95vh] sm:max-h-none">
                            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-100"><CheckCircle2 className="w-8 h-8" /></div>
                            <h2 className="text-2xl font-black text-slate-900">Member ID Generated</h2>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1 mb-8">Pendaftaran Berhasil</p>

                            <div className="bg-slate-50 p-2 rounded-[2rem] border-2 border-slate-100 flex flex-col items-center justify-center mb-8 shadow-inner overflow-hidden">
                                {registrationResult.cardUrl ? (
                                    <img
                                        src={registrationResult.cardUrl}
                                        alt="Membership Card"
                                        className="w-full h-auto rounded-xl shadow-sm"
                                        onError={(e) => {
                                            // Fallback if card image fails to load
                                            e.currentTarget.style.display = 'none';
                                            const parent = e.currentTarget.parentElement;
                                            if (parent) {
                                                const fallback = document.createElement('div');
                                                fallback.className = 'p-8 text-slate-400 font-bold text-xs uppercase';
                                                fallback.innerText = 'Gagal memuat kartu';
                                                parent.appendChild(fallback);
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="p-8 text-slate-400 font-bold text-xs uppercase">Kartu tidak tersedia</div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-3 mb-3">
                                <button
                                    onClick={async () => {
                                        if (registrationResult.cardUrl) {
                                            try {
                                                const response = await fetch(registrationResult.cardUrl);
                                                const blob = await response.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.download = `Card_Member_${registrationResult.name.replace(/\s+/g, '_')}.png`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                window.URL.revokeObjectURL(url);
                                            } catch (err) {
                                                console.error('Download failed', err);
                                                const link = document.createElement('a');
                                                link.href = registrationResult.cardUrl;
                                                link.download = `Card_Member_${registrationResult.name.replace(/\s+/g, '_')}.png`;
                                                link.target = '_blank';
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }
                                        } else {
                                            downloadQRCode();
                                        }
                                    }}
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] hover:bg-slate-800 transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg"
                                >
                                    <Download className="w-4 h-4" /> DOWNLOAD KARTU (PNG)
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <button onClick={() => setShowSuccessModal(false)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 active:scale-95 transition-all text-[10px] uppercase tracking-widest">TUTUP</button>
                            </div>
                        </div>
                    </div>
                )}

                {showLogModal && selectedMember && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain">
                        <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-2xl shadow-3xl animate-in fade-in slide-in-from-bottom-full sm:zoom-in duration-300 max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                            <header className="p-8 pb-4 flex justify-between items-start sticky top-0 bg-white z-10">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Riwayat Aktivitas</h2>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                                        Member: {selectedMember.name}
                                    </p>
                                </div>
                                <button onClick={() => setShowLogModal(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all font-black border border-slate-100">X</button>
                            </header>

                            {/* Summary Header */}
                            {!fetchingLogs && memberLogs.length > 0 && (
                                <div className="px-8 mb-6">
                                    <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Top-up</p>
                                            <p className="text-sm font-black text-emerald-600">
                                                + Rp {memberLogs.filter(l => l.type === 'TOPUP').reduce((s, l) => s + Number(l.grandTotal), 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right border-l border-slate-200 pl-4">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pengeluaran</p>
                                            <p className="text-sm font-black text-rose-600">
                                                - Rp {memberLogs.filter(l => l.type !== 'TOPUP').reduce((s, l) => s + Number(l.grandTotal), 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                                {fetchingLogs ? (
                                    <div className="py-20 text-center">
                                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="font-black text-indigo-600 uppercase tracking-widest text-[10px]">Sinkronisasi Data...</p>
                                    </div>
                                ) : memberLogs.length === 0 ? (
                                    <div className="py-24 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border-2 border-slate-100/50">
                                            <History className="w-10 h-10 text-slate-200" />
                                        </div>
                                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Belum ada aktivitas tercatat</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {memberLogs.map((log) => {
                                            const isTopup = log.type === 'TOPUP';
                                            const isBilliard = log.type === 'BILLIARD' || !!log.tableId;
                                            const isCafe = log.type === 'CAFE' || (!log.tableId && !!log.cafeTableId);

                                            return (
                                                <div key={log.id} className="group relative bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50/50 rounded-2xl p-5 transition-all">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex gap-4">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-all group-hover:scale-110 ${isTopup ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                isBilliard ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                                }`}>
                                                                {isTopup ? <PlusCircle className="w-6 h-6" /> :
                                                                    isBilliard ? <Trophy className="w-6 h-6" /> :
                                                                        <Utensils className="w-6 h-6" />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <p className="font-black text-slate-900 uppercase tracking-tight text-sm">
                                                                        {isTopup ? 'Top-up Saldo' :
                                                                            isBilliard ? `Sewa ${log.table?.tableName || 'Meja Billiard'}` :
                                                                                `Order ${log.cafeTable?.tableName || 'Meja Cafe'}`}
                                                                    </p>
                                                                    <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                                        {log.invoiceNumber}
                                                                    </span>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-y-1 gap-x-3">
                                                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                                        <Timer className="w-3 h-3" />
                                                                        {new Date(log.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, {new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>

                                                                    {log.sessionDuration && (
                                                                        <p className="text-[10px] font-black text-indigo-600 bg-indigo-50/50 px-2 rounded-lg">
                                                                            {log.sessionDuration.split(':')[0]}j {log.sessionDuration.split(':')[1]}m
                                                                        </p>
                                                                    )}

                                                                    {log.paymentDetails && (
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                            via {Array.isArray(log.paymentDetails) ? log.paymentDetails.map((p: any) => p.method).join(', ') : 'Wallet'}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                {log.orderItems && log.orderItems.length > 0 && (
                                                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                                                        {log.orderItems.map((item: any, idx: number) => (
                                                                            <span key={idx} className="inline-flex items-center gap-1 text-[9px] font-black bg-slate-50 text-slate-500 px-2 py-1 rounded-lg border border-slate-100">
                                                                                <Coffee className="w-2.5 h-2.5" />
                                                                                {item.quantity}x {item.menuItem?.name || 'Item'}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`text-base font-black flex items-center justify-end gap-1 ${isTopup ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {isTopup ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                                                                {isTopup ? '+' : '-'} Rp {Number(log.grandTotal).toLocaleString()}
                                                            </p>
                                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter mt-1">Status: {log.status}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="p-8 pt-4 border-t border-slate-50 bg-slate-50/50">
                                <button onClick={() => setShowLogModal(false)} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.25em] shadow-xl shadow-slate-200 active:scale-95 transition-all border-b-4 border-slate-950">Tutup Riwayat</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {showReceiptModal && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden w-full max-w-lg relative animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 right-0 p-6 z-10">
                            <button 
                                onClick={() => setShowReceiptModal(false)}
                                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all font-black"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 pb-10">
                            <ThermalReceipt tx={lastTransaction} settings={settings} />
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => window.print()} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                                <Printer className="w-4 h-4" /> CETAK STRUK
                            </button>
                            <button onClick={() => setShowReceiptModal(false)} className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-slate-300 transition-all">TUTUP</button>
                        </div>
                    </div>
                </div>
            )}
            
            {displayScanUuid && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6">
                        <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <QrCode className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Menunggu Scan</h3>
                            <p className="text-slate-500 mt-2 text-sm">Persilakan pelanggan melakukan scan QR Member mereka pada layar Terminal Display.</p>
                        </div>
                        <button
                            onClick={() => {
                                socket.emit('cancel_display_scan', { uuid: displayScanUuid });
                                setDisplayScanUuid(null);
                            }}
                            className="w-full py-4 rounded-2xl bg-rose-50 text-rose-600 font-extrabold uppercase hover:bg-rose-100 transition-all text-xs"
                        >
                            Batalkan Operasi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

