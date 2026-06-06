'use client';

import { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Info, CheckCircle, AlertOctagon } from 'lucide-react';

export interface BroadcastMessage {
  id: string | number;
  pesan: string;
  tipe: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
}

interface ToastItem extends BroadcastMessage {
  visible: boolean;
}

const TOAST_CONFIG = {
  INFO:    { bg: '#1e3a5f', border: '#3b82f6', color: '#93c5fd', icon: Info,          autoClose: 10000 },
  SUCCESS: { bg: '#14532d', border: '#22c55e', color: '#86efac', icon: CheckCircle,   autoClose: 10000 },
  WARNING: { bg: '#713f12', border: '#f59e0b', color: '#fde68a', icon: AlertTriangle, autoClose: 30000 },
  DANGER:  { bg: '#450a0a', border: '#ef4444', color: '#fca5a5', icon: AlertOctagon,  autoClose: 30000 },
};

import { getApiUrl } from '@/utils/urlUtils';

export function BroadcastToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastsRef = useRef<BroadcastMessage[]>([]);

  // SSE listener dari backend
  useEffect(() => {
    const API_BASE = getApiUrl();
    const evtSource = new EventSource(`${API_BASE}/api/license/stream`);

    evtSource.onmessage = (event) => {
      try {
        const broadcasts = JSON.parse(event.data);
        if (Array.isArray(broadcasts) && broadcasts.length > 0) {
          lastBroadcastsRef.current = broadcasts;
          showBroadcasts(broadcasts);
        }
      } catch {}
    };

    evtSource.onerror = () => {
      // SSE error - fallback ke polling REST
      evtSource.close();
      startPollingFallback();
    };

    return () => evtSource.close();
  }, []);

  // Fallback polling jika SSE gagal (setiap 30 detik)
  const startPollingFallback = () => {
    const poll = async () => {
      try {
        const API_BASE = getApiUrl();
        const res = await fetch(`${API_BASE}/api/license/status`);
        // Tidak ada broadcast di endpoint status, tapi tetap keep alive
      } catch {}
    };
    intervalRef.current = setInterval(poll, 30000);
  };

  // Tampilkan broadcast & filter yang sedang dalam periode ditutup sementara
  const showBroadcasts = (broadcasts: BroadcastMessage[]) => {
    if (!Array.isArray(broadcasts)) return;

    setToasts(prev => {
      const existingIds = new Set(prev.map(t => String(t.id)));
      const newToasts = broadcasts
        .filter(b => b && b.id !== undefined
          && !existingIds.has(String(b.id))
          && !tempDismissedRef.current.has(String(b.id)))
        .map(b => ({ ...b, visible: true }));
      return [...prev, ...newToasts];
    });
  };

  // Re-show setiap 60 detik jika ada broadcast yang belum dalam periode close
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastBroadcastsRef.current.length > 0) {
        setToasts(prev =>
          prev.map(t => ({
            ...t,
            visible: !tempDismissedRef.current.has(String(t.id)),
          }))
        );
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Set in-memory untuk ID yang sedang ditutup sementara (1 menit)
  const tempDismissedRef = useRef<Set<string>>(new Set());

  const closeToast = (id: string | number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
    // Tandai sebagai ditutup sementara
    tempDismissedRef.current.add(String(id));
    // Setelah 1 menit, hapus dari daftar sementara agar bisa muncul lagi
    setTimeout(() => {
      tempDismissedRef.current.delete(String(id));
    }, 1 * 60 * 1000);
  };

  const visibleToasts = toasts.filter(t => t.visible);
  if (visibleToasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 'max(32px, calc(env(safe-area-inset-top) + 16px))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'center',
      pointerEvents: 'none',
    }}>
      {visibleToasts.map((toast) => {
        const cfg = TOAST_CONFIG[toast.tipe] || TOAST_CONFIG.INFO;
        const Icon = cfg.icon;
        return (
          <div
            key={String(toast.id)}
            style={{
              background: '#000000', // Hitam pekat ala Dynamic Island
              borderRadius: '9999px',
              height: '36px',
              padding: '0 10px 0 4px',
              boxShadow: 'none',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              animation: 'slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              width: 'max-content',
              maxWidth: '90vw',
              pointerEvents: 'auto',
            }}
          >
            <div style={{
              background: '#ffffff',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={14} color={cfg.border} />
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>
              <p style={{
                margin: 0,
                color: '#ffffff',
                fontSize: '12.5px',
                lineHeight: '1.4',
                fontWeight: '600',
                letterSpacing: '0.2px',
                wordBreak: 'break-word',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                {toast.pesan}
              </p>
            </div>
            <button
              onClick={() => closeToast(toast.id)}
              style={{
                flexShrink: 0,
                background: 'transparent',
                border: 'none',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#94a3b8',
                borderRadius: '50%',
                transition: 'background 0.2s',
              }}
              title="Tutup & Jangan tampilkan lagi"
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideInDown {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
