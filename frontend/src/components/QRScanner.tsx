import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { X, Smartphone, RefreshCw } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    useBodyScrollLock(true);
    const [error, setError] = useState<string | null>(null);
    const qrReaderId = "qr-reader-container";

    useEffect(() => {
        let isMounted = true;

        // Small delay to ensure DOM is ready and any previous instances are cleared
        const initTimeout = setTimeout(() => {
            const html5QrCode = new Html5Qrcode(qrReaderId);
            scannerRef.current = html5QrCode;

            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    // Stop first, then trigger success
                    html5QrCode.stop().then(() => {
                        html5QrCode.clear();
                        if (isMounted) onScanSuccess(decodedText);
                    }).catch(e => console.error(e));
                },
                () => { /* ignore error noise */ }
            ).catch((err) => {
                if (isMounted) {
                    setError('Gagal mengakses kamera. Pastikan izin telah diberikan.');
                }
                console.error("Gagal start kamera:", err);
            });
        }, 100);

        return () => {
            isMounted = false;
            clearTimeout(initTimeout);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => {
                    if (scannerRef.current) scannerRef.current.clear();
                }).catch(err => console.error("Cleanup failed", err));
            }
        };
    }, []);

    const handleStop = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (err) {
                console.error("Gagal mematikan kamera:", err);
            }
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300 overscroll-contain">
            <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>

                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 uppercase tracking-tight">Scan QR Member</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arahkan ke QR Code</p>
                        </div>
                    </div>
                    <button
                        onClick={handleStop}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div
                        id={qrReaderId}
                        className="w-full rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 [&_video]:!w-full [&_video]:!h-auto [&_video]:!block [&_video]:!object-cover [&_img]:!hidden [&_canvas]:!hidden"
                    />

                    {error && (
                        <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold text-center">
                            {error}
                        </div>
                    )}

                    <div className="mt-6 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            MENCARI QR CODE...
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium text-center px-4 leading-relaxed">
                            Pastikan QR Code pelanggan terlihat jelas di layar dan dalam pencahayaan yang cukup.
                        </p>
                    </div>
                </div>

                <footer className="p-6 bg-slate-50 border-t border-slate-100">
                    <button
                        onClick={handleStop}
                        className="w-full py-4 bg-white border-2 border-slate-200 text-slate-500 font-black rounded-2xl text-xs hover:border-slate-300 active:scale-95 transition-all uppercase tracking-widest"
                    >
                        BATALKAN SCAN
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default QRScanner;
