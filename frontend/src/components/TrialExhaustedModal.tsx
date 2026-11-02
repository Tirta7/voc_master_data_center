'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lock, QrCode, MessageCircle, RefreshCw, CheckCircle, Tag, ArrowRight, X, Sparkles, WifiOff, Calendar, ShieldCheck } from 'lucide-react';
import { getApiUrl, getSocketUrl } from '@/utils/urlUtils';
import { socket } from '@/lib/socket';

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

interface LicenseBilling {
  amount: number;
  amount_text: string;
  merchant_name: string;
  contact: string;
  note?: string;
  packages?: BillingPackage[];
  unique_code?: number | null;
}

interface TrialExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
  billingData?: LicenseBilling | null;
  machineId?: string;
  onVoucherClaimed?: () => void;
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

const toWaNumber = (contact: string) => {
  const d = contact.replace(/\D/g, '');
  return d.startsWith('0') ? `62${d.slice(1)}` : d;
};

export default function TrialExhaustedModal({
  isOpen,
  onClose,
  billingData,
  machineId = 'VOC-2177-C6EC-13BF',
  onVoucherClaimed,
  title,
  subtitle,
  badgeText,
}: TrialExhaustedModalProps) {
  const qrImgRef = useRef<HTMLImageElement | null>(null);
  const [billing, setBilling] = useState<LicenseBilling | null>(billingData || null);
  const [selectedPackage, setSelectedPackage] = useState<BillingPackage | null>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
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
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  const currentAmount = selectedPackage
    ? (selectedPackage.amount ?? selectedPackage.final_amount ?? billing?.amount ?? 0)
    : (billing?.amount ?? 0);
  const currentAmountText = selectedPackage
    ? (selectedPackage.amount_text || `Rp${currentAmount.toLocaleString('id-ID')}`)
    : (billing?.amount_text ?? '');
  const currentPackageName = selectedPackage
    ? (selectedPackage.label || selectedPackage.name || (selectedPackage.days ? `Paket ${selectedPackage.days} Hari` : 'Perpanjangan Lisensi'))
    : 'Perpanjangan Lisensi';

  const initialLicenseRef = useRef<{
    expiredAt?: string;
    licenseKey?: string;
    uniqueCode?: number;
    daysLeft?: number;
    status?: string;
  } | null>(null);

  // Sinkronisasi billing realtime saat modal dibuka
  useEffect(() => {
    if (billingData && billingData.packages && billingData.packages.length > 0) {
      setBilling(billingData);
    }
  }, [billingData]);

  useEffect(() => {
    if (!isOpen) {
      initialLicenseRef.current = null;
      setPaymentSuccess(null);
      setPaymentNotice(null);
      return;
    }

    // Ambil baseline lisensi saat modal pertama kali dibuka
    fetch(`${getApiUrl()}/api/license/status`)
      .then((r) => r.json())
      .then((d) => {
        if (!initialLicenseRef.current && d) {
          initialLicenseRef.current = {
            expiredAt: d.expiredAt || '',
            licenseKey: d.licenseKey || '',
            uniqueCode: d.billing?.unique_code ?? d.uniqueCode,
            daysLeft: typeof d.daysLeft === 'number' ? d.daysLeft : 0,
            status: d.status,
          };
        }
      })
      .catch(() => {});

    const detectPaymentSuccess = (newData: any) => {
      const init = initialLicenseRef.current;
      if (!init || !newData) return false;

      const newCode = newData.billing?.unique_code ?? newData.uniqueCode;
      const oldCode = init.uniqueCode;

      const expiredExtended = !!(newData.expiredAt && init.expiredAt && newData.expiredAt > init.expiredAt);
      const daysIncreased = !!(typeof newData.daysLeft === 'number' && typeof init.daysLeft === 'number' && newData.daysLeft > init.daysLeft);
      const keyChanged = !!(newData.licenseKey && init.licenseKey && newData.licenseKey !== init.licenseKey);
      const codeRotated = !!(oldCode && newCode && Number(newCode) !== Number(oldCode));

      if (expiredExtended || daysIncreased || keyChanged || codeRotated) {
        const pkgName = selectedPackage?.name || selectedPackage?.label || (selectedPackage?.days ? `Paket ${selectedPackage.days} Hari` : 'Paket Lisensi');
        const paidAmt = selectedPackage?.amount ?? selectedPackage?.final_amount ?? currentAmount;

        setPaymentSuccess({
          packageName: pkgName,
          amountPaid: paidAmt,
          expiredAt: newData.expiredAt || '',
          daysLeft: typeof newData.daysLeft === 'number' ? newData.daysLeft : (typeof init.daysLeft === 'number' ? init.daysLeft + 1 : 1),
        });

        // Update baseline
        initialLicenseRef.current = {
          expiredAt: newData.expiredAt || '',
          licenseKey: newData.licenseKey || '',
          uniqueCode: newCode,
          daysLeft: newData.daysLeft,
          status: newData.status,
        };

        if (onVoucherClaimed) onVoucherClaimed();
        return true;
      }
      return false;
    };

    const fetchLatestBilling = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/license/status?force=true`);
        if (res.ok) {
          const d = await res.json();
          detectPaymentSuccess(d);
          if (d.billing && d.billing.packages && d.billing.packages.length > 0) {
            setBilling(d.billing);
            setQrFailed(false);
            return;
          }
        }
        const bRes = await fetch(`${getApiUrl()}/api/license/billing`);
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData?.billing && bData.billing.packages?.length > 0) {
            setBilling(bData.billing);
            setQrFailed(false);
          }
        }
      } catch {}
    };

    fetchLatestBilling();
    const interval = setInterval(fetchLatestBilling, 2500);

    const onLicenseUpdated = (data: any) => {
      if (data) {
        detectPaymentSuccess(data);
        if (data.billing) {
          setBilling(data.billing);
        }
      }
    };
    socket.on('license_updated', onLicenseUpdated);

    let es: EventSource | null = null;
    try {
      es = new EventSource(`${getSocketUrl()}/api/license/stream`);
      es.addEventListener('license', (ev) => {
        try {
          const state = JSON.parse((ev as MessageEvent).data);
          if (state) {
            detectPaymentSuccess(state);
            if (state.billing) {
              setBilling(state.billing);
            }
          }
        } catch {}
      });
    } catch {}

    return () => {
      clearInterval(interval);
      socket.off('license_updated', onLicenseUpdated);
      es?.close();
    };
  }, [isOpen, selectedPackage, currentAmount]);

  // Pilih paket default
  useEffect(() => {
    if (billing?.packages && billing.packages.length > 0) {
      setSelectedPackage((prev) => {
        if (prev) {
          const match = billing.packages!.find(
            (p) => (p.id && prev.id && p.id === prev.id) || (p.days && prev.days && p.days === prev.days)
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

  useEffect(() => {
    setQrFailed(false);
    if (qrImgRef.current && qrImgRef.current.complete && qrImgRef.current.naturalWidth > 0) {
      setQrLoaded(true);
    } else {
      setQrLoaded(false);
    }
  }, [currentAmount]);

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
        setVoucherMsg({ text: data.message || 'Voucher berhasil digunakan! Kuota trial telah ditambahkan.' });
        if (onVoucherClaimed) onVoucherClaimed();
        setTimeout(() => {
          onClose();
        }, 1500);
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
    setPaymentNotice(null);
    try {
      const res = await fetch(`${getApiUrl()}/api/license/status?force=true`);
      const data = await res.json();
      const init = initialLicenseRef.current;
      const newCode = data.billing?.unique_code ?? data.uniqueCode;
      const oldCode = init?.uniqueCode;

      const expiredExtended = !!(init?.expiredAt && data.expiredAt && data.expiredAt > init.expiredAt);
      const daysIncreased = !!(typeof init?.daysLeft === 'number' && typeof data.daysLeft === 'number' && data.daysLeft > init.daysLeft);
      const keyChanged = !!(init?.licenseKey && data.licenseKey && data.licenseKey !== init.licenseKey);
      const codeRotated = !!(oldCode && newCode && Number(newCode) !== Number(oldCode));

      if (expiredExtended || daysIncreased || keyChanged || codeRotated) {
        setPaymentSuccess({
          packageName: selectedPackage?.name || selectedPackage?.label || (selectedPackage?.days ? `Paket ${selectedPackage.days} Hari` : 'Paket Lisensi'),
          amountPaid: selectedPackage?.amount ?? selectedPackage?.final_amount ?? currentAmount,
          expiredAt: data.expiredAt || '',
          daysLeft: typeof data.daysLeft === 'number' ? data.daysLeft : 1,
        });
        if (onVoucherClaimed) onVoucherClaimed();
      } else {
        setPaymentNotice('Sedang memverifikasi mutasi transfer QRIS Anda... Mohon tunggu 5-10 detik jika baru saja transfer dari m-banking/e-wallet.');
        setTimeout(() => setPaymentNotice(null), 8000);
      }
    } catch {
      setPaymentNotice('Gagal menghubungkan ke server lisensi. Pastikan koneksi internet stabil.');
    } finally {
      setCheckingPayment(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="trial-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100%',
        minHeight: '100dvh',
        zIndex: 9999999,
        background: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        overscrollBehaviorY: 'contain',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'max(20px, env(safe-area-inset-top, 20px))',
        paddingBottom: 'max(36px, env(safe-area-inset-bottom, 36px))',
        paddingLeft: 'max(14px, env(safe-area-inset-left, 14px))',
        paddingRight: 'max(14px, env(safe-area-inset-right, 14px))',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="trial-modal-container"
        style={{
          width: '100%',
          maxWidth: '860px',
          background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(99,102,241,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          margin: 'auto 0',
          flexShrink: 0,
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header Modal */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px',
              background: title ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'linear-gradient(135deg, #dc2626, #ef4444)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: title ? '0 0 20px rgba(99,102,241,0.4)' : '0 0 20px rgba(239,68,68,0.4)',
            }}>
              <Sparkles size={20} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ color: 'white', fontSize: '17px', fontWeight: '800', margin: 0, letterSpacing: '-0.01em' }}>
                  {title || 'Kuota Coba Gratis Telah Habis'}
                </h2>
                <span style={{
                  fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                  background: title ? 'rgba(99,102,241,0.2)' : 'rgba(239,68,68,0.2)',
                  color: title ? '#c7d2fe' : '#fca5a5',
                  border: title ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(239,68,68,0.3)',
                }}>
                  {badgeText || (title ? 'DAFTAR PAKET' : 'TRIAL 0 SESI')}
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0' }}>
                {subtitle || 'Untuk menyalakan meja baru, silakan lakukan perpanjangan lisensi atau masukkan kode voucher promo.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none', borderRadius: '50%',
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            title="Tutup Modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Modal: Layar Sukses Pembayaran vs Layar Dua Kolom (QRIS & Paket) */}
        {paymentSuccess ? (
          <div style={{
            padding: '38px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            background: 'radial-gradient(circle at 50% 15%, rgba(16, 185, 129, 0.22) 0%, rgba(15, 23, 42, 0.98) 75%)',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <div style={{
              width: '78px', height: '78px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 45px rgba(16, 185, 129, 0.55), 0 0 90px rgba(16, 185, 129, 0.25)',
              marginBottom: '18px',
              animation: 'bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}>
              <CheckCircle size={46} color="#ffffff" strokeWidth={2.5} />
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '20px', padding: '5px 16px', marginBottom: '12px',
            }}>
              <Sparkles size={14} color="#34d399" />
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#6ee7b7', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Pembayaran Berhasil Diterima
              </span>
            </div>

            <h2 style={{
              color: '#ffffff', fontSize: '23px', fontWeight: '900', margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}>
              Lisensi Anda Berhasil Diperpanjang!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 24px', maxWidth: '460px', lineHeight: '1.5' }}>
              Terima kasih! Pembayaran QRIS Anda telah terverifikasi secara otomatis. Masa aktif lisensi aplikasi Anda telah diperbarui.
            </p>

            {/* Rincian Transaksi */}
            <div style={{
              width: '100%', maxWidth: '440px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px', padding: '16px 20px',
              display: 'flex', flexDirection: 'column', gap: '12px',
              boxSizing: 'border-box', marginBottom: '24px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '10px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>Paket Diperpanjang</span>
                <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: '800' }}>{paymentSuccess.packageName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '10px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>Total Nominal</span>
                <span style={{ color: '#34d399', fontSize: '16px', fontWeight: '900' }}>
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

            {/* Tombol Selesai */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%', maxWidth: '440px', padding: '12px 24px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '12px', border: 'none', color: '#ffffff',
                fontSize: '13px', fontWeight: '800', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'transform 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <CheckCircle size={16} /> Selesai & Lanjutkan
            </button>
          </div>
        ) : (
        /* Body Modal: Dua Kolom (Kiri QRIS & Kanan Pilihan Paket + Voucher) */
        <div
          className="trial-modal-columns"
          style={{
            display: 'flex', flexDirection: 'row', alignItems: 'stretch',
            flexWrap: 'wrap', width: '100%',
          }}
        >
          {/* Kolom Kiri: QRIS & Nominal */}
          <div
            className="trial-modal-qris-col"
            style={{
              flex: '0 0 320px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRight: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
              textAlign: 'center', boxSizing: 'border-box',
            }}
          >
            <div style={{ width: '100%' }}>
              <div style={{
                background: 'rgba(34,197,94,0.12)', color: '#4ade80',
                padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '800',
                display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '12px',
              }}>
                <QrCode size={12} /> Scan QRIS Pembayaran
              </div>

              {/* QR Image Box */}
              {!qrFailed ? (
                <div style={{
                  background: '#ffffff', padding: '8px', borderRadius: '12px',
                  width: '180px', height: '180px', boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto', position: 'relative',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                }}>
                  {!qrLoaded && currentAmount > 0 && (
                    <RefreshCw size={22} color="#94a3b8" style={{ position: 'absolute', animation: 'spin 1.5s linear infinite' }} />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {currentAmount > 0 ? (
                    <img
                      ref={qrImgRef}
                      src={`${getApiUrl()}/api/license/billing/qris.png?amount=${currentAmount}&t=${currentAmount}`}
                      alt={`QRIS ${currentAmountText}`}
                      width={164}
                      height={164}
                      onLoad={() => setQrLoaded(true)}
                      onError={() => setQrFailed(true)}
                      style={{
                        width: '164px', height: '164px', display: 'block',
                        objectFit: 'contain', imageRendering: 'pixelated',
                        background: '#ffffff', opacity: qrLoaded ? 1 : 0,
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={24} color="#6366f1" style={{ animation: 'spin 1.5s linear infinite' }} />
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Memuat QRIS...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  width: '180px', height: '180px', boxSizing: 'border-box', margin: '0 auto',
                  padding: '16px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: '#fca5a5',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                  <WifiOff size={22} />
                  <div style={{ fontSize: '11px', fontWeight: 600 }}>Koneksi terputus</div>
                  <button
                    onClick={() => { setQrFailed(false); setQrLoaded(false); }}
                    style={{ background: 'rgba(255,255,255,0.08)', color: '#fca5a5', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Coba lagi
                  </button>
                </div>
              )}

              {/* Total Tagihan */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Total tagihan • {currentPackageName}
                </div>
                <div style={{ color: '#fff', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: '2px' }}>
                  {currentAmountText}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px', fontWeight: 600 }}>
                  QRIS · {billing?.merchant_name || 'VIRTUAL OPERATION CONTROL'}
                </div>
              </div>
            </div>

            {/* WA button */}
            <div style={{ width: '100%', marginTop: '12px' }}>
              {billing?.contact && (
                <a
                  href={`https://wa.me/${toWaNumber(billing.contact)}?text=${encodeURIComponent(
                    `Halo admin, saya ingin memperpanjang lisensi Billiard.\nPaket: ${currentPackageName}\nMachine ID: ${machineId}\nNominal: ${currentAmountText}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    borderRadius: '8px', color: 'white', textDecoration: 'none',
                    fontSize: '11px', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                  }}
                >
                  <MessageCircle size={14} /> Hubungi Admin / Kirim Bukti
                </a>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Pilihan Paket & Form Voucher */}
          <div
            className="trial-modal-content-col"
            style={{
              flex: '1 1 440px',
              padding: '20px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            <div>
              {/* Pilihan Paket */}
              {billing?.packages && billing.packages.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#cbd5e1', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={12} color="#818cf8" /> Pilih Paket Lisensi
                    </span>
                    {billing.unique_code && (
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                        Kode Unik: <strong style={{ color: '#38bdf8' }}>+{billing.unique_code}</strong>
                      </span>
                    )}
                  </div>

                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '8px', width: '100%',
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
                            if (isSelected) return;
                            setSelectedPackage(pkg);
                          }}
                          style={{
                            position: 'relative', textAlign: 'left', padding: '8px 10px',
                            borderRadius: '10px',
                            border: isSelected ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.06)',
                            background: isSelected ? 'linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(79,70,229,0.12) 100%)' : 'rgba(255,255,255,0.02)',
                            cursor: 'pointer', transition: 'all 0.15s ease',
                          }}
                        >
                          {badge && (
                            <span style={{
                              position: 'absolute', top: '-5px', right: '8px',
                              fontSize: '8px', fontWeight: '900', padding: '1px 5px', borderRadius: '4px',
                              background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                            }}>
                              {badge}
                            </span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '11px', fontWeight: isSelected ? '800' : '700', color: isSelected ? '#fff' : '#cbd5e1' }}>
                              {pkg.label || pkg.name || `${pkg.days} Hari`}
                            </span>
                            <div style={{
                              width: '12px', height: '12px', borderRadius: '50%',
                              border: isSelected ? '3.5px solid #6366f1' : '1.5px solid rgba(255,255,255,0.2)',
                              background: isSelected ? '#fff' : 'transparent',
                            }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: isSelected ? '#38bdf8' : '#e2e8f0' }}>
                              {pkgText}
                            </span>
                            {hasPromo && pkg.basePrice && (
                              <span style={{ fontSize: '9px', color: '#64748b', textDecoration: 'line-through' }}>
                                Rp{pkg.basePrice.toLocaleString('id-ID')}
                              </span>
                            )}
                          </div>
                          {pkg.days && (
                            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '500' }}>
                              +{pkg.days} Hari aktif
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form Klaim Kode Voucher Promo */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '12px', marginBottom: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#c7d2fe', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                  <Tag size={13} /> Punya Kode Voucher Promo / Trial?
                </div>
                <form onSubmit={handleClaimVoucher} style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode voucher di sini"
                    style={{
                      flex: 1, background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px', padding: '7px 10px',
                      color: 'white', fontSize: '11px', fontFamily: 'monospace', outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={voucherLoading || !voucherCode.trim()}
                    style={{
                      background: 'rgba(99,102,241,0.3)',
                      border: '1px solid rgba(99,102,241,0.6)',
                      borderRadius: '8px', padding: '7px 14px',
                      color: '#c7d2fe', fontSize: '11px', fontWeight: '700',
                      cursor: (voucherLoading || !voucherCode.trim()) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
                    }}
                  >
                    {voucherLoading ? '...' : <>Klaim <ArrowRight size={12} /></>}
                  </button>
                </form>
                {voucherMsg && (
                  <p style={{
                    marginTop: '6px', marginBottom: 0, fontSize: '10px', fontWeight: '600',
                    color: voucherMsg.error ? '#f87171' : '#4ade80'
                  }}>
                    {voucherMsg.text}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  onClick={handleCheckPaymentNow}
                  disabled={checkingPayment}
                  style={{
                    flex: 1, padding: '10px 14px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderRadius: '10px', border: 'none', color: 'white',
                    fontSize: '12px', fontWeight: '800', cursor: checkingPayment ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  }}
                >
                  {checkingPayment ? (
                    <><RefreshCw size={13} style={{ animation: 'spin 1.5s linear infinite' }} /> Memeriksa...</>
                  ) : (
                    <><CheckCircle size={14} /> Saya Sudah Bayar</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#94a3b8',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  }}
                >
                  Tutup
                </button>
              </div>

              {paymentNotice && (
                <div style={{
                  marginTop: '10px', padding: '9px 12px', borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)',
                  color: '#93c5fd', fontSize: '11px', lineHeight: '1.4', textAlign: 'left',
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                }}>
                  <RefreshCw size={14} style={{ flexShrink: 0, marginTop: '2px', animation: 'spin 2s linear infinite' }} />
                  <span>{paymentNotice}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      <style>{`
        @keyframes modalSlideUp {
          from { transform: translateY(20px) scale(0.96); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.08); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }

        /* ─── iOS Safari & Dynamic Island Scroll Fix ─── */
        .trial-modal-backdrop {
          -webkit-overflow-scrolling: touch !important;
          touch-action: pan-y !important;
        }

        @media (max-width: 768px) {
          .trial-modal-backdrop {
            padding-top: max(24px, env(safe-area-inset-top, 24px)) !important;
            padding-bottom: max(40px, env(safe-area-inset-bottom, 40px)) !important;
            padding-left: max(12px, env(safe-area-inset-left, 12px)) !important;
            padding-right: max(12px, env(safe-area-inset-right, 12px)) !important;
            display: block !important;
          }
          .trial-modal-container {
            margin: 0 auto 20px auto !important;
            border-radius: 20px !important;
            max-width: 100% !important;
          }
          .trial-modal-columns {
            flex-direction: column !important;
          }
          .trial-modal-qris-col {
            flex: 1 1 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
            padding: 20px 14px !important;
          }
          .trial-modal-content-col {
            flex: 1 1 auto !important;
            width: 100% !important;
            padding: 20px 14px !important;
          }
        }
      `}</style>
    </div>
  );
}

