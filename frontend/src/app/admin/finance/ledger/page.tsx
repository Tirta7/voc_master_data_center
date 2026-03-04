'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    ArrowDownLeft, ArrowUpRight, Wallet, TrendingDown,
    Search, RefreshCw, Receipt, ShoppingBag, Users2,
    Calendar, ChevronDown, ChevronRight, X, Banknote, CreditCard, QrCode,
    SplitSquareHorizontal, CircleDollarSign, BarChart3, Activity,
    Hash, Clock, User, CheckCircle2, ExternalLink, Eye, Filter, FileDown, Coffee, ShieldOff,
    SearchX, Printer
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

function StatCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent: string }) {
    return (
        <div className={`bg-white rounded-2xl border ${accent} p-4 lg:p-5 shadow-sm flex items-center gap-3 lg:gap-4`}>
            <div className="flex-shrink-0 scale-90 lg:scale-100">{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-[8px] lg:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</p>
                <p className="text-lg lg:text-xl font-black text-slate-900 tracking-tight truncate">{value}</p>
                {sub && <p className="text-[9px] lg:text-[10px] text-slate-400 font-medium mt-0.5 truncate">{sub}</p>}
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
    const [txLoading, setTxLoading] = useState(true);
    const availableMethods = settings?.availablePaymentMethods || [];

    useEffect(() => {
        axios.get(`${API_URL}/transactions/invoice/${item.refId}`)
            .then(r => setTxInfo(r.data))
            .catch(() => setTxInfo(null))
            .finally(() => setTxLoading(false));
    }, [item.refId]);

    const payers = item.entries.map(e => ({
        name: payerFrom(e.description) || 'Pembayar',
        amount: Number(e.amount),
        isMember: isMemberUsage(e),
        method: isMemberUsage(e) ? 'MEMBERSHIP' : methodLabel(e.description, availableMethods),
        icon: isMemberUsage(e)
            ? <User className="w-3 h-3 text-violet-400" />
            : methodIcon(e.description),
        ts: e.timestamp,
        desc: e.description,
    }));

    const hasMemberPayer = payers.some(p => p.isMember);
    const memberPayerCount = payers.filter(p => p.isMember).length;
    const cashTotal = payers.filter(p => !p.isMember).reduce((s, p) => s + p.amount, 0);

    const customerDisplay = txInfo?.customerName || null;
    const tableDisplay = txInfo?.tableName || (txInfo?.tableId ? `Meja ${txInfo.tableId}` : null);

    return (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-violet-50/40 overflow-hidden shadow-sm">
            {/* ── Header ── */}
            <button
                className="w-full flex items-center gap-3 px-4 lg:px-5 py-4 text-left hover:bg-white/60 transition-colors"
                onClick={() => setOpen(o => !o)}
            >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                    <SplitSquareHorizontal className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] lg:text-xs font-black text-indigo-700 uppercase tracking-wider">Split Bill</span>
                        {txInfo?.cafeTableId ? (
                            <span className="text-[8px] lg:text-[9px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-200 uppercase">
                                <Coffee className="w-2.5 h-2.5" /> Cafe
                            </span>
                        ) : txInfo?.tableId ? (
                            <span className="text-[8px] lg:text-[9px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded flex items-center gap-1 border border-indigo-200 uppercase">
                                <CircleDollarSign className="w-2.5 h-2.5" /> Billiard
                            </span>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        {customerDisplay && (
                            <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-emerald-600" />
                                <span className="text-xs lg:text-sm font-black text-slate-800">{customerDisplay}</span>
                            </div>
                        )}
                        {tableDisplay && (
                            <div className="flex items-center gap-1">
                                <Hash className="w-3 h-3 text-amber-600" />
                                <span className="text-[10px] lg:text-xs font-black text-amber-800">{tableDisplay}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-[9px] lg:text-[10px] text-slate-400 font-medium flex-wrap mt-0.5">
                        <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{fmtTime(item.firstTs)}</span>
                        <span className="flex items-center gap-1 uppercase tracking-tight">#{item.refId}</span>
                    </div>
                </div>

                <div className="text-right flex-shrink-0">
                    <p className="text-sm lg:text-base font-black text-emerald-600">+{fmt(cashTotal).replace('Rp ', '')}</p>
                    {hasMemberPayer && (
                        <p className="text-[8px] font-bold text-violet-500 flex items-center justify-end gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                            +{memberPayerCount} Saldo Member
                        </p>
                    )}
                    <p className="text-[8px] lg:text-[10px] text-slate-400 font-mono italic">Joined Bill</p>
                </div>
                <div className={`ml-2 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-4 h-4 text-indigo-400" />
                </div>
            </button>

            {/* ── Expanded ── */}
            {open && (
                <div className="border-t border-indigo-200/60 divide-y divide-indigo-100/60">
                    {payers.map((p, i) => (
                        <div key={i} className={`flex items-center gap-3 px-4 lg:px-5 py-3 ${p.isMember ? 'bg-violet-50/70' : 'bg-white/60'}`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${p.isMember ? 'bg-violet-100 border border-violet-200' : 'bg-indigo-50 border border-indigo-100'}`}>
                                <User className={`w-3.5 h-3.5 ${p.isMember ? 'text-violet-500' : 'text-indigo-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-black text-slate-800">{p.name}</p>
                                    <span className={`flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${p.isMember
                                        ? 'bg-violet-100 text-violet-700 border border-violet-200'
                                        : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {p.icon} {p.method}
                                    </span>
                                </div>
                                {p.isMember && (
                                    <p className="text-[8px] text-violet-400 font-medium mt-0.5">Dipotong dari saldo member</p>
                                )}
                                <p className="text-[9px] text-slate-400 font-mono">{fmtTime(p.ts)}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                {p.isMember ? (
                                    <p className="text-xs font-black text-violet-600 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                                        Saldo Member
                                    </p>
                                ) : (
                                    <p className="text-xs lg:text-sm font-black text-emerald-600">+{fmt(p.amount).replace('Rp ', '')}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {(onViewInvoice && hasPermission('FIN_PRINT_REPRINT')) && (
                        <div className="px-4 py-3 bg-indigo-50/80">
                            <button
                                onClick={e => { e.stopPropagation(); onViewInvoice(txInfo?.id?.toString() ?? item.refId); }}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-indigo-200"
                            >
                                <Eye className="w-3.5 h-3.5" /> Detail Invoice Info
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
    const [txLoading, setTxLoading] = useState(false);

    useEffect(() => {
        if (entry.referenceId && entry.source !== 'expense') {
            setTxLoading(true);
            axios.get(`${API_URL}/transactions/invoice/${entry.referenceId}`)
                .then(r => setTxInfo(r.data))
                .catch(() => setTxInfo(null))
                .finally(() => setTxLoading(false));
        }
    }, [entry.referenceId, entry.source]);

    const customerDisplay = txInfo?.customerName || null;
    const tableDisplay = txInfo?.tableName || (txInfo?.tableId ? `Meja ${txInfo.tableId}` : null);

    const isMemberUse = isMemberUsage(entry);

    return (
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-sm ${expanded ? 'border-slate-200 bg-slate-50' : isMemberUse ? 'border-violet-100 bg-violet-50/20 hover:border-violet-200' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'}`}>
            <button className="w-full flex items-center gap-3 px-4 lg:px-5 py-4 text-left" onClick={onToggle}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${isMemberUse ? 'bg-violet-100' : isIn ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                    {isMemberUse ? <Users2 className="w-5 h-5 text-violet-500" /> : isIn ? <ArrowDownLeft className="w-5 h-5 text-emerald-600" /> : <ArrowUpRight className="w-5 h-5 text-rose-500" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[8px] lg:text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 ${src.ring} ${src.color} bg-white`}>{src.label}</span>
                        {txInfo?.cafeTableId ? (
                            <span className="text-[8px] lg:text-[9px] font-black bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-100 uppercase">
                                <Coffee className="w-2.5 h-2.5" /> Cafe
                            </span>
                        ) : txInfo?.tableId ? (
                            <span className="text-[8px] lg:text-[9px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded flex items-center gap-1 border border-indigo-100 uppercase">
                                <CircleDollarSign className="w-2.5 h-2.5" /> Billiard
                            </span>
                        ) : null}
                    </div>
                    <p className="text-xs lg:text-sm font-black text-slate-800 truncate leading-snug">{entry.description || '—'}</p>

                    <div className="flex items-center gap-3 flex-wrap mt-1">
                        {txLoading ? (
                            <div className="h-3 w-20 bg-slate-100 rounded-full animate-pulse" />
                        ) : (
                            <>
                                {customerDisplay && (
                                    <div className="flex items-center gap-1">
                                        <User className="w-2.5 h-2.5 text-emerald-500" />
                                        <span className="text-[9px] lg:text-[10px] font-black text-slate-600 uppercase tracking-tight truncate max-w-[80px] lg:max-w-none">{customerDisplay}</span>
                                    </div>
                                )}
                                {tableDisplay && (
                                    <div className="flex items-center gap-1">
                                        <Hash className="w-2.5 h-2.5 text-amber-500" />
                                        <span className="text-[9px] lg:text-[10px] font-black text-amber-700 uppercase tracking-tight">{tableDisplay}</span>
                                    </div>
                                )}
                            </>
                        )}
                        <span className="text-[9px] lg:text-[10px] text-slate-400 font-mono tracking-tighter">{fmtTime(entry.timestamp)}</span>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    {isMemberUse ? (
                        <>
                            <p className="text-sm lg:text-base font-black tracking-tight text-violet-500 italic">Saldo Member</p>
                            <p className="text-[8px] lg:text-[10px] text-violet-400 font-mono">Non-kas</p>
                        </>
                    ) : (
                        <>
                            <p className={`text-sm lg:text-base font-black tracking-tight ${isIn ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {isIn ? '+' : '−'} {fmt(Number(entry.amount)).replace('Rp ', '')}
                            </p>
                            <p className="text-[8px] lg:text-[10px] text-slate-400 font-mono">Saldo: {fmt(Number(entry.balanceAfter)).replace('Rp ', '')}</p>
                        </>
                    )}
                </div>
                <div className={`ml-1 lg:ml-2 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
            </button>

            {expanded && (
                <div className="border-t border-slate-100 mx-4 lg:mx-5 mb-4 mt-0 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { l: 'ID Entri', v: `#${entry.id}` },
                            { l: 'Waktu', v: new Date(entry.timestamp).toLocaleString('id-ID') },
                            { l: 'Metode', v: methodLabel(entry.description, availableMethods).toUpperCase() },
                            { l: 'Referensi', v: entry.referenceId || '—' },
                        ].map(({ l, v }) => (
                            <div key={l} className="bg-white rounded-xl p-3 border border-slate-100">
                                <p className="text-[8px] lg:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">{l}</p>
                                <p className="text-[10px] lg:text-xs font-black text-slate-700 font-mono truncate">{v}</p>
                            </div>
                        ))}
                        <div className="col-span-full bg-white rounded-xl p-3 border border-slate-100">
                            <p className="text-[8px] lg:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Narasi Ledger</p>
                            <p className="text-[10px] lg:text-xs text-slate-600 leading-relaxed font-medium">{entry.description || 'Tidak ada deskripsi'}</p>
                        </div>
                    </div>
                    {(onViewInvoice && entry.referenceId && hasPermission('FIN_PRINT_REPRINT')) && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={e => { e.stopPropagation(); onViewInvoice(entry.referenceId); }}
                                className="w-full lg:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-slate-200"
                            >
                                <Eye className="w-3.5 h-3.5" /> Buka Invoice Online
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
    const [expanded, setExpanded] = useState<number | null>(null);
    const { hasPermission } = useAuth();
    const [settings, setSettings] = useState<any>(null);
    const { subscribe } = useMqtt();

    useEffect(() => {
        axios.get(`${API_URL}/reports/settings`).then(r => setSettings(r.data)).catch(e => console.error(e));
    }, []);

    const handleViewInvoice = (refId: string) => {
        window.open(`/admin/finance/ledger/invoice/${refId}`, '_blank');
    };

    useEffect(() => { fetchLedger(); }, [limit]);

    useEffect(() => {
        return subscribe('billiard/finance/update', () => {
            fetchLedger();
        });
    }, [subscribe]);

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/finance/ledger?limit=${limit}`);
            setLedger(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = () => {
        window.open('/admin/finance/ledger/print', '_blank');
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
                    <StatCard label="SALDO AKHIR" value={fmt(stats.balance)} sub="Current Balance" icon={<Wallet className="w-5 h-5 text-indigo-600" />} accent="bg-indigo-50/20 border-indigo-100" />
                    <StatCard label="PENDAPATAN KAS" value={fmt(stats.totalIn)} sub={`${stats.splitCount} nota split`} icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600" />} accent="bg-emerald-50/20 border-emerald-100" />
                    <StatCard label="PENGELUARAN" value={fmt(stats.totalOut)} sub="Exp & Refunds" icon={<ArrowUpRight className="w-5 h-5 text-rose-500" />} accent="bg-rose-50/20 border-rose-100" />
                    <StatCard label="SALDO MEMBER" value={`${stats.memberUsageCount} Transaksi`} sub="Bukan kas fisik" icon={<Users2 className="w-5 h-5 text-violet-500" />} accent="bg-violet-50/30 border-violet-100" />
                </div>

                {/* ── Net Bar ── */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm overflow-hidden relative">
                    <div className="flex justify-between items-end mb-4 relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Flow Efficiency</p>
                            <p className="text-3xl font-black text-slate-900 leading-none">+{fmt(stats.totalIn - stats.totalOut)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-indigo-600 leading-none">{pctIn}%</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Inflow Ratio</p>
                        </div>
                    </div>
                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                        <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pctIn}%` }} />
                    </div>
                </div>

                {/* ── Filters ── */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari referensi atau deskripsi..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-300 focus:ring-2 focus:ring-indigo-100/50 outline-none transition-all"
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
                {loading ? (
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
                    <div className="space-y-10">
                        {Object.entries(grouped).map(([date, dayItems]) => {
                            const dIn = dayItems.reduce((s, i) => i.kind === 'single' ? (i.entry.type === 'in' ? s + Number(i.entry.amount) : s) : s + i.total, 0);
                            const dOut = dayItems.reduce((s, i) => i.kind === 'single' ? (i.entry.type === 'out' ? s + Number(i.entry.amount) : s) : s, 0);
                            return (
                                <div key={date}>
                                    <header className="flex items-center justify-between mb-4 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                                            <p className="text-sm font-black text-slate-900 tracking-tight">{date}</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-black">
                                            <span className="text-emerald-600">+{fmt(dIn).replace('Rp ', '')}</span>
                                            <span className="text-rose-500">−{fmt(dOut).replace('Rp ', '')}</span>
                                        </div>
                                    </header>
                                    <div className="space-y-3">
                                        {dayItems.map(item => item.kind === 'group'
                                            ? <SplitGroup key={`grp-${item.refId}`} item={item} settings={settings} onViewInvoice={handleViewInvoice} />
                                            : <SingleRow key={`single-${item.entry.id}`} entry={item.entry} settings={settings} expanded={expanded === item.entry.id} onToggle={() => setExpanded(expanded === item.entry.id ? null : item.entry.id)} onViewInvoice={handleViewInvoice} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {ledger.length >= limit && (
                            <button onClick={() => setLimit(l => l + 100)} className="w-full bg-white border border-slate-200 py-5 rounded-3xl font-black text-xs text-slate-400 hover:text-slate-900 hover:shadow-lg transition-all active:scale-95">
                                LOAD PREVIOUS DATA
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
