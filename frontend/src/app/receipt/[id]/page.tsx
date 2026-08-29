'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Bluetooth, Printer } from 'lucide-react';
import ThermalReceipt from '@/components/ThermalReceipt';
import { printReceiptBluetooth } from '@/utils/bluetoothPrinter';

export default function StandaloneThermalReceiptPage() {
    const params = useParams();
    const id = params?.id as string;
    const [tx, setTx] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [error, setError] = useState('');
    const printed = useRef(false);
    const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
    const [paperSize, setPaperSize] = useState<58 | 80>(58);

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
            // Di perangkat mobile, kita beri jeda sebentar tapi tidak langsung maksa print jika user lebih suka BT
            // Tapi karena existing flow seperti itu, kita pertahankan.
            setTimeout(() => window.print(), 800);
        }
    }, [tx, settings]);

    const handleBluetoothPrint = async () => {
        if (!tx) return;
        try {
            setIsBluetoothPrinting(true);
            await printReceiptBluetooth(tx, settings, paperSize, '', 0, 0);
        } catch (err: any) {
            alert(err.message || 'Gagal mencetak struk bluetooth');
        } finally {
            setIsBluetoothPrinting(false);
        }
    };

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

            <div className="no-print fixed bottom-0 left-0 right-0 bg-white/70  border-t border-slate-200/50 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] z-[100] flex flex-col items-center gap-3 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,16px)+16px)]">
                <div className="flex gap-2 w-full max-w-md">
                    <button
                        onClick={() => window.print()}
                        className="flex-[1] py-3.5 md:py-4 bg-slate-900 hover:bg-black text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-2 uppercase"
                    >
                        <Printer className="w-4 h-4" />
                        PDF/USB
                    </button>
                    <div className="flex bg-slate-100 rounded-xl md:rounded-2xl p-1">
                        <button onClick={() => setPaperSize(58)} className={`px-3 rounded-lg text-[10px] md:text-xs font-bold transition-all ${paperSize === 58 ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>58</button>
                        <button onClick={() => setPaperSize(80)} className={`px-3 rounded-lg text-[10px] md:text-xs font-bold transition-all ${paperSize === 80 ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>80</button>
                    </div>
                    <button
                        onClick={handleBluetoothPrint}
                        disabled={isBluetoothPrinting}
                        className="flex-[1.5] py-3.5 md:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs transition-all active:scale-95 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 uppercase disabled:opacity-50"
                    >
                        {isBluetoothPrinting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bluetooth className="w-4 h-4" />}
                        Cetak BT
                    </button>
                </div>
                <div className="w-full max-w-md">
                    <button
                        onClick={() => {
                            // Pada iOS PWA / Safari, window.close() bisa membuat aplikasi hang atau blank putih.
                            // Kita ganti dengan navigasi yang aman.
                            try {
                                if (window.history.length > 2) {
                                    window.history.back();
                                } else {
                                    window.location.href = '/';
                                }
                            } catch (e) {
                                window.location.href = '/';
                            }
                        }}
                        className="w-full bg-slate-100/80 text-slate-600 px-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold border border-slate-200 hover:bg-slate-200 transition-all text-xs md:text-sm active:scale-95 text-center"
                    >
                        TUTUP
                    </button>
                </div>
            </div>

            <div className="page pb-32 md:pb-10 mb-32 md:mb-10">
                <ThermalReceipt tx={tx} settings={settings} isReprint={true} />
            </div>
        </div>
    );
}
