'use client';

import { useState, useEffect } from 'react';
import { Lock, Copy, CheckCircle, RefreshCw, QrCode, MessageCircle, WifiOff } from 'lucide-react';
import { getApiUrl, getSocketUrl } from '@/utils/urlUtils';
import WaitingCat from '@/components/WaitingCat';

/** Tagihan QRIS dari VOCML (field `billing`). */
interface LicenseBilling {
  reason: 'locked' | 'expired';
  amount: number;
  amount_text: string;
  currency: string;
  merchant_name: string;
  merchant_city: string;
  qris: string;
  qris_image_url: string;
  note: string;
  contact: string;
}

const toWaNumber = (contact: string) => {
  const d = contact.replace(/\D/g, '');
  return d.startsWith('0') ? `62${d.slice(1)}` : d;
};

export default function ActivatePage() {
  const [copied, setCopied] = useState(false);
  const [machineId, setMachineId] = useState('Memuat...');
  const [licenseState, setLicenseState] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [backendReady, setBackendReady] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);

  const isLockedStatus = licenseState?.status === 'EXPIRED' || licenseState?.status === 'BLOCKED';
  // QRIS hanya ditampilkan saat EXPIRED / BLOCKED
  const billing: LicenseBilling | null = isLockedStatus ? (licenseState?.billing || null) : null;

  // Reset status gambar saat nominal / QR berubah
  useEffect(() => { setQrFailed(false); setQrLoaded(false); }, [billing?.amount, billing?.qris]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    let attempt = 0;
    const MAX_RETRIES = 20; // 20x × 5 detik = 100 detik tunggu backend warm-up
    let notified = false;

    const applyState = (data: any) => {
      if (cancelled || !data) return;
      setMachineId(data.machineId || 'TIDAK DIKETAHUI');
      setLicenseState(data);
      // Sudah aktif kembali (diperpanjang / dibuka kuncinya) → tutup layar terkunci otomatis
      if (data.status === 'ACTIVE' || data.status === 'GRACE') {
        window.location.href = '/';
      } else if (!notified && (data.status === 'EXPIRED' || data.status === 'BLOCKED')) {
        notified = true;
        // Trigger push notification ke HP owner
        fetch(`${getApiUrl()}/api/license/notify-warning`, { method: 'POST' }).catch(() => {});
      }
    };

    const fetchStatus = async () => {
      try {
        const API_BASE = getApiUrl();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per request

        const res = await fetch(`${API_BASE}/api/license/status`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;
        setBackendReady(true);
        applyState(data);
      } catch (err: any) {
        if (cancelled) return;
        attempt++;
        setRetryCount(attempt);

        if (attempt < MAX_RETRIES) {
          // Retry setiap 5 detik sampai backend ready
          retryTimer = setTimeout(fetchStatus, 5000);
        } else {
          // Setelah 20x retry (100 detik), tampilkan error
          setMachineId('GAGAL TERHUBUNG — Restart aplikasi');
        }
      }
    };

    fetchStatus();

    // Polling setiap 5 detik (cadangan bila SSE terputus)
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/license/status`);
        applyState(await res.json());
      } catch { /* abaikan polling error */ }
    }, 5000);

    // SSE: status lisensi + billing real-time (event bernama `license`)
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${getSocketUrl()}/api/license/stream`);
      es.addEventListener('license', (ev) => {
        try { applyState(JSON.parse((ev as MessageEvent).data)); } catch {}
      });
    } catch { /* polling tetap berjalan */ }

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearInterval(interval);
      es?.close();
    };
  }, []);

  const copyMachineId = async () => {
    await navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isBlocked = licenseState?.status === 'BLOCKED';
  const isExpired = licenseState?.status === 'EXPIRED';
  const isFirstInstall = licenseState?.status === 'NOT_REGISTERED';

  const statusLabel = isBlocked
    ? 'Lisensi Diblokir'
    : isExpired
    ? 'Lisensi Telah Berakhir'
    : isFirstInstall
    ? 'Instalasi Baru — Belum Diaktifkan'
    : 'Verifikasi Lisensi...';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e1b4b 100%)',
      fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
      overflow: 'auto',
    }}>
      {/* Container scrollable yang aman dari top overflow */}
      <div style={{
        minHeight: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        padding: 'calc(env(safe-area-inset-top, 48px) + 24px) 20px calc(env(safe-area-inset-bottom, 24px) + 24px)',
      }}>
      {/* Animasi partikel latar belakang */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${200 + i * 80}px`, height: `${200 + i * 80}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(99,102,241,${0.04 + i * 0.01}) 0%, transparent 70%)`,
            top: `${10 + i * 15}%`, left: `${5 + i * 17}%`,
            animation: `pulse ${3 + i}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: '850px', position: 'relative', margin: 'auto 0' }}>
        {/* Gembok */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '72px', height: '72px',
            background: isBlocked
              ? 'linear-gradient(135deg, #7f1d1d, #dc2626)'
              : 'linear-gradient(135deg, #312e81, #6366f1)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: isBlocked
              ? '0 0 40px rgba(239,68,68,0.35)'
              : '0 0 40px rgba(99,102,241,0.35)',
            animation: 'lockBounce 2s ease-in-out infinite',
          }}>
            <Lock size={32} color="white" strokeWidth={2} />
          </div>

          <h1 style={{
            color: 'white', fontSize: '20px', fontWeight: '800',
            margin: '0 0 6px', letterSpacing: '-0.02em',
          }}>
            Aplikasi Terkunci
          </h1>
          <p style={{
            color: '#94a3b8', fontSize: '13px', margin: 0,
            lineHeight: '1.5',
          }}>
            {statusLabel}
          </p>
          {licenseState?.message && (isBlocked || isExpired) && (
            <p style={{
              display: 'inline-block', marginTop: '10px', padding: '6px 14px', borderRadius: '999px',
              background: 'rgba(239,68,68,0.12)', color: '#fca5a5', fontSize: '12px', fontWeight: 600,
            }}>
              {licenseState.message}
            </p>
          )}
        </div>

        {/* Cards Container */}
        <div style={{
          display: 'flex', gap: '24px', flexWrap: 'wrap',
          alignItems: 'stretch', justifyContent: 'center'
        }}>
          
        {/* Card Kiri: Tagihan QRIS dari VOCML (hanya bila billing != null) */}
        {billing && (
          <section id="billing-panel" aria-label="Tagihan QRIS" style={{
            flex: '1 1 350px',
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: 'none',
            borderRadius: '24px',
            padding: '32px 24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.02)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'rgba(34,197,94,0.1)', color: '#4ade80',
              padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
              marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px'
            }}>
              <QrCode size={14} /> Tagihan Perpanjangan
            </div>

            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '800', margin: '0 0 6px' }}>
              {billing.reason === 'expired' ? 'Lisensi telah berakhir' : 'Aplikasi dikunci'}
            </h2>
            {licenseState?.lockReason && (
              <p style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 600, margin: '0 0 20px', lineHeight: 1.5 }}>
                {licenseState.lockReason}
              </p>
            )}

            {/* QR: dari proxy backend, latar putih, tanpa blur/stretch */}
            {!qrFailed ? (
              <div style={{
                background: '#ffffff', padding: '12px', borderRadius: '12px',
                width: '288px', height: '288px', boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto', position: 'relative',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}>
                {!qrLoaded && (
                  <RefreshCw size={24} color="#94a3b8" style={{ position: 'absolute', animation: 'spin 1.5s linear infinite' }} />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  id="billing-qris-image"
                  src={`${getApiUrl()}/api/license/billing/qris.png?t=${billing.amount}`}
                  alt={`QRIS ${billing.merchant_name} ${billing.amount_text}`}
                  width={264}
                  height={264}
                  onLoad={() => setQrLoaded(true)}
                  onError={() => setQrFailed(true)}
                  style={{
                    width: '264px', height: '264px', display: 'block',
                    objectFit: 'contain', imageRendering: 'pixelated',
                    background: '#ffffff', opacity: qrLoaded ? 1 : 0,
                  }}
                />
              </div>
            ) : (
              <div id="billing-qris-offline" style={{
                width: '288px', minHeight: '160px', boxSizing: 'border-box', margin: '0 auto',
                padding: '24px', borderRadius: '16px', background: 'rgba(239,68,68,0.1)', color: '#fca5a5',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}>
                <WifiOff size={28} />
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Hubungkan internet untuk menampilkan QRIS</div>
                <button
                  id="billing-qris-retry"
                  onClick={() => { setQrFailed(false); setQrLoaded(false); }}
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fca5a5', border: 'none', borderRadius: '10px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Coba lagi
                </button>
              </div>
            )}

            <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', marginTop: '20px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Total tagihan
            </div>
            <div id="billing-amount" style={{ color: '#fff', fontSize: '34px', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {billing.amount_text}
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '6px', fontWeight: 600 }}>
              QRIS · {billing.merchant_name}
            </div>
            {billing.note && (
              <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '12px', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxWidth: '320px' }}>
                {billing.note}
              </div>
            )}

            {billing.contact.trim() !== '' && (
              <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ color: '#cbd5e1', fontSize: '13px' }}>
                  Kontak admin: <strong style={{ color: '#fff' }}>{billing.contact}</strong>
                </div>
                <a
                  id="billing-whatsapp"
                  href={`https://wa.me/${toWaNumber(billing.contact)}?text=${encodeURIComponent(
                    `Halo admin, saya ingin membayar perpanjangan lisensi Billiard.\nMachine ID: ${machineId}\nNominal: ${billing.amount_text}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="billing-wa-btn"
                  style={{
                    padding: '10px 18px',
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    borderRadius: '12px', color: 'white', textDecoration: 'none',
                    fontSize: '14px', fontWeight: '700',
                    boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                >
                  <MessageCircle size={16} /> Chat WhatsApp
                </a>
              </div>
            )}
          </section>
        )}

        {/* Card Kanan: Form Manual */}
        <div style={{
          flex: '1 1 350px',
          maxWidth: billing ? undefined : '480px',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: 'none',
          borderRadius: '24px',
          padding: '32px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>

          <WaitingCat />

          {/* Metode Pembayaran Didukung (Dipindah ke atas card Kanan) */}
          <div 
            className="w-full flex flex-col items-center gap-2 sm:gap-3"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '12px 16px',
              marginBottom: '32px'
            }}
          >
              <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">Metode Pembayaran Didukung</p>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                  <span className="px-2 py-0.5 bg-white rounded text-[9px] font-black text-[#005E6A] italic shadow-sm">Mandiri</span>
                  <span className="px-2 py-0.5 bg-white rounded text-[9px] font-black text-[#0066AE] italic shadow-sm">BCA</span>
                  <span className="px-2 py-0.5 bg-white rounded text-[9px] font-black text-[#00529C] shadow-sm">BRI</span>
                  <span className="px-2 py-0.5 bg-white rounded text-[9px] font-black text-[#F36F21] shadow-sm">BNI</span>
                  <span className="px-2 py-0.5 bg-white rounded text-[9px] font-black text-[#00AED6] shadow-sm">DANA</span>
                  <span className="px-2 py-0.5 bg-white rounded text-[9px] font-black text-[#4C2A86] shadow-sm">OVO</span>
                  <span className="px-2 py-0.5 bg-white rounded text-[9px] font-black text-[#00AED6] shadow-sm">gopay</span>
                  <span className="px-2 py-0.5 bg-white rounded text-[9px] font-black text-[#EE4D2D] shadow-sm">ShopeePay</span>
              </div>
          </div>

          {/* CTA Hubungi Teknisi */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '16px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}>
            <div style={{ fontSize: '24px' }}>📞</div>
            <div>
              <p style={{ color: '#c7d2fe', fontSize: '13px', fontWeight: '700', margin: '0 0 2px' }}>
                Hubungi Teknisi / Admin
              </p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0, lineHeight: '1.4' }}>
                {isFirstInstall
                  ? 'Sampaikan Serial Number di bawah untuk mendapatkan kode aktivasi, selesaikan pembayaran terlebih dahulu'
                  : 'Sampaikan Serial Number di bawah untuk perpanjangan lisensi.'}
              </p>
            </div>
          </div>

          {/* Serial Number / Machine ID */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', color: '#64748b', fontSize: '10px',
              fontWeight: '700', letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: '8px',
            }}>
              Serial Number PC Ini
            </label>
            {/* Pesan status saat backend belum ready */}
            {machineId === 'Memuat...' && (
              <div style={{
                background: 'rgba(99,102,241,0.08)',
                borderRadius: '10px',
                padding: '8px 12px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <RefreshCw size={12} style={{ color: '#818cf8', animation: 'spin 1.5s linear infinite', flexShrink: 0 }} />
                <span style={{ color: '#818cf8', fontSize: '11px', fontWeight: '600' }}>
                  {retryCount === 0
                    ? 'Menghubungkan ke server aplikasi...'
                    : `Menunggu server siap... (percobaan ${retryCount}/20)`}
                </span>
              </div>
            )}
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '16px', padding: '12px 14px',
            }}>
              <span style={{
                flex: 1, color: machineId === 'Memuat...' ? '#475569' : '#e2e8f0', fontSize: '15px',
                fontWeight: '800', letterSpacing: '0.08em',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                animation: machineId === 'Memuat...' ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }}>
                {machineId}
              </span>
              <button
                onClick={copyMachineId}
                disabled={machineId === 'Memuat...' || machineId.startsWith('GAGAL')}
                style={{
                  background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.15)',
                  border: `1px solid ${copied ? '#22c55e' : 'rgba(99,102,241,0.4)'}`,
                  borderRadius: '8px', padding: '8px 12px',
                  cursor: (machineId === 'Memuat...' || machineId.startsWith('GAGAL')) ? 'not-allowed' : 'pointer',
                  opacity: (machineId === 'Memuat...' || machineId.startsWith('GAGAL')) ? 0.4 : 1,
                  color: copied ? '#86efac' : '#818cf8',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '12px', fontWeight: '700',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                {copied ? <><CheckCircle size={14} /> Disalin!</> : <><Copy size={14} /> Salin</>}
              </button>
            </div>
          </div>

          {/* Status otomatis — VOCML membuka kunci tanpa kode */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(20,184,166,0.08)', borderRadius: '14px',
            padding: '12px 14px', marginBottom: '14px',
          }}>
            <RefreshCw size={16} style={{ color: '#5eead4', animation: 'spin 2s linear infinite', flexShrink: 0 }} />
            <p style={{ color: '#99f6e4', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
              Setelah pembayaran dikonfirmasi admin, aplikasi <strong>terbuka otomatis</strong> dalam ±10 detik — tidak perlu memasukkan kode.
            </p>
          </div>

          {/* Footer */}
          <p style={{
            textAlign: 'center', color: '#334155',
            fontSize: '11px', marginTop: '24px',
          }}>
            VOC Billiard Management System v2.0 • Lisensi Komersial
          </p>
        </div>
        </div>
      </div>
      </div>

      <style>{`
        @keyframes lockBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse {
          from { transform: scale(0.95); opacity: 0.5; }
          to { transform: scale(1.05); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .billing-wa-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(34,197,94,0.45) !important;
        }
      `}</style>
    </div>
  );
}
