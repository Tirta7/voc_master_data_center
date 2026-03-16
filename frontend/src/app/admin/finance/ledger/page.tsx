'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    ArrowDownLeft, ArrowUpRight, Wallet, TrendingDown,
    Search, RefreshCw, Receipt, ShoppingBag, Users2,
    Calendar, ChevronDown, ChevronRight, X, Banknote, CreditCard, QrCode,
    SplitSquareHorizontal, CircleDollarSign, BarChart3, Activity,
    Hash, Clock, User, CheckCircle2, ExternalLink, Eye, Filter, FileDown, Coffee, ShieldOff,
    SearchX, Printer, ArrowRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMqtt } from '@/context/MqttContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Config ─────────────────────────────────────────────────────────────────

const SOURCE_MAP: Record<string, { label: string; color: string; ring: string }> = {
    sale: { label: 'Penjualan', color: 'text-emerald-700', ring: 'ring-emerald-200' },
    topup: { label: 'Top-up Member', color: 'text-sky-700', ring: 'ring-sky-200' },
    'usage:member': { label: 'Saldo Digunakan', color: 'text-violet-600', ring: 'ring-violet-200' },
    usage: { label: 'Penggunaan Saldo', color: 'text-slate-500', ring: 'ring-slate-100' },
    expense: { label: 'Pengeluaran', color: 'text-rose-700', ring: 'ring-rose-200' },
    refund: { label: 'Refund', color: 'text-amber-700', ring: 'ring-amber-200' },
    split: { label: 'Split Bill', color: 'text-indigo-700', ring: 'ring-indigo-200' },
    default: { label: 'Lainnya', color: 'text-slate-600', ring: 'ring-slate-200' },
};
function srcOf(s: string) {
    if (!s) return SOURCE_MAP.default;
    const k = s.toLowerCase();
    if (k === 'usage:member') return SOURCE_MAP['usage:member'];
    if (k.includes('split') || k.includes('multi')) return SOURCE_MAP.split;
    if (k.includes('topup')) return SOURCE_MAP.topup;
    if (k.includes('usage')) return SOURCE_MAP.usage;
    if (k.includes('sale')) return SOURCE_MAP.sale;
    if (k.includes('expense')) return SOURCE_MAP.expense;
    if (k.includes('refund')) return SOURCE_MAP.refund;
    return SOURCE_MAP.default;
}

function isMemberUsage(e: any) {
    return (e.source || '').toLowerCase() === 'usage:member' ||
        (e.description || '').toLowerCase().startsWith('[member usage]');
}

function isSplit(e: any) {
    return (e.description || '').toLowerCase().includes('split') ||
        (e.source || '').toLowerCase().includes('split') ||
        (e.source || '').toLowerCase().includes('multi');
}

function payerFrom(desc: string = ''): string {
    const m = desc.match(/\[([^\]]+)\]/);
    return m?.[1] || '';
}

function methodIcon(desc: string = '') {
    const d = desc.toLowerCase();
    if (d.includes('qris') || d.includes('qr')) return <QrCode className="w-3 h-3 text-violet-400" />;
    if (d.includes('debit') || d.includes('card') || d.includes('bank')) return <CreditCard className="w-3 h-3 text-sky-400" />;
    if (d.includes('transfer')) return <ExternalLink className="w-3 h-3 text-blue-400" />;
    if (d.includes('member')) return <User className="w-3 h-3 text-emerald-400" />;
    return <Banknote className="w-3 h-3 text-emerald-400" />;
}

function methodLabel(desc: string = '', availableMethods: string[] = []): string {
    const d = desc.toLowerCase();
    if (d.includes('member')) return 'MEMBERSHIP';
    const match = availableMethods.find(m => d.includes(m.toLowerCase()));
    if (match) return match;
    return 'Lainnya';
}

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1000000000) return `Rp ${(n / 1000000000).toFixed(abs % 1000000000 === 0 ? 0 : 1)}B`;
    if (abs >= 1000000) return `Rp ${(n / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 1)}M`;
    if (abs >= 1000) return `Rp ${(n / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`;
    return fmt(n);
};
const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (ts: string) => new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

// ─── Data Shaping ────────────────────────────────────────────────────────────

type SingleItem = { kind: 'single'; entry: any };
type GroupItem = { kind: 'group'; refId: string; entries: any[]; total: number; memberTotal: number; cashTotal: number; firstTs: string };
type LedgerItem = SingleItem | GroupItem;

function extractMemberAmount(desc: string): number {
    // Try to extract amount from description like "Split Payment [name] for INV: ..."
    // Member usage entries have amount:0 in DB, so we try to find the real amount from the numerical context
    // This is a best-effort extraction; prefer using transaction's grandTotal if available
    const m = desc.match(/Rp\s?([\d,.]+)/i);
    return m ? Number(m[1].replace(/[,.]/g, '')) : 0;
}

function buildItems(entries: any[]): LedgerItem[] {
    const splitGroups: Record<string, any[]> = {};
    const singles: any[] = [];

    for (const e of entries) {
        if (isSplit(e) && e.referenceId) {
            (splitGroups[e.referenceId] ||= []).push(e);
        } else {
            singles.push(e);
        }
    }

    const items: LedgerItem[] = [];
    for (const [refId, grp] of Object.entries(splitGroups)) {
        if (grp.length > 1) {
            // Separate member usage (amount:0) from real cash entries
            const cashEntries = grp.filter(e => !isMemberUsage(e));
            const memberEntries = grp.filter(e => isMemberUsage(e));
            const cashTotal = cashEntries.reduce((s, e) => s + Number(e.amount), 0);
            const memberTotal = memberEntries.length; // just a count; real amount is in description
            items.push({ kind: 'group', refId, entries: grp, total: cashTotal, memberTotal, cashTotal, firstTs: grp[grp.length - 1].timestamp });
        } else {
            singles.push(grp[0]);
        }
    }
    for (const e of singles) items.push({ kind: 'single', entry: e });

    items.sort((a, b) => {
        const ta = a.kind === 'single' ? new Date(a.entry.timestamp).getTime() : new Date(a.firstTs).getTime();
        const tb = b.kind === 'single' ? new Date(b.entry.timestamp).getTime() : new Date(b.firstTs).getTime();
        return tb - ta;
    });
    return items;
}

