'use client';

import { useState, useEffect } from 'react';
import { Lock, Copy, CheckCircle, RefreshCw, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getApiUrl } from '@/utils/urlUtils';

export default function ActivatePage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [machineId, setMachineId] = useState('Memuat...');
  const [licenseState, setLicenseState] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [backendReady, setBackendReady] = useState(false);
  const [renewalInfo, setRenewalInfo] = useState<{ nominal?: number; qrisString?: string } | null>(null);
  const [qrisLoading, setQrisLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    let attempt = 0;
    const MAX_RETRIES = 20; // 20x × 5 detik = 100 detik tunggu backend warm-up

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
        setMachineId(data.machineId || 'TIDAK DIKETAHUI');
        setLicenseState(data);

        // Jika sudah aktif kembali, redirect ke halaman utama
        if (data.status === 'ACTIVE' || data.status === 'GRACE') {
          window.location.href = '/';
        } else if (data.status === 'EXPIRED' || data.status === 'BLOCKED') {
          setQrisLoading(true);
          fetch(`${API_BASE}/api/license/renewal-info`)
            .then(r => r.json())
            .then(res => {
              if (res.success) setRenewalInfo(res);
            })
            .catch(() => {})
            .finally(() => setQrisLoading(false));
        }
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

    // Polling setiap 30 detik setelah backend ready — jika owner aktifkan lisensi, langsung redirect
    const interval = setInterval(async () => {
      if (!backendReady) return;
      try {
        const API_BASE = getApiUrl();
        const res = await fetch(`${API_BASE}/api/license/status`);
        const data = await res.json();
        setMachineId(data.machineId || 'TIDAK DIKETAHUI');
        setLicenseState(data);
        if (data.status === 'ACTIVE' || data.status === 'GRACE') {
          window.location.href = '/';
        }
      } catch { /* abaikan polling error */ }
    }, 5000); // Poll setiap 5 detik agar terbuka dalam hitungan detik setelah GAS update

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearInterval(interval);
    };
  }, []);

  const copyMachineId = async () => {
    await navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const API_BASE = getApiUrl();
      const res = await fetch(`${API_BASE}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        setTimeout(() => window.location.href = '/', 1500);
      }
    } catch {
      setResult({ success: false, message: 'Tidak bisa menghubungi server. Pastikan aplikasi berjalan.' });
    } finally {
      setLoading(false);
    }
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
        </div>

        {/* Cards Container */}
        <div style={{
          display: 'flex', gap: '24px', flexWrap: 'wrap',
          alignItems: 'stretch', justifyContent: 'center'
        }}>
          
        {/* Card Kiri: QRIS (Hanya muncul jika bukan First Install dan ada data) */}
        {!isFirstInstall && (
          <div style={{
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
              <QrCode size={14} /> Scan & Otomatis Buka Kunci
            </div>
            
            <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '700', margin: '0 0 8px' }}>
              Pembayaran via QRIS
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 24px', lineHeight: '1.5' }}>
              Scan QR di bawah &amp; bayar sesuai nominal. Aplikasi otomatis terbuka setelah pembayaran sukses.
            </p>

            {qrisLoading ? (
              <div style={{ padding: '40px', color: '#64748b' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ fontSize: '13px' }}>Memuat QRIS...</div>
              </div>
            ) : renewalInfo?.qrisString ? (
              /* ══ QRIS TEMPLATE + QR OVERLAY ══ */
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '310px',
                margin: '0 auto 12px',
                // Tidak ada border-radius (ujung lancip)
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                minHeight: '200px',
              }}>
                {/* Template background image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/tempQR.png"
                  alt="QRIS Certificate Template"
                  style={{ width: '100%', display: 'block' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.border = '4px solid red';
                    (e.target as HTMLImageElement).alt = 'GAGAL LOAD: /tempQR.png';
                  }}
                  onLoad={() => console.log('✅ tempQR.png berhasil dimuat')}
                />



                {/* QR Code overlay — tepat di tengah area kosong QR pada template */}
                <div style={{
                  position: 'absolute',
                  top: '34%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '56%',
                  background: 'white',
                  padding: '4px',
                  // Hilangkan border-radius (lancip) dan box-shadow (blur)
                }}>
                  <QRCodeSVG
                    value={renewalInfo.qrisString}
                    size={256}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>Gagal memuat QRIS.</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Tagihan belum di-set di pusat.</div>
              </div>
            )}

            {renewalInfo?.nominal && (
              <>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '4px', marginTop: '16px' }}>
                  Jumlah Nominal:
                </div>
                <div style={{ color: '#fff', fontSize: '28px', fontWeight: '800', fontFamily: 'monospace' }}>
                  Rp{renewalInfo.nominal.toLocaleString('id-ID')}
                </div>
              </>
            )}
          </div>
        )}

        {/* Card Kanan: Form Manual */}
        <div style={{
          flex: '1 1 350px',
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

          {/* Metode Pembayaran Didukung (Dipindah ke atas card Kanan) */}
          <div className="w-full flex flex-col items-center gap-2 sm:gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-2xl mb-12">
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

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '20px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
            <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kode Aktivasi</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
          </div>

          {/* Input Kode Aktivasi */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="LIC-XXXX-XXXX-XXXX"
              onKeyDown={e => e.key === 'Enter' && handleActivate()}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(0,0,0,0.4)',
                border: result?.success === false ? '1px solid rgba(239,68,68,0.5)' : 'none',
                borderRadius: '14px', padding: '14px 16px',
                color: 'white', fontSize: '15px',
                fontFamily: 'monospace', letterSpacing: '0.06em',
                outline: 'none', transition: 'border 0.2s',
                textAlign: 'center',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
          </div>

          {/* Feedback */}
          {result && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px', marginBottom: '14px',
              background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
              color: result.success ? '#86efac' : '#fca5a5',
              fontSize: '13px', fontWeight: '500', textAlign: 'center',
            }}>
              {result.success ? '✅ ' : '❌ '}{result.message}
            </div>
          )}

          {/* Tombol Aktifkan */}
          <button
            onClick={handleActivate}
            disabled={loading || !licenseKey.trim()}
            style={{
              width: '100%', padding: '14px',
              background: loading || !licenseKey.trim()
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: 'none',
              borderRadius: '14px', color: loading || !licenseKey.trim() ? '#64748b' : 'white',
              fontSize: '14px', fontWeight: '700',
              cursor: loading || !licenseKey.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading || !licenseKey.trim()
                ? 'none'
                : '0 8px 24px rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
            }}
          >
            {loading
              ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Memverifikasi...</>
              : <><Lock size={16} /> Aktifkan </>
            }
          </button>
        </div>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center', color: '#334155',
          fontSize: '11px', marginTop: '16px',
        }}>
          VOC Billiard Management System v2.0 • Lisensi Komersial
        </p>
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
      `}</style>
    </div>
  );
}
