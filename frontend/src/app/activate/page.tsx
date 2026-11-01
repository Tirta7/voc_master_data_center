'use client';

import { useState, useEffect } from 'react';
import { Lock, Copy, CheckCircle, RefreshCw, QrCode, MessageCircle, WifiOff, Tag, ArrowRight, Sparkles } from 'lucide-react';
import { getApiUrl, getSocketUrl } from '@/utils/urlUtils';
import WaitingCat from '@/components/WaitingCat';

/** Varian paket perpanjangan dari VOCML. */
interface BillingPackage {
  id?: string;
  days?: number;
  label?: string;
  name?: string;
  basePrice?: number;
  promoPrice?: number;
  is_promo?: boolean;
  promo_badge?: string;
  final_amount?: number;
  amount?: number;
  amount_text?: string;
  qris_image_url?: string;
  qris?: string;
}

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
  packages?: BillingPackage[];
  unique_code?: number | null;
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
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    packageName?: string;
    amountPaid?: number;
    expiredAt?: string;
    daysLeft?: number;
  } | null>(null);

  const handleClaimVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    setVoucherMsg(null);
    try {
      const res = await fetch(`${getApiUrl()}/api/license/voucher/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherCode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setVoucherMsg({ text: data.message || 'Voucher berhasil digunakan!' });
        setTimeout(() => { window.location.href = '/'; }, 1000);
      } else {
        setVoucherMsg({ text: data.message || 'Kode voucher tidak valid', error: true });
      }
    } catch (err: any) {
      setVoucherMsg({ text: err?.message || 'Gagal klaim voucher', error: true });
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleCheckPaymentNow = async () => {
    setCheckingPayment(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/license/status?force=true`);
      const data = await res.json();
      if (data.status === 'ACTIVE' || data.status === 'GRACE' || data.status === 'TRIAL') {
        const pkgName = selectedPackage?.name || selectedPackage?.label || (selectedPackage?.days ? `Paket ${selectedPackage.days} Hari` : 'Lisensi Aktif');
        const paidAmt = selectedPackage?.amount ?? selectedPackage?.final_amount ?? currentAmount;

        setPaymentSuccess({
          packageName: pkgName,
          amountPaid: paidAmt,
          expiredAt: data.expiredAt || '',
          daysLeft: typeof data.daysLeft === 'number' ? data.daysLeft : 1,
        });

        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    } catch {}
    finally {
      setCheckingPayment(false);
    }
  };

  const isLockedStatus = licenseState?.status === 'EXPIRED' || licenseState?.status === 'BLOCKED';
  // QRIS hanya ditampilkan saat EXPIRED / BLOCKED
  const billing: LicenseBilling | null = isLockedStatus ? (licenseState?.billing || null) : null;

  const [selectedPackage, setSelectedPackage] = useState<BillingPackage | null>(null);

  // Otomatis sinkronisasi paket pilihan saat data billing masuk/berubah
  useEffect(() => {
    if (billing?.packages && billing.packages.length > 0) {
      setSelectedPackage((prev) => {
        if (prev) {
          const match = billing.packages!.find(
            (p) => (p.id && p.id === prev.id) || (p.days === prev.days && (p.amount === prev.amount || p.final_amount === prev.final_amount))
          );
          if (match) return match;
        }
        const initial = billing.packages!.find(
          (p) => p.amount === billing.amount || p.final_amount === billing.amount
        );
        return initial || billing.packages![0];
      });
    } else {
      setSelectedPackage(null);
    }
  }, [billing]);

  const currentAmount = selectedPackage
    ? (selectedPackage.amount ?? selectedPackage.final_amount ?? billing?.amount ?? 0)
    : (billing?.amount ?? 0);
  const currentAmountText = selectedPackage
    ? (selectedPackage.amount_text || `Rp${currentAmount.toLocaleString('id-ID')}`)
    : (billing?.amount_text ?? '');
  const currentPackageName = selectedPackage
    ? (selectedPackage.label || selectedPackage.name || (selectedPackage.days ? `Paket ${selectedPackage.days} Hari` : 'Perpanjangan Lisensi'))
    : 'Perpanjangan Lisensi';

  // Reset status gambar saat nominal / QR berubah
  useEffect(() => {
    setQrFailed(false);
    setQrLoaded(false);
  }, [currentAmount, billing?.qris]);

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
      // Sudah aktif kembali (diperpanjang / dibuka kuncinya) → tampilkan sukses lalu redirect
      if (data.status === 'ACTIVE' || data.status === 'GRACE') {
        const pkgName = selectedPackage?.name || selectedPackage?.label || (selectedPackage?.days ? `Paket ${selectedPackage.days} Hari` : 'Lisensi Aktif');
        const paidAmt = selectedPackage?.amount ?? selectedPackage?.final_amount ?? currentAmount;

        setPaymentSuccess({
          packageName: pkgName,
          amountPaid: paidAmt,
          expiredAt: data.expiredAt || '',
          daysLeft: typeof data.daysLeft === 'number' ? data.daysLeft : 1,
        });

        setTimeout(() => {
          window.location.href = '/';
        }, 3200);
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
      background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 70%, #000000 100%)',
      fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box',
    }}>
      {/* Animasi partikel latar belakang halus */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${240 + i * 80}px`, height: `${240 + i * 80}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(99,102,241,${0.03 + i * 0.01}) 0%, transparent 70%)`,
            top: `${15 + i * 20}%`, left: `${10 + i * 25}%`,
            animation: `pulse ${4 + i}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      {/* Main Unified Modal Container */}
      <div style={{
        width: '100%',
        maxWidth: billing ? '1000px' : '520px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(36px)',
        WebkitBackdropFilter: 'blur(36px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255,255,255,0.03)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
        margin: 'auto 0',
      }}>

        {/* Card Header Terintegrasi */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(255, 255, 255, 0.015)',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px',
              background: isBlocked
                ? 'linear-gradient(135deg, #991b1b, #ef4444)'
                : 'linear-gradient(135deg, #312e81, #6366f1)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isBlocked ? '0 0 20px rgba(239,68,68,0.35)' : '0 0 20px rgba(99,102,241,0.35)',
              flexShrink: 0,
            }}>
              <Lock size={20} color="white" strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                  Aplikasi Terkunci
                </h1>
                <span style={{
                  fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                  background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)',
                }}>
                  {statusLabel}
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0', fontWeight: '500' }}>
                {licenseState?.lockReason || licenseState?.message || 'Selesaikan perpanjangan lisensi untuk melanjutkan penggunaan aplikasi.'}
              </p>
            </div>
          </div>

          {/* Quick Machine ID Copy Pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px', padding: '5px 10px',
          }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Machine ID
            </span>
            <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: '800', color: '#e2e8f0' }}>
              {machineId}
            </span>
            <button
              onClick={copyMachineId}
              disabled={machineId === 'Memuat...' || machineId.startsWith('GAGAL')}
              style={{
                background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: '6px', padding: '3px 8px',
                color: copied ? '#4ade80' : '#cbd5e1', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s ease',
              }}
            >
              {copied ? <><CheckCircle size={12} /> Disalin</> : <><Copy size={12} /> Salin</>}
            </button>
          </div>
        </div>

        {/* Card Body: Layar Sukses Pembayaran vs Dua Kolom Terkunci */}
        {paymentSuccess ? (
          <div style={{
            padding: '48px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            background: 'radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.22) 0%, rgba(15, 23, 42, 0.98) 75%)',
          }}>
            <div style={{
              width: '84px', height: '84px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 50px rgba(16, 185, 129, 0.6), 0 0 100px rgba(16, 185, 129, 0.25)',
              marginBottom: '20px',
            }}>
              <CheckCircle size={50} color="#ffffff" strokeWidth={2.5} />
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '20px', padding: '5px 16px', marginBottom: '12px',
            }}>
              <Sparkles size={14} color="#34d399" />
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#6ee7b7', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Pembayaran Berhasil Diverifikasi
              </span>
            </div>

            <h2 style={{ color: '#ffffff', fontSize: '26px', fontWeight: '900', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Aplikasi Berhasil Diaktifkan Kembali!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 26px', maxWidth: '480px', lineHeight: '1.5' }}>
              Terima kasih! Pembayaran QRIS Anda telah diterima dan masa aktif lisensi aplikasi Anda langsung diperpanjang secara otomatis.
            </p>

            <div style={{
              width: '100%', maxWidth: '460px',
              background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px', padding: '18px 22px',
              display: 'flex', flexDirection: 'column', gap: '14px',
              boxSizing: 'border-box', marginBottom: '28px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '10px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>Paket Lisensi</span>
                <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: '800' }}>{paymentSuccess.packageName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '10px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>Total Nominal</span>
                <span style={{ color: '#34d399', fontSize: '17px', fontWeight: '900' }}>
                  Rp{paymentSuccess.amountPaid?.toLocaleString('id-ID')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '10px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>Berlaku Sampai</span>
                <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: '800' }}>
                  {paymentSuccess.expiredAt
                    ? new Date(paymentSuccess.expiredAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Aktif'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>Total Sisa Waktu</span>
                <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: '800' }}>
                  {paymentSuccess.daysLeft} Hari Lagi
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              style={{
                width: '100%', maxWidth: '460px', padding: '13px 24px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '12px', border: 'none', color: '#ffffff',
                fontSize: '13px', fontWeight: '800', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <CheckCircle size={16} /> Buka Aplikasi Sekarang
            </button>
            <p style={{ color: '#64748b', fontSize: '11px', marginTop: '12px', marginBottom: 0 }}>
              Membuka aplikasi secara otomatis dalam beberapa detik...
            </p>
          </div>
        ) : (
        /* Card Body (Two Columns Unified Layout) */
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          flexWrap: 'wrap',
        }}>

          {/* Kolom Kiri: QRIS & Pembayaran */}
          {billing && (
            <div id="billing-panel" style={{
              flex: '0 0 360px',
              background: 'rgba(0, 0, 0, 0.22)',
              borderRight: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}>
              {/* Badge & Total Tagihan */}
              <div style={{ width: '100%' }}>
                <div style={{
                  background: 'rgba(34,197,94,0.12)', color: '#4ade80',
                  padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800',
                  display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '12px',
                }}>
                  <QrCode size={13} /> QRIS Pembayaran Otomatis
                </div>

                {/* QR Box Bersih */}
                {!qrFailed ? (
                  <div style={{
                    background: '#ffffff', padding: '10px', borderRadius: '14px',
                    width: '200px', height: '200px', boxSizing: 'border-box',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto', position: 'relative',
                    boxShadow: '0 16px 36px rgba(0,0,0,0.55)',
                  }}>
                    {!qrLoaded && (
                      <RefreshCw size={24} color="#94a3b8" style={{ position: 'absolute', animation: 'spin 1.5s linear infinite' }} />
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      id="billing-qris-image"
                      src={`${getApiUrl()}/api/license/billing/qris.png?amount=${currentAmount}&t=${currentAmount}`}
                      alt={`QRIS ${billing.merchant_name} ${currentAmountText}`}
                      width={180}
                      height={180}
                      onLoad={() => setQrLoaded(true)}
                      onError={() => setQrFailed(true)}
                      style={{
                        width: '180px', height: '180px', display: 'block',
                        objectFit: 'contain', imageRendering: 'pixelated',
                        background: '#ffffff', opacity: qrLoaded ? 1 : 0,
                      }}
                    />
                  </div>
                ) : (
                  <div id="billing-qris-offline" style={{
                    width: '200px', height: '200px', boxSizing: 'border-box', margin: '0 auto',
                    padding: '16px', borderRadius: '14px', background: 'rgba(239,68,68,0.1)', color: '#fca5a5',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                    <WifiOff size={24} />
                    <div style={{ fontSize: '11px', fontWeight: 600 }}>Hubungkan internet</div>
                    <button
                      id="billing-qris-retry"
                      onClick={() => { setQrFailed(false); setQrLoaded(false); }}
                      style={{ background: 'rgba(255,255,255,0.08)', color: '#fca5a5', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Coba lagi
                    </button>
                  </div>
                )}

                {/* Total Tagihan */}
                <div style={{ marginTop: '14px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Total tagihan • {currentPackageName}
                  </div>
                  <div id="billing-amount" style={{ color: '#fff', fontSize: '30px', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: '2px' }}>
                    {currentAmountText}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px', fontWeight: 600 }}>
                    QRIS · {billing.merchant_name}
                  </div>
                  {billing.note && (
                    <p style={{ color: '#64748b', fontSize: '11px', margin: '6px 0 0', lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>
                      {billing.note}
                    </p>
                  )}
                </div>
              </div>

              {/* Tombol WhatsApp & Info Kontak */}
              <div style={{ width: '100%', marginTop: '14px' }}>
                {billing.contact.trim() !== '' && (
                  <a
                    id="billing-whatsapp"
                    href={`https://wa.me/${toWaNumber(billing.contact)}?text=${encodeURIComponent(
                      `Halo admin, saya ingin membayar perpanjangan lisensi Billiard.\nPaket: ${currentPackageName}\nMachine ID: ${machineId}\nNominal: ${currentAmountText}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="billing-wa-btn"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '9px 14px',
                      background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                      borderRadius: '10px', color: 'white', textDecoration: 'none',
                      fontSize: '12px', fontWeight: '700',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <MessageCircle size={15} /> Hubungi Admin / Kirim Bukti
                  </a>
                )}
                {billing.contact && (
                  <span style={{ fontSize: '10px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                    Nomor Admin: <strong style={{ color: '#cbd5e1' }}>{billing.contact}</strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Kolom Kanan: Pilihan Paket & Konfirmasi Aktivasi */}
          <div style={{
            flex: '1 1 480px',
            padding: '24px 26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}>
            <div>
              {/* Header Pilihan Paket */}
              {billing?.packages && billing.packages.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}>
                    <span style={{
                      fontSize: '11px', fontWeight: '800', color: '#cbd5e1',
                      letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <Tag size={12} color="#818cf8" /> Pilih Paket Perpanjangan
                    </span>
                    {billing.unique_code && (
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                        Kode Unik Otomatis: <strong style={{ color: '#38bdf8' }}>+{billing.unique_code}</strong>
                      </span>
                    )}
                  </div>

                  {/* Grid Paket 2 Kolom Rapi */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '8px',
                    width: '100%',
                  }}>
                    {billing.packages.map((pkg, idx) => {
                      const isSelected = selectedPackage
                        ? (selectedPackage.id ? selectedPackage.id === pkg.id : (selectedPackage.amount === pkg.amount && selectedPackage.days === pkg.days))
                        : idx === 0;
                      const pkgAmount = pkg.amount ?? pkg.final_amount ?? 0;
                      const pkgText = pkg.amount_text || `Rp${pkgAmount.toLocaleString('id-ID')}`;
                      const hasPromo = pkg.is_promo || (pkg.basePrice && pkg.promoPrice && pkg.basePrice > pkg.promoPrice);
                      const badge = pkg.promo_badge || (hasPromo ? 'PROMO' : null);

                      return (
                        <button
                          key={pkg.id || `pkg-${idx}`}
                          type="button"
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setQrLoaded(false);
                            setQrFailed(false);
                          }}
                          style={{
                            position: 'relative',
                            textAlign: 'left',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: isSelected ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.06)',
                            background: isSelected
                              ? 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(79,70,229,0.1) 100%)'
                              : 'rgba(255,255,255,0.02)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease-in-out',
                            boxShadow: isSelected ? '0 0 16px rgba(99,102,241,0.25)' : 'none',
                          }}
                        >
                          {badge && (
                            <span style={{
                              position: 'absolute', top: '-6px', right: '10px',
                              fontSize: '8px', fontWeight: '900', padding: '1px 6px', borderRadius: '4px',
                              background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                              letterSpacing: '0.04em', boxShadow: '0 2px 4px rgba(239,68,68,0.35)',
                            }}>
                              {badge}
                            </span>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{
                              fontSize: '12px', fontWeight: isSelected ? '800' : '700',
                              color: isSelected ? '#ffffff' : '#cbd5e1', lineHeight: 1.2,
                            }}>
                              {pkg.label || pkg.name || `${pkg.days} Hari`}
                            </span>
                            <div style={{
                              width: '14px', height: '14px', borderRadius: '50%',
                              border: isSelected ? '4px solid #6366f1' : '1.5px solid rgba(255,255,255,0.2)',
                              background: isSelected ? '#fff' : 'transparent',
                              transition: 'all 0.15s ease', flexShrink: 0,
                            }} />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '14px', fontWeight: '900',
                              color: isSelected ? '#38bdf8' : '#e2e8f0', letterSpacing: '-0.01em',
                            }}>
                              {pkgText}
                            </span>
                            {hasPromo && pkg.basePrice && (
                              <span style={{ fontSize: '9px', color: '#64748b', textDecoration: 'line-through', fontWeight: '600' }}>
                                Rp{pkg.basePrice.toLocaleString('id-ID')}
                              </span>
                            )}
                          </div>

                          {pkg.days && (
                            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '500', marginTop: '1px', display: 'block' }}>
                              +{pkg.days} Hari masa aktif
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status Info Buka Otomatis */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.15)',
                borderRadius: '12px', padding: '10px 14px', marginBottom: '14px',
              }}>
                <RefreshCw size={15} style={{ color: '#5eead4', animation: 'spin 2s linear infinite', flexShrink: 0 }} />
                <p style={{ color: '#99f6e4', fontSize: '11px', margin: 0, lineHeight: 1.4 }}>
                  Setelah scan / transfer, sistem membuka kunci <strong>otomatis dalam ±10 detik</strong> tanpa perlu memasukkan kode.
                </p>
              </div>

              {/* Tombol Utama: Saya Sudah Bayar */}
              <button
                type="button"
                onClick={handleCheckPaymentNow}
                disabled={checkingPayment}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  borderRadius: '12px', border: 'none', color: 'white',
                  fontSize: '13px', fontWeight: '800',
                  cursor: checkingPayment ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                  transition: 'all 0.15s ease',
                  marginBottom: '12px',
                  opacity: checkingPayment ? 0.7 : 1,
                }}
              >
                {checkingPayment ? (
                  <>
                    <RefreshCw size={15} style={{ animation: 'spin 1.5s linear infinite' }} /> Memeriksa Status Pembayaran...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} /> ✅ Saya Sudah Bayar (Buka Sekarang)
                  </>
                )}
              </button>

              {/* Form Klaim Kode Voucher Promo */}
              <form onSubmit={handleClaimVoucher} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '8px 10px',
                marginBottom: '14px',
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Punya voucher promo? Masukkan di sini"
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: 'white',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={voucherLoading || !voucherCode.trim()}
                    style={{
                      background: 'rgba(99,102,241,0.25)',
                      border: '1px solid rgba(99,102,241,0.5)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#c7d2fe',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: (voucherLoading || !voucherCode.trim()) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {voucherLoading ? '...' : <>Klaim <ArrowRight size={12} /></>}
                  </button>
                </div>
                {voucherMsg && (
                  <p style={{
                    marginTop: '6px', marginBottom: 0, fontSize: '10px', fontWeight: '600',
                    color: voucherMsg.error ? '#f87171' : '#4ade80'
                  }}>
                    {voucherMsg.text}
                  </p>
                )}
              </form>
            </div>

            {/* Metode Pembayaran Didukung (Footer Kanan) */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', flexWrap: 'wrap', gap: '8px',
            }}>
              <span style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Metode Pembayaran
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                <span className="px-1.5 py-0.5 bg-white rounded text-[8px] font-black text-[#005E6A] italic shadow-sm">Mandiri</span>
                <span className="px-1.5 py-0.5 bg-white rounded text-[8px] font-black text-[#0066AE] italic shadow-sm">BCA</span>
                <span className="px-1.5 py-0.5 bg-white rounded text-[8px] font-black text-[#00529C] shadow-sm">BRI</span>
                <span className="px-1.5 py-0.5 bg-white rounded text-[8px] font-black text-[#F36F21] shadow-sm">BNI</span>
                <span className="px-1.5 py-0.5 bg-white rounded text-[8px] font-black text-[#00AED6] shadow-sm">DANA</span>
                <span className="px-1.5 py-0.5 bg-white rounded text-[8px] font-black text-[#4C2A86] shadow-sm">OVO</span>
                <span className="px-1.5 py-0.5 bg-white rounded text-[8px] font-black text-[#00AED6] shadow-sm">gopay</span>
                <span className="px-1.5 py-0.5 bg-white rounded text-[8px] font-black text-[#EE4D2D] shadow-sm">ShopeePay</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Footer Branding */}
      <p style={{
        textAlign: 'center', color: '#475569',
        fontSize: '11px', margin: '12px 0 0',
      }}>
        VOC Billiard Management System v2.0 • Lisensi Komersial
      </p>

      <style>{`
        @keyframes pulse {
          from { transform: scale(0.95); opacity: 0.5; }
          to { transform: scale(1.05); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .billing-wa-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(34,197,94,0.45) !important;
        }
      `}</style>
    </div>
  );
}