function groupByDate(items: LedgerItem[]) {
    const groups: Record<string, LedgerItem[]> = {};
    for (const item of items) {
        const ts = item.kind === 'single' ? item.entry.timestamp : item.firstTs;
        const key = fmtDate(ts);
        (groups[key] ||= []).push(item);
    }
    return groups;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, accent, trend }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent: string; trend?: { val: string; pos: boolean } }) {
    return (
        <div className={`relative overflow-hidden bg-white rounded-[1.5rem] md:rounded-[2.5rem] border-2 ${accent} p-5 md:p-7 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 opacity-0 group-hover:opacity-100 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity" />
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100">
                        {icon}
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black ${trend.pos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                            {trend.pos ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {trend.val}
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 italic">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
                    </div>
                    {sub && <p className="text-[11px] text-slate-400 font-bold mt-2 uppercase tracking-tight opacity-70">{sub}</p>}
                </div>
            </div>
        </div>
    );
}

// ─── Split Group Card ─────────────────────────────────────────────────────────

type TxInfo = { id: number; customerName: string | null; tableId: number | null; cafeTableId: number | null; tableName: string | null } | null;

const SplitGroup = React.memo(({ item, settings, onViewInvoice }: { item: GroupItem; settings: any; onViewInvoice?: (id: string) => void }) => {
    const { hasPermission } = useAuth();
    const [open, setOpen] = useState(false);
    const [txInfo, setTxInfo] = useState<TxInfo>(null);
    const availableMethods = settings?.availablePaymentMethods || [];

    useEffect(() => {
        axios.get(`${API_URL}/transactions/invoice/${item.refId}`)
            .then(r => setTxInfo(r.data))
            .catch(() => setTxInfo(null));
    }, [item.refId]);

    const payers = item.entries.map(e => ({
        name: payerFrom(e.description) || 'Pembayar',
        amount: Number(e.amount),
        isMember: isMemberUsage(e),
        method: isMemberUsage(e) ? 'MEMBERSHIP' : methodLabel(e.description, availableMethods),
        icon: isMemberUsage(e) ? <User className="w-3 h-3 text-violet-400" /> : methodIcon(e.description),
        ts: e.timestamp,
        desc: e.description,
    }));

    const hasMemberPayer = payers.some(p => p.isMember);
    const memberPayerCount = payers.filter(p => p.isMember).length;
    const cashTotal = payers.filter(p => !p.isMember).reduce((s, p) => s + p.amount, 0);

    const customerDisplay = txInfo?.customerName || null;
    const tableDisplay = txInfo?.tableName || (txInfo?.tableId ? `Meja ${txInfo.tableId}` : null);

    return (
        <div className={`rounded-[1.5rem] md:rounded-[2rem] border-2 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-xl ${open ? 'border-indigo-400 bg-white ring-4 ring-indigo-50' : 'border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white'}`}>
            {/* ── Header ── */}
            <button
                className="w-full flex items-center gap-4 px-4 md:px-6 py-4 md:py-6 text-left"
                onClick={() => setOpen(o => !o)}
            >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 flex-shrink-0 relative group">
                    <SplitSquareHorizontal className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    <div className="absolute -top-1.5 -right-1.5 bg-indigo-900 text-white text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg border-2 border-white">{payers.length}</div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em] italic bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">Split Bill Ledger</span>
                        {txInfo?.cafeTableId ? (
                             <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg flex items-center gap-1.5 border border-orange-200 uppercase tracking-tighter">
                                <Coffee className="w-3 h-3" /> Cafe Order
                            </span>
                        ) : txInfo?.tableId ? (
                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-lg flex items-center gap-1.5 border border-indigo-200 uppercase tracking-tighter">
                                <CircleDollarSign className="w-3 h-3" /> Billiard Session
                            </span>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap mb-1">
                        {customerDisplay && (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
                                    <User className="w-2.5 h-2.5 text-emerald-600" />
                                </div>
                                <span className="text-sm font-black text-slate-800 tracking-tight">{customerDisplay}</span>
                            </div>
                        )}
                        {tableDisplay && (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
                                    <Hash className="w-2.5 h-2.5 text-amber-600" />
                                </div>
                                <span className="text-xs font-black text-amber-800 tracking-tight">{tableDisplay}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold flex-wrap mt-1 opacity-70">
                         <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{fmtTime(item.firstTs)}</span>
                         <span className="flex items-center gap-1.5 uppercase tracking-widest px-2 py-0.5 bg-slate-50 rounded italic border border-slate-100">REF: {item.refId}</span>
                    </div>
                </div>

                <div className="text-right flex-shrink-0 pr-2">
                    <p className="text-xl lg:text-2xl font-black text-emerald-600 tracking-tighter">+{fmt(cashTotal).replace('Rp ', '')}</p>
                    {hasMemberPayer && (
                         <div className="flex justify-end mt-1">
                            <span className="text-[9px] font-black text-violet-500 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100 flex items-center gap-1.5">
                                <User className="w-2.5 h-2.5" /> +{memberPayerCount} Member Splitted
                            </span>
                         </div>
                    )}
                </div>
                <div className={`ml-2 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 transition-all duration-500 ${open ? 'rotate-90 bg-indigo-600 text-white border-transparent' : 'text-slate-400'}`}>
                    <ChevronRight className="w-5 h-5" />
                </div>
            </button>

            {/* ── Expanded ── */}
            {open && (
                <div className="border-t-2 border-indigo-100 bg-white shadow-inner">
                    <div className="p-4 bg-slate-50/50 flex items-center gap-3 space-x-2 overflow-x-auto no-scrollbar">
                        <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm whitespace-nowrap">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Tunai/QR</p>
                            <p className="text-sm font-black text-emerald-600 leading-none">{fmt(cashTotal)}</p>
                        </div>
                        <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm whitespace-nowrap">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Mata Uang</p>
                            <p className="text-sm font-black text-slate-800 leading-none">IDR (Rupiah)</p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {payers.map((p, i) => (
                            <div key={i} className={`flex items-center gap-4 px-4 md:px-8 py-4 md:py-5 transition-colors hover:bg-slate-50 ${p.isMember ? 'bg-violet-50/30' : 'bg-transparent'}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${p.isMember ? 'bg-violet-100 border-2 border-violet-200' : 'bg-white border-2 border-slate-100'}`}>
                                    <User className={`w-5 h-5 ${p.isMember ? 'text-violet-500' : 'text-slate-400'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm font-black text-slate-800">{p.name}</p>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${p.isMember
                                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-100'
                                            : 'bg-white border border-slate-200 text-slate-500 shadow-sm'
                                            }`}>
                                            {p.icon} {p.method}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 opacity-60">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{fmtTime(p.ts)}</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    {p.isMember ? (
                                        <div className="bg-violet-50 px-4 py-2 rounded-xl border border-violet-100">
                                            <p className="text-sm font-black text-violet-600 flex items-center justify-end gap-2 italic">
                                                <CircleDollarSign className="w-4 h-4" />
                                                Saldo Member
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-lg font-black text-emerald-600">+{fmt(p.amount).replace('Rp ', '')}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {(onViewInvoice && hasPermission('FIN_PRINT_REPRINT')) && (
                        <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-100">
                            <button
                                onClick={e => { e.stopPropagation(); onViewInvoice(txInfo?.id?.toString() ?? item.refId); }}
                                className="w-full h-14 bg-indigo-600 hover:bg-slate-900 text-white rounded-[1.2rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl shadow-indigo-100 flex items-center justify-center gap-4"
                            >
                                <Eye className="w-5 h-5" /> View Official Receipt
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

// ─── Single Entry Row ────────────────────────────────────────────────────────

const SingleRow = React.memo(({ entry, onToggle, expanded, onViewInvoice, settings }: {
    entry: any; onToggle: () => void; expanded: boolean; onViewInvoice?: (id: string) => void; settings: any;
}) => {
    const { hasPermission } = useAuth();
    const isIn = entry.type === 'in';
    const src = srcOf(entry.source);
    const availableMethods = settings?.availablePaymentMethods || [];

    const [txInfo, setTxInfo] = useState<TxInfo>(null);

    useEffect(() => {
        if (entry.referenceId && entry.source !== 'expense') {
            axios.get(`${API_URL}/transactions/invoice/${entry.referenceId}`)
                .then(r => setTxInfo(r.data))
                .catch(() => setTxInfo(null));
        }
    }, [entry.referenceId, entry.source]);

    const customerDisplay = txInfo?.customerName || null;
    const tableDisplay = txInfo?.tableName || (txInfo?.tableId ? `Meja ${txInfo.tableId}` : null);
    const isMemberUse = isMemberUsage(entry);

    return (
        <div className={`rounded-2xl md:rounded-3xl border-2 transition-all duration-300 overflow-hidden shadow-sm ${expanded ? 'border-slate-800 bg-white ring-4 ring-slate-100 translate-x-2' : isMemberUse ? 'border-violet-100 bg-violet-50/20 hover:border-violet-300 hover:bg-white' : 'border-slate-50 bg-white hover:border-slate-200 hover:shadow-xl'}`}>
            <button className="w-full flex items-center gap-4 px-4 md:px-6 py-4 md:py-5 text-left group" onClick={onToggle}>
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-500 group-hover:scale-110 ${isMemberUse ? 'bg-violet-100 text-violet-600' : isIn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {isMemberUse ? <Users2 className="w-5 h-5 md:w-6 md:h-6" /> : isIn ? <ArrowDownLeft className="w-5 h-5 md:w-6 md:h-6" /> : <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg border ${src.color} bg-white opacity-80 shadow-sm`}>{src.label}</span>
                        {txInfo?.cafeTableId ? (
                            <span className="text-[9px] font-black bg-orange-50 text-orange-600 px-2 py-1 rounded-lg flex items-center gap-1.5 border border-orange-100 uppercase tracking-tight">
                                <Coffee className="w-3 h-3" /> Cafe Order
                            </span>
                        ) : txInfo?.tableId ? (
                            <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg flex items-center gap-1.5 border border-indigo-100 uppercase tracking-tight">
                                <CircleDollarSign className="w-3 h-3" /> Billiard Session
                            </span>
                        ) : null}
                    </div>
                    <p className="text-[13px] font-black text-slate-800 truncate leading-none group-hover:text-indigo-600 transition-colors uppercase tracking-wider">{entry.description || '—'}</p>

                    <div className="flex items-center gap-4 flex-wrap mt-2 opacity-70">
                        {customerDisplay && (
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <User className="w-2.5 h-2.5 text-emerald-500" />
                                </div>
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{customerDisplay}</span>
                            </div>
                        )}
                        {tableDisplay && (
                             <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-amber-50 flex items-center justify-center">
                                    <Hash className="w-2.5 h-2.5 text-amber-500" />
                                </div>
                                <span className="text-[10px] font-black text-amber-700 uppercase tracking-tight">{tableDisplay}</span>
                             </div>
                        )}
                        <div className="flex items-center gap-1.5 bg-slate-100/50 px-2 py-0.5 rounded italic">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{fmtTime(entry.timestamp)}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right flex-shrink-0 px-2">
                    {isMemberUse ? (
                        <div className="bg-violet-50 px-3 py-1.5 rounded-xl border border-violet-100">
                             <p className="text-sm font-black tracking-tighter text-violet-600 flex items-center gap-1.5 italic uppercase">
                                <ShieldOff className="w-3.5 h-3.5" /> Saldo Member
                             </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <p className={`text-lg lg:text-xl font-black tracking-tighter ${isIn ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {isIn ? '+' : '−'} {fmt(Number(entry.amount)).replace('Rp ', '')}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-60">Balance: {fmt(Number(entry.balanceAfter)).replace('Rp ', '').split(',')[0]}</p>
                        </div>
                    )}
                </div>
                <div className={`ml-3 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 transition-all duration-300 ${expanded ? 'bg-slate-900 text-white rotate-90' : 'text-slate-300'}`}>
                    <ChevronRight className="w-4 h-4" />
                </div>
            </button>

            {expanded && (
                <div className="border-t-2 border-slate-100 bg-slate-50/30 p-5 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { l: 'Internal Transaction ID', v: `#${entry.id}`, icon: <Activity className="w-3 h-3" /> },
                            { l: 'Precise Timestamp', v: new Date(entry.timestamp).toLocaleString('id-ID'), icon: <Clock className="w-3 h-3" /> },
                            { l: 'Gateway / Method', v: methodLabel(entry.description, availableMethods).toUpperCase(), icon: <Banknote className="w-3 h-3" /> },
                            { l: 'Invoice Code', v: entry.referenceId || 'NON-INVOICE', icon: <Hash className="w-3 h-3" /> },
                        ].map(({ l, v, icon }) => (
                            <div key={l} className="bg-white rounded-xl md:rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden group/detail">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/detail:opacity-40 transition-opacity">{icon}</div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 italic">{l}</p>
                                <p className="text-[11px] font-black text-slate-700 font-mono tracking-tighter">{v}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Detailed Transaction Flow Insight</p>
                        <p className="text-xs text-slate-600 leading-relaxed font-bold font-mono bg-slate-50 p-4 rounded-xl border border-slate-100">
                            {entry.description || 'Detailed narrative description unavailable for this ledger entry.'}
                        </p>
                    </div>

                    {(onViewInvoice && entry.referenceId && hasPermission('FIN_PRINT_REPRINT')) && (
                        <div className="flex justify-end">
                            <button
                                onClick={e => { e.stopPropagation(); onViewInvoice(entry.referenceId); }}
                                className="h-12 md:h-14 bg-slate-900 hover:bg-black text-white px-6 md:px-10 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl flex items-center gap-4 group"
                            >
                                <Receipt className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-12 transition-transform" /> Access Digital Receipt Archive
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LedgerPage() {
    const [ledger, setLedger] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out'>('all');
    const [methodFilter, setMethodFilter] = useState<string>('all');
    const [limit, setLimit] = useState(150);
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState<string>('00:00');
    const [endTime, setEndTime] = useState<string>('23:59');
    const [expanded, setExpanded] = useState<number | null>(null);
    const [loyaltyStats, setLoyaltyStats] = useState<any>(null);
    const { hasPermission } = useAuth();
    const [settings, setSettings] = useState<any>(null);
    const { subscribe } = useMqtt();

    useEffect(() => {
        axios.get(`${API_URL}/reports/settings`).then(r => setSettings(r.data)).catch(e => console.error(e));
    }, []);

    const handleViewInvoice = (refId: string) => {
        window.open(`/admin/finance/ledger/invoice/${refId}`, '_blank');
    };

    useEffect(() => { 
        if (startDate && endDate) {
            fetchLedger();
            fetchLoyalty();
        } else {
            setLedger([]);
            setLoading(false);
        }
    }, [limit, startDate, endDate, startTime, endTime]);

    useEffect(() => {
        return subscribe('billiard/finance/update', () => {
            fetchLedger();
        });
    }, [subscribe]);

    const fetchLedger = async () => {
        if (!startDate || !endDate) return;
        setLoading(true);
        try {
            const start = `${startDate}T${startTime}`;
            const end = `${endDate}T${endTime}`;
            const res = await axios.get(`${API_URL}/finance/ledger?limit=${limit}&startDate=${start}&endDate=${end}`);
            setLedger(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLoyalty = async () => {
        try {
            const res = await axios.get(`${API_URL}/finance/loyalty-analytics?startDate=${startDate}&endDate=${endDate}`);
            setLoyaltyStats(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const exportPDF = () => {
        const query = new URLSearchParams({
            start: startDate,
            end: endDate,
            sTime: startTime,
            eTime: endTime
        }).toString();
        window.open(`/admin/finance/ledger/print?${query}`, '_blank');
    };

    const exportCSV = async () => {
        setLoading(true);
        try {
            const [txsRes, settingsRes] = await Promise.all([
                axios.get(`${API_URL}/reports/transactions-full`),
                axios.get(`${API_URL}/reports/settings`)
            ]);
            const transactions: any[] = txsRes.data;
            const cfg = settingsRes.data;
            const venueName = cfg.invoiceBusinessName || cfg.businessName || 'My Billiard';
            const venueAddr = cfg.invoiceAddress || cfg.address || '—';

            // ── Discover all unique order-item categories dynamically ──────────────
            const catSet = new Set<string>();
            catSet.add('Billiard'); // always present
            transactions.forEach((tx: any) => {
                (tx.orderItems || []).forEach((oi: any) => {
                    const cat = (oi.menuItem?.category?.name || oi.menuItem?.category || '').trim();
                    if (cat) catSet.add(cat);
                });
            });
            const dynamicCats = Array.from(catSet); // e.g. ['Billiard', 'Food & Beverage', 'Store', 'Pro Shop']

            // ── Helper: calculate per-category totals for a transaction ────────────
            const catTotals = (tx: any): Record<string, number> => {
                const totals: Record<string, number> = {};
                dynamicCats.forEach(c => { totals[c] = 0; });
                totals['Billiard'] = Number(tx.billiardTotal || 0);
                (tx.orderItems || []).forEach((oi: any) => {
                    const cat = (oi.menuItem?.category?.name || oi.menuItem?.category || '').trim() || 'Lainnya';
                    totals[cat] = (totals[cat] || 0) + Number(oi.priceAtOrder) * Number(oi.quantity);
                });
                return totals;
            };

            // ── VAT rate label ──────────────────────────────────────────────────────
            const vatRate = Number(cfg.vatRate || cfg.vatPercent || 0);
            const vatLabel = vatRate > 0 ? `PPN ${vatRate}%` : 'PPN';
            const scRate = Number(cfg.serviceChargeRate || cfg.serviceCharge || 0);
            const scLabel = scRate > 0 ? `Service Charge ${scRate}%` : 'Service Charge';

            // ══ SHEET 1 — Invoice Summary ═══════════════════════════════════════════
            const staticBefore = ['Nama Tempat', 'Alamat', 'No Urut', 'Invoice Number', 'Status',
                'Payment Date', 'Table', 'Customer', 'Guest', 'Paket',
                'Start Date', 'Start Time', 'End Date', 'End Time', 'Duration'];
            const staticAfter = ['Sub Total', 'Discount', 'Nama Promo', 'DPP (Taxable)',
                scLabel, vatLabel, 'Rounding', 'Grand Total', 'Method',
                'Money Paid', 'Change', 'Kasir', 'Waiter', 'Catatan'];
            const headers1 = [...staticBefore, ...dynamicCats.map(c => `Total ${c}`), ...staticAfter];

            const fmtN = (n: number) => Math.round(n);
            const fD = (d: any) => d ? new Date(d).toLocaleDateString('id-ID') : '';
            const fT = (d: any) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

            const rows1: any[][] = transactions.map((tx: any, idx: number) => {
                const totals = catTotals(tx);
                const methods = (tx.payments || []).map((p: any) => p.paymentMethod).join(', ') || '—';
                const promoNames = (tx.appliedPromos || []).map((p: any) => p.promoName || p.name || '').filter(Boolean).join(', ');
                const discount = (tx.appliedPromos || []).reduce((s: number, p: any) => s + Number(p.discount || 0), 0);
                const subTotal = Number(tx.billiardTotal || 0) + Number(tx.cafeTotal || 0);
                const change = Number(tx.paidAmount || 0) - Number(tx.grandTotal || 0);

                const row = [
                    venueName, venueAddr, idx + 1, tx.invoiceNumber, tx.status,
                    fD(tx.updatedAt),
                    tx.table?.name || (tx.tableId ? `Meja ${tx.tableId}` : tx.cafeTable?.name || '—'),
                    tx.customerName || '—', tx.guestCount || '',
                    tx.fareName || tx.packageName || '—',
                    fD(tx.startTime), fT(tx.startTime),
                    fD(tx.endTime), fT(tx.endTime),
                    tx.sessionDuration || '',
                    ...dynamicCats.map(c => fmtN(totals[c] || 0)),
                    fmtN(subTotal), fmtN(discount), promoNames,
                    fmtN(Number(tx.dppAmount || tx.billiardTotal || 0)),
                    fmtN(Number(tx.serviceChargeAmount || 0)),
                    fmtN(Number(tx.vatAmount || 0)),
                    fmtN(Number(tx.roundingAmount || 0)),
                    fmtN(Number(tx.grandTotal || 0)),
                    methods,
                    fmtN(Number(tx.paidAmount || 0)),
                    fmtN(change > 0 ? change : 0),
                    'Kasir', 'Waiter',
                    tx.notes || tx.note || '',
                ];
                return row;
            });

            // Total row for Sheet 1
            const totalRow1: any[] = ['TOTAL', '', transactions.length, '', '', '', '', '', '', '', '', '', '', '', ''];
            dynamicCats.forEach(cat => {
                totalRow1.push(fmtN(transactions.reduce((s: number, tx: any) => s + (catTotals(tx)[cat] || 0), 0)));
            });
            ['Sub Total', 'Discount', 'Nama Promo', 'DPP (Taxable)', scLabel, vatLabel, 'Rounding', 'Grand Total'].forEach((col, i) => {
                if (col === 'Sub Total') totalRow1.push(fmtN(transactions.reduce((s: number, tx: any) => s + Number(tx.billiardTotal || 0) + Number(tx.cafeTotal || 0), 0)));
                else if (col === 'Discount') totalRow1.push(fmtN(transactions.reduce((s: number, tx: any) => s + (tx.appliedPromos || []).reduce((ss: number, p: any) => ss + Number(p.discount || 0), 0), 0)));
                else if (col === 'Nama Promo') totalRow1.push('');
                else if (col === 'DPP (Taxable)') totalRow1.push(fmtN(transactions.reduce((s: number, tx: any) => s + Number(tx.dppAmount || tx.billiardTotal || 0), 0)));
                else if (col === scLabel) totalRow1.push(fmtN(transactions.reduce((s: number, tx: any) => s + Number(tx.serviceChargeAmount || 0), 0)));
                else if (col === vatLabel) totalRow1.push(fmtN(transactions.reduce((s: number, tx: any) => s + Number(tx.vatAmount || 0), 0)));
                else if (col === 'Rounding') totalRow1.push(fmtN(transactions.reduce((s: number, tx: any) => s + Number(tx.roundingAmount || 0), 0)));
                else if (col === 'Grand Total') totalRow1.push(fmtN(transactions.reduce((s: number, tx: any) => s + Number(tx.grandTotal || 0), 0)));
            });
            totalRow1.push(...['', '', '', '', '']);

            // ══ SHEET 2 — Order Item Breakdown ═════════════════════════════════════
            const headers2 = ['No Urut', 'Invoice Number', 'Customer', 'Table', 'Payment Date',
                'Item Name', 'Kategori', 'Qty', 'Harga Satuan (Rp)', 'Subtotal (Rp)', 'Catatan Item'];
            const rows2: any[][] = [];
            transactions.forEach((tx: any, idx: number) => {
                const baseRow = [idx + 1, tx.invoiceNumber, tx.customerName || '—',
                tx.table?.name || (tx.tableId ? `Meja ${tx.tableId}` : tx.cafeTable?.name || '—'),
                fD(tx.updatedAt)];
                if (!tx.orderItems || tx.orderItems.length === 0) {
                    rows2.push([...baseRow, '(Tidak ada item)', '', '', '', '', '']);
                } else {
                    (tx.orderItems || []).forEach((oi: any) => {
                        rows2.push([
                            ...baseRow,
                            oi.menuItem?.name || '—',
                            oi.menuItem?.category?.name || oi.menuItem?.category || '—',
                            Number(oi.quantity),
                            fmtN(Number(oi.priceAtOrder)),
                            fmtN(Number(oi.priceAtOrder) * Number(oi.quantity)),
                            oi.notes || oi.note || '',
                        ]);
                    });
                }
            });

            // ── Build XLSX dynamically (no build dependency — pure ArrayBuffer) ────────
            // Use SheetJS (xlsx) via dynamic import
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();

            // Sheet 1
            const ws1 = XLSX.utils.aoa_to_sheet([headers1, ...rows1, totalRow1]);
            // Style header row (col widths based on content)
            ws1['!cols'] = headers1.map((h: string) => ({ wch: Math.max(h.length + 2, 14) }));
            ws1['!rows'] = [{ hpt: 22 }]; // header row height
            XLSX.utils.book_append_sheet(wb, ws1, 'Invoice Summary');

            // Sheet 2
            const ws2 = XLSX.utils.aoa_to_sheet([headers2, ...rows2]);
            ws2['!cols'] = headers2.map((h: string) => ({ wch: Math.max(h.length + 2, 14) }));
            XLSX.utils.book_append_sheet(wb, ws2, 'Item Breakdown');

            // Download
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `ledger_${dateStr}.xlsx`);
        } catch (err) {
            console.error('Export XLSX failed:', err);
            alert('Export gagal. Cek console untuk detail.');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        // Exclude member-usage (amount:0) entries from income stats — they're audit trail only
        const realIncome = ledger.filter(e => e.type === 'in' && !isMemberUsage(e));
        const totalIn = realIncome.reduce((s, e) => s + Number(e.amount), 0);
        const totalOut = ledger.filter(e => e.type === 'out').reduce((s, e) => s + Number(e.amount), 0);
        const balance = ledger.length > 0 ? Number(ledger[0].balanceAfter) : 0;
        const splits = ledger.filter(e => isSplit(e) && !isMemberUsage(e));
        const uniqueInvoices = new Set(splits.map(e => e.referenceId).filter(Boolean)).size;
        const splitTotal = splits.reduce((s, e) => s + Number(e.amount), 0);
        const memberUsageEntries = ledger.filter(isMemberUsage);
        const memberUsageTotal = memberUsageEntries.reduce((s, e) => {
            // The real amount is described in the description for member usage
            const m = (e.description || '').match(/untuk INV/i);
            return s + (m ? Number(e.amount) : 0);
        }, 0);
        const memberUsageCount = new Set(memberUsageEntries.map((e: any) => e.referenceId).filter(Boolean)).size;
        return { totalIn, totalOut, balance, splitCount: uniqueInvoices, splitTotal, memberUsageCount };
    }, [ledger]);

    const filtered = useMemo(() => ledger.filter(e => {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false;
        if (methodFilter !== 'all') {
            const m = methodLabel(e.description, settings?.availablePaymentMethods || []).toLowerCase();
            if (m !== methodFilter.toLowerCase()) return false;
        }
        if (search) {
            const q = search.toLowerCase();
            return (e.description || '').toLowerCase().includes(q) || (e.referenceId || '').toLowerCase().includes(q);
        }
        return true;
    }), [ledger, typeFilter, search, methodFilter, settings]);

    const items = useMemo(() => buildItems(filtered), [filtered]);
    const grouped = useMemo(() => groupByDate(items), [items]);
    const pctIn = stats.totalIn + stats.totalOut > 0 ? Math.round((stats.totalIn / (stats.totalIn + stats.totalOut)) * 100) : 100;

    if (!hasPermission('FIN_LEDGER')) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 border-2 border-rose-100 shadow-xl shadow-rose-100/50">
                    <ShieldOff className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">Akses Terbatas</h2>
                <p className="text-slate-500 max-w-sm font-medium">Anda tidak memiliki izin untuk melihat buku besar keuangan.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* ── Header ── */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm px-4 lg:px-0">
                <div className="max-w-6xl mx-auto py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                            <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none">Buku Kas</h1>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Financial Data Stream</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                        <button onClick={fetchLedger} className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shrink-0">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={exportPDF} className="bg-indigo-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shrink-0 hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100">
                            <Printer className="w-4 h-4" /> Export PDF
                        </button>
                        <button onClick={exportCSV} className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shrink-0 hover:bg-emerald-700 active:scale-95 shadow-lg shadow-emerald-100">
                            <FileDown className="w-4 h-4" /> Export CSV
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 lg:px-0 py-6 lg:py-10 space-y-6 lg:space-y-8">
                {/* ── Stats ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <StatCard label="SALDO AKHIR" value={fmtK(stats.balance)} sub="Current Balance" icon={<Wallet className="w-5 h-5 text-indigo-600" />} accent="bg-indigo-50/20 border-indigo-100" />
                    <StatCard label="PENDAPATAN KAS" value={fmtK(stats.totalIn)} sub={`${stats.splitCount} nota split`} icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600" />} accent="bg-emerald-50/20 border-emerald-100" />
                    <StatCard label="LOYALTY REVENUE" value={fmtK(loyaltyStats?.totalTopupRevenue || 0)} sub="Total Topup Member" icon={<CircleDollarSign className="w-5 h-5 text-amber-600" />} accent="bg-amber-50/20 border-amber-100" />
                    <StatCard label="REDEMPTION" value={`${loyaltyStats?.totalPointsRedeemed || 0} PTS`} sub={`${loyaltyStats?.redemptionCount || 0} Item Ditukar`} icon={<ShoppingBag className="w-5 h-5 text-violet-500" />} accent="bg-violet-50/30 border-violet-100" />
                </div>

                {/* ── Net Bar & Date Filter ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* Date Picker Section - Ultra Modern */}
                    <div className="lg:col-span-12 bg-white rounded-[2rem] md:rounded-[3rem] border-2 border-slate-100 p-6 md:p-8 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 shrink-0">
                                    <Calendar className="w-6 h-6 md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tighter uppercase italic">Filter Periode Kas</h3>
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">Tentukan rentang tanggal analisa</p>
                                </div>
                            </div>

                            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-10 w-full">
                                {/* START DATE-TIME GROUP */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4 ml-6">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Start Boundary</label>
                                    </div>
                                    <div className="flex gap-1 p-2 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] shadow-inner focus-within:border-indigo-500 focus-within:bg-white focus-within:shadow-2xl focus-within:shadow-indigo-50 transition-all duration-500 group/input">
                                        <div className="flex-1 relative">
                                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors" />
                                            <input 
                                                type="date" 
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 bg-transparent text-[12px] font-black text-slate-700 outline-none uppercase tracking-tighter"
                                            />
                                        </div>
                                        <div className="w-px h-10 bg-slate-200 self-center opacity-50" />
                                        <div className="w-36 relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors" />
                                            <input 
                                                type="time" 
                                                value={startTime}
                                                onChange={e => setStartTime(e.target.value)}
                                                className="w-full pl-10 pr-6 py-4 bg-transparent text-[12px] font-black text-slate-700 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* RANGE INDICATOR */}
                                <div className="hidden xl:flex flex-col items-center justify-center pt-8">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm">
                                        <ArrowRight className="w-5 h-5 text-slate-300" />
                                    </div>
                                </div>

                                {/* END DATE-TIME GROUP */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4 ml-6">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">End Boundary</label>
                                    </div>
                                    <div className="flex gap-1 p-2 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] shadow-inner focus-within:border-rose-500 focus-within:bg-white focus-within:shadow-2xl focus-within:shadow-rose-50 transition-all duration-500 group/input2">
                                        <div className="flex-1 relative">
                                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/input2:text-rose-500 transition-colors" />
                                            <input 
                                                type="date" 
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 bg-transparent text-[12px] font-black text-slate-700 outline-none uppercase tracking-tighter"
                                            />
                                        </div>
                                        <div className="w-px h-10 bg-slate-200 self-center opacity-50" />
                                        <div className="w-36 relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/input2:text-rose-500 transition-colors" />
                                            <input 
                                                type="time" 
                                                value={endTime}
                                                onChange={e => setEndTime(e.target.value)}
                                                className="w-full pl-10 pr-6 py-4 bg-transparent text-[12px] font-black text-slate-700 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* RESET BUTTON */}
                                <div className="pt-0 xl:pt-10 flex justify-end">
                                    <button 
                                        onClick={() => { 
                                            const today = new Date().toISOString().split('T')[0];
                                            setStartDate(today); setEndDate(today); 
                                            setStartTime('00:00'); setEndTime('23:59'); 
                                        }}
                                        className="w-16 h-16 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] transition-all active:scale-95 flex items-center justify-center shadow-xl shadow-slate-200 group/reset border-4 border-white"
                                        title="Sync to Today"
                                    >
                                        <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-1000" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Presets - Premium Monthly Shortcuts */}
                        <div className="relative z-10 mt-10 pt-8 border-t border-slate-50">
                            <div className="flex items-center gap-3 mb-6 ml-2">
                                <Activity className="w-4 h-4 text-indigo-400" />
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em] italic">Analisa Per-Bulan (Tahun Ini)</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button 
                                    onClick={() => { 
                                        const now = new Date();
                                        const y = now.getFullYear();
                                        const m = String(now.getMonth() + 1).padStart(2, '0');
                                        const d = String(now.getDate()).padStart(2, '0');
                                        setStartDate(`${y}-${m}-${d}`);
                                        setEndDate(`${y}-${m}-${d}`);
                                        setStartTime('00:00');
                                        setEndTime('23:59');
                                    }}
                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:shadow-xl transition-all active:scale-95 shadow-sm"
                                >
                                    Hari Ini
                                </button>
                                <div className="w-px h-6 bg-slate-200 mx-2" />
                                {[
                                    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
                                    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
                                ].map((month, idx) => (
                                    <button 
                                        key={month}
                                        onClick={() => {
                                            const y = new Date().getFullYear();
                                            const startMonth = String(idx + 1).padStart(2, '0');
                                            const lastDay = new Date(y, idx + 1, 0).getDate();
                                            setStartDate(`${y}-${startMonth}-01`);
                                            setEndDate(`${y}-${startMonth}-${lastDay}`);
                                            setStartTime('00:00');
                                            setEndTime('23:59');
                                        }}
                                        className="px-4 py-2.5 bg-white text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-95"
                                    >
                                        {month}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* REDEMPTION DETAIL - NEW SECTION */}
                    {loyaltyStats?.items?.length > 0 && (
                        <div className="lg:col-span-12 bg-white rounded-[2rem] md:rounded-[3rem] border-2 border-slate-100 p-6 md:p-10 shadow-xl relative overflow-hidden group">
                           <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight italic uppercase">Detail Penukaran Poin</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Inventory Loyalty Analytics</p>
                                </div>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                               {loyaltyStats.items.map((item: any) => (
                                   <div key={item.name} className="p-5 md:p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:border-violet-200 transition-all group/item">
                                       <div className="flex justify-between items-start gap-4 mb-4">
                                           <p className="text-xs md:text-sm font-black text-slate-800 tracking-tight group-hover/item:text-violet-600 transition-colors uppercase italic line-clamp-2">{item.name}</p>
                                           <div className="px-2.5 py-1 bg-violet-50 text-violet-600 rounded-lg text-[8px] md:text-[9px] font-black uppercase whitespace-nowrap">
                                               {item.count}X Tukar
                                           </div>
                                       </div>
                                       <div className="flex items-end justify-between">
                                           <div>
                                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Poin</p>
                                               <p className="text-lg md:text-xl font-black text-slate-900 tracking-tighter">{item.points} <span className="text-[10px] text-slate-400">PTS</span></p>
                                           </div>
                                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-200 group-hover/item:text-violet-400 transition-colors shrink-0">
                                               <ArrowUpRight className="w-4 h-4" />
                                           </div>
                                       </div>
                                   </div>
                               ))}
                           </div>

                           {/* Summary Net Point */}
                           <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400">
                               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-center sm:text-left">Redemption Flow Integrity: 100% Verified</p>
                               <div className="flex items-center gap-4">
                                    <p className="text-[10px] font-black uppercase bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                                        Total Vol: <span className="text-slate-900 ml-2">{loyaltyStats.totalPointsRedeemed} PTS</span>
                                    </p>
                               </div>
                           </div>
                        </div>
                    )}

                    <div className="lg:col-span-8 bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all duration-700" />
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] italic leading-none">Net Revenue Flow Optimization</p>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none italic">
                                    {fmt(stats.totalIn - stats.totalOut)}
                                </h2>
                                <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest opacity-60">Konsolidasi Arus Kas Real-Time</p>
                            </div>
                            <div className="text-right w-full md:w-auto">
                                <div className="bg-indigo-600/20 backdrop-blur-md px-6 py-4 rounded-[1.5rem] border border-indigo-500/30 shadow-xl inline-block w-full md:w-auto">
                                    <p className="text-2xl md:text-3xl font-black text-indigo-400 leading-none">{pctIn}%</p>
                                    <p className="text-[9px] md:text-[10px] font-black text-indigo-400/60 uppercase tracking-widest mt-2 italic">Cash Inflow Efficiency</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="h-3 md:h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner p-1">
                                <div className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(99,102,241,0.5)]" style={{ width: `${pctIn}%` }} />
                            </div>
                            <div className="flex justify-between text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">
                                <span>Total Revenue Flow</span>
                                <span>{pctIn}% Efficient</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 p-8 md:p-10 shadow-xl flex flex-col justify-between relative group overflow-hidden">
                     <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                     <div className="relative z-10">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 shadow-sm shrink-0">
                            <Activity className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                        <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter uppercase italic leading-none mb-3">Health Status</h4>
                        <p className="text-xs md:text-sm text-slate-400 font-bold leading-relaxed mb-8 uppercase tracking-tight">Kondisi likuiditas bisnis berdasarkan performa 150 transaksi terakhir.</p>
                     </div>
                     <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Inflow Status</span>
                             <span className="text-[10px] md:text-xs font-black text-emerald-600 uppercase italic">Excellent</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Level</span>
                             <span className="text-[10px] md:text-xs font-black text-indigo-600 uppercase italic">Ultra Low</span>
                        </div>
                     </div>
                </div>
            </div>

                {/* ── Filters ── */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari referensi, deskripsi, atau nomor invoice..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-16 pr-8 py-5 bg-white border-2 border-slate-100 rounded-[2rem] text-sm font-black text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:ring-[8px] focus:ring-indigo-50 outline-none transition-all shadow-sm"
                            />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide pb-2 lg:pb-0 w-full lg:w-auto">
                        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                            {[
                                { id: 'all', l: 'All' },
                                { id: 'in', l: 'In' },
                                { id: 'out', l: 'Out' }
                            ].map(f => (
                                <button key={f.id} onClick={() => setTypeFilter(f.id as any)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${typeFilter === f.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {f.l}
                                </button>
                            ))}
                        </div>
                        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                            <button onClick={() => setMethodFilter('all')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${methodFilter === 'all' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
                                All Methods
                            </button>
                            {(settings?.availablePaymentMethods || []).slice(0, 2).map((m: string) => (
                                <button key={m} onClick={() => setMethodFilter(m)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${methodFilter === m ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Timeline ── */}
                {(!startDate || !endDate) ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 shadow-inner group">
                        <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-8 border-2 border-white shadow-xl transition-transform group-hover:scale-110 duration-500">
                             <Calendar className="w-12 h-12 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-4">Pilih Periode Laporan</h2>
                        <p className="text-slate-400 max-w-sm text-center font-bold text-sm uppercase tracking-tight leading-relaxed">
                            Silahkan tentukan rentang tanggal di atas untuk menampilkan data aliran kas tertentu secara detail dan akurat.
                        </p>
                        <div className="mt-10 flex gap-3">
                             <div className="w-2 h-2 rounded-full bg-slate-200 animate-bounce" />
                             <div className="w-2 h-2 rounded-full bg-slate-200 animate-bounce delay-75" />
                             <div className="w-2 h-2 rounded-full bg-slate-200 animate-bounce delay-150" />
                        </div>
                    </div>
                ) : loading ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-24 bg-white rounded-2xl animate-skeleton border border-slate-100" />
                            ))}
                        </div>
                        <div className="h-32 bg-white rounded-3xl animate-skeleton border border-slate-100" />
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-20 bg-white rounded-2xl animate-skeleton border border-slate-100" />
                            ))}
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <SearchX className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No entries found for criteria</p>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {Object.entries(grouped).map(([date, dayItems], dayIdx) => {
                            const dIn = dayItems.reduce((s, i) => i.kind === 'single' ? (i.entry.type === 'in' ? s + Number(i.entry.amount) : s) : s + i.total, 0);
                            const dOut = dayItems.reduce((s, i) => i.kind === 'single' ? (i.entry.type === 'out' ? s + Number(i.entry.amount) : s) : s, 0);
                            const net = dIn - dOut;
                            return (
                                <div key={date} className="relative">
                                    {dayIdx !== Object.entries(grouped).length - 1 && (
                                        <div className="absolute left-[31px] top-20 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 to-transparent" />
                                    )}
                                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 sticky top-24 z-30 bg-slate-50/90 backdrop-blur-md py-4 rounded-2xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-[64px] h-[64px] rounded-[1.5rem] bg-white border border-slate-200 shadow-xl flex flex-col items-center justify-center p-2">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase leading-none mb-1">{date.split(' ')[1].substring(0, 3)}</p>
                                                <p className="text-2xl font-black text-slate-900 leading-none">{date.split(' ')[0]}</p>
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">{date}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                     <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-black border border-emerald-100 uppercase">+{fmt(dIn).replace('Rp ', '')}</span>
                                                     <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[9px] font-black border border-rose-100 uppercase">−{fmt(dOut).replace('Rp ', '')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`px-6 py-3 rounded-2xl border-2 flex flex-col items-end shadow-sm ${net >= 0 ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-100' : 'bg-rose-600 border-rose-500 text-white shadow-rose-100'}`}>
                                                <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1.5 italic">Daily Net Performance</p>
                                                <p className="text-lg font-black leading-none tracking-tighter">{net >= 0 ? '+' : ''}{fmt(net)}</p>
                                            </div>
                                        </div>
                                    </header>

                                    <div className="grid grid-cols-1 gap-4 pl-0 md:pl-20">
                                        {dayItems.map(item => item.kind === 'group'
                                            ? <SplitGroup key={`grp-${item.refId}`} item={item} settings={settings} onViewInvoice={handleViewInvoice} />
                                            : <SingleRow key={`single-${item.entry.id}`} entry={item.entry} settings={settings} expanded={expanded === item.entry.id} onToggle={() => setExpanded(expanded === item.entry.id ? null : item.entry.id)} onViewInvoice={handleViewInvoice} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {ledger.length >= limit && (
                            <div className="flex justify-center pt-10">
                                <button
                                    onClick={() => setLimit(l => l + 100)}
                                    className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-200 transition-all active:scale-95 flex items-center gap-4"
                                >
                                    <RefreshCw className="w-4 h-4" /> Sync Previous Archival Data
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
