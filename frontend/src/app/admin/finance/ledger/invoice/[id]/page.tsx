'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';

// import { API_URL } from '@/utils/urlUtils';

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n: number | string) => `Rp ${Math.round(Number(n)).toLocaleString('id-ID')}`;
const fDate = (d: string | Date) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
const fTime = (d: string | Date) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fFull = (d: string | Date) => `${fDate(d)}, ${fTime(d)}`;

function methodLabel(m: string = '') {
    const s = m.toLowerCase();
    if (s.includes('qris') || s.includes('qr')) return 'QRIS';
    if (s.includes('cash') || s.includes('tunai') || s === '') return 'Tunai';
    return m.toUpperCase(); // Directly show BCA, BNI, BJB, SHOPEEPAY, etc.
}

// ─── Group order items by bundleGroupId ──────────────────────────────────────
function groupOrderItems(orderItems: any[]) {
    const bundles: Record<string, any[]> = {};
    const standalone: any[] = [];

    for (const item of orderItems) {
        if (item.bundleGroupId) {
            if (!bundles[item.bundleGroupId]) bundles[item.bundleGroupId] = [];
            bundles[item.bundleGroupId].push(item);
        } else {
            standalone.push(item);
        }
    }
    return { bundles, standalone };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p style={{ fontSize: 9, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>
            {children}
        </p>
    );
}

function InfoCard({ rows }: { rows: { label: string; value: string }[] }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {rows.map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 11, color: '#1f2937', fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
            ))}
        </div>
    );
}

