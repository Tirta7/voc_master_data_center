'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';

interface LicenseState {
  status: string;
  daysLeft: number;
  graceDaysLeft?: number;
  expiredAt?: string;
}

export function LicenseBanner() {
  const [state, setState] = useState<LicenseState | null>(null);

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

  if (!state) return null;

  // GRACE: sudah expired tapi masih dalam 3 hari tenggang
  if (state.status === 'GRACE') {
    return (
      <div style={{
        background: 'linear-gradient(90deg, #7f1d1d, #991b1b)',
        color: 'white',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        fontWeight: '600',
        borderBottom: '1px solid #ef4444',
        zIndex: 9999,
      }}>
        <XCircle size={16} color="#fca5a5" />
        <span style={{ color: '#fca5a5' }}>
          ⚠️ Lisensi sudah berakhir! Sisa waktu tenggang: <strong>{state.graceDaysLeft} hari</strong>.
          Segera hubungi support untuk perpanjangan agar toko tidak terkunci.
        </span>
      </div>
    );
  }

  // WARNING: 7 hari atau kurang sebelum expired
  if (state.status === 'ACTIVE' && state.daysLeft <= 7 && state.daysLeft >= 0) {
    const urgentColor = state.daysLeft <= 3 ? '#dc2626' : '#d97706';
    return (
      <div style={{
        background: state.daysLeft <= 3
          ? 'linear-gradient(90deg, #7f1d1d, #991b1b)'
          : 'linear-gradient(90deg, #78350f, #92400e)',
        color: 'white',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        fontWeight: '600',
        borderBottom: `1px solid ${urgentColor}`,
        zIndex: 9999,
      }}>
        <AlertTriangle size={16} color="#fde68a" />
        <span style={{ color: '#fde68a' }}>
          ⏳ Lisensi berakhir dalam <strong>{state.daysLeft} hari</strong>.
          Hubungi support untuk perpanjangan sebelum aplikasi terkunci.
        </span>
      </div>
    );
  }

  return null;
}
