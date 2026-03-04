'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(2)}Jt` : n >= 1_000 ? `Rp ${(n / 1_000).toFixed(0)}K` : fmt(n);
const fD = (d: any) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fT = (d: any) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';
const now = new Date();
const docId = `BD/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}-${Math.floor(now.getTime() / 1000).toString().slice(-5)}`;

// Design tokens
const C = {
    ink: '#0f172a', sub: '#475569', muted: '#94a3b8', line: '#e2e8f0',
    bg: '#f8fafc', white: '#ffffff',
    navy: '#0f172a', navyL: '#1e293b',
    indigo: '#4f46e5', indigoL: '#eef2ff', indigoBorder: '#c7d2fe',
    green: '#059669', greenL: '#d1fae5',
    red: '#dc2626', redL: '#fee2e2',
    amber: '#d97706', amberL: '#fef3c7',
    violet: '#7c3aed', violetL: '#f5f3ff', violetBorder: '#ddd6fe',
    sky: '#0284c7',
};

function Badge({ text, color, bg, border }: { text: string; color: string; bg: string; border: string }) {
    return (
        <span style={{ fontSize: 6.5, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color, background: bg, border: `1px solid ${border}`, borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap' as const }}>{text}</span>
    );
}

function KpiCard({ label, value, sub, accent, light }: { label: string; value: string; sub: string; accent: string; light: string }) {
    return (
        <div style={{ background: light, border: `1px solid ${accent}20`, borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${accent}` }}>
            <p style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: accent, marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: C.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 8.5, color: C.muted, marginTop: 4 }}>{sub}</p>
        </div>
    );
}

export default function BusinessDayPrintPage() {
    const [report, setReport] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) { setError(true); return; }

        Promise.all([
            axios.get(`${API_URL}/finance/shifts/report/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }),
            axios.get(`${API_URL}/reports/settings`),
        ]).then(([r, s]) => {
            setReport(r.data);
            setSettings(s.data);
        }).catch(() => setError(true));
    }, []);

    if (error) return <div style={{ padding: 40, textAlign: 'center', color: C.red }}>Gagal memuat laporan. Pastikan ID valid dan sudah login.</div>;
    if (!report || !settings) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, fontFamily: 'Inter,sans-serif' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.line}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <p style={{ color: C.muted, fontSize: 13 }}>Menyiapkan Laporan Operasional…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    // ── Data extraction ──────────────────────────────────────────────────────
    const bd = report.businessDay || {};
    const transactions: any[] = report.transactions || [];
    const summary = report.summary || {};
    const shifts: any[] = report.shifts || [];

    const venueName = settings.invoiceBusinessName || settings.businessName || 'Billiard Cafe';
    const venueAddr = settings.invoiceAddress || settings.address || '';

    // Payment methods
    const methodsRaw: Record<string, number> = summary.paymentMethods || {};
    shifts.forEach((s: any) => {
        Object.entries(s.paymentMethods || {}).forEach(([m, a]) => {
            methodsRaw[m] = (methodsRaw[m] || 0) + Number(a);
        });
    });

    const cashMethods = Object.entries(methodsRaw).filter(([m]) => !['MEMBER', 'MEMBERSHIP'].includes(m.toUpperCase()));
    const memberMethods = Object.entries(methodsRaw).filter(([m]) => ['MEMBER', 'MEMBERSHIP'].includes(m.toUpperCase()));
    const totalCash = cashMethods.reduce((s, [, v]) => s + Number(v), 0);
    const totalMember = memberMethods.reduce((s, [, v]) => s + Number(v), 0);

    // Totals
    const totalOmzet = Number(summary.totalOmzet || bd.totalRevenue || 0) || totalCash;
    const totalBilliard = Number(summary.totalBilliard || 0);
    const totalCafe = Number(summary.totalCafe || 0);
    const totalTopUp = Number(summary.totalTopUp || 0);
    const totalVat = transactions.reduce((s, tx) => s + Number(tx.vatAmount || 0), 0);
    const totalSc = transactions.reduce((s, tx) => s + Number(tx.serviceChargeAmount || 0), 0);
    const totalDiscount = transactions.reduce((s, tx) => s + (tx.appliedPromos || []).reduce((ss: number, p: any) => ss + Number(p.discount || 0), 0), 0);
    const txCount = transactions.length;
    const paidCount = transactions.filter(tx => tx.status === 'PAID').length;
    const unpaidCount = txCount - paidCount;

    const printDate = new Date();

    // ── CSS ──────────────────────────────────────────────────────────────────
    const css = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{font-family:'Inter',sans-serif;background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        @media print{
            html,body{background:white!important}
            .no-print{display:none!important}
            .page-wrap{box-shadow:none!important;margin:0!important;border-radius:0!important}
            .keep{break-inside:avoid}
            .pb{break-before:page}
            @page{size:A4 portrait;margin:12mm 10mm}
        }
        @media screen{
            .no-print{display:flex!important}
            .page-wrap{width:210mm;margin:72px auto 48px;box-shadow:0 20px 60px rgba(0,0,0,.15);border-radius:6px;overflow:hidden}
        }
        table{border-collapse:collapse;width:100%}
        th,td{padding:0}
    `;

    const methodBadgeStyle: Record<string, { c: string; bg: string; br: string }> = {
        'CASH': { c: C.green, bg: C.greenL, br: '#a7f3d0' },
        'TUNAI': { c: C.green, bg: C.greenL, br: '#a7f3d0' },
        'QRIS': { c: C.violet, bg: C.violetL, br: C.violetBorder },
        'MEMBER': { c: C.violet, bg: C.violetL, br: C.violetBorder },
        'MEMBERSHIP': { c: C.violet, bg: C.violetL, br: C.violetBorder },
        'TRANSFER': { c: C.sky, bg: '#e0f2fe', br: '#bae6fd' },
        'DEBIT': { c: '#1d4ed8', bg: '#eff6ff', br: '#bfdbfe' },
    };
    function mBadge(m: string) {
        const k = m.toUpperCase();
        const s = methodBadgeStyle[k] || { c: C.sub, bg: C.bg, br: C.line };
        return <Badge text={k === 'MEMBER' ? 'MEMBERSHIP' : k} color={s.c} bg={s.bg} border={s.br} />;
    }

    return (
        <>
            <style>{css}</style>

            {/* Toolbar */}
            <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999, background: 'white', borderBottom: `1px solid ${C.line}`, padding: '10px 24px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 6px rgba(0,0,0,.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => window.close()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sub, fontSize: 13, fontWeight: 700 }}>✕ Tutup</button>
                    <span style={{ color: C.line }}>|</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>Business Day Report — {bd.date || fD(printDate)}</span>
                    <span style={{ background: C.indigoL, color: C.indigo, fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 99 }}>{txCount} transaksi</span>
                </div>
                <button onClick={() => window.print()} style={{ background: C.indigo, color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 12px ${C.indigo}40` }}>
                    🖨️ Cetak / Simpan PDF
                </button>
            </div>

            {/* ════════════════════ PAGE 1 — SUMMARY ════════════════════ */}
            <div className="page-wrap" style={{ background: 'white' }}>

                {/* Header */}
                <div style={{ background: C.navy, padding: '28px 36px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg,${C.indigo},#818cf8,#6366f1)` }} />
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                        <div>
                            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 7, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Laporan Operasional Harian</p>
                            <h1 style={{ color: 'white', fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>Business Day Report</h1>
                            <p style={{ color: 'rgba(99,102,241,.7)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Operational Daily Record</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <p style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{venueName}</p>
                                {venueAddr && <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 9 }}>{venueAddr}</p>}
                                <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 8.5, marginTop: 3 }}>
                                    Tanggal: <span style={{ color: 'rgba(255,255,255,.7)' }}>{bd.date || fD(printDate)}</span>
                                </p>
                                <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 8.5 }}>
                                    Dicetak: <span style={{ color: 'rgba(255,255,255,.55)' }}>{printDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · {printDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                </p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '12px 18px', marginBottom: 8 }}>
                                <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 5 }}>Total Omzet (Kas)</p>
                                <p style={{ color: 'white', fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>{fmt(totalOmzet)}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {[{ label: 'Transaksi', v: txCount, c: '#a78bfa', cb: 'rgba(139,92,246,.12)', cc: 'rgba(139,92,246,.25)' },
                                { label: 'Lunas', v: paidCount, c: '#4ade80', cb: 'rgba(52,211,153,.12)', cc: 'rgba(52,211,153,.25)' }].map(x => (
                                    <div key={x.label} style={{ background: x.cb, border: `1px solid ${x.cc}`, borderRadius: 7, padding: '7px 12px', flex: 1, textAlign: 'left' }}>
                                        <p style={{ color: x.c, fontSize: 6.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3, opacity: .8 }}>{x.label}</p>
                                        <p style={{ color: x.c, fontSize: 14, fontWeight: 900 }}>{x.v}</p>
                                    </div>
                                ))}
                            </div>
                            <p style={{ color: 'rgba(255,255,255,.18)', fontSize: 7.5, marginTop: 8, fontFamily: "'SF Mono', monospace" }}>{docId}</p>
                        </div>
                    </div>
                </div>

                {/* Accent bar */}
                <div style={{ height: 2, background: `linear-gradient(90deg,${C.indigo},#8b5cf6,#ec4899,#f59e0b,#10b981)` }} />

                <div style={{ padding: '24px 36px 32px' }}>

                    {/* KPI Row */}
                    <div className="keep" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                        <KpiCard label="Billiard Revenue" value={fmt(totalBilliard)} sub={`${transactions.filter(tx => tx.type !== 'TOPUP' && tx.billiardTotal > 0).length} sesi`} accent={C.indigo} light={C.indigoL} />
                        <KpiCard label="Café & F&B Revenue" value={fmt(totalCafe)} sub={`${transactions.filter(tx => Number(tx.cafeTotal) > 0).length} transaksi`} accent={C.amber} light={C.amberL} />
                        <KpiCard label="Top-up Member" value={fmt(totalTopUp)} sub={`${transactions.filter(tx => tx.type === 'TOPUP').length} top-up`} accent={C.green} light={C.greenL} />
                    </div>
                    <div className="keep" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 22 }}>
                        <KpiCard label="Service Charge (SC)" value={fmt(totalSc)} sub="Terkumpul" accent={C.amber} light={C.amberL} />
                        <KpiCard label="PPN / VAT" value={fmt(totalVat)} sub="Dipungut" accent={C.sky} light="#e0f2fe" />
                        <KpiCard label="Total Diskon / Promo" value={fmt(totalDiscount)} sub="Diberikan" accent={C.red} light={C.redL} />
                    </div>

                    {/* Financial Waterfall + Payment Methods */}
                    <div className="keep" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>

                        {/* Audit Waterfall */}
                        <div style={{ background: C.navyL, borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                                <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 7.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Audit Trail Keuangan</p>
                            </div>
                            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                    { label: 'Gross Revenue (Sebelum Pajak)', val: totalOmzet + totalDiscount - totalSc - totalVat, color: 'white' },
                                    { label: 'Potongan Promo / Diskon', val: -totalDiscount, color: '#f87171' },
                                    { label: '+ Service Charge (SC)', val: totalSc, color: '#fbbf24' },
                                    { label: '+ PPN / VAT', val: totalVat, color: '#a5b4fc' },
                                ].map((row, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,.45)', fontWeight: 600 }}>{row.label}</span>
                                        <span style={{ fontSize: 9.5, fontWeight: 900, color: row.color }}>
                                            {row.val < 0 ? `-${fmt(-row.val)}` : `+${fmt(row.val)}`}
                                        </span>
                                    </div>
                                ))}
                                {totalMember > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 8.5, color: '#c4b5fd', fontWeight: 600 }}>Saldo Member (Non-kas)</span>
                                        <span style={{ fontSize: 9.5, fontWeight: 900, color: '#c4b5fd' }}>⊘ {fmt(totalMember)}</span>
                                    </div>
                                )}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 8, marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Net Revenue (Kas Fisik)</span>
                                    <span style={{ fontSize: 15, fontWeight: 900, color: '#34d399' }}>{fmt(totalOmzet)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ background: C.indigoL, padding: '10px 16px', borderBottom: `1px solid ${C.indigoBorder}` }}>
                                <p style={{ fontSize: 7.5, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: C.indigo }}>Metode Pembayaran</p>
                            </div>
                            <div style={{ padding: '12px 16px' }}>
                                {cashMethods.length > 0 && (
                                    <>
                                        <p style={{ fontSize: 6.5, fontWeight: 900, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 7 }}>Kas Fisik Diterima</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                                            {cashMethods.map(([m, v]) => (
                                                <div key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    {mBadge(m)}
                                                    <div style={{ flex: 1, marginLeft: 8 }}>
                                                        <div style={{ height: 4, background: C.line, borderRadius: 999 }}>
                                                            <div style={{ height: 4, borderRadius: 999, background: C.indigo, width: totalCash > 0 ? `${(Number(v) / totalCash) * 100}%` : '0%' }} />
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: 9.5, fontWeight: 900, color: C.ink, marginLeft: 8 }}>{fmtK(Number(v))}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.line}`, paddingTop: 6, marginBottom: 8 }}>
                                            <span style={{ fontSize: 8, fontWeight: 700, color: C.sub }}>Total Kas Diterima</span>
                                            <span style={{ fontSize: 10, fontWeight: 900, color: C.green }}>{fmt(totalCash)}</span>
                                        </div>
                                    </>
                                )}
                                {memberMethods.length > 0 && (
                                    <>
                                        <p style={{ fontSize: 6.5, fontWeight: 900, color: C.violet, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 7 }}>Saldo Member (Non-kas)</p>
                                        {memberMethods.map(([m, v]) => (
                                            <div key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                {mBadge(m)}
                                                <div style={{ flex: 1 }} />
                                                <span style={{ fontSize: 9.5, fontWeight: 900, color: C.violet }}>{fmtK(Number(v))}</span>
                                            </div>
                                        ))}
                                        <p style={{ fontSize: 7, color: C.violet, opacity: .7 }}>Dipotong dari saldo member · bukan kas masuk</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Shift Breakdown */}
                    {shifts.length > 0 && (
                        <div className="keep" style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                            <div style={{ background: C.bg, padding: '10px 16px', borderBottom: `1px solid ${C.line}` }}>
                                <p style={{ fontSize: 7.5, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: C.sub }}>Rincian Shift ({shifts.length})</p>
                            </div>
                            <table>
                                <thead>
                                    <tr style={{ background: C.bg }}>
                                        {['Kasir', 'Buka', 'Tutup', 'Durasi', 'R. Masuk', 'Billiard', 'Café', 'Status'].map((h, i) => (
                                            <th key={h} style={{ padding: '6px 10px', fontSize: 6.5, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: i >= 4 ? 'right' : 'left', borderBottom: `1px solid ${C.line}` }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {shifts.map((s: any, i: number) => {
                                        const dur = s.startTime && s.endTime
                                            ? `${Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000)}m`
                                            : '—';
                                        return (
                                            <tr key={i} style={{ borderBottom: `1px solid ${C.line}`, background: i % 2 === 0 ? 'white' : C.bg }}>
                                                <td style={{ padding: '6px 10px', fontSize: 9, fontWeight: 700, color: C.ink }}>{s.startedBy || s.userName || '—'}</td>
                                                <td style={{ padding: '6px 10px', fontSize: 8, color: C.sub }}>{fT(s.startTime)}</td>
                                                <td style={{ padding: '6px 10px', fontSize: 8, color: C.sub }}>{s.endTime ? fT(s.endTime) : '—'}</td>
                                                <td style={{ padding: '6px 10px', fontSize: 8, color: C.muted }}>{dur}</td>
                                                <td style={{ padding: '6px 10px', fontSize: 9, fontWeight: 800, color: C.green, textAlign: 'right' }}>{fmtK(Number(s.cashRevenue || s.totalRevenue || 0))}</td>
                                                <td style={{ padding: '6px 10px', fontSize: 8, color: C.sub, textAlign: 'right' }}>{fmtK(Number(s.billiardRevenue || 0))}</td>
                                                <td style={{ padding: '6px 10px', fontSize: 8, color: C.sub, textAlign: 'right' }}>{fmtK(Number(s.cafeRevenue || 0))}</td>
                                                <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                                                    <Badge text={s.endTime ? 'Tutup' : 'Buka'} color={s.endTime ? C.green : C.amber} bg={s.endTime ? C.greenL : C.amberL} border={s.endTime ? '#a7f3d0' : '#fde68a'} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ════════════════════ PAGE 2 — INVOICE TABLE ════════════════════ */}
                <div className="pb" />

                {/* Page 2 header */}
                <div style={{ background: C.navy, padding: '14px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 3, height: 18, background: `linear-gradient(${C.indigo},#818cf8)`, borderRadius: 2 }} />
                        <div>
                            <p style={{ color: 'rgba(255,255,255,.9)', fontWeight: 900, fontSize: 11 }}>Rincian Transaksi & Invoice</p>
                            <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 8 }}>{venueName} · {bd.date}</p>
                        </div>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 8, fontFamily: 'monospace' }}>{docId} · {txCount} transaksi</p>
                </div>
                <div style={{ height: 2, background: `linear-gradient(90deg,${C.indigo},#8b5cf6,#ec4899,#f59e0b,#10b981)` }} />

                <div style={{ padding: '20px 36px 36px' }}>
                    <table style={{ fontSize: 8, border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ background: C.bg }}>
                                {['#', 'Invoice', 'Status', 'Customer / Tamu', 'Meja / Café', 'Paket', 'Mulai', 'Selesai', 'Durasi', 'Billiard', 'Café', 'SC', 'PPN', 'Diskon', 'Grand Total', 'Metode', 'Kasir'].map((h, i) => (
                                    <th key={h} style={{ padding: '6px 6px', fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 6, textAlign: i >= 9 ? 'right' : 'left', borderBottom: `1.5px solid ${C.line}`, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx: any, idx: number) => {
                                const isPaid = tx.status === 'PAID';
                                const methods = (tx.txPaymentDetails || tx.paymentDetails || []);
                                const payStr = Array.isArray(methods)
                                    ? methods.map((p: any) => (p.method || p.paymentMethod || '').toUpperCase()).filter(Boolean).join('+') || '—'
                                    : '—';
                                const discount = (tx.appliedPromos || []).reduce((s: number, p: any) => s + Number(p.discount || 0), 0);
                                return (
                                    <tr key={tx.id} style={{ background: idx % 2 === 0 ? 'white' : C.bg, borderBottom: `1px solid ${C.line}` }}>
                                        <td style={{ padding: '5px 6px', fontSize: 7.5, color: C.muted, fontFamily: 'monospace' }}>{idx + 1}</td>
                                        <td style={{ padding: '5px 6px', fontWeight: 800, color: C.indigo, fontSize: 8, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{tx.invoiceNumber || `#${tx.id}`}</td>
                                        <td style={{ padding: '5px 6px' }}>
                                            <Badge text={tx.status} color={isPaid ? C.green : C.amber} bg={isPaid ? C.greenL : C.amberL} border={isPaid ? '#a7f3d0' : '#fde68a'} />
                                        </td>
                                        <td style={{ padding: '5px 6px', fontSize: 8, color: C.ink, fontWeight: 600, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {tx.customerName || tx.guestName || `${tx.guestCount || '-'} Tamu`}
                                        </td>
                                        <td style={{ padding: '5px 6px', fontSize: 8, color: C.sub }}>
                                            {tx.table?.name || (tx.tableId ? `Meja ${tx.tableId}` : tx.cafeTable?.name || '—')}
                                        </td>
                                        <td style={{ padding: '5px 6px', fontSize: 7.5, color: C.sub, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.fareName || tx.packageName || '—'}</td>
                                        <td style={{ padding: '5px 6px', fontSize: 7.5, color: C.muted, whiteSpace: 'nowrap' }}>{fT(tx.startTime)}</td>
                                        <td style={{ padding: '5px 6px', fontSize: 7.5, color: C.muted, whiteSpace: 'nowrap' }}>{tx.endTime ? fT(tx.endTime) : '—'}</td>
                                        <td style={{ padding: '5px 6px', fontSize: 7.5, color: C.muted, textAlign: 'right' }}>{tx.sessionDuration || '—'}</td>
                                        <td style={{ padding: '5px 6px', fontSize: 8, fontWeight: 700, color: C.ink, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(Number(tx.billiardTotal || 0))}</td>
                                        <td style={{ padding: '5px 6px', fontSize: 8, color: C.sub, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(Number(tx.cafeTotal || 0))}</td>
                                        <td style={{ padding: '5px 6px', fontSize: 8, color: C.amber, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(Number(tx.serviceChargeAmount || 0))}</td>
                                        <td style={{ padding: '5px 6px', fontSize: 8, color: C.sky, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(Number(tx.vatAmount || 0))}</td>
                                        <td style={{ padding: '5px 6px', fontSize: 8, color: C.red, textAlign: 'right', whiteSpace: 'nowrap' }}>{discount > 0 ? `-${fmt(discount)}` : '—'}</td>
                                        <td style={{ padding: '5px 6px', fontSize: 9, fontWeight: 900, color: C.ink, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(Number(tx.grandTotal || 0))}</td>
                                        <td style={{ padding: '5px 6px', whiteSpace: 'nowrap' }}>
                                            {payStr.split('+').map((m: string, i: number) => (
                                                <span key={i} style={{ marginRight: 2, display: 'inline-block' }}>{mBadge(m.trim())}</span>
                                            ))}
                                        </td>
                                        <td style={{ padding: '5px 6px', fontSize: 7, color: C.muted }}>{'—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: C.navy, borderTop: `2px solid ${C.line}` }}>
                                <td colSpan={9} style={{ padding: '7px 8px', fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,.6)', textAlign: 'right' }}>TOTAL ({txCount} transaksi)</td>
                                <td style={{ padding: '7px 6px', fontWeight: 900, color: '#a5b4fc', fontSize: 9, textAlign: 'right' }}>{fmt(totalBilliard)}</td>
                                <td style={{ padding: '7px 6px', fontWeight: 900, color: '#fbbf24', fontSize: 9, textAlign: 'right' }}>{fmt(totalCafe)}</td>
                                <td style={{ padding: '7px 6px', fontWeight: 900, color: '#fbbf24', fontSize: 9, textAlign: 'right' }}>{fmt(totalSc)}</td>
                                <td style={{ padding: '7px 6px', fontWeight: 900, color: '#93c5fd', fontSize: 9, textAlign: 'right' }}>{fmt(totalVat)}</td>
                                <td style={{ padding: '7px 6px', fontWeight: 900, color: '#f87171', fontSize: 9, textAlign: 'right' }}>-{fmt(totalDiscount)}</td>
                                <td style={{ padding: '7px 6px', fontWeight: 900, color: '#4ade80', fontSize: 11, textAlign: 'right' }}>{fmt(totalOmzet)}</td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    </table>

                    {/* Signature */}
                    <div className="keep" style={{ marginTop: 28, paddingTop: 20, borderTop: `2px solid ${C.line}` }}>
                        <p style={{ fontSize: 7, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center', marginBottom: 18 }}>Tanda Tangan & Pengesahan Laporan</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                            {['Kasir / Bendahara', 'Supervisor / Admin', 'Pemilik / Owner'].map(role => (
                                <div key={role} style={{ textAlign: 'center' }}>
                                    <div style={{ height: 56, border: `1px dashed ${C.line}`, borderRadius: 8, marginBottom: 8, background: C.bg, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 5 }}>
                                        <span style={{ fontSize: 6.5, color: C.line, fontWeight: 600 }}>tanda tangan</span>
                                    </div>
                                    <div style={{ width: 100, height: 1, background: '#374151', margin: '0 auto 6px' }} />
                                    <p style={{ fontSize: 8.5, fontWeight: 800, color: C.ink }}>{role}</p>
                                    <p style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>Nama: ________________</p>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                            <div>
                                <p style={{ fontSize: 7, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>Dicetak Otomatis oleh Sistem</p>
                                <p style={{ fontSize: 8.5, fontWeight: 700, color: C.sub }}>{printDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {printDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 7, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>No. Dokumen</p>
                                <p style={{ fontSize: 9, fontWeight: 800, color: C.ink, fontFamily: 'monospace' }}>{docId}</p>
                                <p style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>Dokumen Rahasia — Keperluan Internal</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ height: 2, background: `linear-gradient(90deg,${C.indigo},#8b5cf6,#ec4899,#f59e0b,#10b981)` }} />
            </div>

            <div style={{ height: 48 }} />
        </>
    );
}
