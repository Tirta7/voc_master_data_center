'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Lock,
  QrCode,
  MessageCircle,
  RefreshCw,
  CheckCircle,
  Tag,
  ArrowRight,
  X,
  Sparkles,
  WifiOff,
  Calendar,
  Layers,
  Clock,
  AlertTriangle,
  Flame,
  Check,
} from 'lucide-react';
import { getApiUrl, getSocketUrl } from '@/utils/urlUtils';
import { socket } from '@/lib/socket';

const VOCML_BASE = 'https://vocml.vocpos.id';
const DEFAULT_MID = 'VOC-2177-C6EC-13BF';
const PRODUCT = 'billiard';

export interface BillingPackage {
  id?: string;
  type?: 'quota' | 'days' | string;
  days?: number;
  quota?: number;
  label?: string;
  name?: string;
  basePrice?: number;
  promoPrice?: number;
  original_price?: number;
  promo_price?: number;
  is_promo?: boolean;
  promo_badge?: string;
  promoBadge?: string;
  unique_code?: number | null;
  final_amount?: number;
  amount?: number;
  amount_text?: string;
  qris_image_url?: string;
  qris?: string;
}

export interface LicenseBilling {
  amount: number;
  amount_text: string;
  merchant_name: string;
  merchant_city?: string;
  contact: string;
  note?: string;
  packages?: BillingPackage[];
  unique_code?: number | null;
  qris_image_url?: string;
  qris?: string;
  reason?: string;
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

// Audio Ding Lonceng Kasir Realtime
function playDingSound() {
  try {
    const audio = new Audio('/sounds/payment-success.mp3');
    audio.play().catch(() => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3); // A6
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
      } catch {}
    });
  } catch {}
}

