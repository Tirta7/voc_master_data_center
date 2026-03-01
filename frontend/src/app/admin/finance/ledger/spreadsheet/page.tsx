'use client';

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const fmt = (n: number) => Math.round(n).toLocaleString('id-ID');
const fDate = (d: string | Date | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fTime = (d: string | Date | null) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';

export default function LedgerSpreadsheetPage() {
    const [data, setData] = useState<{ transactions: any[], settings: any } | null>(null);
    const [error, setError] = useState(false);
    const printed = useRef(false);

    useEffect(() => {
        Promise.all([
            axios.get(`${API_URL}/reports/transactions-full`),
            axios.get(`${API_URL}/reports/settings`)
        ]).then(([txs, s]) => {
            setData({ transactions: txs.data, settings: s.data });
        }).catch(() => setError(true));
    }, []);

    useEffect(() => {
        if (data && !printed.current) {
            printed.current = true;
            setTimeout(() => window.print(), 1000);
        }
    }, [data]);

    if (error) return <div style={{ padding: 40, textAlign: 'center' }}>Gagal memuat data spreadsheet.</div>;
    if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Menyiapkan Spreadsheet Transaksi...</div>;

    const { transactions, settings } = data;
    const venueName = settings.invoiceBusinessName || settings.businessName || 'My Billiard';
    const venueAddress = settings.invoiceAddress || settings.address || '—';

    return (
        <div style={{ padding: '10mm', background: 'white', minHeight: '100vh' }}>
            <style>{`
                @media print {
                    @page { size: A3 landscape; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                * { box-sizing: border-box; font-family: 'Inter', system-ui, sans-serif; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; border: 1.5px solid #000; color: #000; }
                th { background: #e2e8f0 !important; font-weight: 800; border: 1px solid #000; padding: 6px 4px; text-transform: uppercase; white-space: nowrap; color: #000; }
                td { border: 1px solid #000; padding: 5px 6px; white-space: nowrap; color: #000; }
                .text-right { text-align: right; }
                .font-bold { font-weight: 900; }
                .header { margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 15px; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 900; color: #000; }
                .header p { margin: 4px 0; font-size: 11px; color: #000; font-weight: 700; }
            `}</style>

            <div className="header">
                <h1>Laporan Spreadsheet Transaksi</h1>
                <p>{venueName} — {venueAddress}</p>
                <p>Periode: {transactions.length > 0 ? `${fDate(transactions[transactions.length - 1].createdAt)} s/d ${fDate(transactions[0].createdAt)}` : '—'}</p>
                <p>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Nama Tempat</th>
                        <th>Alamat</th>
                        <th>No Urut</th>
                        <th>Invoice Number</th>
                        <th>Payment Date</th>
                        <th>Table</th>
                        <th>Customer</th>
                        <th>Paket</th>
                        <th>Start Date</th>
                        <th>Start Time</th>
                        <th>End Date</th>
                        <th>End Time</th>
                        <th>Duration</th>
                        <th>Total Billiard</th>
                        <th>Total Café</th>
                        <th>Total Store</th>
                        <th>Total Pro Shop</th>
                        <th>Sub Total</th>
                        <th>Rounding</th>
                        <th>Discount</th>
                        <th>PPN 10%</th>
                        <th>Grand Total</th>
                        <th>Method</th>
                        <th>Money Paid</th>
                        <th>Change</th>
                        <th>Kasir</th>
                        <th>Waiter</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((tx: any) => {
                        // Calculate item category totals
                        let totalStore = 0;
                        let totalProShop = 0;
                        let totalCafeOnly = 0;

                        tx.orderItems?.forEach((oi: any) => {
                            const cat = (oi.menuItem?.category || '').toLowerCase();
                            const sub = Number(oi.priceAtOrder) * Number(oi.quantity);
                            if (cat === 'store') totalStore += sub;
                            else if (cat === 'pro shop' || cat === 'proshop') totalProShop += sub;
                            else totalCafeOnly += sub;
                        });

                        const methods = tx.payments?.map((p: any) => p.paymentMethod).join(', ') || '—';
                        const change = Number(tx.paidAmount) - Number(tx.grandTotal);
                        const subTotal = Number(tx.billiardTotal) + Number(tx.cafeTotal);

                        // Estimate discount from promos
                        const discount = (tx.appliedPromos || []).reduce((s: number, p: any) => s + Number(p.discount || 0), 0);

                        return (
                            <tr key={tx.id}>
                                <td>{venueName}</td>
                                <td>{venueAddress}</td>
                                <td>{tx.id}</td>
                                <td className="font-bold">{tx.invoiceNumber}</td>
                                <td>{fDate(tx.updatedAt)}</td>
                                <td>{tx.table?.name || (tx.tableId ? `Meja ${tx.tableId}` : '—')}</td>
                                <td>{tx.customerName || '—'}</td>
                                <td>{tx.fareName || '—'}</td>
                                <td>{fDate(tx.startTime)}</td>
                                <td>{fTime(tx.startTime)}</td>
                                <td>{fDate(tx.endTime)}</td>
                                <td>{fTime(tx.endTime)}</td>
                                <td>{tx.sessionDuration || '—'}</td>
                                <td className="text-right">{fmt(Number(tx.billiardTotal))}</td>
                                <td className="text-right">{fmt(totalCafeOnly)}</td>
                                <td className="text-right">{fmt(totalStore)}</td>
                                <td className="text-right">{fmt(totalProShop)}</td>
                                <td className="text-right font-bold">{fmt(subTotal)}</td>
                                <td className="text-right">{fmt(Number(tx.roundingAmount))}</td>
                                <td className="text-right text-rose-600">{fmt(discount)}</td>
                                <td className="text-right">{fmt(Number(tx.vatAmount))}</td>
                                <td className="text-right font-bold">{fmt(Number(tx.grandTotal))}</td>
                                <td>{methods}</td>
                                <td className="text-right">{fmt(Number(tx.paidAmount))}</td>
                                <td className="text-right">{fmt(change > 0 ? change : 0)}</td>
                                <td>Kasir</td>
                                <td>Waiter</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                        <td colSpan={13} className="text-right font-bold">TOTAL KESELURUHAN</td>
                        <td className="text-right">{fmt(transactions.reduce((s, tx) => s + Number(tx.billiardTotal), 0))}</td>
                        <td className="text-right">{fmt(transactions.reduce((s, tx) => {
                            return s + (tx.orderItems || []).reduce((ss: number, oi: any) => {
                                const cat = (oi.menuItem?.category || '').toLowerCase();
                                return (cat !== 'store' && cat !== 'pro shop' && cat !== 'proshop') ? ss + (Number(oi.priceAtOrder) * Number(oi.quantity)) : ss;
                            }, 0);
                        }, 0))}</td>
                        <td className="text-right">{fmt(transactions.reduce((s, tx) => {
                            return s + (tx.orderItems || []).reduce((ss: number, oi: any) => {
                                const cat = (oi.menuItem?.category || '').toLowerCase();
                                return cat === 'store' ? ss + (Number(oi.priceAtOrder) * Number(oi.quantity)) : ss;
                            }, 0);
                        }, 0))}</td>
                        <td className="text-right">{fmt(transactions.reduce((s, tx) => {
                            return s + (tx.orderItems || []).reduce((ss: number, oi: any) => {
                                const cat = (oi.menuItem?.category || '').toLowerCase();
                                return (cat === 'pro shop' || cat === 'proshop') ? ss + (Number(oi.priceAtOrder) * Number(oi.quantity)) : ss;
                            }, 0);
                        }, 0))}</td>
                        <td className="text-right">{fmt(transactions.reduce((s, tx) => s + Number(tx.billiardTotal) + Number(tx.cafeTotal), 0))}</td>
                        <td className="text-right">{fmt(transactions.reduce((s, tx) => s + Number(tx.roundingAmount), 0))}</td>
                        <td className="text-right">{fmt(transactions.reduce((s, tx) => s + (tx.appliedPromos || []).reduce((ss: number, p: any) => ss + Number(p.discount || 0), 0), 0))}</td>
                        <td className="text-right">{fmt(transactions.reduce((s, tx) => s + Number(tx.vatAmount), 0))}</td>
                        <td className="text-right">{fmt(transactions.reduce((s, tx) => s + Number(tx.grandTotal), 0))}</td>
                        <td colSpan={5}></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
