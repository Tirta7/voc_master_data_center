'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, XCircle, X } from 'lucide-react';
import { getApiUrl } from '@/utils/urlUtils';

interface LicenseState {
  status: string;
  daysLeft: number;
  graceDaysLeft?: number;
  expiredAt?: string;
}

export function LicenseBanner() {
  const [state, setState] = useState<LicenseState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    // Muncul lagi setelah 1 menit
    setTimeout(() => setDismissed(false), 60 * 1000);
  };

  useEffect(() => {
    const check = async () => {
      try {
        const API_BASE = getApiUrl();
        const res = await fetch(`${API_BASE}/api/license/status`);
        const data = await res.json();
        setState(data);

        // Jika lisensi akan habis atau grace, trigger push notification ke HP owner.
        // Backend otomatis melakukan throttling agar tidak spam (maksimal 1x per 12 jam).
        if ((data.status === 'ACTIVE' && data.daysLeft <= 7) || data.status === 'GRACE') {
          fetch(`${API_BASE}/api/license/notify-warning`, { method: 'POST' }).catch(() => {});
        }
      } catch {}
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed || !state) return null;

  // GRACE: sudah expired tapi masih dalam 3 hari tenggang
  if (state.status === 'GRACE') {
    return (
      <div style={{
        position: 'fixed',
        top: 'max(32px, calc(env(safe-area-inset-top) + 16px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: '#000000',
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
        }}>
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
            <XCircle size={14} color="#ef4444" />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>
            <p style={{
              margin: 0,
              color: '#ffffff',
              fontSize: '12.5px',
              lineHeight: '1.4',
              fontWeight: '600',
              letterSpacing: '0.2px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              whiteSpace: 'nowrap',
            }}>
              Lisensi berakhir! Waktu tenggang: <strong style={{ color: '#fca5a5' }}>{state.graceDaysLeft} hari</strong>
            </p>
          </div>
          <button
            onClick={handleDismiss}
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
            title="Tutup Peringatan"
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={12} />
          </button>
        </div>
        <style>{`
          @keyframes slideInDown {
            from { transform: translateY(-30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // WARNING: 7 hari atau kurang sebelum expired
  if (state.status === 'ACTIVE' && state.daysLeft <= 7 && state.daysLeft >= 0) {
    const isUrgent = state.daysLeft <= 3;
    const iconBgColor = isUrgent ? '#ef4444' : '#f59e0b';
    const strongColor = isUrgent ? '#fca5a5' : '#fde68a';

    return (
      <div style={{
        position: 'fixed',
        top: 'max(32px, calc(env(safe-area-inset-top) + 16px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: '#000000',
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
        }}>
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
            <AlertTriangle size={14} color={iconBgColor} />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>
            <p style={{
              margin: 0,
              color: '#ffffff',
              fontSize: '12.5px',
              lineHeight: '1.4',
              fontWeight: '600',
              letterSpacing: '0.2px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              whiteSpace: 'nowrap',
            }}>
              Lisensi berakhir dalam <strong style={{ color: strongColor }}>{state.daysLeft} hari</strong>
            </p>
          </div>
          <button
            onClick={handleDismiss}
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
            title="Tutup Peringatan"
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={12} />
          </button>
        </div>
        <style>{`
          @keyframes slideInDown {
            from { transform: translateY(-30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
