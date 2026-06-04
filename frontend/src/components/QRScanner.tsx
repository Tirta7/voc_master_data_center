import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Smartphone, RefreshCw } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
    title?: string;
    subtitle?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ 
    onScanSuccess, 
    onClose,
    title = "Scan QR Member",
    subtitle = "Arahkan ke QR Code"
}) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    useBodyScrollLock(true);
    const [error, setError] = useState<string | null>(null);
    const qrReaderId = "qr-reader-container";

    useEffect(() => {
        let isMounted = true;

        // Cek apakah berjalan di dalam WebView native Android
        // (window.AndroidBridge di-inject oleh aplikasi VFD Android)
        const isNativeAndroidApp = typeof (window as any).AndroidBridge !== 'undefined' 
            && (window as any).AndroidBridge.isNativeApp?.() === true;

        if (!window.isSecureContext && window.location.hostname !== 'localhost' && !isNativeAndroidApp) {
            setError('Kamera hanya dapat diakses melalui koneksi aman (HTTPS) atau localhost. Silakan gunakan scanner pada layar display jika tersedia.');
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError('Browser Anda tidak mendukung akses kamera atau fitur ini diblokir.');
            return;
        }

        let startPromise: Promise<any> | null = null;
        let activeTimeout: NodeJS.Timeout | null = null;

        const startScanner = (useRearCamera: boolean) => {
            if (!isMounted) return;

            // Bersihkan hardware lama jika ada sebelum start ulang (fallback safe)
            const oldVideo = document.querySelector(`#${qrReaderId} video`) as HTMLVideoElement;
            if (oldVideo && oldVideo.srcObject) {
                const stream = oldVideo.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                oldVideo.srcObject = null;
            }

            if (scannerRef.current) {
                try { scannerRef.current.clear(); } catch (e) {}
            }

            const html5QrCode = new Html5Qrcode(qrReaderId);
            scannerRef.current = html5QrCode;

            // Menggunakan qrbox visual yang terbukti responsif (Screenshoot 2)
            const config = { 
                fps: 15, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false
            };

            // html5-qrcode throws an error if we pass more than 1 key here!
            // It MUST be exactly 1 key (facingMode OR deviceId).
            const constraints: any = useRearCamera ? { facingMode: "environment" } : { facingMode: "user" };

            startPromise = html5QrCode.start(
                constraints,
                config,
                (decodedText) => {
                    // Stop first, then trigger success
                    if (scannerRef.current?.isScanning) {
                        scannerRef.current.stop().then(() => {
                            scannerRef.current?.clear();
                            if (isMounted) onScanSuccess(decodedText);
                        }).catch(e => console.error(e));
                    }
                },
                () => { /* ignore error noise */ }
            );

            startPromise.then(() => {
                // Pastikan video element langsung play (mengatasi blank screen)
                const video = document.querySelector(`#${qrReaderId} video`) as HTMLVideoElement;
                if (video) {
                    video.setAttribute('playsinline', 'true');
                    video.setAttribute('muted', 'true');
                    video.muted = true;
                    video.play().catch(err => console.warn("Auto-play warning:", err));
                }
            }).catch((err) => {
                const errStr = err?.toString() || "";
                
                // Jika error saat minta kamera belakang/ideal (terutama di PC desktop), coba kamera depan/webcam (fallback)
                if (useRearCamera && (errStr.includes("OverconstrainedError") || errStr.includes("NotReadableError") || errStr.includes("facingMode") || errStr.includes("NotFound") || errStr.includes("not supported"))) {
                    console.warn("Kamera belakang gagal/tidak ada, mencoba kamera alternatif (Webcam)...");
                    activeTimeout = setTimeout(() => startScanner(false), 300);
                    return; // Jangan tampilkan error dulu
                }

                if (isMounted) {
                    if (errStr.includes("NotAllowed") || errStr.includes("Permission") || errStr.includes("NotAllowedError")) {
                        setError('Akses kamera ditolak. Mohon izinkan akses kamera di browser Anda.');
                    } else if (errStr.includes("not supported")) {
                        setError('Streaming kamera tidak didukung oleh browser Anda pada koneksi ini. Silakan gunakan Layar Display untuk melakukan scan QR.');
                    } else {
                        setError('Gagal mengakses kamera. Pastikan izin telah diberikan atau perangkat kamera tersedia.');
                    }
                }
                console.warn("QR Scanner error:", err);
            });
        };

        activeTimeout = setTimeout(() => {
            startScanner(true);
        }, 100);

        const stopAndCleanupHardware = async () => {
            if (scannerRef.current) {
                try {
                    // Matikan instance html5-qrcode
                    if (scannerRef.current.isScanning) {
                        await scannerRef.current.stop();
                    }
                    scannerRef.current.clear();
                } catch (e) {
                    console.warn("Error saat stop html5qrcode:", e);
                }
            }
            
            // Failsafe: Paksa matikan sensor hardware (kamera) jika nyangkut
            const video = document.querySelector(`#${qrReaderId} video`) as HTMLVideoElement;
            if (video && video.srcObject) {
                const stream = video.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }
        };

        return () => {
            isMounted = false;
            if (activeTimeout) clearTimeout(activeTimeout);
            
            if (startPromise) {
                // Jika masih proses starting, tunggu resolve/reject baru matikan
                startPromise.finally(() => {
                    stopAndCleanupHardware();
                });
            } else {
                stopAndCleanupHardware();
            }
        };
    }, []);

    const handleStop = async () => {
        const video = document.querySelector(`#${qrReaderId} video`) as HTMLVideoElement;
        if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }

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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-sm max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>

                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 uppercase tracking-tight">{title}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
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
                        className="w-full aspect-square max-h-[250px] sm:max-h-[300px] rounded-2xl overflow-hidden border-2 border-slate-100 bg-black [&_video]:!w-full [&_video]:!h-full [&_video]:!block [&_video]:!object-cover [&_img]:!hidden [&_canvas]:!hidden flex items-center justify-center"
                    />

                    {error && (
                        <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold text-center">
                            {error}
                        </div>
                    )}

                    {/* Fitur Alternatif Input Manual Member ID */}
                    <div className="mt-6 pt-6 border-t border-dashed border-slate-200">
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                            Alternatif: Masukkan ID Member Manual
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="manual-member-id"
                                type="text"
                                placeholder="Contoh: VOC-2026-0005"
                                className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all uppercase"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (val) {
                                            if (scannerRef.current && scannerRef.current.isScanning) {
                                                scannerRef.current.stop().then(() => {
                                                    scannerRef.current?.clear();
                                                    onScanSuccess(val);
                                                }).catch(() => onScanSuccess(val));
                                            } else {
                                                onScanSuccess(val);
                                            }
                                        }
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    const input = document.getElementById('manual-member-id') as HTMLInputElement;
                                    const val = input?.value.trim();
                                    if (val) {
                                        if (scannerRef.current && scannerRef.current.isScanning) {
                                            scannerRef.current.stop().then(() => {
                                                scannerRef.current?.clear();
                                                onScanSuccess(val);
                                            }).catch(() => onScanSuccess(val));
                                        } else {
                                            onScanSuccess(val);
                                        }
                                    }
                                }}
                                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all uppercase tracking-widest"
                            >
                                Cari
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            MENCARI QR CODE...
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium text-center px-4 leading-relaxed">
                            Pastikan QR Code pelanggan terlihat jelas di layar atau ketik manual ID di atas jika terkendala kamera.
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
