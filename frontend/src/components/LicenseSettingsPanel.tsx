'use client';

import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, ShieldAlert, RefreshCw, Key, Copy, CheckCircle, AlertTriangle, Clock, Monitor } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  const [renewalInfo, setRenewalInfo] = useState<{ nominal?: number; qrisString?: string } | null>(null);
  const [qrisLoading, setQrisLoading] = useState(false);

  const fetchStatus = async (force = false) => {
    try {
      const API_BASE = getApiUrl();
      const url = force ? `${API_BASE}/api/license/status?force=true` : `${API_BASE}/api/license/status`;
      const res = await fetch(url);
      const data = await res.json();
      setLicenseState(data);
      
      // Fetch renewal info as well
      if (!renewalInfo && !qrisLoading) {
        setQrisLoading(true);
        fetch(`${API_BASE}/api/license/renewal-info`)
          .then(r => r.json())
          .then(resInfo => {
            if (resInfo.success) setRenewalInfo(resInfo);
          })
          .catch(() => {})
          .finally(() => setQrisLoading(false));
      }
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
    ? new Date(licenseState.expiredAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const needsRenewal = ['GRACE', 'EXPIRED', 'NOT_REGISTERED'].includes(status) ||
    (status === 'ACTIVE' && (licenseState?.daysLeft || 0) <= 30);

  return (
    <div className="flex flex-col gap-5 p-1">
      {/* Grid: Status & Serial Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Status Badge */}
        <div 
          className="rounded-3xl p-4 md:p-8 flex flex-col justify-between gap-5 md:gap-6 border-2 transition-all duration-300 relative overflow-hidden group"
          style={{ background: cfg.bg, borderColor: cfg.border }}
        >
          {/* Decorative blur blob */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] opacity-50" style={{ background: cfg.color }}></div>

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3 md:gap-4">
              <div 
                className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border"
                style={{ background: `${cfg.color}15`, borderColor: `${cfg.color}30` }}
              >
                <Icon className="w-5 h-5 md:w-7 md:h-7" color={cfg.color} />
              </div>
              <div className="min-w-0">
                <h4 className="text-base md:text-xl font-black text-slate-800 tracking-tight leading-none mb-1.5 truncate">Lisensi Software</h4>
                <span 
                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] md:text-xs font-black tracking-widest uppercase text-white shadow-sm"
                  style={{ background: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>
            </div>

            <button
              onClick={() => fetchStatus(true)}
              className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 bg-white/50 hover:bg-white shadow-sm border border-slate-200/50"
              title="Refresh status"
            >
              <RefreshCw size={18} className="text-slate-500" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-4 mt-2 relative z-10">
            <div className="bg-white/60 rounded-xl p-2 md:p-3 border border-white/50  min-w-0">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                <Clock size={12} /> Expired Date
              </span>
              <p className="text-xs md:text-base font-black text-slate-800 truncate">{expiredDate}</p>
            </div>
            {licenseState?.daysLeft !== undefined && (
              <div className="bg-white/60 rounded-xl p-2 md:p-3 border border-white/50  min-w-0">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sisa Waktu
                </span>
                <p className="text-xs md:text-base font-black truncate" style={{ color: cfg.color }}>
                  {licenseState.daysLeft} Hari
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Machine ID / Serial Number */}
        <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-4 md:p-8 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-[50px] pointer-events-none"></div>
          
          <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Serial Number PC Ini
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-4">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 shadow-sm w-full min-w-0">
              <span className="font-mono text-xs md:text-lg font-black tracking-widest text-slate-700 break-all">
                {licenseState?.machineId || '—'}
              </span>
            </div>
            <button 
              onClick={copyMachineId} 
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 w-full sm:w-auto shadow-sm border ${
                copied 
                  ? 'bg-emerald-100 border-emerald-200 text-emerald-600' 
                  : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-600'
              }`}
            >
              {copied ? <><CheckCircle size={16} /> Disalin!</> : <><Copy size={16} /> Salin</>}
            </button>
          </div>
          
          <p className="text-xs text-slate-500 font-medium leading-relaxed bg-white/50 p-3 rounded-xl border border-slate-200/50">
            Kirimkan <strong className="text-slate-700">Serial Number</strong> ini ke tim teknisi/admin untuk mendapatkan <strong className="text-slate-700">Kode Lisensi</strong> perpanjangan aplikasi Anda.
          </p>
        </div>

      </div>

      {/* Panel Perpanjang Lisensi */}
      <div 
        className="rounded-3xl p-4 md:p-8 border-2 transition-colors relative overflow-hidden"
        style={{
          background: status === 'ACTIVE' ? 'rgba(34,197,94,0.02)' : 'rgba(239,68,68,0.02)',
          borderColor: status === 'ACTIVE' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: status === 'ACTIVE' ? '#22c55e20' : '#dc262620' }}
          >
            <Key size={20} color={status === 'ACTIVE' ? '#22c55e' : '#dc2626'} />
          </div>
          <div>
            <h4 className="text-base md:text-lg font-black text-slate-800 tracking-tight">Perpanjang Lisensi</h4>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {status === 'ACTIVE' ? `Status Aktif - Sisa ${licenseState?.daysLeft || 0} hari` : 'Aktivasi Lisensi Baru'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <ShieldCheck className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={renewKey}
              onChange={e => setRenewKey(e.target.value.toUpperCase())}
              placeholder="LIC-XXXX-XXXX-XXXX"
              onKeyDown={e => e.key === 'Enter' && handleRenew()}
              className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl font-mono text-sm md:text-base font-black tracking-widest text-slate-800 placeholder:text-slate-300 placeholder:font-sans focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>
          <button
            onClick={handleRenew}
            disabled={renewLoading || !renewKey.trim()}
            className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-300 w-full sm:w-auto shadow-sm ${
              renewLoading || !renewKey.trim()
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:shadow-indigo-500/30 border-2 border-indigo-600 hover:-translate-y-0.5'
            }`}
          >
            {renewLoading ? (
              <><RefreshCw size={16} className="animate-spin" /> Memproses</>
            ) : (
              <>Aktifkan <CheckCircle size={16} /></>
            )}
          </button>
        </div>

        {renewResult && (
          <div className={`mt-4 p-4 rounded-xl border-2 flex items-center gap-3 text-sm md:text-base font-bold animate-in fade-in slide-in-from-top-2 ${
            renewResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {renewResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <p>{renewResult.message}</p>
          </div>
        )}
      </div>

      {/* Panel Pembayaran QRIS */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden text-white mt-2">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none"></div>
        
        <div className="flex-1 relative z-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-400/30">
              <Key size={20} className="text-indigo-400" />
            </div>
            <h4 className="text-xl font-black tracking-tight">Pembayaran Lisensi</h4>
          </div>
          <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-lg mb-6">
            Dapatkan kode lisensi instan dengan melakukan pembayaran via QRIS. Scan QR Code di samping menggunakan aplikasi e-Wallet atau Mobile Banking Anda.
          </p>
          <div className="bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col gap-2 max-w-sm mx-auto md:mx-0 ">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Cara Perpanjang:</p>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside font-medium text-left">
              <li>Scan QRIS menggunakan aplikasi Bank/e-Wallet.</li>
              <li>Masukkan nominal perpanjangan yang sesuai.</li>
              <li>Kirim bukti transfer ke WhatsApp Tim Teknisi.</li>
              <li>Masukkan kode yang diberikan pada kolom di atas.</li>
            </ol>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col items-center gap-3 relative z-10 shrink-0">
          <div className="bg-white p-4 rounded-[2rem] shadow-2xl relative w-48 md:w-64">
            <div className="absolute inset-0 rounded-[2rem] ring-4 ring-white/20 ring-offset-4 ring-offset-slate-900"></div>
            {qrisLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <RefreshCw size={24} className="animate-spin mb-3" />
                <span className="text-xs font-bold">Memuat QRIS...</span>
              </div>
            ) : renewalInfo?.qrisString ? (
              <div className="relative w-full overflow-hidden rounded-xl border border-slate-100">
                <img src="/tempQR.png" alt="QRIS Pembayaran Lisensi" className="w-full h-auto block" />
                <div className="absolute top-[34%] left-[50%] -translate-x-1/2 w-[56%] bg-white p-1">
                  <QRCodeSVG 
                    value={renewalInfo.qrisString} 
                    size={256} 
                    level="M" 
                    includeMargin={false} 
                    style={{ width: '100%', height: 'auto', display: 'block' }} 
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-rose-400 bg-rose-50 rounded-xl border border-rose-100 p-4 text-center">
                <AlertTriangle size={24} className="mb-2" />
                <span className="text-[10px] font-bold">Gagal memuat QRIS / Tagihan belum di-set</span>
              </div>
            )}
          </div>
          
          {renewalInfo?.nominal && (
            <div className="bg-slate-800 border border-slate-700 px-5 py-2.5 rounded-2xl shadow-inner mt-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-0.5">Nominal Tagihan</p>
              <p className="text-xl md:text-2xl font-mono font-black text-emerald-400 tracking-tight">
                Rp {renewalInfo.nominal.toLocaleString('id-ID')}
              </p>
            </div>
          )}

          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mt-1 flex items-center gap-1.5">
            <ShieldCheck size={14} /> Official Payment
          </p>
        </div>
      </div>

    </div>
  );
}
