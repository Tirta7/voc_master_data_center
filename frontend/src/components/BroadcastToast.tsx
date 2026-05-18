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
        const broadcasts: BroadcastMessage[] = JSON.parse(event.data);
        if (broadcasts.length > 0) {
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

  // Tampilkan broadcast & setup interval 60 detik untuk muncul kembali
  const showBroadcasts = (broadcasts: BroadcastMessage[]) => {
    setToasts(prev => {
      const existingIds = new Set(prev.map(t => String(t.id)));
      const newToasts = broadcasts
        .filter(b => !existingIds.has(String(b.id)))
        .map(b => ({ ...b, visible: true }));
      return [...prev, ...newToasts];
    });
  };

  // Re-show setiap 60 detik jika masih ada broadcast aktif
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastBroadcastsRef.current.length > 0) {
        setToasts(prev => {
          // Re-show semua yang sudah ditutup (visible=false)
          return prev.map(t => ({ ...t, visible: true }));
        });
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const closeToast = (id: string | number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
  };

  const visibleToasts = toasts.filter(t => t.visible);
  if (visibleToasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '380px',
      width: '100%',
    }}>
      {visibleToasts.map((toast) => {
        const cfg = TOAST_CONFIG[toast.tipe] || TOAST_CONFIG.INFO;
        const Icon = cfg.icon;
        return (
          <div
            key={String(toast.id)}
            style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${cfg.border}33`,
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              animation: 'slideInRight 0.3s ease',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
              <Icon size={20} color={cfg.border} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0,
                color: cfg.color,
                fontSize: '14px',
                lineHeight: '1.5',
                fontWeight: '500',
                wordBreak: 'break-word',
              }}>
                {toast.pesan}
              </p>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '11px' }}>
                Dari: Manajemen VOC Billiard
              </p>
            </div>
            <button
              onClick={() => closeToast(toast.id)}
              style={{
                flexShrink: 0,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#94a3b8',
                transition: 'background 0.2s',
              }}
              title="Tutup sementara (muncul kembali dalam 1 menit)"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
