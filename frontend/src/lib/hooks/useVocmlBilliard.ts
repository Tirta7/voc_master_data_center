'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiUrl } from '@/utils/urlUtils';

const VOCML_BASE = 'https://vocml.vocpos.id';
const MID = 'VOC-2177-C6EC-13BF';
const PRODUCT = 'billiard';
const CACHE_KEY = 'vocml_billiard_license_cache';

export interface VocmlPackage {
  id?: string;
  type?: 'quota' | 'days';
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

export interface VocmlBilling {
  reason?: string;
  amount: number;
  amount_text: string;
  currency?: string;
  merchant_name: string;
  merchant_city?: string;
  contact: string;
  note?: string;
  packages?: VocmlPackage[];
  unique_code?: number | null;
  qris?: string;
  qris_image_url?: string;
}

export interface VocmlLicenseState {
  allowed: boolean;
  status: string;
  isLocked: boolean;
  expiresAt?: string | null;
  remainingDays?: number;
  daysLeft?: number;
  trial?: {
    enabled: boolean;
    quota: number;
    used: number;
    remaining: number;
    is_trial?: boolean;
  } | null;
  billing?: VocmlBilling | null;
  licenseKey?: string | null;
  uniqueCode?: number | null;
  token?: string | null;
}

export interface RenewalSuccessInfo {
  packageName: string;
  amountText: string;
  addedQuota: number;
  totalRemaining: number;
  expiredAt?: string | null;
  daysLeft?: number;
}

// Helper audio lonceng / ding kasir
function playSuccessDing() {
  try {
    const audio = new Audio('/sounds/payment-success.mp3');
    audio.play().catch(() => {
      // Fallback: Web Audio API synth chime jika file mp3 tidak ada
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;
        
        // Chime Note 1
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        gain1.gain.setValueAtTime(0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // Chime Note 2 (Harmonic Ding)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, now + 0.1); // C6
        gain2.gain.setValueAtTime(0.3, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 1.2);
      } catch {}
    });
  } catch {}
}

export function useVocmlBilliard() {
  const [license, setLicense] = useState<VocmlLicenseState>(() => {
    // Pilar 6: Coba muat cache offline dari LocalStorage saat startup
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            allowed: parsed.allowed ?? true,
            status: parsed.status ?? 'checking',
            isLocked: !parsed.allowed,
            expiresAt: parsed.expires_at || parsed.expiresAt || null,
            remainingDays: parsed.remaining_days ?? parsed.days_left,
            daysLeft: parsed.days_left ?? parsed.remaining_days,
            trial: parsed.trial || { enabled: true, quota: 600, used: 101, remaining: 499, is_trial: true },
            billing: parsed.billing || null,
            licenseKey: parsed.license_key || null,
            uniqueCode: parsed.unique_code || null,
            token: parsed.token || null,
          };
        }
      } catch {}
    }
    return {
      allowed: true,
      status: 'checking',
      isLocked: false,
      trial: { enabled: true, quota: 600, used: 101, remaining: 499, is_trial: true },
      billing: null,
    };
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState<RenewalSuccessInfo | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const licenseRef = useRef<VocmlLicenseState>(license);
  licenseRef.current = license;

  // PILAR 6: Simpan cache token Ed25519 & payload ke LocalStorage
  const saveToLocalCache = useCallback((data: any) => {
    if (typeof window === 'undefined' || !data) return;
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          ...data,
          cachedAt: Date.now(),
        })
      );
    } catch {}
  }, []);

  // PILAR 4 & 5: Check lisensi langsung (0 milidetik via fetch)
  const fetchCheck = useCallback(async () => {
    try {
      // 1. Coba check langsung ke server VOCML
      let res: Response;
      try {
        res = await fetch(`${VOCML_BASE}/api/v1/check?machine_id=${MID}&product=${PRODUCT}&_t=${Date.now()}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(4500),
        });
      } catch (err) {
        // Fallback: lewat internal backend server
        res = await fetch(`${getApiUrl()}/api/license/status?force=true&_t=${Date.now()}`, {
          cache: 'no-store',
        });
      }

      if (res.status === 404) {
        await fetch(`${VOCML_BASE}/api/v1/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ machine_id: MID, product: PRODUCT, store_name: 'VOC Billiard' }),
        }).catch(() => {});
        return fetchCheck();
      }

      const data = await res.json();
      const isAllowed = data.allowed !== false && data.status !== 'locked' && data.status !== 'expired';

      setLicense((prev) => {
        const next: VocmlLicenseState = {
          ...prev,
          allowed: isAllowed,
          status: data.status || (isAllowed ? 'active' : 'locked'),
          expiresAt: data.expires_at || data.expiredAt || prev.expiresAt,
          remainingDays: data.remaining_days ?? data.daysLeft ?? prev.remainingDays,
          daysLeft: data.days_left ?? data.daysLeft ?? prev.daysLeft,
          trial: data.trial || prev.trial,
          billing: data.billing || prev.billing,
          licenseKey: data.license_key || data.licenseKey || prev.licenseKey,
          uniqueCode: data.unique_code ?? data.uniqueCode ?? prev.uniqueCode,
          token: data.token || prev.token,
          isLocked: !isAllowed,
        };
        saveToLocalCache(next);
        return next;
      });

      return data;
    } catch (err) {
      console.warn('[VOCML] Offline tolerance active, using local cached license state.', err);
      return null;
    }
  }, [saveToLocalCache]);

  // PILAR 4: Handler saat lisensi diperpanjang / di-unlock seketika (< 2 detik)
  const handleRenew = useCallback(
    (payload: any = {}) => {
      playSuccessDing();

      const addedQuota = payload.added_quota || payload.quota_added || 0;
      const trialData = payload.trial || (payload.trial_remaining !== undefined ? {
        ...licenseRef.current.trial,
        remaining: payload.trial_remaining,
      } : licenseRef.current.trial);

      setLicense((prev) => {
        const updated: VocmlLicenseState = {
          ...prev,
          allowed: true,
          status: payload.status || 'active',
          isLocked: false,
          expiresAt: payload.expires_at || prev.expiresAt,
          remainingDays: payload.remaining_days ?? prev.remainingDays,
          daysLeft: payload.days_left ?? prev.daysLeft,
          trial: trialData || prev.trial,
        };
        saveToLocalCache(updated);
        return updated;
      });

      setSuccessInfo({
        packageName: payload.package_name || payload.package || 'Perpanjangan Lisensi',
        amountText: payload.amount_text || (payload.amount ? `Rp${Number(payload.amount).toLocaleString('id-ID')}` : ''),
        addedQuota,
        totalRemaining: trialData?.remaining ?? (trialData?.quota ? trialData.quota - (trialData.used || 0) : 0),
        expiredAt: payload.expires_at || null,
        daysLeft: payload.days_left ?? payload.remaining_days,
      });

      setShowSuccessModal(true);
      fetchCheck();
    },
    [fetchCheck, saveToLocalCache]
  );

  // PILAR 4 Engine 1: SSE Stream Realtime Langsung ke VOCML (< 2 detik respon)
  useEffect(() => {
    fetchCheck();

    let sse: EventSource | null = null;
    try {
      sse = new EventSource(`${VOCML_BASE}/api/v1/stream?machine_id=${MID}&product=${PRODUCT}`);

      sse.addEventListener('renew', (e: any) => {
        try {
          const d = JSON.parse(e.data);
          handleRenew(d);
        } catch {
          handleRenew({});
        }
      });

      sse.addEventListener('unlock', (e: any) => {
        try {
          const d = JSON.parse(e.data);
          handleRenew(d);
        } catch {
          handleRenew({});
        }
      });

      sse.addEventListener('lock', () => {
        setLicense((prev) => ({ ...prev, allowed: false, isLocked: true }));
      });

      sse.addEventListener('billing', () => {
        fetchCheck();
      });

      sse.addEventListener('update', () => {
        fetchCheck();
      });

      sse.onerror = () => {
        // SSE error, biarkan browser reconnect otomatis
      };
    } catch (e) {
      console.warn('[VOCML] SSE connection failed, relying on fast polling', e);
    }

    return () => {
      sse?.close();
    };
  }, [fetchCheck, handleRenew]);

  // PILAR 4 Engine 2: Fast Polling Fallback (1.5 Detik saat locked)
  useEffect(() => {
    if (license.isLocked) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const latest = await fetchCheck();
        if (latest && (latest.allowed || latest.status === 'active' || latest.status === 'trial')) {
          if (pollRef.current) clearInterval(pollRef.current);
          handleRenew(latest);
        }
      }, 1500);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [license.isLocked, fetchCheck, handleRenew]);

  // PILAR 1: Titik Aksi Potong Kuota Sesi (/api/v1/trial/consume)
  // Dipanggil HANYA saat tombol "Mulai Sewa Meja" / lampu meja dinyalakan
  const startTableSession = useCallback(async (): Promise<boolean> => {
    // Jika lisensi adalah unlimited waktu murni tanpa kuota trial
    if (license.trial && !license.trial.enabled && !license.trial.is_trial) {
      return true;
    }

    try {
      const res = await fetch(`${VOCML_BASE}/api/v1/trial/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: MID, product: PRODUCT, count: 1 }),
      });
      const data = await res.json();

      if (res.ok && data.allowed) {
        setLicense((prev) => {
          const nextTrial = data.trial || {
            ...prev.trial,
            remaining: Math.max(0, (prev.trial?.remaining || 1) - 1),
            used: (prev.trial?.used || 0) + 1,
            quota: prev.trial?.quota || 600,
          };
          const next = { ...prev, trial: nextTrial };
          saveToLocalCache(next);
          return next;
        });
        return true; // Berhasil, lampu meja menyala
      }

      // Kuota habis -> kunci dan trigger modal
      setLicense((prev) => ({ ...prev, allowed: false, isLocked: true }));
      return false;
    } catch (err) {
      console.warn('[VOCML] Consume offline fallback tolerance', err);
      // Jika offline dan masih ada sisa di cache lokal
      if (license.trial && license.trial.remaining > 0) {
        setLicense((prev) => {
          const next = {
            ...prev,
            trial: {
              ...prev.trial!,
              remaining: Math.max(0, prev.trial!.remaining - 1),
              used: prev.trial!.used + 1,
            },
          };
          saveToLocalCache(next);
          return next;
        });
        return true;
      }
      return false;
    }
  }, [license.trial, saveToLocalCache]);

  return {
    license,
    isLocked: license.isLocked,
    showSuccessModal,
    closeSuccessModal: () => setShowSuccessModal(false),
    successInfo,
    startTableSession,
    refreshLicense: fetchCheck,
    handleRenew,
  };
}
