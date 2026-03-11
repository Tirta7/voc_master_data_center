'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(2)} Jt` : n >= 1_000 ? `Rp ${(n / 1_000).toFixed(0)}K` : fmt(n);
const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (ts: string) => new Date(ts).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const fmtShort = (ts: string) => new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const now = new Date();
const docId = `BK/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}-${Math.floor(now.getTime() / 1000).toString().slice(-5)}`;

// ─ helpers ──────────────────────────────────────────────────────────────────
function isSplit(e: any) {
    return (e.description || '').toLowerCase().includes('split') ||
        (e.source || '').toLowerCase().includes('split') ||
        (e.source || '').toLowerCase().includes('multi');
}
function payerFrom(desc: string = '') { const m = desc.match(/\[([^\]]+)\]/); return m?.[1] || '—'; }
function methodLabel(desc: string = '', availableMethods: string[] = []) {
    const d = desc.toLowerCase();
    if (d.includes('member')) return 'MEMBERSHIP';
    const match = availableMethods.find(m => d.includes(m.toLowerCase()));
    if (match) return match;
    return 'Lainnya';
}
function srcLabel(s: string) {
    if (!s) return 'Lainnya';
    const k = s.toLowerCase();
    if (k.includes('split') || k.includes('multi')) return 'Split Bill';
    if (k.includes('sale:cafe')) return 'Cafe';
    if (k.includes('sale:billiard')) return 'Billiard';
    if (k.includes('sale')) return 'Penjualan';
    if (k.includes('expense')) return 'Pengeluaran';
    if (k.includes('refund')) return 'Refund';
    return s;
}

type GroupItem = { kind: 'group'; refId: string; entries: any[]; total: number; firstTs: string };
type SingleItem = { kind: 'single'; entry: any };
type LedgerItem = SingleItem | GroupItem;

function isMemberUsage(e: any) {
    const src = (e.source || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    return src === 'usage:member' ||
        src.includes('member') ||
        desc.startsWith('[member usage]') ||
        desc.includes('saldo member');
}

function buildItems(entries: any[]): LedgerItem[] {
    const grps: Record<string, any[]> = {};
    const singles: any[] = [];
    for (const e of entries) {
        if (isSplit(e) && e.referenceId) (grps[e.referenceId] ||= []).push(e);
        else singles.push(e);
    }
    const items: LedgerItem[] = [];
    for (const [refId, g] of Object.entries(grps)) {
        if (g.length > 1) {
            // Only sum cash payers — member usage entries are audit trail only
            const cashTotal = g.filter(e => !isMemberUsage(e)).reduce((s, e) => s + Number(e.amount), 0);
            items.push({ kind: 'group', refId, entries: g, total: cashTotal, firstTs: g[g.length - 1].timestamp });
        } else {
            singles.push(g[0]);
        }
    }
    for (const e of singles) items.push({ kind: 'single', entry: e });
    items.sort((a, b) => {
        const ta = a.kind === 'single' ? +new Date(a.entry.timestamp) : +new Date(a.firstTs);
        const tb = b.kind === 'single' ? +new Date(b.entry.timestamp) : +new Date(b.firstTs);
        return tb - ta;
    });
    return items;
}

function groupByDate(items: LedgerItem[]) {
    const g: Record<string, LedgerItem[]> = {};
    for (const item of items) {
        const ts = item.kind === 'single' ? item.entry.timestamp : item.firstTs;
        (g[fmtDate(ts)] ||= []).push(item);
    }
    return g;
}

// ─ design tokens ─────────────────────────────────────────────────────────────
const C = {
    ink: '#111827',
    sub: '#6b7280',
    muted: '#9ca3af',
    line: '#e5e7eb',
    bg: '#f9fafb',
    white: '#ffffff',
    navy: '#1e293b',
    indigo: '#4338ca',
    indigoL: '#eef2ff',
    green: '#059669',
    greenL: '#d1fae5',
    red: '#dc2626',
    redL: '#fee2e2',
    purple: '#7c3aed',
    amber: '#d97706',
};

const S = {
    label: { fontSize: 7, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: C.muted },
    mono: { fontFamily: "'SF Mono', 'Fira Code', monospace" },
};

// ─ small components ──────────────────────────────────────────────────────────
function Badge({ text, color, bg, border }: { text: string; color: string; bg: string; border: string }) {
    return (
        <span style={{ fontSize: 6.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color, background: bg, border: `1px solid ${border}`, borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap' as const }}>
            {text}
        </span>
    );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
    return (
        <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 12, paddingRight: 10 }}>
            <p style={{ ...S.label, marginBottom: 5 }}>{label}</p>
            <p style={{ fontSize: 16, fontWeight: 900, color: C.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 8.5, color: C.muted, marginTop: 4 }}>{sub}</p>
        </div>
    );
}

// ─ main ──────────────────────────────────────────────────────────────────────
export default function LedgerPrintPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter,sans-serif', gap: 12 }}>
                <div style={{ width: 36, height: 36, border: `3px solid #e5e7eb`, borderTopColor: '#4338ca', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                <p style={{ color: '#6b7280', fontSize: 13 }}>Inisialisasi Dokumen…</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        }>
            <LedgerPrintContent />
        </Suspense>
    );
}

