'use client';

import React, { useState, useEffect } from 'react';
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
    Smartphone
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Tier {
    id: number;
    name: string;
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

    const [showLogModal, setShowLogModal] = useState(false);
    const [memberLogs, setMemberLogs] = useState<any[]>([]);
    const [fetchingLogs, setFetchingLogs] = useState(false);

    const [newMember, setNewMember] = useState({
        name: '',
        phone: '',
        balance: 0,
        tierId: '',
        expiryDate: '',
        expiryTemplate: 'never'
    });

    const [registrationResult, setRegistrationResult] = useState<any | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [fetchingCard, setFetchingCard] = useState(false);
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

        return () => {
            unsubs.forEach(u => u());
            socket.off('memberUpdate', onMemberUpdate);
            socket.off('memberBalanceUpdated', onMemberBalance);
        };
    }, [subscribe]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
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
            setNewMember({ name: '', phone: '', balance: 0, tierId: '', expiryDate: '', expiryTemplate: 'never' });
            setSelectedMember(null);
        } catch (error) {
            alert('Gagal menyimpan member');
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
        if (!selectedMember) return;
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
        } catch (error) {
            alert('Gagal topup saldo');
            setTopupStep('INPUT_AMOUNT');
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

    const handleQrScanTopup = async (decodedText: string) => {
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

        try {
            const token = localStorage.getItem('token');
            const url = version !== undefined
                ? `${API_URL}/members/scan/${encodeURIComponent(memberCode)}?v=${version}`
                : `${API_URL}/members/scan/${encodeURIComponent(memberCode)}`;

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const foundMember = res.data;

            if (topupStep === 'SCAN_VALIDATION') {
                setSelectedMember(foundMember);
                setTopupStep('INPUT_AMOUNT');
            } else if (topupStep === 'SCAN_COMMIT') {
                if (selectedMember && foundMember.id === selectedMember.id) {
                    handleTopup();
                } else {
                    alert('QR Code tidak cocok dengan member yang sedang di-topup.');
                }
            }
        } catch (err: any) {
            console.error('Scan Error:', err);
            const errorMessage = err.response?.data?.message || 'Gagal memproses QR Code. Silakan coba lagi.';
            alert(errorMessage);
        }
    };

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
        <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-8 min-h-screen">
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

            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Users className="w-8 lg:w-10 h-8 lg:h-10 text-indigo-600" />
                        Membership
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm lg:text-base">Kelola data pelanggan setia dan royalty tier.</p>
                </div>
                <div className="flex gap-3 w-full lg:w-auto">
                    {hasPermission('MEMBER_MANAGE') && (
                        <Link
                            href="/admin/members/tiers"
                            className="bg-white border-2 border-indigo-600 text-indigo-600 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-95 text-xs transition-all"
                        >
                            <Award className="w-5 h-5" />
                            <span>KATEGORI TIER</span>
                        </Link>
                    )}
                    {hasPermission('MEMBER_MANAGE') && (
                        <button
                            onClick={() => { setSelectedMember(null); setNewMember({ name: '', phone: '', balance: 0, tierId: '', expiryDate: '', expiryTemplate: 'never' }); setShowAddModal(true); }}
                            className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 lg:px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-200 active:scale-95 text-xs"
                        >
                            <UserPlus className="w-5 h-5" />
                            <span>TAMBAH MEMBER</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <StatCard label="TOTAL MEMBER" value={members.length} icon={<Users />} color="text-indigo-600" />
                <StatCard label="MEMBER AKTIF" value={members.filter(m => m.isActive).length} icon={<ShieldCheck />} color="text-emerald-600" />
                <StatCard label="SALDO E-WALLET" value={`Rp ${(members.reduce((acc, curr) => acc + Number(curr.balance), 0)).toLocaleString()}`} icon={<Wallet />} color="text-amber-600" />
                <StatCard label="KATEGORI TIER" value={tiers.length} icon={<Award />} color="text-blue-600" />
            </div>

            <div className="bg-white rounded-[1.5rem] lg:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-4 lg:p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama, ID, atau HP..."
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-900 shadow-inner text-sm outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                                    <button onClick={() => { setTopupStep('SCAN_VALIDATION'); setShowTopupModal(true); }} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shadow-sm active:scale-90" title="Topup Saldo">
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
                                        <button onClick={() => { setTopupStep('SCAN_VALIDATION'); setShowTopupModal(true); }} className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-black uppercase">
                                            <Wallet className="w-3.5 h-3.5" /> Topup
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain">
                    <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg p-8 lg:p-12 shadow-3xl animate-in fade-in slide-in-from-bottom-full sm:zoom-in duration-300 overflow-y-auto max-h-[95vh] sm:max-h-[90vh]">
                        <header className="mb-8">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedMember ? 'Edit Data Member' : 'Member Baru'}</h2>
                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Lengkapi informasi pelanggan.</p>
                        </header>
                        <form onSubmit={handleAddMember} className="space-y-6">
                            <InputField label="Nama Lengkap" value={newMember.name} onChange={v => setNewMember({ ...newMember, name: v })} placeholder="Andi Wijaya" required />
                            <InputField label="WhatsApp (Aktif)" value={newMember.phone} onChange={v => setNewMember({ ...newMember, phone: v })} placeholder="081234..." required />
                            {!selectedMember && <InputField label="Saldo Awal" type="number" value={newMember.balance === 0 ? '' : newMember.balance} onChange={v => setNewMember({ ...newMember, balance: Number(v) })} placeholder="0" />}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Kategori Member</label>
                                <select className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-bold text-slate-900 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjY2JjYmNiIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9M002IDlsNiA2IDYtNiIvPjwvc3ZnPg==')] bg-[length:20px] bg-[right_16px_center] bg-no-repeat" value={newMember.tierId} onChange={e => setNewMember({ ...newMember, tierId: e.target.value })} required>
                                    <option value="">Pilih Tier</option>
                                    {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Masa Berlaku</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[{ id: '1m', label: '1 Bulan' }, { id: '6m', label: '6 Bulan' }, { id: '1y', label: '1 Tahun' }, { id: 'custom', label: 'Kustom' }, { id: 'never', label: 'Selamanya' }].map(t => (
                                        <button key={t.id} type="button" onClick={() => setNewMember({ ...newMember, expiryTemplate: t.id })} className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newMember.expiryTemplate === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:border-indigo-600'}`}>{t.label}</button>
                                    ))}
                                </div>
                                {newMember.expiryTemplate === 'custom' && (
                                    <div className="mt-4"><InputField label="Pilih Tanggal Berakhir" type="datetime-local" value={newMember.expiryDate} onChange={v => setNewMember({ ...newMember, expiryDate: v })} required /></div>
                                )}
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => { setShowAddModal(false); setSelectedMember(null); }} className="flex-1 py-4 text-xs font-black text-slate-500 rounded-2xl active:scale-95 transition-all uppercase tracking-widest">BATAL</button>
                                <button type="submit" className="flex-2 bg-indigo-600 text-white py-4 px-8 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2"><Save className="w-4 h-4" /> SIMPAN DATA</button>
                            </div>
                        </form>
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
                                <form onSubmit={(e) => { e.preventDefault(); setTopupStep('SCAN_COMMIT'); }} className="space-y-6 mt-8 text-left">
                                    <InputField label="Jumlah Topup" type="number" value={topupAmount === 0 ? '' : topupAmount} onChange={v => setTopupAmount(Number(v))} className="!text-3xl !font-black !text-emerald-600 !text-center !py-6 font-sans" required autoFocus />
                                    <div className="grid grid-cols-2 gap-3">
                                        {[20000, 50000, 100000, 200000].map(amt => (
                                            <button key={amt} type="button" onClick={() => setTopupAmount(amt)} className="py-3 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black transition-all border border-slate-100">+ {amt.toLocaleString()}</button>
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
                                        <button type="submit" className="flex-2 bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] shadow-lg shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest">LANJUTKAN SCAN</button>
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
                                <div className="p-4 bg-slate-50 rounded-2xl text-left border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ringkasan Top-up</p>
                                    <div className="flex justify-between items-center"><span className="font-bold text-slate-900">{selectedMember.name}</span><span className="font-black text-emerald-600 text-lg">Rp {topupAmount.toLocaleString()}</span></div>
                                </div>
                                <button type="button" onClick={() => setTopupStep('INPUT_AMOUNT')} className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-2 border-slate-100 rounded-2xl">KEMBALI</button>
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
                        <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                            <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nama Member</span><span className="font-black text-slate-900 truncate ml-2">{(lastTransaction.customerName || 'MEMBER').toUpperCase()}</span></div>
                            <div className="h-px bg-slate-200"></div>
                            <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nominal Top-up</span><span className="font-black text-emerald-600 text-xl">Rp {lastTransaction.grandTotal.toLocaleString()}</span></div>
                            {lastTransaction.member && (
                                <><div className="h-px bg-slate-200"></div><div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Saldo Baru</span><span className="font-black text-indigo-600">Rp {Number(lastTransaction.member.balance).toLocaleString()}</span></div></>
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
                    <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-2xl p-6 sm:p-8 shadow-3xl animate-in fade-in slide-in-from-bottom-full sm:zoom-in duration-300 max-h-[95vh] sm:max-h-none overflow-y-auto">
                        <header className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase">Riwayat Aktivitas</h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Member: {selectedMember.name}</p>
                            </div>
                            <button onClick={() => setShowLogModal(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all font-black">X</button>
                        </header>
                        <div className="overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                            {fetchingLogs ? (
                                <div className="py-20 text-center"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div><p className="font-black text-indigo-600 uppercase tracking-widest text-[10px]">Mengambil Data...</p></div>
                            ) : memberLogs.length === 0 ? (
                                <div className="py-20 text-center"><History className="w-12 h-12 text-slate-100 mx-auto mb-4" /><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Belum ada riwayat</p></div>
                            ) : (
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left"><th className="pb-4 pt-2">Waktu</th><th className="pb-4 pt-2">Aktivitas</th><th className="pb-4 pt-2 text-right">Nominal</th></tr></thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {memberLogs.map((log) => (
                                            <tr key={log.id} className="text-xs group">
                                                <td className="py-4"><p className="font-bold text-slate-900">{new Date(log.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p><p className="text-[10px] text-slate-400 font-medium">{new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p></td>
                                                <td className="py-4">
                                                    <p className="font-black text-slate-900 uppercase tracking-wide">
                                                        {log.type === 'TOPUP' ? 'TOP-UP SALDO' : `SEWA ${log.table?.tableName || log.cafeTable?.tableName || 'MEJA'}`}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-bold">INV: {log.invoiceNumber}</p>
                                                    {log.orderItems && log.orderItems.length > 0 && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {log.orderItems.map((item: any, idx: number) => (
                                                                <span key={idx} className="text-[8px] font-bold bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">
                                                                    {item.quantity}x {item.menuItem?.name || 'Item'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 text-right"><p className={`font-black ${log.type === 'TOPUP' ? 'text-emerald-600' : 'text-rose-600'}`}>{log.type === 'TOPUP' ? '+' : '-'} Rp {Number(log.grandTotal).toLocaleString()}</p></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <button onClick={() => setShowLogModal(false)} className="w-full mt-8 py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200">TUTUP</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string, value: any, icon: any, color: string }) {
    return (
        <div className="bg-white p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2.5rem] shadow-lg shadow-slate-200/50 border border-slate-100 group">
            <div className="flex items-center lg:block gap-4">
                <div className={`w-12 lg:w-14 h-12 lg:h-14 bg-slate-50 ${color} rounded-xl lg:rounded-2xl flex items-center justify-center mb-0 lg:mb-6 border border-slate-100 shadow-sm shrink-0`}>
                    {React.cloneElement(icon as React.ReactElement, { size: 24 })}
                </div>
                <div>
                    <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 lg:mb-2">{label}</p>
                    <p className="text-xl lg:text-2xl font-black text-slate-900 leading-none">{value}</p>
                </div>
            </div>
        </div>
    );
}
