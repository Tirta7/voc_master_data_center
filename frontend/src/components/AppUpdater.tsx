'use client';

import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Download, X } from 'lucide-react';

export function AppUpdater() {
    const [hasUpdate, setHasUpdate] = useState(false);
    const [checking, setChecking] = useState(false);
    const currentVersionRef = useRef<string | null>(null);

    const checkForUpdates = async () => {
        try {
            setChecking(true);
            // Tambahkan timestamp untuk menghindari cache agresif pada Safari/iOS
            const res = await fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            
            if (data?.version) {
                if (currentVersionRef.current === null) {
                    // Inisialisasi versi pertama kali aplikasi dibuka
                    currentVersionRef.current = data.version;
                } else if (currentVersionRef.current !== data.version) {
                    // Jika versi berbeda dari versi saat awal muat, berarti ada pembaruan!
                    setHasUpdate(true);
                }
            }
        } catch (e) {
            console.error('Failed to check for updates', e);
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        // Cek pertama kali saat komponen di-mount
        checkForUpdates();

        // Polling setiap 5 menit (berguna jika app dibiarkan menyala di layar)
        const intervalId = setInterval(checkForUpdates, 5 * 60 * 1000);

        // Event listener saat user kembali ke aplikasi (buka dari background/freeze di iOS/Android)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkForUpdates();
            }
        };
        
        // Event listener jika menggunakan PWA standalone
        const handleFocus = () => checkForUpdates();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    const performUpdate = () => {
        // Panggil reload dari window dengan force true (meski di browser modern argumen diabaikan,
        // namun mengosongkan cache jika bisa)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (let registration of registrations) {
                    registration.update();
                }
            });
        }
        window.location.reload();
    };

    if (!hasUpdate) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 'max(32px, calc(env(safe-area-inset-top) + 16px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999, // Di atas broadcast toast
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
        }}>
            <div style={{
                background: '#0F172A',
                borderRadius: '16px',
                padding: '8px 8px 8px 16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                animation: 'slideInDownUpdate 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                width: 'max-content',
                maxWidth: '92vw',
                pointerEvents: 'auto',
                border: '1px solid rgba(99, 102, 241, 0.3)',
            }}>
                <div style={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Download size={16} color="#818cf8" />
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                        margin: 0,
                        color: '#ffffff',
                        fontSize: '13px',
                        lineHeight: '1.2',
                        fontWeight: '700',
                        letterSpacing: '0.2px',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}>
                        Pembaruan Sistem Tersedia
                    </p>
                    <p style={{
                        margin: '2px 0 0 0',
                        color: '#94a3b8',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        Versi baru siap dipasang
                    </p>
                </div>
                
                <button
                    onClick={performUpdate}
                    style={{
                        flexShrink: 0,
                        background: '#4f46e5',
                        border: 'none',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '12px',
                        borderRadius: '10px',
                        transition: 'background 0.2s',
                        boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#4338ca'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#4f46e5'}
                >
                    <RefreshCw size={12} />
                    UPDATE
                </button>
                
                <button
                    onClick={() => setHasUpdate(false)}
                    style={{
                        flexShrink: 0,
                        background: 'transparent',
                        border: 'none',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748b',
                        borderRadius: '50%',
                        transition: 'background 0.2s',
                        marginLeft: '-4px',
                    }}
                    title="Nanti Saja"
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <X size={14} />
                </button>
            </div>
            
            <style>{`
                @keyframes slideInDownUpdate {
                    0% { transform: translateY(-50px) scale(0.9); opacity: 0; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
