'use client';

import React, { useState, useEffect } from 'react';
import { Lock, QrCode, MessageCircle, RefreshCw, CheckCircle, Tag, ArrowRight, X, Sparkles, WifiOff } from 'lucide-react';
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
  const [billing, setBilling] = useState<LicenseBilling | null>(billingData || null);
  const [selectedPackage, setSelectedPackage] = useState<BillingPackage | null>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Sinkronisasi billing realtime saat modal dibuka
  useEffect(() => {
    if (billingData && billingData.packages && billingData.packages.length > 0) {
      setBilling(billingData);
    }
  }, [billingData]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLatestBilling = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/license/status?force=true`);
        if (res.ok) {
          const d = await res.json();
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
      if (data?.billing) {
        setBilling(data.billing);
      }
    };
    socket.on('license_updated', onLicenseUpdated);

    let es: EventSource | null = null;
    try {
      es = new EventSource(`${getSocketUrl()}/api/license/stream`);
      es.addEventListener('license', (ev) => {
        try {
          const state = JSON.parse((ev as MessageEvent).data);
          if (state?.billing) {
            setBilling(state.billing);
          }
        } catch {}
      });
    } catch {}

    return () => {
      clearInterval(interval);
      socket.off('license_updated', onLicenseUpdated);
      es?.close();
    };
  }, [isOpen]);

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

  const currentAmount = selectedPackage
    ? (selectedPackage.amount ?? selectedPackage.final_amount ?? billing?.amount ?? 0)
    : (billing?.amount ?? 0);
  const currentAmountText = selectedPackage
    ? (selectedPackage.amount_text || `Rp${currentAmount.toLocaleString('id-ID')}`)
    : (billing?.amount_text ?? '');
  const currentPackageName = selectedPackage
    ? (selectedPackage.label || selectedPackage.name || (selectedPackage.days ? `Paket ${selectedPackage.days} Hari` : 'Perpanjangan Lisensi'))
    : 'Perpanjangan Lisensi';

  useEffect(() => {
    setQrLoaded(false);
    setQrFailed(false);
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
    try {
      const res = await fetch(`${getApiUrl()}/api/license/status?force=true`);
      const data = await res.json();
      if (data.status === 'ACTIVE' || data.status === 'GRACE' || (data.trial && data.trial.remaining > 0)) {
        if (onVoucherClaimed) onVoucherClaimed();
        onClose();
      }
    } catch {}
    finally {
      setCheckingPayment(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999999,
      background: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%', maxWidth: '860px',
        background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(99,102,241,0.2)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
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

        {/* Body Modal: Dua Kolom (Kiri QRIS & Kanan Pilihan Paket + Voucher) */}
        <div style={{
          display: 'flex', flexDirection: 'row', alignItems: 'stretch',
          flexWrap: 'wrap',
        }}>
          {/* Kolom Kiri: QRIS & Nominal */}
          <div style={{
            flex: '0 0 320px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
            textAlign: 'center', boxSizing: 'border-box',
          }}>
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
          <div style={{
            flex: '1 1 440px',
            padding: '20px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}>
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
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
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
                          onClick={() => setSelectedPackage(pkg)}
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
          </div>
        </div>
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
      `}</style>
    </div>
  );
}

