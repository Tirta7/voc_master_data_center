'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Zap, ShieldCheck, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { getApiUrl, getSocketUrl } from '@/utils/urlUtils';
import { socket } from '@/lib/socket';
import TrialExhaustedModal from '@/components/TrialExhaustedModal';

interface LicenseState {
  status: string;
  daysLeft: number;
  expiredAt?: string;
  trial?: {
    enabled: boolean;
    quota: number;
    used: number;
    remaining: number;
    is_trial?: boolean;
  } | null;
}

export default function LicenseHeaderBadge({ className = '' }: { className?: string }) {
  const [state, setState] = useState<LicenseState | null>(null);
  const [showPackageModal, setShowPackageModal] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/license/status`);
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();

    const handleUpdate = (data: any) => {
      if (data) {
        setState((prev) => ({
          ...(prev || {}),
          ...data,
          trial: data.trial !== undefined ? data.trial : prev?.trial,
        }));
      }
    };

    socket.on('license_updated', handleUpdate);
    socket.on('license_renewed', handleUpdate);

    let es: EventSource | null = null;
    try {
      es = new EventSource(`${getSocketUrl()}/api/license/status-stream`);
      es.onmessage = (e) => {
        if (e.data) {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed.trial !== undefined || parsed.daysLeft !== undefined) {
              setState((prev) => ({ ...(prev || {}), ...parsed }));
            } else {
              fetchStatus();
            }
          } catch {
            fetchStatus();
          }
        }
      };
    } catch {}

    const interval = setInterval(fetchStatus, 30000);
    return () => {
      socket.off('license_updated', handleUpdate);
      socket.off('license_renewed', handleUpdate);
      es?.close();
      clearInterval(interval);
    };
  }, [fetchStatus]);

  if (!state) return null;

  const hasQuota = state.trial && state.trial.enabled;
  const remainingQuota = state.trial?.remaining ?? 0;
  const daysLeft = Math.max(0, state.daysLeft ?? 0);
  const isQuotaLow = remainingQuota <= 5;
  const isDaysLow = daysLeft <= 7;

  return (
    <>
      <div
        onClick={() => setShowPackageModal(true)}
        className={`flex items-center gap-2 cursor-pointer transition-all hover:scale-102 active:scale-98 ${className}`}
        title="Klik untuk melihat paket lisensi & top-up kuota"
      >
        {/* BADGE SISA KUOTA SESI */}
        {hasQuota && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-sm transition-all ${
              isQuotaLow
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-200 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                isQuotaLow ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white shadow-xs'
              }`}
            >
              <Zap size={13} className="fill-current animate-pulse" />
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-300/80">
                Sisa Kuota
              </span>
              <span className="text-xs font-black tracking-tight text-white mt-0.5">
                {remainingQuota} Sesi
              </span>
            </div>
          </div>
        )}

        {/* BADGE MASA AKTIF WAKTU */}
        {state.expiredAt && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-sm transition-all ${
              isDaysLow
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-200 hover:bg-amber-500/30'
                : 'bg-white/10 border-white/20 text-indigo-100 hover:bg-white/20'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                isDaysLow ? 'bg-amber-500 text-white' : 'bg-indigo-500/80 text-white'
              }`}
            >
              <ShieldCheck size={13} />
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] font-black uppercase tracking-wider text-indigo-200/80">
                Masa Aktif
              </span>
              <span className="text-xs font-black tracking-tight text-white mt-0.5">
                {daysLeft} Hari
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PAKET & TOP-UP QRIS */}
      <TrialExhaustedModal
        isOpen={showPackageModal}
        onClose={() => setShowPackageModal(false)}
        machineId={state?.status ? undefined : ''}
      />
    </>
  );
}
