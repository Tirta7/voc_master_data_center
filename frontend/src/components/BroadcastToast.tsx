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

export function BroadcastToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastsRef = useRef<BroadcastMessage[]>([]);

  // SSE listener dari backend
  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
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
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
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
      top: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '460px',
      width: '90%',
      alignItems: 'center',
    }}>
      {visibleToasts.map((toast) => {
        const cfg = TOAST_CONFIG[toast.tipe] || TOAST_CONFIG.INFO;
        const Icon = cfg.icon;
        return (
          <div
            key={String(toast.id)}
            style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}2b`,
              borderRadius: '14px',
              padding: '14px 18px',
              boxShadow: `0 12px 32px -6px ${cfg.border}4D, 0 4px 12px -2px ${cfg.border}26`,
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              animation: 'slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              backdropFilter: 'blur(16px)',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <Icon size={20} color={cfg.border} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0,
                color: cfg.color,
                fontSize: '13px',
                lineHeight: '1.4',
                fontWeight: '600',
                wordBreak: 'break-word',
              }}>
                {toast.pesan}
              </p>
              <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '10px', opacity: 0.8 }}>
                Dari: Manajemen VOC Billiard
              </p>
            </div>
            <button
              onClick={() => closeToast(toast.id)}
              style={{
                flexShrink: 0,
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '8px',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#94a3b8',
                transition: 'all 0.2s',
              }}
              title="Tutup & Jangan tampilkan lagi"
            >
              <X size={14} />
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