export default function TrialExhaustedModal({
  isOpen,
  onClose,
  billingData,
  machineId = DEFAULT_MID,
  onVoucherClaimed,
  title,
  subtitle,
  badgeText,
}: TrialExhaustedModalProps) {
  const [billing, setBilling] = useState<LicenseBilling | null>(billingData || null);
  const [selectedPackage, setSelectedPackage] = useState<BillingPackage | null>(null);
  const [packageTab, setPackageTab] = useState<'quota' | 'days'>('quota');
  const [remainingDays, setRemainingDays] = useState<number>(0);

  const qrImgRef = useRef<HTMLImageElement | null>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Payment check states
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    packageName?: string;
    amountText?: string;
    addedQuota?: number;
    totalRemaining?: number;
    expiredAt?: string | null;
    daysLeft?: number;
  } | null>(null);

  const activeMachineId = machineId || DEFAULT_MID;

  // 1. Fetch fresh check data langsung dari server VOC ML / backend
  const fetchFreshBilling = useCallback(async () => {
    try {
      let data: any = null;
      try {
        const res = await fetch(
          `${VOCML_BASE}/api/v1/check?machine_id=${activeMachineId}&product=${PRODUCT}&_t=${Date.now()}`,
          { cache: 'no-store', signal: AbortSignal.timeout(4000) }
        );
        if (res.ok) data = await res.json();
      } catch {}

      if (!data) {
        const bRes = await fetch(`${getApiUrl()}/api/license/billing?fresh=true&_t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (bRes.ok) {
          const bData = await bRes.json();
          data = bData;
        }
      }

      if (data) {
        if (data.billing) setBilling(data.billing);
        if (typeof data.remaining_days === 'number') setRemainingDays(data.remaining_days);
        else if (typeof data.days_left === 'number') setRemainingDays(data.days_left);
        setQrFailed(false);
      }
    } catch {}
  }, [activeMachineId]);

  useEffect(() => {
    if (billingData) {
      setBilling(billingData);
    }
  }, [billingData]);

  // Pisahkan paket menjadi Tab Kuota Sesi dan Tab Waktu Hari
  const allPackages: BillingPackage[] = useMemo(() => {
    return Array.isArray(billing?.packages) ? billing.packages : [];
  }, [billing?.packages]);

  const quotaPackages = useMemo(() => {
    return allPackages.filter((p) => p.type === 'quota' || (Number(p.quota) > 0 && !p.days));
  }, [allPackages]);

  const daysPackages = useMemo(() => {
    return allPackages.filter((p) => p.type === 'days' || (!p.type && Number(p.days) > 0) || (Number(p.days) > 0 && !p.quota));
  }, [allPackages]);

  // Set default tab dan package saat modal dibuka / data masuk
  useEffect(() => {
    if (!isOpen) return;

    fetchFreshBilling();

    // Utamakan tab kuota jika ada paket kuota, fallback ke tab days
    if (quotaPackages.length > 0) {
      setPackageTab('quota');
      setSelectedPackage(quotaPackages[0]);
    } else if (daysPackages.length > 0) {
      setPackageTab('days');
      setSelectedPackage(daysPackages[0]);
    } else if (allPackages.length > 0) {
      setSelectedPackage(allPackages[0]);
    }
  }, [isOpen, fetchFreshBilling, quotaPackages.length, daysPackages.length]);

  // URL QRIS Dinamis tunggal (Pilar 3)
  const currentQrisUrl = useMemo(() => {
    if (selectedPackage?.qris_image_url) return selectedPackage.qris_image_url;
    if (selectedPackage?.amount) {
      return `${VOCML_BASE}/api/v1/billing/qris.png?machine_id=${activeMachineId}&product=${PRODUCT}&amount=${selectedPackage.amount}`;
    }
    return billing?.qris_image_url || '';
  }, [selectedPackage, billing, activeMachineId]);

  // Handler pergantian tab
  const handleSelectTab = (tab: 'quota' | 'days') => {
    setPackageTab(tab);
    const targetPkg = tab === 'quota' ? (quotaPackages[0] || null) : (daysPackages[0] || null);
    if (targetPkg) {
      setSelectedPackage(targetPkg);
      const nextUrl = targetPkg.qris_image_url || `${VOCML_BASE}/api/v1/billing/qris.png?machine_id=${activeMachineId}&product=${PRODUCT}&amount=${targetPkg.amount}`;
      if (nextUrl !== currentQrisUrl) {
        setQrLoaded(false);
      }
    }
    setQrFailed(false);
  };

  // Cek apakah gambar QRIS di-cache oleh browser dan siap ditampilkan
  useEffect(() => {
    if (qrImgRef.current && qrImgRef.current.complete && qrImgRef.current.naturalWidth > 0) {
      setQrLoaded(true);
      setQrFailed(false);
    }
  }, [currentQrisUrl, selectedPackage]);

  const currentAmount = selectedPackage
    ? selectedPackage.amount ?? selectedPackage.final_amount ?? billing?.amount ?? 0
    : billing?.amount ?? 0;

  const currentAmountText = selectedPackage
    ? selectedPackage.amount_text || `Rp${currentAmount.toLocaleString('id-ID')}`
    : billing?.amount_text || `Rp${currentAmount.toLocaleString('id-ID')}`;

  const currentPackageName = selectedPackage
    ? selectedPackage.name || selectedPackage.label || (selectedPackage.quota ? `Paket ${selectedPackage.quota} Sesi` : selectedPackage.days ? `Paket ${selectedPackage.days} Hari` : 'Lisensi VOC')
    : 'Lisensi VOC';

  // PILAR 4: Trigger Sukses & Unlock Seketika (< 2 detik)
  const triggerSuccessUnlock = useCallback(
    (payload: any = {}) => {
      playDingSound();

      const isQuotaPkg = selectedPackage?.type === 'quota' || (selectedPackage?.quota && selectedPackage.quota > 0) || String(payload.package_name || payload.package || currentPackageName).toLowerCase().includes('sesi');
      const numMatch = String(payload.package_name || payload.package || currentPackageName).match(/(\d+)\s*sesi/) || String(payload.package_name || payload.package || currentPackageName).match(/\d+/);
      const extractedQuota = numMatch ? parseInt(numMatch[0], 10) : 0;
      const addedQuota = payload.added_quota || payload.quota_added || selectedPackage?.quota || (extractedQuota > 0 ? extractedQuota : 0);
      const totalRemaining =
        payload.trial?.remaining ??
        (payload.trial_remaining !== undefined ? payload.trial_remaining : undefined);

      const successPayload = {
        ...payload,
        packageName: payload.package_name || payload.package || currentPackageName,
        amountText: payload.amount_text || currentAmountText,
        addedQuota,
        totalRemaining: totalRemaining !== undefined ? totalRemaining : (selectedPackage?.quota || 0),
        expiredAt: payload.expires_at || null,
        daysLeft: payload.days_left ?? payload.remaining_days,
        isQuota: isQuotaPkg,
        type: isQuotaPkg ? 'quota' : 'days',
      };

      setPaymentSuccess(successPayload);

      if (onVoucherClaimed) onVoucherClaimed();
      window.dispatchEvent(new CustomEvent('vocml:license_renewed', { detail: successPayload }));
    },
    [currentPackageName, currentAmountText, selectedPackage, onVoucherClaimed]
  );

  // PILAR 4: Dual-Engine Realtime (SSE Stream + Fast Polling 1.5 Detik)
  useEffect(() => {
    if (!isOpen) {
      setPaymentSuccess(null);
      setVoucherMsg(null);
      return;
    }

    let isDone = false;

    // Engine 1: SSE Stream Langsung ke VOCML (< 2 detik)
    let sseVocml: EventSource | null = null;
    try {
      sseVocml = new EventSource(`${VOCML_BASE}/api/v1/stream?machine_id=${activeMachineId}&product=${PRODUCT}`);

      sseVocml.addEventListener('renew', (e: any) => {
        if (isDone) return;
        isDone = true;
        try {
          triggerSuccessUnlock(JSON.parse(e.data));
        } catch {
          triggerSuccessUnlock();
        }
      });

      sseVocml.addEventListener('unlock', (e: any) => {
        if (isDone) return;
        isDone = true;
        try {
          triggerSuccessUnlock(JSON.parse(e.data));
        } catch {
          triggerSuccessUnlock();
        }
      });

      sseVocml.addEventListener('billing', () => {
        fetchFreshBilling();
      });
    } catch (e) {
      console.warn('[VOCML] SSE init error', e);
    }

    // Listener socket internal backend
    const onLicenseRenewed = (data: any) => {
      if (isDone) return;
      isDone = true;
      triggerSuccessUnlock(data);
    };
    socket.on('license_renewed', onLicenseRenewed);

    // Engine 2: Fast Polling Fallback (Interval 1.5 Detik) HANYA saat modal terbuka
    const pollInterval = setInterval(async () => {
      if (isDone) return;
      try {
        const res = await fetch(
          `${VOCML_BASE}/api/v1/check?machine_id=${activeMachineId}&product=${PRODUCT}&_t=${Date.now()}`,
          { cache: 'no-store', signal: AbortSignal.timeout(1800) }
        );
        if (res.ok) {
          const d = await res.json();
          // Cek apakah sudah active atau ada penambahan quota/hari
          if (d.allowed && (d.status === 'active' || d.status === 'trial')) {
            // Jika ada event pembayaran baru yang berhasil
            if (d.trial?.remaining > 0 || d.days_left > 0) {
              // Verifikasi apakah ini hasil aktivasi baru
              if (d.last_payment && new Date().getTime() - new Date(d.last_payment.created_at).getTime() < 120000) {
                isDone = true;
                clearInterval(pollInterval);
                triggerSuccessUnlock(d);
              }
            }
          }
        }
      } catch {}
    }, 1500);

    return () => {
      isDone = true;
      clearInterval(pollInterval);
      sseVocml?.close();
      socket.off('license_renewed', onLicenseRenewed);
    };
  }, [isOpen, activeMachineId, triggerSuccessUnlock, fetchFreshBilling]);

  // PILAR 5: Tombol "✅ Saya Sudah Bayar" Langsung Check Seketika (0 milidetik)
  const handleCheckPaymentNow = async () => {
    if (checkingPayment) return;
    setCheckingPayment(true);
    try {
      const res = await fetch(
        `${VOCML_BASE}/api/v1/check?machine_id=${activeMachineId}&product=${PRODUCT}&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const d = await res.json();
        if (d.allowed) {
          triggerSuccessUnlock(d);
          return;
        }
      }
      // Jika belum terdeteksi, berikan feedback ramah
      setVoucherMsg({
        text: 'Sistem sedang menunggu konfirmasi mutasi bank. Mohon tunggu beberapa detik lagi...',
        error: false,
      });
      setTimeout(() => setVoucherMsg(null), 3500);
    } catch {
      setVoucherMsg({ text: 'Gagal menghubungi server VOCML. Periksa koneksi internet Anda.', error: true });
    } finally {
      setCheckingPayment(false);
    }
  };

  // PILAR 5: Form Klaim Voucher Promo
  const handleClaimVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim() || voucherLoading) return;
    setVoucherLoading(true);
    setVoucherMsg(null);
    try {
      const res = await fetch(`${VOCML_BASE}/api/v1/voucher/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: activeMachineId,
          product: PRODUCT,
          code: voucherCode.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setVoucherMsg({
          text: data.message || 'Voucher berhasil diklaim! Kuota sesi rental telah ditambahkan.',
          error: false,
        });
        triggerSuccessUnlock({
          package_name: 'Klaim Kode Promo',
          added_quota: data.added_quota || data.quota || 0,
          trial: data.trial,
        });
      } else {
        setVoucherMsg({ text: data.message || data.error || 'Kode voucher tidak valid atau sudah kadaluarsa.', error: true });
      }
    } catch (err: any) {
      setVoucherMsg({ text: err?.message || 'Gagal klaim voucher.', error: true });
    } finally {
      setVoucherLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] text-slate-100 shadow-2xl shadow-indigo-950/50">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {title || 'Daftar Paket Lisensi & Perpanjangan'}
                </h3>
                <span className="rounded-md border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
                  {badgeText || 'PILIHAN PAKET'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {subtitle || 'Pilih durasi paket lisensi untuk bayar otomatis dengan QRIS atau tukarkan kode voucher perpanjangan.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Tutup Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Layar Sukses Pembayaran (Pilar 4) */}
        {paymentSuccess ? (
          <div className="flex flex-col items-center justify-center px-8 py-12 text-center bg-radial from-emerald-500/10 via-slate-900 to-slate-900">
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-xl shadow-emerald-500/30">
              <CheckCircle className="h-10 w-10 text-white" strokeWidth={2.5} />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" /> Pembayaran Berhasil Diterima
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight mb-1">
              Lisensi & Kuota Anda Berhasil Diperbarui!
            </h2>
            <p className="text-xs text-slate-400 max-w-md mb-6">
              Terima kasih! Pembayaran QRIS Anda telah diverifikasi secara otomatis oleh server VOC ML. Seluruh meja rental billiard kini dapat dinyalakan normal.
            </p>

            <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-4 mb-6 space-y-2.5 text-left text-xs">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400 font-medium">Paket Terpilih</span>
                <span className="font-bold text-white">{paymentSuccess.packageName}</span>
              </div>
              {paymentSuccess.amountText && (
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-slate-400 font-medium">Nominal Pembayaran</span>
                  <span className="font-extrabold text-emerald-400 text-sm">{paymentSuccess.amountText}</span>
                </div>
              )}
              {(paymentSuccess.addedQuota ?? 0) > 0 && (
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-slate-400 font-medium">Tambahan Kuota</span>
                  <span className="font-extrabold text-indigo-400">+{paymentSuccess.addedQuota} Sesi Meja</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Kuota / Sisa Sesi</span>
                <span className="font-extrabold text-emerald-400">
                  {paymentSuccess.totalRemaining} Sesi Aktif
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full max-w-md rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-500/30 hover:opacity-95 transition-all"
            >
              Selesai & Lanjutkan Operasional Meja
            </button>
          </div>
        ) : (
          /* Tampilan Dua Kolom: Kiri Single QRIS Dinamis & Kanan Pilihan Paket Tab */
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
            
            {/* ============================================================== */}
            {/* PILAR 3: KOLOM KIRI SINGLE QRIS IMAGE (Bebas Canvas Ganda)    */}
            {/* ============================================================== */}
            <div className="md:col-span-5 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-white/10 bg-slate-950/60 p-6 text-center">
              <div className="w-full flex flex-col items-center">
                
                {/* Badge Status Siap Scan */}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 mb-4 text-[10px] font-bold text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  QRIS Pembayaran Otomatis
                </div>

                {/* Box QRIS Tunggal Murni (PILAR 3) */}
                <div className="relative flex h-60 w-60 items-center justify-center rounded-2xl border border-white/10 bg-white p-3 shadow-xl shadow-black/40">
                  {!qrFailed && currentQrisUrl ? (
                    <img
                      key={currentQrisUrl}
                      ref={qrImgRef}
                      src={currentQrisUrl}
                      alt="QRIS VOC ML"
                      className={`h-56 w-56 object-contain transition-opacity duration-200 ${qrLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => {
                        setQrLoaded(true);
                        setQrFailed(false);
                      }}
                      onError={() => {
                        setQrFailed(true);
                        setQrLoaded(false);
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-rose-500 gap-2 p-4 text-center">
                      <WifiOff className="h-8 w-8" />
                      <span className="text-xs font-semibold">Gagal memuat QRIS</span>
                      <button
                        onClick={() => {
                          setQrFailed(false);
                          fetchFreshBilling();
                        }}
                        className="text-[10px] bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded text-rose-300 hover:bg-rose-500/20"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  )}

                  {!qrLoaded && !qrFailed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/60 backdrop-blur-sm rounded-xl">
                      <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
                      <span className="text-[10px] font-medium text-slate-300">Memuat QRIS...</span>
                    </div>
                  )}
                </div>

                {/* Label Total Tagihan */}
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Tagihan &bull; {currentPackageName}
                  </p>
                  <p className="text-2xl font-black text-white tracking-tight mt-0.5">
                    {currentAmountText}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    QRIS &bull; {billing?.merchant_name || 'VIRTUAL OPERATION CONTROL'}
                  </p>
                </div>
              </div>

              {/* Action Buttons Kolom Kiri */}
              <div className="w-full space-y-2 mt-4">
                {/* PILAR 5: Tombol "✅ Saya Sudah Bayar" */}
                <button
                  type="button"
                  onClick={handleCheckPaymentNow}
                  disabled={checkingPayment}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {checkingPayment ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Memeriksa...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 stroke-[3]" /> Saya Sudah Bayar
                    </>
                  )}
                </button>

                {billing?.contact && (
                  <a
                    href={`https://wa.me/${toWaNumber(billing.contact)}?text=${encodeURIComponent(
                      `Halo admin VOC Billiard, saya ingin konfirmasi pembayaran lisensi.\nPaket: ${currentPackageName}\nMachine ID: ${activeMachineId}\nNominal: ${currentAmountText}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Hubungi Admin / Kirim Bukti
                  </a>
                )}
              </div>
            </div>

            {/* ============================================================== */}
            {/* PILAR 2: KOLOM KANAN PILIHAN PAKET & KLAIM VOUCHER             */}
            {/* ============================================================== */}
            <div className="md:col-span-7 flex flex-col justify-between p-6 bg-slate-900/40">
              <div>
                
                {/* Header Bagian Paket */}
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Tag className="h-3.5 w-3.5 text-indigo-400" /> Pilih Paket Lisensi
                  </span>
                  {billing?.unique_code && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Kode Unik Otomatis: <strong className="text-cyan-400">+{billing.unique_code}</strong>
                    </span>
                  )}
                </div>

                {/* PILAR 2: Tab Navigasi "Paket Kuota Sesi" vs "Paket Durasi Waktu" */}
                <div className="flex rounded-xl bg-slate-950/60 p-1 border border-white/5 mb-3">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('quota')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      packageTab === 'quota'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" /> Paket Kuota Sesi
                    <span className="rounded bg-indigo-400/20 px-1.5 py-0.2 text-[9px] font-extrabold text-indigo-200 uppercase">
                      KUOTA
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTab('days')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      packageTab === 'days'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" /> Paket Durasi Waktu
                    <span className="rounded bg-indigo-400/20 px-1.5 py-0.2 text-[9px] font-extrabold text-indigo-200 uppercase">
                      WAKTU
                    </span>
                  </button>
                </div>

                {/* PILAR 2 Aturan Tunggakan: HANYA tampilkan peringatan potong hari jika user memilih tab 'days' */}
                {packageTab === 'days' && remainingDays < 0 && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      <strong>Perhatian:</strong> Masa tenggang Anda menunggak {Math.abs(remainingDays)} hari. Jika memilih paket durasi waktu, perpanjangan akan otomatis dipotong hari tunggakan tersebut.
                    </p>
                  </div>
                )}

                {/* Grid Daftar Kartu Paket */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(packageTab === 'quota' ? quotaPackages : daysPackages).map((pkg, idx) => {
                    const isSelected = selectedPackage?.id === pkg.id || (!selectedPackage?.id && selectedPackage?.amount === pkg.amount);
                    const pkgAmount = pkg.amount ?? pkg.final_amount ?? 0;
                    const pkgText = pkg.amount_text || `Rp${pkgAmount.toLocaleString('id-ID')}`;
                    const badge = pkg.promo_badge || pkg.promoBadge;

                    return (
                      <button
                        key={pkg.id || `pkg-${idx}`}
                        type="button"
                        onClick={() => {
                          const nextUrl = pkg.qris_image_url || `${VOCML_BASE}/api/v1/billing/qris.png?machine_id=${activeMachineId}&product=${PRODUCT}&amount=${pkg.amount}`;
                          if (nextUrl !== currentQrisUrl) {
                            setQrLoaded(false);
                          }
                          setSelectedPackage(pkg);
                          setQrFailed(false);
                        }}
                        className={`relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/15 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500'
                            : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                        }`}
                      >
                        {badge && (
                          <span className="absolute -top-2 right-2 rounded bg-gradient-to-r from-rose-500 to-red-600 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-white shadow">
                            {badge}
                          </span>
                        )}

                        <div>
                          <p className="text-xs font-bold text-white leading-snug">
                            {pkg.name || pkg.label}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {pkg.quota ? `${pkg.quota} Sesi Rental` : `${pkg.days} Hari Masa Aktif`}
                          </p>
                        </div>

                        <div className="mt-3">
                          <p className="text-sm font-black text-indigo-300">
                            {pkgText}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Info edukasi kuota hemat */}
                {packageTab === 'quota' && (
                  <div className="mt-3 rounded-xl border border-white/5 bg-slate-950/40 p-2.5 text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">✓</span>
                    <span><strong>Bebas Masa Kedaluwarsa:</strong> Kuota sesi tidak hangus di akhir bulan dan hanya berkurang saat mulai sewa meja baru.</span>
                  </div>
                )}
              </div>

              {/* PILAR 5: Form Input Voucher Promo */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Punya Kode Voucher Promo / Trial?
                </p>
                <form onSubmit={handleClaimVoucher} className="flex gap-2">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode voucher..."
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase tracking-wider"
                  />
                  <button
                    type="submit"
                    disabled={voucherLoading || !voucherCode.trim()}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {voucherLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Klaim'}
                  </button>
                </form>

                {voucherMsg && (
                  <p
                    className={`mt-2 text-[11px] font-medium ${
                      voucherMsg.error ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {voucherMsg.text}
                  </p>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
