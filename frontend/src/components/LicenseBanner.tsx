'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, XCircle, X } from 'lucide-react';

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
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${API_BASE}/api/license/status`);
        const data = await res.json();
        setState(data);
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
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        maxWidth: '460px',
        width: '90%',
      }}>
        <div style={{
          background: 'rgba(69, 10, 10, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '14px',
          padding: '14px 18px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          animation: 'slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          backdropFilter: 'blur(16px)',
          boxSizing: 'border-box',
          width: '100%',
        }}>
          <div style={{ flexShrink: 0 }}>
            <XCircle size={20} color="#ef4444" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0,
              color: '#fca5a5',
              fontSize: '13px',
              lineHeight: '1.4',
              fontWeight: '600',
            }}>
              ⚠️ Lisensi sudah berakhir! Sisa waktu tenggang: <strong style={{ color: '#ef4444' }}>{state.graceDaysLeft} hari</strong>.
            </p>
            <p style={{ margin: '2px 0 0', color: '#fca5a5cc', fontSize: '11px' }}>
              Segera hubungi support untuk perpanjangan agar toko tidak terkunci.
            </p>
          </div>
          <button
            onClick={handleDismiss}
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
              color: '#fca5a5',
              transition: 'all 0.2s',
            }}
            title="Tutup Peringatan"
          >
            <X size={14} />
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
    const bg = isUrgent ? 'rgba(69, 10, 10, 0.95)' : 'rgba(113, 63, 18, 0.95)';
    const borderColor = isUrgent ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)';
    const iconColor = isUrgent ? '#ef4444' : '#f59e0b';
    const textColor = isUrgent ? '#fca5a5' : '#fde68a';
    const textSubColor = isUrgent ? '#fca5a5cc' : '#fde68acc';

    return (
      <div style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        maxWidth: '460px',
        width: '90%',
      }}>
        <div style={{
          background: bg,
          border: `1px solid ${borderColor}`,
          borderRadius: '14px',
          padding: '14px 18px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          animation: 'slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          backdropFilter: 'blur(16px)',
          boxSizing: 'border-box',
          width: '100%',
        }}>
          <div style={{ flexShrink: 0 }}>
            <AlertTriangle size={20} color={iconColor} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0,
              color: textColor,
              fontSize: '13px',
              lineHeight: '1.4',
              fontWeight: '600',
            }}>
              ⏳ Lisensi berakhir dalam <strong style={{ color: iconColor }}>{state.daysLeft} hari</strong>.
            </p>
            <p style={{ margin: '2px 0 0', color: textSubColor, fontSize: '11px' }}>
              Hubungi support untuk perpanjangan sebelum aplikasi terkunci.
            </p>
          </div>
          <button
            onClick={handleDismiss}
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
              color: textColor,
              transition: 'all 0.2s',
            }}
            title="Tutup Peringatan"
          >
            <X size={14} />
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
