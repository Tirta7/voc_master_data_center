'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldOff, ShieldAlert, RefreshCw, Key, Copy, CheckCircle,
  Clock, Monitor, Server, Wifi, WifiOff, CalendarClock, Sparkles, Lock,
} from 'lucide-react';
import { getApiUrl, getSocketUrl } from '@/utils/urlUtils';

interface LicenseState {
  status: 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'BLOCKED' | 'NOT_REGISTERED' | 'OFFLINE';
  expiredAt: string | null;
  daysLeft: number;
  message?: string;
  machineId: string;
  lastChecked: string;
  licenseKey?: string | null;
  serverOnline?: boolean;
  serverUrl?: string;
  rawStatus?: string;
}

const STATUS_CONFIG = {
  ACTIVE:         { color: '#16a34a', soft: '#dcfce7', ring: '#bbf7d0', icon: ShieldCheck, label: 'Aktif',            desc: 'Lisensi aktif dan tersinkron dengan VOCML.' },
  GRACE:          { color: '#d97706', soft: '#fef3c7', ring: '#fde68a', icon: ShieldAlert, label: 'Segera Berakhir',  desc: 'Masa lisensi hampir habis. Segera lakukan perpanjangan.' },
  EXPIRED:        { color: '#dc2626', soft: '#fee2e2', ring: '#fecaca', icon: ShieldOff,   label: 'Kadaluarsa',       desc: 'Masa lisensi telah berakhir. Aplikasi terkunci sampai diperpanjang.' },
  BLOCKED:        { color: '#b91c1c', soft: '#fee2e2', ring: '#fecaca', icon: Lock,        label: 'Dikunci',          desc: 'Aplikasi dikunci oleh admin dari VOCML.' },
  NOT_REGISTERED: { color: '#4f46e5', soft: '#e0e7ff', ring: '#c7d2fe', icon: Shield,      label: 'Menunggu Aktivasi', desc: 'Machine ID sudah terdaftar di VOCML, menunggu admin klik Generate License Key.' },
  OFFLINE:        { color: '#475569', soft: '#f1f5f9', ring: '#e2e8f0', icon: WifiOff,     label: 'Offline',          desc: 'Tidak dapat terhubung ke server lisensi VOCML.' },
};

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const fmtAgo = (s?: string) => {
  if (!s) return '—';
  const diff = Math.max(0, Math.round((Date.now() - new Date(s).getTime()) / 1000));
  if (diff < 10) return 'Baru saja';
  if (diff < 60) return `${diff} detik lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  return new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

export function LicenseSettingsPanel() {
  const [state, setState] = useState<LicenseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState<'mid' | 'key' | null>(null);
  const [, setNow] = useState(Date.now());

  const fetchStatus = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/license/status${force ? '?force=true' : ''}`);
      setState(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Real-time: backend push saat status lisensi berubah (mis. admin klik Generate License Key di VOCML)
    const es = new EventSource(`${getSocketUrl()}/api/license/status-stream`);
    es.onmessage = (e) => { if (e.data) fetchStatus(); };
    const fallback = setInterval(() => fetchStatus(), 60000);
    const clock = setInterval(() => setNow(Date.now()), 15000); // update label "x detik lalu"
    return () => { es.close(); clearInterval(fallback); clearInterval(clock); };
  }, [fetchStatus]);

  const copy = async (text: string | null | undefined, which: 'mid' | 'key') => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-8 text-indigo-600">
        <RefreshCw size={20} className="animate-spin" />
        <span className="font-semibold">Memuat status lisensi...</span>
      </div>
    );
  }

  const status = state?.status || 'OFFLINE';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
  const Icon = cfg.icon;
  const online = state?.serverOnline !== false && status !== 'OFFLINE';
  const daysLeft = Math.max(0, state?.daysLeft ?? 0);
  const hasExpiry = !!state?.expiredAt;
  // Progress bar sisa masa aktif (skala 30 hari)
  const pct = hasExpiry ? Math.min(100, Math.round((daysLeft / 30) * 100)) : 0;
  const serverHost = (state?.serverUrl || 'https://vocml.vocpos.id').replace(/^https?:\/\//, '');

  return (
    <div className="flex flex-col gap-5 p-1">
      {/* ── HERO STATUS ───────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl border-2 p-5 md:p-7"
        style={{ background: `linear-gradient(135deg, ${cfg.soft} 0%, #ffffff 70%)`, borderColor: cfg.ring }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-[60px]" style={{ background: cfg.color }} />

        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border shadow-sm"
              style={{ background: '#fff', borderColor: cfg.ring }}
            >
              <Icon className="h-7 w-7" color={cfg.color} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-lg font-black tracking-tight text-slate-800 md:text-xl">Lisensi Aplikasi Billiard</h4>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-sm"
                  style={{ background: cfg.color }}
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  {cfg.label}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">{state?.message || cfg.desc}</p>
            </div>
          </div>

          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Sinkron...' : 'Cek Sekarang'}
          </button>
        </div>

        {/* Stats */}
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={<CalendarClock size={12} />} label="Berlaku Sampai" value={fmtDate(state?.expiredAt)} />
          <Stat
            icon={<Clock size={12} />}
            label="Sisa Waktu"
            value={hasExpiry ? `${daysLeft} Hari` : '—'}
            valueColor={cfg.color}
          />
          <Stat
            icon={online ? <Wifi size={12} /> : <WifiOff size={12} />}
            label="Server VOCML"
            value={online ? 'Terhubung' : 'Terputus'}
            valueColor={online ? '#16a34a' : '#dc2626'}
          />
          <Stat icon={<RefreshCw size={12} />} label="Sinkron Terakhir" value={fmtAgo(state?.lastChecked)} />
        </div>

        {hasExpiry && (
          <div className="relative z-10 mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200/60">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}aa)` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── MACHINE ID + LICENSE KEY ───────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border-2 border-slate-100 bg-slate-50 p-5 md:p-6">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Monitor className="h-4 w-4" /> Machine ID PC Ini
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="break-all font-mono text-base font-black tracking-widest text-slate-700 md:text-lg">
                {state?.machineId || '—'}
              </span>
            </div>
            <CopyBtn active={copied === 'mid'} onClick={() => copy(state?.machineId, 'mid')} />
          </div>
          <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">
            Machine ID ini <strong className="text-slate-700">terdaftar otomatis</strong> di VOCML. Sebutkan ID ini ke admin saat
            melakukan perpanjangan.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border-2 border-slate-100 bg-white p-5 md:p-6">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Key className="h-4 w-4" /> License Key Aktif
          </p>
          {state?.licenseKey ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="line-clamp-3 break-all font-mono text-[11px] font-bold leading-relaxed text-slate-600">
                  {state.licenseKey}
                </span>
              </div>
              <CopyBtn active={copied === 'key'} onClick={() => copy(state.licenseKey, 'key')} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-xs font-semibold text-slate-400">
              Belum ada License Key. Menunggu admin klik <span className="text-slate-600">Generate License Key</span> di VOCML.
            </div>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Server size={12} /> Diterbitkan oleh <span className="font-bold text-slate-700">{serverHost}</span>
          </p>
        </div>
      </div>

      {/* ── CARA PERPANJANG ───────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-teal-500/20 blur-[70px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-[70px]" />

        <div className="relative z-10 mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-400/30 bg-teal-500/20">
            <Sparkles size={20} className="text-teal-300" />
          </div>
          <div>
            <h4 className="text-lg font-black tracking-tight md:text-xl">Perpanjangan Otomatis</h4>
            <p className="text-xs font-medium text-slate-400">Tidak perlu mengetik kode — aplikasi aktif sendiri setelah admin memperpanjang.</p>
          </div>
        </div>

        <ol className="relative z-10 grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            { t: 'Salin Machine ID', d: 'Klik tombol Salin pada kartu Machine ID di atas.' },
            { t: 'Hubungi Admin', d: 'Kirim Machine ID & lakukan pembayaran perpanjangan.' },
            { t: 'Admin Generate Key', d: 'Admin memilih durasi lalu klik Generate License Key di VOCML.' },
            { t: 'Aktif Otomatis', d: 'Dalam ±10 detik status di halaman ini berubah tanpa reload.' },
          ].map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10">
              <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-teal-400/20 text-xs font-black text-teal-300">
                {i + 1}
              </span>
              <p className="text-sm font-black">{s.t}</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-400">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur">
      <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {icon} {label}
      </span>
      <p className="truncate text-sm font-black text-slate-800 md:text-base" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </p>
    </div>
  );
}

function CopyBtn({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition-all sm:w-auto ${
        active ? 'border-emerald-200 bg-emerald-100 text-emerald-600' : 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
      }`}
    >
      {active ? <><CheckCircle size={16} /> Disalin</> : <><Copy size={16} /> Salin</>}
    </button>
  );
}
