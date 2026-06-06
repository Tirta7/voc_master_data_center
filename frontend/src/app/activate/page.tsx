'use client';

import { useState, useEffect } from 'react';
import { Lock, Copy, CheckCircle, RefreshCw } from 'lucide-react';
import { getApiUrl } from '@/utils/urlUtils';

export default function ActivatePage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [machineId, setMachineId] = useState('Memuat...');
  const [licenseState, setLicenseState] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const API_BASE = getApiUrl();
        const res = await fetch(`${API_BASE}/api/license/status`);
        const data = await res.json();
        setMachineId(data.machineId || 'TIDAK DIKETAHUI');
        setLicenseState(data);
        // Jika sudah aktif kembali, redirect ke halaman utama
        if (data.status === 'ACTIVE' || data.status === 'GRACE') {
          window.location.href = '/';
        }
      } catch {
        setMachineId('ERROR');
      }
    };
    fetchStatus();
    // Polling setiap 30 detik — jika owner aktifkan lisensi, langsung redirect
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const copyMachineId = async () => {
    await navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const API_BASE = getApiUrl();
      const res = await fetch(`${API_BASE}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        setTimeout(() => window.location.href = '/', 1500);
      }
    } catch {
      setResult({ success: false, message: 'Tidak bisa menghubungi server. Pastikan aplikasi berjalan.' });
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = licenseState?.status === 'BLOCKED';
  const isExpired = licenseState?.status === 'EXPIRED';
  const isFirstInstall = licenseState?.status === 'NOT_REGISTERED';

  const statusLabel = isBlocked
    ? 'Lisensi Diblokir'
    : isExpired
    ? 'Lisensi Telah Berakhir'
    : isFirstInstall
    ? 'Instalasi Baru — Belum Diaktifkan'
    : 'Verifikasi Lisensi...';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e1b4b 100%)',
      fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
      overflow: 'auto',
    }}>
      {/* Container scrollable yang aman dari top overflow */}
      <div style={{
        minHeight: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        padding: 'calc(env(safe-area-inset-top, 48px) + 24px) 20px calc(env(safe-area-inset-bottom, 24px) + 24px)',
      }}>
      {/* Animasi partikel latar belakang */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${200 + i * 80}px`, height: `${200 + i * 80}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(99,102,241,${0.04 + i * 0.01}) 0%, transparent 70%)`,
            top: `${10 + i * 15}%`, left: `${5 + i * 17}%`,
            animation: `pulse ${3 + i}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', margin: 'auto 0' }}>
        {/* Gembok */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '72px', height: '72px',
            background: isBlocked
              ? 'linear-gradient(135deg, #7f1d1d, #dc2626)'
              : 'linear-gradient(135deg, #312e81, #6366f1)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: isBlocked
              ? '0 0 40px rgba(239,68,68,0.35)'
              : '0 0 40px rgba(99,102,241,0.35)',
            animation: 'lockBounce 2s ease-in-out infinite',
          }}>
            <Lock size={32} color="white" strokeWidth={2} />
          </div>

          <h1 style={{
            color: 'white', fontSize: '20px', fontWeight: '800',
            margin: '0 0 6px', letterSpacing: '-0.02em',
          }}>
            Aplikasi Terkunci
          </h1>
          <p style={{
            color: '#94a3b8', fontSize: '13px', margin: 0,
            lineHeight: '1.5',
          }}>
            {statusLabel}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: 'none',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.02)',
        }}>

          {/* CTA Hubungi Teknisi */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '16px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}>
            <div style={{ fontSize: '24px' }}>📞</div>
            <div>
              <p style={{ color: '#c7d2fe', fontSize: '13px', fontWeight: '700', margin: '0 0 2px' }}>
                Hubungi Teknisi / Admin
              </p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0, lineHeight: '1.4' }}>
                {isFirstInstall
                  ? 'Sampaikan Serial Number di bawah untuk mendapatkan kode aktivasi, selesaikan pembayaran terlebih dahulu'
                  : 'Sampaikan Serial Number di bawah untuk perpanjangan lisensi.'}
              </p>
            </div>
          </div>

          {/* Serial Number / Machine ID */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', color: '#64748b', fontSize: '10px',
              fontWeight: '700', letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: '8px',
            }}>
              Serial Number PC Ini
            </label>
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '16px', padding: '12px 14px',
            }}>
              <span style={{
                flex: 1, color: '#e2e8f0', fontSize: '15px',
                fontWeight: '800', letterSpacing: '0.08em',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}>
                {machineId}
              </span>
              <button
                onClick={copyMachineId}
                style={{
                  background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.15)',
                  border: `1px solid ${copied ? '#22c55e' : 'rgba(99,102,241,0.4)'}`,
                  borderRadius: '8px', padding: '8px 12px',
                  cursor: 'pointer',
                  color: copied ? '#86efac' : '#818cf8',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '12px', fontWeight: '700',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                {copied ? <><CheckCircle size={14} /> Disalin!</> : <><Copy size={14} /> Salin</>}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '20px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
            <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kode Aktivasi</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
          </div>

          {/* Input Kode Aktivasi */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="LIC-XXXX-XXXX-XXXX"
              onKeyDown={e => e.key === 'Enter' && handleActivate()}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(0,0,0,0.4)',
                border: result?.success === false ? '1px solid rgba(239,68,68,0.5)' : 'none',
                borderRadius: '14px', padding: '14px 16px',
                color: 'white', fontSize: '15px',
                fontFamily: 'monospace', letterSpacing: '0.06em',
                outline: 'none', transition: 'border 0.2s',
                textAlign: 'center',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
          </div>

          {/* Feedback */}
          {result && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px', marginBottom: '14px',
              background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
              color: result.success ? '#86efac' : '#fca5a5',
              fontSize: '13px', fontWeight: '500', textAlign: 'center',
            }}>
              {result.success ? '✅ ' : '❌ '}{result.message}
            </div>
          )}

          {/* Tombol Aktifkan */}
          <button
            onClick={handleActivate}
            disabled={loading || !licenseKey.trim()}
            style={{
              width: '100%', padding: '14px',
              background: loading || !licenseKey.trim()
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: 'none',
              borderRadius: '14px', color: loading || !licenseKey.trim() ? '#64748b' : 'white',
              fontSize: '14px', fontWeight: '700',
              cursor: loading || !licenseKey.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading || !licenseKey.trim()
                ? 'none'
                : '0 8px 24px rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
            }}
          >
            {loading
              ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Memverifikasi...</>
              : <><Lock size={16} /> Aktifkan Lisensi</>
            }
          </button>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center', color: '#334155',
          fontSize: '11px', marginTop: '16px',
        }}>
          VOC Billiard Management System v2.0 • Lisensi Komersial
        </p>
      </div>
      </div>

      <style>{`
        @keyframes lockBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse {
          from { transform: scale(0.95); opacity: 0.5; }
          to { transform: scale(1.05); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