// Bundle package card
function BundleCard({ groupId, items }: { groupId: string; items: any[] }) {
    // Derive package name: use customName of first item, or groupId label
    const bundleName = items[0]?.customName || `Paket Bundle ${groupId}`;
    const bundleTotal = items.reduce((s: number, i: any) =>
        s + Number(i.priceAtOrder ?? 0) * Number(i.quantity ?? 1), 0
    );

    return (
        <div style={{ border: '1.5px solid #c7d2fe', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ background: '#4f46e5', borderRadius: 6, padding: '3px 8px' }}>
                        <span style={{ color: 'white', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }}>BUNDLING</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#312e81' }}>{bundleName}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#4f46e5' }}>{fmt(bundleTotal)}</span>
            </div>
            {/* Items inside bundle */}
            <div style={{ background: 'white', padding: '10px 16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        {items.map((item: any, i: number) => (
                            <tr key={item.id} style={{ borderBottom: i < items.length - 1 ? '1px dashed #e5e7eb' : 'none' }}>
                                <td style={{ padding: '5px 0', fontSize: 11, color: '#374151' }}>
                                    • {item.menuItem?.name || item.customName || '—'}
                                    {item.note && <span style={{ color: '#9ca3af', marginLeft: 6, fontSize: 10 }}>({item.note})</span>}
                                </td>
                                <td style={{ padding: '5px 0', fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>×{item.quantity}</td>
                                <td style={{ padding: '5px 0', fontSize: 11, color: '#6b7280', textAlign: 'right' }}>
                                    {item.priceAtOrder > 0 ? fmt(item.priceAtOrder) : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Promo discount section
function PromoCard({ promos }: { promos: any[] }) {
    if (!promos || promos.length === 0) return null;
    return (
        <div style={{ marginBottom: 10 }}>
            {promos.map((promo: any, i: number) => (
                <div key={i} style={{ border: '1.5px solid #bbf7d0', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ background: '#16a34a', borderRadius: 6, padding: '3px 8px' }}>
                                <span style={{ color: 'white', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }}>PROMO</span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#14532d' }}>{promo.name || promo.promoName || `Promo #${i + 1}`}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#16a34a' }}>
                            -{fmt(promo.discount || promo.discountAmount || 0)}
                        </span>
                    </div>
                    {promo.description && (
                        <div style={{ background: 'white', padding: '8px 16px' }}>
                            <p style={{ fontSize: 10, color: '#6b7280' }}>{promo.description}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// Individual items table (non-bundle)
function StandaloneItemsTable({ items }: { items: any[] }) {
    if (!items || items.length === 0) return null;
    const total = items.reduce((s: number, i: any) => s + Number(i.priceAtOrder ?? 0) * Number(i.quantity ?? 1), 0);

    return (
        <div style={{ border: '1px solid #e8eaf0', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f8fafc' }}>
                        {['#', 'Nama Menu', 'Catatan', 'Qty', 'Harga', 'Subtotal'].map((h, i) => (
                            <th key={h} style={{
                                padding: '9px 12px',
                                fontSize: 9, fontWeight: 800, color: '#6b7280',
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                textAlign: i >= 3 ? 'right' : 'left',
                                borderBottom: '1px solid #e8eaf0',
                            }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item: any, idx: number) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                            <td style={{ padding: '8px 12px', fontSize: 10, color: '#d1d5db', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ padding: '8px 12px' }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#1f2937' }}>{item.menuItem?.name || item.customName || '—'}</p>
                                {item.menuItem?.category && (
                                    <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>{typeof item.menuItem.category === 'string' ? item.menuItem.category : item.menuItem.category?.name || ''}</p>
                                )}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: 10, color: '#6b7280' }}>{item.note || '—'}</td>
                            <td style={{ padding: '8px 12px', fontSize: 11, color: '#1f2937', fontWeight: 700, textAlign: 'right' }}>×{item.quantity}</td>
                            <td style={{ padding: '8px 12px', fontSize: 10, color: '#6b7280', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(item.priceAtOrder || 0)}</td>
                            <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 800, color: '#111827', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(Number(item.priceAtOrder || 0) * Number(item.quantity || 1))}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr style={{ background: '#f1f5f9' }}>
                        <td colSpan={5} style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#6b7280', textAlign: 'right' }}>Subtotal Menu</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 900, color: '#4f46e5', textAlign: 'right' }}>{fmt(total)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InvoicePage() {
    const params = useParams();
    const id = params?.id as string;
    const [tx, setTx] = useState<any>(null);
    const [error, setError] = useState('');
    const printed = useRef(false);

    useEffect(() => {
        if (!id) return;
        const isNumeric = /^\d+$/.test(id);
        const fetchFull = (numId: number | string) =>
            axios.get(`/transactions/${numId}`).then(r => setTx(r.data));

        if (isNumeric) {
            fetchFull(id).catch(() => setError('Transaksi tidak ditemukan.'));
        } else {
            // Invoice number string like TAB-260221164318
            axios.get(`/transactions/invoice/${id}`)
                .then(r => fetchFull(r.data.id))
                .catch(() => setError('Transaksi tidak ditemukan.'));
        }
    }, [id]);

    useEffect(() => {
        if (tx && !printed.current) {
            printed.current = true;
            setTimeout(() => window.print(), 700);
        }
    }, [tx]);

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md">
                <p className="text-5xl mb-4">⚠️</p>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Gagal Memuat Invoice</h2>
                <p className="text-slate-500 text-sm">{error}</p>
            </div>
        </div>
    );

    if (!tx) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-medium text-sm">Menyiapkan invoice...</p>
            </div>
        </div>
    );

    // ── Derived data ──────────────────────────────────────────────────────────
    const payments: any[] = tx.payments || [];
    const orderItems: any[] = tx.orderItems || [];
    const appliedPromos: any[] = Array.isArray(tx.appliedPromos) ? tx.appliedPromos : [];
    const billingDetails: any = tx.billingDetails || null;
    const isSplit = payments.length > 1 || payments.some((p: any) => p.payerName);

    const { bundles, standalone } = groupOrderItems(orderItems);
    const hasBundles = Object.keys(bundles).length > 0;
    const hasStandalone = standalone.length > 0;
    const hasMenuOrders = orderItems.length > 0;
    const hasPromos = appliedPromos.length > 0;

    const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.totalPaid ?? 0), 0);
    const printDate = new Date();

    // ── Billing/session detail rows ───────────────────────────────────────────
    const sessionRows: { label: string; value: string }[] = [
        { label: 'Jenis Sesi', value: tx.sessionType || '—' },
        { label: 'Paket / Tarif', value: tx.fareName || '—' },
        { label: 'Mulai Bermain', value: tx.startTime ? fFull(tx.startTime) : '—' },
        { label: 'Selesai Bermain', value: tx.endTime ? fFull(tx.endTime) : '—' },
        { label: 'Durasi Bermain', value: tx.sessionDuration || '—' },
    ];

    // Parse billingDetails for dynamic pricing segments
    type BillingSegment = { label?: string; period?: string; rate?: number; duration?: string; amount?: number; description?: string };
    const billingSegments: BillingSegment[] =
        billingDetails?.segments || billingDetails?.breakdown || [];

    return (
        <>
            {/* ── Print / Screen CSS ── */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                html, body {
                    font-family: 'Inter', sans-serif;
                    background: #f1f5f9;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                @media print {
                    html, body { width: 210mm; background: white !important; }
                    .no-print { display: none !important; }
                    .page {
                        width: 100% !important;
                        min-height: unset !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                    }
                    @page { size: A4 portrait; margin: 15mm 10mm; }
                }
                @media screen {
                    .page { width: 794px; min-height: 1123px; margin: 32px auto; border-radius: 8px; }
                }
            `}</style>

            {/* Screen action bar */}
            <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => window.close()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
                        ✕ Tutup
                    </button>
                    <span className="text-slate-200">|</span>
                    <span className="text-sm font-bold text-slate-700">Invoice #{tx.invoiceNumber}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-black ${isSplit ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {isSplit ? '🔀 Split Bill' : '📋 Reguler'}
                    </span>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md shadow-indigo-200">
                    🖨️ Cetak / Simpan PDF
                </button>
            </div>
            <div className="no-print h-16" />

            {/* ══ INVOICE PAGE ══════════════════════════════════════════════════ */}
            <div className="page bg-white shadow-2xl" style={{ fontFamily: "'Inter', sans-serif" }}>

                {/* ── HEADER ────────────────────────────────────────────────── */}
                <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%)', padding: '40px 52px 32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {/* Brand */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.25)', fontSize: 20 }}>🎱</div>
                                <div>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Billiard &amp; Café</p>
                                    <p style={{ color: 'white', fontSize: 20, fontWeight: 900, lineHeight: 1 }}>Manajemen</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 12px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                        {isSplit ? '🔀 Split Bill Invoice' : '📋 Invoice Resmi'}
                                    </span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 12px' }}>
                                    <span style={{ color: tx.status === 'PAID' ? '#86efac' : '#fde68a', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                        {tx.status === 'PAID' ? '✓ LUNAS' : tx.status === 'PARTIAL' ? '◐ SEBAGIAN' : tx.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Invoice meta */}
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Nomor Invoice</p>
                            <p style={{ color: 'white', fontSize: 18, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: 10 }}>#{tx.invoiceNumber}</p>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Dicetak</p>
                            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600 }}>{fFull(printDate)}</p>
                        </div>
                    </div>

                    {/* Stats ribbon */}
                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Meja', value: tx.cafeTable?.tableName ? `☕ ${tx.cafeTable.tableName}` : (tx.table?.tableName || (tx.tableId ? `Meja ${tx.tableId}` : '—')) },
                            { label: 'Pelanggan', value: tx.customerName || '—' },
                            ...(Number(tx.billiardTotal || 0) > 0 ? [{ label: 'Durasi', value: tx.sessionDuration || '—' }] : []),
                            { label: 'Pembayar', value: isSplit ? `${payments.length} Orang (Split)` : (payments[0]?.payerName || 'Umum') },
                            { label: 'Metode', value: isSplit ? 'Multipayment' : (payments[0] ? methodLabel(payments[0].paymentMethod) : 'Tunai') },
                            { label: 'Tanggal Transaksi', value: tx.createdAt ? fDate(tx.createdAt) : '—' },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>{label}</p>
                                <p style={{ color: 'white', fontSize: 12, fontWeight: 800 }}>{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── BODY ──────────────────────────────────────────────────── */}
                <div style={{ padding: '36px 52px' }}>

                    {/* ── Row: Session + Financial summary ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: Number(tx.billiardTotal || 0) > 0 ? '1fr 1fr' : '1fr', gap: 14, marginBottom: 28 }}>
                        {/* Session info */}
                        {Number(tx.billiardTotal || 0) > 0 && (
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                                <SectionLabel>🎱 Sesi Bermain Billiard</SectionLabel>
                                <InfoCard rows={sessionRows} />

                                {/* Dynamic billing segments */}
                                {billingSegments.length > 0 && (
                                    <div style={{ marginTop: 12, borderTop: '1px dashed #e2e8f0', paddingTop: 10 }}>
                                        <p style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Rincian Tarif Dinamis</p>
                                        {billingSegments.map((seg: BillingSegment, i: number) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: 10, color: '#6b7280' }}>{seg.label || seg.period || seg.description || `Segmen ${i + 1}`}{seg.duration ? ` (${seg.duration})` : ''}</span>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: '#374151' }}>{fmt(seg.amount || (seg.rate ?? 0))}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Financial summary */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                            <SectionLabel>💰 Ringkasan Tagihan</SectionLabel>
                            <InfoCard rows={[
                                ...(Number(tx.billiardTotal || 0) > 0 ? [{ label: 'Tagihan Billiard', value: fmt(tx.billiardTotal || 0) }] : []),
                                { label: 'Tagihan Café', value: fmt(tx.cafeTotal || 0) },
                                { label: 'PPN / Pajak', value: fmt(tx.vatAmount || 0) },
                                { label: 'Biaya Layanan', value: fmt(tx.serviceChargeAmount || 0) },
                                { label: 'Pembulatan', value: fmt(tx.roundingAmount || 0) },
                            ]} />
                            {/* Divider + grand total */}
                            <div style={{ borderTop: '1.5px solid #c7d2fe', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#1f2937' }}>Grand Total</span>
                                <span style={{ fontSize: 16, fontWeight: 900, color: '#4338ca' }}>{fmt(tx.grandTotal || 0)}</span>
                            </div>
                            {/* Payment method if not split */}
                            {!isSplit && payments[0] && (
                                <div style={{ marginTop: 12, background: '#f0f4ff', borderRadius: 10, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #c7d2fe' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: 8, color: '#4338ca', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metode Pembayaran</span>
                                        <span style={{ fontSize: 11, color: '#312e81', fontWeight: 900, textTransform: 'uppercase' }}>{methodLabel(payments[0].paymentMethod)}</span>
                                    </div>
                                    <div style={{ width: 8, height: 8, background: '#4338ca', borderRadius: '50%' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Café Order Section ── */}
                    {hasMenuOrders && (
                        <div style={{ marginBottom: 28 }}>
                            <SectionLabel>🍽️ Pesanan Café</SectionLabel>

                            {/* Bundle groups */}
                            {hasBundles && (
                                <div style={{ marginBottom: 4 }}>
                                    {Object.entries(bundles).map(([groupId, items]) => (
                                        <BundleCard key={groupId} groupId={groupId} items={items as any[]} />
                                    ))}
                                </div>
                            )}

                            {/* Standalone individual items */}
                            {hasStandalone && (
                                <StandaloneItemsTable items={standalone} />
                            )}

                            {/* Applied promos */}
                            {hasPromos && (
                                <div style={{ marginTop: 6 }}>
                                    <p style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>🎁 Diskon / Promo Diterapkan</p>
                                    <PromoCard promos={appliedPromos} />
                                </div>
                            )}

                            {/* Café total summary */}
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#14532d' }}>Total Tagihan Café</span>
                                <span style={{ fontSize: 14, fontWeight: 900, color: '#15803d' }}>{fmt(tx.cafeTotal || 0)}</span>
                            </div>
                        </div>
                    )}

                    {/* ── Split Bill Detail ── */}
                    {isSplit && (
                        <div style={{ marginBottom: 28 }}>
                            <SectionLabel>🔀 Rincian Split Bill — {payments.length} Pembayar</SectionLabel>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {payments.map((p: any, idx: number) => {
                                    const snapshot: any[] = p.itemsSnapshot || [];
                                    return (
                                        <div key={p.id} style={{ border: '1.5px solid #ede9fe', borderRadius: 14, overflow: 'hidden' }}>
                                            {/* Payer header */}
                                            <div style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 32, height: 32, background: '#7c3aed', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 900 }}>{idx + 1}</div>
                                                    <div>
                                                        <p style={{ fontSize: 14, fontWeight: 900, color: '#1e1b4b' }}>{p.payerName || `Pembayar ${idx + 1}`}</p>
                                                        <p style={{ fontSize: 10, color: '#6b7280', fontWeight: 500, marginTop: 1 }}>{p.createdAt ? fFull(p.createdAt) : '—'}</p>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{methodLabel(p.paymentMethod)}</p>
                                                    <p style={{ fontSize: 18, fontWeight: 900, color: '#4f46e5' }}>{fmt(p.totalPaid || 0)}</p>
                                                </div>
                                            </div>

                                            {/* Breakdown */}
                                            <div style={{ padding: '14px 18px', background: 'white' }}>
                                                {/* Items snapshot */}
                                                {snapshot.length > 0 && (
                                                    <div style={{ marginBottom: 12 }}>
                                                        <p style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Item yang Dibayar</p>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                            <tbody>
                                                                {snapshot.map((item: any, si: number) => (
                                                                    <tr key={si} style={{ borderBottom: '1px dashed #f3f4f6' }}>
                                                                        <td style={{ padding: '4px 0', fontSize: 11, color: '#374151' }}>• {item.name || item.menuName || '—'}</td>
                                                                        <td style={{ padding: '4px 0', fontSize: 10, color: '#9ca3af', textAlign: 'center', width: 40 }}>×{item.qty || item.quantity || 1}</td>
                                                                        <td style={{ padding: '4px 0', fontSize: 11, color: '#374151', fontWeight: 700, textAlign: 'right' }}>{fmt(item.subtotal || item.price || 0)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        <div style={{ borderTop: '1px dashed #e5e7eb', marginTop: 8 }} />
                                                    </div>
                                                )}

                                                {/* mini cost grid */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                                    {[
                                                        { l: 'Billiard', v: fmt(p.billiardPortion || 0), accent: '#1d4ed8', bg: '#eff6ff' },
                                                        { l: 'Café', v: fmt(p.itemsSubtotal || 0), accent: '#047857', bg: '#f0fdf4' },
                                                        { l: 'PPN + Svc', v: fmt(Number(p.taxAmount || 0) + Number(p.serviceAmount || 0)), accent: '#b45309', bg: '#fffbeb' },
                                                    ].map(({ l, v, accent, bg }) => (
                                                        <div key={l} style={{ background: bg, borderRadius: 8, padding: '8px 10px' }}>
                                                            <p style={{ fontSize: 8, color: accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{l}</p>
                                                            <p style={{ fontSize: 11, fontWeight: 800, color: '#1f2937' }}>{v}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Grand Total Bar ── */}
                    <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%)', borderRadius: 14, padding: '20px 28px', marginBottom: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${[Number(tx.billiardTotal || 0) > 0, Number(tx.cafeTotal || 0) > 0, isSplit, true, true].filter(Boolean).length}, 1fr)`, gap: 0 }}>
                            {[
                                ...(Number(tx.billiardTotal || 0) > 0 ? [{ label: 'Billiard', value: fmt(tx.billiardTotal || 0), border: true }] : []),
                                ...(Number(tx.cafeTotal || 0) > 0 ? [{ label: 'Café', value: fmt(tx.cafeTotal || 0), border: true }] : []),
                                ...(isSplit ? [{ label: `${payments.length} Pembayar`, value: `Split Bill`, border: true }] : []),
                                {
                                    label: !isSplit && payments[0] ? methodLabel(payments[0].paymentMethod) : 'Total Dibayar',
                                    value: fmt(totalPaid || tx.paidAmount || 0),
                                    border: true,
                                    highlightLabel: !isSplit && payments[0]
                                },
                                { label: 'GRAND TOTAL', value: fmt(tx.grandTotal || 0), border: false, highlight: true },
                            ].map(({ label, value, border, highlight, highlightLabel }: any) => (
                                <div key={label} style={{ padding: '0 18px', borderRight: border ? '1px solid rgba(255,255,255,0.1)' : 'none', textAlign: 'center' }}>
                                    <p style={{ color: (highlight || highlightLabel) ? '#a5b4fc' : 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>{label}</p>
                                    <p style={{ color: highlight ? '#a5b4fc' : 'white', fontSize: highlight ? 16 : 13, fontWeight: 900 }}>{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Remarks ── */}
                    {tx.remarks && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
                            <p style={{ fontSize: 8, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Catatan</p>
                            <p style={{ fontSize: 11, color: '#78350f', lineHeight: 1.6 }}>{tx.remarks}</p>
                        </div>
                    )}

                    {/* ── Footer ── */}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <p style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>Dicetak pada</p>
                            <p style={{ fontSize: 10, color: '#374151', fontWeight: 600 }}>{fFull(printDate)}</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 90, height: 1, background: '#374151', margin: '0 auto 5px' }} />
                            <p style={{ fontSize: 9, color: '#6b7280', fontWeight: 600 }}>Kasir / Admin</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>Ref. Dokumen</p>
                            <p style={{ fontSize: 11, color: '#374151', fontWeight: 700, fontFamily: 'monospace' }}>{tx.invoiceNumber}</p>
                            <p style={{ fontSize: 8, color: '#9ca3af', marginTop: 1 }}>Dokumen ini sah sebagai bukti pembayaran</p>
                        </div>
                    </div>
                </div>

                {/* Color accent bar */}
                <div style={{ height: 5, background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #ec4899, #f59e0b)' }} />
            </div>

            <div className="no-print h-12" />
        </>
    );
}
