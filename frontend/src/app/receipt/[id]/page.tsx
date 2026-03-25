'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import ThermalReceipt from '@/components/ThermalReceipt';
// import { API_URL } from '@/utils/urlUtils';

export default function StandaloneThermalReceiptPage() {
    const params = useParams();
    const id = params?.id as string;
    const [tx, setTx] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [error, setError] = useState('');
    const printed = useRef(false);

    useEffect(() => {
        if (!id) return;
        const fetchAll = async () => {
            try {
                // Determine if ID is numeric or invoice number
                const isNumeric = /^\d+$/.test(id);
                let txData;

                if (isNumeric) {
                    const r = await axios.get(`/transactions/${id}`);
                    txData = r.data;
                } else {
                    const r = await axios.get(`/transactions/invoice/${id}`);
                    const fullR = await axios.get(`/transactions/${r.data.id}`);
                    txData = fullR.data;
                }

                const sR = await axios.get(`/settings`);
                setTx(txData);
                setSettings(sR.data);
            } catch (e: any) {
                console.error('Fetch Error:', e);
                setError('Transaksi tidak ditemukan.');
            }
        };
        fetchAll();
    }, [id]);

    useEffect(() => {
        if (tx && settings && !printed.current) {
            printed.current = true;
            setTimeout(() => window.print(), 800);
        }
    }, [tx, settings]);

    if (error) return <div className="p-10 text-center font-black text-rose-500">{error}</div>;
    if (!tx || !settings) return <div className="p-10 text-center animate-pulse text-slate-500 font-bold uppercase tracking-widest text-xs">Menyiapkan Struk…</div>;

    return (
        <div className="min-h-screen text-black py-1">
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
                    @page { size: 80mm auto; margin: 0; }
                    html, body { width: 80mm; background: white !important; margin: 0 !important; padding: 0 !important; }
                    .no-print { display: none !important; }
                    .page {
                        width: 100% !important;
                        min-height: unset !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                    }
                }
                @media screen {
                    .page { 
                        width: 80mm; 
                        min-height: 120mm; 
                        margin: 32px auto; 
                        background: white;
                        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
                        border-radius: 8px; 
                        overflow: hidden;
                    }
                }
            `}</style>

            <div className="no-print fixed top-6 right-6 flex flex-col gap-3">
                <button
                    onClick={() => window.print()}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center gap-2"
                >
                    <span>🖨️ CETAK STRUK</span>
                </button>
                <button
                    onClick={() => window.close()}
                    className="bg-white text-slate-900 border border-slate-200 px-6 py-3 rounded-2xl font-bold shadow-xl hover:bg-slate-50 transition-all text-sm"
                >
                    TUTUP
                </button>
            </div>

            <div className="page pb-10">
                <ThermalReceipt tx={tx} settings={settings} isReprint={true} />
            </div>
        </div>
    );
}
