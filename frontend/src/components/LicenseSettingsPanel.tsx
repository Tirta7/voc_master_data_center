'use client';

import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, ShieldAlert, RefreshCw, Key, Copy, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { getApiUrl } from '@/utils/urlUtils';

interface LicenseState {
  status: 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'BLOCKED' | 'NOT_REGISTERED' | 'OFFLINE';
  expiredAt: string | null;
  daysLeft: number;
  graceDaysLeft?: number;
  machineId: string;
  lastChecked: string;
}

const STATUS_CONFIG = {
  ACTIVE:         { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   icon: ShieldCheck, label: 'Aktif' },
  GRACE:          { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  icon: ShieldAlert, label: 'Masa Tenggang' },
  EXPIRED:        { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   icon: ShieldOff,   label: 'Kadaluarsa' },
  BLOCKED:        { color: '#dc2626', bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.3)',   icon: ShieldOff,   label: 'Diblokir' },
  NOT_REGISTERED: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)', icon: Shield,      label: 'Belum Didaftarkan' },
  OFFLINE:        { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', icon: Shield,     label: 'Offline' },
};

export function LicenseSettingsPanel() {
  const [licenseState, setLicenseState] = useState<LicenseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewKey, setRenewKey] = useState('');
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewResult, setRenewResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = async (force = false) => {
    try {
      const API_BASE = getApiUrl();
      const url = force ? `${API_BASE}/api/license/status?force=true` : `${API_BASE}/api/license/status`;
      const res = await fetch(url);
      const data = await res.json();
      setLicenseState(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), 30000);
    return () => clearInterval(interval);
  }, []);

  const copyMachineId = async () => {
    if (!licenseState?.machineId) return;
    await navigator.clipboard.writeText(licenseState.machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRenew = async () => {
    if (!renewKey.trim()) return;
    setRenewLoading(true);
    setRenewResult(null);
    try {
      const API_BASE = getApiUrl();
      const res = await fetch(`${API_BASE}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: renewKey.trim() }),
      });
      const data = await res.json();
      setRenewResult(data);
      if (data.success) {
        setRenewKey('');
        fetchStatus();
      }
    } catch {
      setRenewResult({ success: false, message: 'Tidak bisa menghubungi server lisensi.' });
    } finally {
      setRenewLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '32px', color: '#6366f1' }}>
        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontWeight: '600' }}>Memuat status lisensi...</span>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  const status = licenseState?.status || 'OFFLINE';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
  const Icon = cfg.icon;
  const expiredDate = licenseState?.expiredAt
    ? new Date(licenseState.expiredAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const needsRenewal = ['GRACE', 'EXPIRED', 'NOT_REGISTERED'].includes(status) ||
    (status === 'ACTIVE' && (licenseState?.daysLeft || 0) <= 30);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>
      {/* Status Badge */}
      <div style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
      }}>
        <div style={{
          width: '52px', height: '52px',
          background: `${cfg.color}20`,
          border: `1px solid ${cfg.color}40`,
          borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={26} color={cfg.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ color: '#0f172a', fontWeight: '800', fontSize: '18px' }}>Lisensi Software</span>
            <span style={{
              background: cfg.color,
              color: 'white',
              fontSize: '11px', fontWeight: '700',
              padding: '2px 10px', borderRadius: '999px',
              letterSpacing: '0.04em',
            }}>
              {cfg.label.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <span style={{ color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={13} />
              Expired: <strong style={{ color: '#334155' }}>{expiredDate}</strong>
            </span>
            {licenseState?.daysLeft !== undefined && (
              <span style={{ color: '#64748b', fontSize: '13px' }}>
                Sisa: <strong style={{ color: cfg.color }}>{licenseState.daysLeft} hari</strong>
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => fetchStatus(true)}
          style={{
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '10px', padding: '8px', cursor: 'pointer',
            color: '#6366f1',
          }}
          title="Refresh status"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Machine ID / Serial Number */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '20px 24px',
      }}>
        <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Serial Number PC Ini
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{
            flex: 1, fontFamily: 'monospace',
            fontSize: '18px', fontWeight: '800', letterSpacing: '0.06em',
            color: '#1e293b',
          }}>
            {licenseState?.machineId || '—'}
          </span>
          <button onClick={copyMachineId} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
            borderRadius: '10px', padding: '8px 14px',
            cursor: 'pointer', fontWeight: '700', fontSize: '13px',
            color: copied ? '#16a34a' : '#4f46e5',
            transition: 'all 0.2s',
          }}>
            {copied ? <><CheckCircle size={14} /> Disalin!</> : <><Copy size={14} /> Salin</>}
          </button>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '12px', margin: '8px 0 0' }}>
          Kirimkan Serial Number ini ke admin/teknisi untuk mendapatkan kode perpanjangan lisensi.
        </p>
      </div>

      {/* Panel Perpanjang Lisensi */}
      {true && (
        <div style={{
          background: status === 'ACTIVE' ? 'rgba(34,197,94,0.03)' : 'rgba(239,68,68,0.03)',
          border: `1px solid ${status === 'ACTIVE' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
          borderRadius: '16px',
          padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Icon size={18} color={status === 'ACTIVE' ? '#22c55e' : '#dc2626'} />
            <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>
              {status === 'ACTIVE'
                ? `Perpanjang Lisensi (Aktif - Sisa ${licenseState?.daysLeft || 0} hari)`
                : 'Perpanjang Lisensi'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={renewKey}
              onChange={e => setRenewKey(e.target.value.toUpperCase())}
              placeholder="LIC-XXXX-XXXX-XXXX"
              onKeyDown={e => e.key === 'Enter' && handleRenew()}
              style={{
                flex: 1,
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '10px', padding: '12px 16px',
                fontSize: '15px', fontFamily: 'monospace',
                letterSpacing: '0.04em', outline: 'none', color: '#1e293b',
              }}
            />
            <button
              onClick={handleRenew}
              disabled={renewLoading || !renewKey.trim()}
              style={{
                padding: '12px 20px',
                background: renewLoading || !renewKey.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                border: 'none', borderRadius: '10px', cursor: renewLoading || !renewKey.trim() ? 'not-allowed' : 'pointer',
                color: renewLoading || !renewKey.trim() ? '#94a3b8' : 'white',
                fontWeight: '700', fontSize: '14px',
                display: 'flex', alignItems: 'center', gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              {renewLoading
                ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Memproses...</>
                : <><Key size={16} /> Aktifkan</>
              }
            </button>
          </div>

          {renewResult && (
            <div style={{
              marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
              background: renewResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${renewResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: renewResult.success ? '#16a34a' : '#dc2626',
              fontSize: '13px', fontWeight: '600',
            }}>
              {renewResult.success ? '✅ ' : '❌ '}{renewResult.message}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