function LedgerPrintContent() {
    const searchParams = useSearchParams();
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const sTime = searchParams.get('sTime') || '00:00';
    const eTime = searchParams.get('eTime') || '23:59';

    const [ledger, setLedger] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [loyaltyStats, setLoyaltyStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const sIso = startParam ? `${startParam}T${sTime}:00` : new Date().toISOString().split('T')[0] + 'T00:00:00';
        const eIso = endParam ? `${endParam}T${eTime}:59` : new Date().toISOString().split('T')[0] + 'T23:59:59';

        Promise.all([
            axios.get(`${API_URL}/finance/ledger`, { params: { limit: 1000, startDate: sIso, endDate: eIso } }),
            axios.get(`${API_URL}/finance/loyalty-analytics`, { params: { start: sIso, end: eIso } }),
            axios.get(`${API_URL}/reports/settings`),
        ]).then(([l, ly, s]) => {
            setLedger(l.data || []);
            setLoyaltyStats(ly.data);
            setSettings(s.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [startParam, endParam, sTime, eTime]);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter,sans-serif', gap: 12 }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.line}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <p style={{ color: C.muted, fontSize: 13 }}>Memuat Buku Kas…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
    if (!ledger.length) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Inter,sans-serif', color: C.red, fontWeight: 700 }}>Gagal memuat data Buku Kas atau tidak ada entri.</div>;


    // ── stats ─────────────────────────────────────────────────────────────────
    // Exclude member usage entries (amount=0, audit-only) from real cash totals
    const cashInEntries = ledger.filter(e => e.type === 'in' && !isMemberUsage(e));
    const cashOutEntries = ledger.filter(e => e.type === 'out' && !isMemberUsage(e));
    const memberUsageEntries = ledger.filter(isMemberUsage);

    const totalIn = cashInEntries.reduce((s, e) => s + Number(e.amount), 0);
    const totalOut = cashOutEntries.reduce((s, e) => s + Number(e.amount), 0);
    const balance = ledger.length ? Number(ledger[0].balanceAfter) : 0;
    const netSaldo = totalIn - totalOut;
    const splitE = ledger.filter(e => isSplit(e) && !isMemberUsage(e));
    const splitTotal = splitE.reduce((s, e) => s + Number(e.amount), 0);
    const uniqueSplits = new Set(splitE.map(e => e.referenceId)).size;
    const inEntries = cashInEntries.filter(e => !isSplit(e));
    const outEntries = cashOutEntries;
    const ts = ledger.map(e => +new Date(e.timestamp));
    const periodStart = ts.length ? fmtShort(new Date(Math.min(...ts)).toISOString()) : '—';
    const periodEnd = ts.length ? fmtShort(new Date(Math.max(...ts)).toISOString()) : '—';

    const totalMemberUsageAmt = memberUsageEntries.reduce((s, e) => {
        const m = (e.description || '').match(/Rp\s?([\d.,]+)/);
        return s + (m ? Number(m[1].replace(/[.,]/g, '').replace(',', '')) : Number(e.amount || 0));
    }, 0);

    const srcBreak: Record<string, number> = {};
    for (const e of inEntries) { const k = srcLabel(e.source); srcBreak[k] = (srcBreak[k] || 0) + Number(e.amount); }
    const expCat: Record<string, number> = {};
    for (const e of outEntries) { const k = (e.source || 'Operasional').replace('expense:', '').replace('expense', 'Operasional'); const l = k.charAt(0).toUpperCase() + k.slice(1); expCat[l] = (expCat[l] || 0) + Number(e.amount); }
    const payM: Record<string, number> = {};
    const availableMethods = settings?.availablePaymentMethods || [];
    for (const e of inEntries) { const m = methodLabel(e.description, availableMethods); payM[m] = (payM[m] || 0) + Number(e.amount); }
    const maxSrc = Math.max(...Object.values(srcBreak), 1);
    const incPct = totalIn + totalOut > 0 ? Math.round((totalIn / (totalIn + totalOut)) * 100) : 50;

    const venueName = settings?.invoiceBusinessName || settings?.businessName || 'Billiard Cafe';
    const venueAddr = settings?.invoiceAddress || settings?.address || '';

    const items = buildItems(ledger);
    const grouped = groupByDate(items);

    const methodBadgeStyle: Record<string, { c: string; bg: string; br: string }> = {
        'QRIS': { c: '#6d28d9', bg: '#f5f3ff', br: '#ddd6fe' },
        'Debit': { c: '#1d4ed8', bg: '#eff6ff', br: '#bfdbfe' },
        'Transfer': { c: '#c2410c', bg: '#fff7ed', br: '#fed7aa' },
        'Tunai': { c: '#065f46', bg: '#ecfdf5', br: '#a7f3d0' },
        'MEMBERSHIP': { c: '#7c3aed', bg: '#f5f3ff', br: '#ddd6fe' },
        'Lainnya': { c: C.sub, bg: C.bg, br: C.line },
    };
    function mBadge(label: string) {
        const s = methodBadgeStyle[label] || { c: C.sub, bg: C.bg, br: C.line };
        return <Badge text={label} color={s.c} bg={s.bg} border={s.br} />;
    }

    // ─ css ───────────────────────────────────────────────────────────────────
    const css = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{font-family:'Inter',sans-serif;background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .no-print{display:none}
        @media print{
            html,body{background:white!important}
            .no-print{display:none!important}
            .page-wrap{box-shadow:none!important;margin:0!important;width:100%!important;border-radius:0!important}
            .keep{break-inside:avoid}
            .pb{break-before:page}
            @page{size:A4 portrait;margin:14mm 12mm}
        }
        @media screen{
            .no-print{display:flex!important}
            .page-wrap{width:210mm;margin:76px auto 48px;box-shadow:0 20px 60px rgba(0,0,0,.14);border-radius:4px;overflow:hidden}
        }
        table{border-collapse:collapse;width:100%}
        th,td{padding:0}
        .divRow:nth-child(even){background:#f9fafb}
    `;

    function TableRow({ entry, availableMethods }: { entry: any, availableMethods: string[] }) {
        const isIn = entry.type === 'in';
        const mL = isIn ? methodLabel(entry.description, availableMethods) : '—';
        return (
            <tr style={{ background: 'white', borderBottom: `1px solid ${C.line}` }}>
                <td style={{ padding: '5px 10px', color: C.muted, fontSize: 7.5, ...S.mono, whiteSpace: 'nowrap' }}>{fmtTime(entry.timestamp)}</td>
                <td style={{ padding: '5px 10px' }}>
                    <Badge text={isIn ? 'Masuk' : 'Keluar'} color={isIn ? C.green : C.red} bg={isIn ? C.greenL : C.redL} border={isIn ? '#a7f3d0' : '#fecaca'} />
                </td>
                <td style={{ padding: '5px 10px', maxWidth: 155 }}>
                    <p style={{ fontWeight: 700, color: C.ink, fontSize: 8.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description || '—'}</p>
                    {entry.referenceId && <p style={{ color: C.muted, fontSize: 6.5, ...S.mono, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{entry.referenceId}</p>}
                </td>
                <td style={{ padding: '5px 10px' }}>
                    {((entry.source || '').includes('cafe') || (entry.source || '').includes('billiard')) ? (
                        <Badge
                            text={srcLabel(entry.source)}
                            color={(entry.source || '').includes('cafe') ? '#c2410c' : '#4338ca'}
                            bg={(entry.source || '').includes('cafe') ? '#fff7ed' : '#eef2ff'}
                            border={(entry.source || '').includes('cafe') ? '#fed7aa' : '#c7d2fe'}
                        />
                    ) : (
                        <span style={{ fontSize: 8, color: C.sub }}>{srcLabel(entry.source)}</span>
                    )}
                </td>
                <td style={{ padding: '5px 10px' }}>{isIn ? mBadge(mL) : <span style={{ color: C.muted, fontSize: 8 }}>—</span>}</td>
                <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 900, fontSize: 9.5, color: isIn ? C.green : C.red, whiteSpace: 'nowrap' }}>
                    {isIn ? '+' : '−'}{fmt(Number(entry.amount))}
                </td>
                <td style={{ padding: '5px 10px', textAlign: 'right', fontSize: 7.5, color: C.muted, ...S.mono, whiteSpace: 'nowrap' }}>
                    {entry.balanceAfter ? fmt(Number(entry.balanceAfter)) : '—'}
                </td>
            </tr>
        );
    }

    function TableGroup({ item, availableMethods }: { item: GroupItem, availableMethods: string[] }) {
        const g = item;
        return (
            <>
                <tr style={{ background: '#f0f4ff', borderBottom: `1px solid #dde3f8` }}>
                    <td style={{ padding: '5px 10px', fontSize: 7.5, color: C.muted, ...S.mono }}>{fmtTime(g.firstTs)}</td>
                    <td style={{ padding: '5px 10px' }}><Badge text="Split Bill" color="#4338ca" bg="#eef2ff" border="#c7d2fe" /></td>
                    <td style={{ padding: '5px 10px' }}>
                        <p style={{ fontWeight: 800, color: '#3730a3', fontSize: 8.5 }}>Split Bill — {g.entries.length} Pembayar</p>
                        <p style={{ color: '#818cf8', fontSize: 6.5, ...S.mono, marginTop: 2 }}>Ref: {g.refId}</p>
                    </td>
                    <td style={{ padding: '5px 10px', color: '#6366f1', fontSize: 8 }}>Split</td>
                    <td style={{ padding: '5px 10px' }}>—</td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 900, color: C.green, fontSize: 10 }}>+{fmt(g.total)}</td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', color: C.muted, fontSize: 7.5, ...S.mono }}>{g.entries[0]?.balanceAfter ? fmt(Number(g.entries[0].balanceAfter)) : '—'}</td>
                </tr>
                {g.entries.map((e, pi) => (
                    <tr key={`sp-${e.id}-${pi}`} style={{ background: '#f5f7ff', borderBottom: `1px solid #e8eaff` }}>
                        <td style={{ padding: '4px 10px 4px 22px', color: '#a5b4fc', fontSize: 7, ...S.mono }}>└ {fmtTime(e.timestamp)}</td>
                        <td style={{ padding: '4px 10px' }}><Badge text="Bayar" color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" /></td>
                        <td style={{ padding: '4px 10px', fontSize: 8, color: '#4b5563' }}>{payerFrom(e.description)}</td>
                        <td style={{ padding: '4px 10px', color: C.muted, fontSize: 7.5 }}>Split</td>
                        <td style={{ padding: '4px 10px' }}>{mBadge(methodLabel(e.description, availableMethods))}</td>
                        <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 800, color: '#6366f1', fontSize: 9 }}>+{fmt(Number(e.amount))}</td>
                        <td style={{ padding: '4px 10px', textAlign: 'right', color: '#c7d2fe', fontSize: 7, ...S.mono }}>{e.balanceAfter ? fmt(Number(e.balanceAfter)) : '—'}</td>
                    </tr>
                ))}
                <tr style={{ background: '#e0e7ff', borderBottom: `2px solid #c7d2fe` }}>
                    <td colSpan={5} style={{ padding: '3px 10px', textAlign: 'right', fontSize: 7.5, fontWeight: 800, color: '#4338ca', fontStyle: 'italic' }}>Subtotal Split ({g.entries.length} payer)</td>
                    <td style={{ padding: '3px 10px', textAlign: 'right', fontWeight: 900, color: '#4338ca', fontSize: 9 }}>+{fmt(g.total)}</td>
                    <td />
                </tr>
            </>
        );
    }

    return (
        <>
            <style>{css}</style>

            {/* toolbar */}
            <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999, background: 'white', borderBottom: `1px solid ${C.line}`, padding: '10px 24px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 6px rgba(0,0,0,.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => window.close()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sub, fontSize: 13, fontWeight: 700 }}>✕ Tutup</button>
                    <span style={{ color: C.line }}>|</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>Buku Kas — Financial Ledger</span>
                    <span style={{ background: C.indigoL, color: C.indigo, fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 99 }}>{ledger.length} entri</span>
                </div>
                <button onClick={() => window.print()} style={{ background: C.indigo, color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 12px ${C.indigo}40` }}>
                    Cetak / Simpan PDF
                </button>
            </div>

            {/* ══════════════════ PAGE 1 — SUMMARY ══════════════════ */}
            <div className="page-wrap" style={{ background: 'white' }}>

                {/* ── HEADER ── */}
                <div style={{ background: C.navy, padding: '32px 40px 28px', position: 'relative', overflow: 'hidden' }}>
                    {/* subtle grid overlay */}
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
                    {/* accent bar left */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg,${C.indigo},#818cf8,#6366f1)` }} />

                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
                        {/* left */}
                        <div>
                            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 7.5, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Laporan Keuangan Internal</p>
                            <h1 style={{ color: 'white', fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>Buku Kas</h1>
                            <p style={{ color: 'rgba(99,102,241,.7)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>Financial Ledger</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <p style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{venueName}</p>
                                {venueAddr && <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 9 }}>{venueAddr}</p>}
                                <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 8.5, marginTop: 4 }}>
                                    Periode: <span style={{ color: 'rgba(255,255,255,.65)' }}>{periodStart} — {periodEnd}</span>
                                </p>
                                <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 8.5 }}>
                                    Dicetak: <span style={{ color: 'rgba(255,255,255,.55)' }}>{now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                </p>
                            </div>
                        </div>

                        {/* right — saldo box */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '14px 20px', marginBottom: 10 }}>
                                <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 6 }}>Saldo Akhir</p>
                                <p style={{ color: 'white', fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>{fmt(balance)}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[{ label: 'Masuk', v: totalIn, c: '#4ade80', cb: 'rgba(52,211,153,.12)', cc: 'rgba(52,211,153,.25)' }, { label: 'Keluar', v: totalOut, c: '#f87171', cb: 'rgba(248,113,113,.12)', cc: 'rgba(248,113,113,.25)' }].map(x => (
                                    <div key={x.label} style={{ background: x.cb, border: `1px solid ${x.cc}`, borderRadius: 7, padding: '7px 14px', flex: 1, textAlign: 'left' }}>
                                        <p style={{ color: x.c, fontSize: 6.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3, opacity: .8 }}>{x.label}</p>
                                        <p style={{ color: x.c, fontSize: 12, fontWeight: 900 }}>{fmtK(x.v)}</p>
                                    </div>
                                ))}
                            </div>
                            <p style={{ color: 'rgba(255,255,255,.18)', fontSize: 7.5, marginTop: 8, ...S.mono }}>{docId}</p>
                        </div>
                    </div>
                </div>

                {/* thin accent */}
                <div style={{ height: 2, background: `linear-gradient(90deg,${C.indigo},#8b5cf6,#ec4899,#f59e0b,#10b981)` }} />

                <div style={{ padding: '28px 40px 36px' }}>

                    {/* ── KPI row ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
                        {[
                            { label: 'Saldo Saat Ini', value: fmt(balance), sub: `Balance terkini`, accent: C.indigo },
                            { label: 'Total Masuk', value: fmtK(totalIn), sub: `${inEntries.length} transaksi`, accent: C.green },
                            { label: 'Total Keluar', value: fmtK(totalOut), sub: `${outEntries.length} entri`, accent: C.red },
                            { label: 'Net Saldo', value: fmtK(netSaldo), sub: 'Masuk − Keluar', accent: netSaldo >= 0 ? C.green : C.red },
                            { label: 'Total Entri', value: String(ledger.length), sub: 'Semua record', accent: C.purple },
                        ].map((k, i) => (
                            <div key={k.label} style={{ padding: '16px 0 16px 0', borderRight: i < 4 ? `1px solid ${C.line}` : 'none' }}>
                                <KpiCard {...k} />
                            </div>
                        ))}
                    </div>

                    {/* ── income ratio bar ── */}
                    <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div>
                                <p style={{ ...S.label, marginBottom: 3 }}>Rasio Pemasukan vs Pengeluaran</p>
                                <p style={{ fontSize: 12, fontWeight: 800, color: C.ink }}>{incPct}% Pemasukan</p>
                            </div>
                            <p style={{ fontSize: 10, fontWeight: 800, color: netSaldo >= 0 ? C.green : C.red, alignSelf: 'flex-end' }}>Net: {fmt(netSaldo)}</p>
                        </div>
                        <div style={{ height: 8, background: C.redL, borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ height: 8, borderRadius: 999, background: `linear-gradient(90deg,#34d399,${C.green})`, width: `${incPct}%` }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 8.5, fontWeight: 700 }}>
                            <span style={{ color: C.green }}>Masuk · {fmt(totalIn)}</span>
                            <span style={{ color: C.red }}>Keluar · {fmt(totalOut)}</span>
                        </div>
                    </div>

                    {/* ── analytics 2-col ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>

                        {/* Sumber Pendapatan */}
                        <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ background: C.indigoL, padding: '10px 16px', borderBottom: `1px solid #c7d2fe` }}>
                                <p style={{ ...S.label, color: C.indigo }}>Sumber Pendapatan</p>
                            </div>
                            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {Object.entries(srcBreak).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                                    <div key={k}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 9.5, fontWeight: 600, color: C.ink }}>{k}</span>
                                            <span style={{ fontSize: 9.5, fontWeight: 800, color: C.ink }}>{fmtK(Number(v))}</span>
                                        </div>
                                        <div style={{ height: 5, background: C.line, borderRadius: 999 }}>
                                            <div style={{ height: 5, borderRadius: 999, background: `linear-gradient(90deg,${C.indigo},#818cf8)`, width: `${(Number(v) / maxSrc) * 100}%` }} />
                                        </div>
                                        <p style={{ fontSize: 7.5, color: C.muted, textAlign: 'right', marginTop: 2 }}>
                                            {totalIn > 0 ? `${((Number(v) / totalIn) * 100).toFixed(1)}%` : '0%'}
                                        </p>
                                    </div>
                                ))}
                                {splitTotal > 0 && (
                                    <div style={{ paddingTop: 8, borderTop: `1px dashed ${C.line}`, display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 8.5, color: C.sub, fontWeight: 600 }}>Split Bill ({uniqueSplits} nota)</span>
                                        <span style={{ fontSize: 9, fontWeight: 800, color: C.purple }}>{fmtK(splitTotal)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* right col */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {/* Metode */}
                            <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden', flex: 1 }}>
                                <div style={{ background: '#f0fdf4', padding: '10px 16px', borderBottom: `1px solid #bbf7d0` }}>
                                    <p style={{ ...S.label, color: C.green }}>Metode Pembayaran</p>
                                </div>
                                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    {Object.entries(payM).filter(([m]) => m !== 'MEMBERSHIP').sort((a, b) => b[1] - a[1]).map(([m, v]) => {
                                        const s = methodBadgeStyle[m] || { c: C.sub, bg: C.bg, br: C.line };
                                        const totalCashM = Object.entries(payM).filter(([k]) => k !== 'MEMBERSHIP').reduce((s, [, vv]) => s + Number(vv), 0);
                                        return (
                                            <div key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: 8, fontWeight: 700, color: s.c, background: s.bg, border: `1px solid ${s.br}`, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m}</span>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontSize: 9.5, fontWeight: 800, color: C.ink }}>{fmtK(Number(v))}</span>
                                                    <span style={{ fontSize: 8, color: C.muted, marginLeft: 5 }}>{totalCashM > 0 ? `${((Number(v) / totalCashM) * 100).toFixed(1)}%` : '0%'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {memberUsageEntries.length > 0 && (
                                        <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 6, marginTop: 2 }}>
                                            <p style={{ fontSize: 7, fontWeight: 900, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Saldo Member (Non-kas)</p>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: 8, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 4, padding: '2px 8px' }}>MEMBERSHIP</span>
                                                <span style={{ fontSize: 9, fontWeight: 800, color: '#7c3aed' }}>{memberUsageEntries.length} transaksi</span>
                                            </div>
                                            <p style={{ fontSize: 7, color: '#a78bfa', marginTop: 4 }}>Dipotong dari saldo member · bukan kas fisik</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pengeluaran */}
                            <div style={{ border: `1px solid #fecaca`, borderRadius: 10, overflow: 'hidden', flex: 1 }}>
                                <div style={{ background: C.redL, padding: '10px 16px', borderBottom: `1px solid #fecaca` }}>
                                    <p style={{ ...S.label, color: C.red }}>Pengeluaran per Kategori</p>
                                </div>
                                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {Object.entries(expCat).sort((a, b) => b[1] - a[1]).map(([cat, v]) => (
                                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 9, color: C.sub }}>{cat}</span>
                                            <span style={{ fontSize: 9.5, fontWeight: 800, color: C.red }}>{fmtK(Number(v))}</span>
                                        </div>
                                    ))}
                                    {outEntries.length === 0 && <p style={{ fontSize: 9, color: C.muted, fontStyle: 'italic' }}>Tidak ada pengeluaran</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Loyalty Analytics ── */}
                    {loyaltyStats && (
                        <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden', marginTop: 14 }}>
                            <div style={{ background: '#f5f3ff', padding: '10px 16px', borderBottom: `1px solid #ddd6fe`, display: 'flex', justifyContent: 'space-between' }}>
                                <p style={{ ...S.label, color: '#7c3aed' }}>Loyalty & Reward Analytics</p>
                                <p style={{ fontSize: 7, fontWeight: 900, color: '#7c3aed', textTransform: 'uppercase' }}>Membership Performance</p>
                            </div>
                            <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 20 }}>
                                <div style={{ borderRight: `1px dashed ${C.line}`, paddingRight: 20 }}>
                                    <div style={{ marginBottom: 12 }}>
                                        <p style={{ ...S.label, fontSize: 6.5, marginBottom: 2 }}>Pendapatan Topup</p>
                                        <p style={{ fontSize: 13, fontWeight: 900, color: C.indigo }}>{fmt(loyaltyStats.totalTopupRevenue || 0)}</p>
                                    </div>
                                    <div>
                                        <p style={{ ...S.label, fontSize: 6.5, marginBottom: 2 }}>Poin Tertukar</p>
                                        <p style={{ fontSize: 13, fontWeight: 900, color: '#7c3aed' }}>{loyaltyStats.totalPointsRedeemed || 0} <span style={{ fontSize: 8, color: C.muted }}>PTS</span></p>
                                        <p style={{ fontSize: 7.5, color: C.muted, marginTop: 2 }}>{loyaltyStats.redemptionCount || 0} transaksi penukaran</p>
                                    </div>
                                </div>
                                <div>
                                    <p style={{ ...S.label, fontSize: 6.5, marginBottom: 8 }}>Detail Item Tertukar</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                        {(loyaltyStats.items || []).slice(0, 6).map((item: any) => (
                                            <div key={item.name} style={{ background: C.bg, padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.line}` }}>
                                                <p style={{ fontSize: 7.5, fontWeight: 800, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                                    <span style={{ fontSize: 6.5, color: C.muted }}>{item.count} unit</span>
                                                    <span style={{ fontSize: 7, fontWeight: 900, color: '#7c3aed' }}>{item.points} pts</span>
                                                </div>
                                            </div>
                                        ))}
                                        {(!loyaltyStats.items || loyaltyStats.items.length === 0) && (
                                            <p style={{ fontSize: 8, color: C.muted, fontStyle: 'italic' }}>Tidak ada data penukaran</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ══════════════════ PAGE 2 — DETAIL ══════════════════ */}
                <div className="pb" />

                {/* page 2 header */}
                <div style={{ background: C.navy, padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 3, height: 18, background: `linear-gradient(${C.indigo},#818cf8)`, borderRadius: 2 }} />
                        <div>
                            <p style={{ color: 'rgba(255,255,255,.9)', fontWeight: 900, fontSize: 11 }}>Buku Kas — Detail Transaksi</p>
                            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 8 }}>{venueName}</p>
                        </div>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 8, ...S.mono }}>{docId} · {ledger.length} entri</p>
                </div>
                <div style={{ height: 2, background: `linear-gradient(90deg,${C.indigo},#8b5cf6,#ec4899,#f59e0b,#10b981)` }} />

                <div style={{ padding: '20px 40px 36px' }}>
                    {Object.entries(grouped).map(([date, dayItems]) => {
                        const dayIn = dayItems.reduce((s, i) => i.kind === 'single' ? (i.entry.type === 'in' ? s + Number(i.entry.amount) : s) : s + i.total, 0);
                        const dayOut = dayItems.reduce((s, i) => i.kind === 'single' ? (i.entry.type === 'out' ? s + Number(i.entry.amount) : s) : s, 0);
                        const dayNet = dayIn - dayOut;
                        return (
                            <div key={date} className="keep" style={{ marginBottom: 22 }}>
                                {/* date row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', background: C.bg, border: `1px solid ${C.line}`, borderRadius: 7, marginBottom: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 3, height: 14, background: C.indigo, borderRadius: 2 }} />
                                        <span style={{ fontSize: 11, fontWeight: 900, color: C.ink }}>{date}</span>
                                        <span style={{ fontSize: 8, fontWeight: 700, color: C.muted, background: C.line, padding: '1px 8px', borderRadius: 99 }}>{dayItems.length} entri</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 9, fontWeight: 800 }}>
                                        {dayIn > 0 && <span style={{ color: C.green }}>+{fmt(dayIn)}</span>}
                                        {dayOut > 0 && <span style={{ color: C.red }}>−{fmt(dayOut)}</span>}
                                        <span style={{ color: dayNet >= 0 ? C.green : C.red, background: dayNet >= 0 ? C.greenL : C.redL, padding: '3px 10px', borderRadius: 5, fontSize: 9.5 }}>
                                            {dayNet >= 0 ? '+' : ''}{fmt(dayNet)}
                                        </span>
                                    </div>
                                </div>

                                <table style={{ fontSize: 8.5, border: `1px solid ${C.line}`, borderRadius: 7, overflow: 'hidden' }}>
                                    <thead>
                                        <tr style={{ background: C.bg }}>
                                            {['Waktu', 'Tipe', 'Deskripsi', 'Sumber', 'Metode', 'Jumlah (Rp)', 'Saldo Setelah'].map((h, i) => (
                                                <th key={h} style={{ padding: '6px 10px', fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 6.5, textAlign: i >= 5 ? 'right' : 'left', borderBottom: `1.5px solid ${C.line}` }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dayItems.map((item, idx) => {
                                            if (item.kind === 'group') {
                                                return <TableGroup key={`g-${item.refId}`} item={item} availableMethods={availableMethods} />;
                                            }
                                            return <TableRow key={`s-${item.entry.id}`} entry={item.entry} availableMethods={availableMethods} />;
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: C.bg, borderTop: `1.5px solid ${C.line}` }}>
                                            <td colSpan={4} style={{ padding: '5px 10px', fontSize: 8, fontWeight: 800, color: C.sub, textAlign: 'right' }}>Total {date}</td>
                                            <td />
                                            <td style={{ padding: '5px 10px', textAlign: 'right', fontSize: 9, fontWeight: 900 }}>
                                                {dayIn > 0 && <span style={{ color: C.green, marginRight: 6 }}>+{fmt(dayIn)}</span>}
                                                {dayOut > 0 && <span style={{ color: C.red }}>−{fmt(dayOut)}</span>}
                                            </td>
                                            <td style={{ padding: '5px 10px', textAlign: 'right', fontSize: 9.5, fontWeight: 900, color: dayNet >= 0 ? C.green : C.red }}>
                                                {dayNet >= 0 ? '+' : ''}{fmt(dayNet)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        );
                    })}

                    {/* ── Grand total ── */}
                    <div className="keep" style={{ background: C.navy, borderRadius: 10, padding: '18px 24px', marginTop: 10 }}>
                        <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 14 }}>Ringkasan Total · {ledger.length} Entri</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
                            {[
                                { label: 'Total Masuk', value: fmt(totalIn), color: '#4ade80' },
                                { label: 'Total Keluar', value: fmt(totalOut), color: '#f87171' },
                                { label: 'Net Saldo', value: fmt(netSaldo), color: netSaldo >= 0 ? '#a78bfa' : '#f87171' },
                                { label: 'Saldo Akhir', value: fmt(balance), color: 'white' },
                            ].map(({ label, value, color }, i) => (
                                <div key={label} style={{ paddingLeft: i > 0 ? 22 : 0, paddingRight: 22, borderLeft: i > 0 ? '1px solid rgba(255,255,255,.08)' : 'none' }}>
                                    <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>{label}</p>
                                    <p style={{ color, fontSize: i === 3 ? 20 : 14, fontWeight: 900, letterSpacing: '-0.01em' }}>{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Signature section ── */}
                    <div className="keep" style={{ marginTop: 28, paddingTop: 20, borderTop: `2px solid ${C.line}` }}>
                        <p style={{ ...S.label, textAlign: 'center', marginBottom: 20 }}>Tanda Tangan & Pengesahan Dokumen</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
                            {['Kasir / Bendahara', 'Supervisor / Admin', 'Pemilik / Owner'].map(role => (
                                <div key={role} style={{ textAlign: 'center' }}>
                                    <div style={{ height: 60, border: `1px dashed ${C.line}`, borderRadius: 8, marginBottom: 8, background: C.bg, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 5 }}>
                                        <span style={{ fontSize: 7, color: C.line, fontWeight: 600 }}>tanda tangan</span>
                                    </div>
                                    <div style={{ width: 110, height: 1, background: '#374151', margin: '0 auto 7px' }} />
                                    <p style={{ fontSize: 8.5, fontWeight: 800, color: C.ink }}>{role}</p>
                                    <p style={{ fontSize: 8, color: C.muted, marginTop: 3 }}>Nama: ________________</p>
                                </div>
                            ))}
                        </div>

                        {/* doc footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                            <div>
                                <p style={{ ...S.label, marginBottom: 3 }}>Dicetak Otomatis oleh Sistem</p>
                                <p style={{ fontSize: 8.5, fontWeight: 700, color: C.sub }}>
                                    {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: 48, height: 48, border: `1.5px solid ${C.line}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 36, height: 36, border: `1px dashed #d1d5db`, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: 6.5, color: '#d1d5db', textAlign: 'center', lineHeight: 1.3 }}>STEMPEL{'\n'}KANTOR</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ ...S.label, marginBottom: 3 }}>No. Dokumen</p>
                                <p style={{ fontSize: 9, fontWeight: 800, color: C.ink, ...S.mono }}>{docId}</p>
                                <p style={{ fontSize: 7.5, color: C.muted, marginTop: 2 }}>Dokumen Rahasia — Keperluan Internal</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* bottom stripe */}
                <div style={{ height: 2, background: `linear-gradient(90deg,${C.indigo},#8b5cf6,#ec4899,#f59e0b,#10b981)` }} />
            </div>

            <div style={{ height: 48 }} />
        </>
    );
}
