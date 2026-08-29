'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  Gamepad2, Wifi, WifiOff, Search, RefreshCw, Radio,
  Lock, Unlock, Monitor, MonitorOff, Send, Settings,
  Download, Upload, ChevronDown, ChevronUp, X, Check,
  AlertCircle, Play, Square, Plus, Zap, Eye
} from 'lucide-react';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import StartSessionModal from '@/components/StartSessionModal';
import ExtendSessionModal from '@/components/ExtendSessionModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PsTable {
  id: number;
  tableName: string;
  stationType: string;
  category: string;
  ipAddress?: string;
  status: string;
  remainingMinutes?: number;
  startTime?: string;
  endTime?: string;
  sessionType?: string;
  activeTransaction?: any;
  isOffline?: boolean;
  activePackagePrice?: number;
}

interface DiscoveredIp {
  ip: string;
  deviceName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  available:       { label: 'Tersedia',       color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  in_use:          { label: 'Aktif',          color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',       dot: 'bg-blue-500' },
  warning:         { label: 'Hampir Habis',   color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-500' },
  waiting_payment: { label: 'Tagihan',        color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200',       dot: 'bg-rose-500' },
  maintenance:     { label: 'Maintenance',    color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200',     dot: 'bg-slate-400' },
};

function formatTime(minutes?: number) {
  if (!minutes || minutes <= 0) return '--:--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

// ─── PS Card Component ────────────────────────────────────────────────────────
function PsCard({
  table,
  onlineMap,
  onStart,
  onStop,
  onExtend,
  onLock,
  onUnlock,
  onSendMessage,
  onIpChange,
  isSubmitting,
}: {
  table: PsTable;
  onlineMap: Record<number, boolean>;
  onStart: (id: number) => void;
  onStop: (id: number) => void;
  onExtend: (id: number) => void;
  onLock: (id: number) => void;
  onUnlock: (id: number) => void;
  onSendMessage: (id: number) => void;
  onIpChange: (id: number, ip: string) => void;
  isSubmitting: boolean;
}) {
  const cfg   = STATUS_CONFIG[table.status] ?? STATUS_CONFIG.available;
  const tvOnline = onlineMap[table.id] !== false; // default true jika belum di-ping
  const hasIp = !!table.ipAddress;
  const [editIp, setEditIp] = useState(false);
  const [ipVal,  setIpVal]  = useState(table.ipAddress || '');
  const isActive = ['in_use', 'warning', 'waiting_payment'].includes(table.status);

  return (
    <div className={`relative bg-white rounded-2xl border ${cfg.bg} shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group`}>
      {/* Status bar top */}
      <div className={`h-1 w-full ${cfg.dot}`} />

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 className={`w-4 h-4 ${cfg.color}`} />
          <span className="font-black text-slate-800 text-sm truncate max-w-[100px]">{table.tableName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* TV Online/Offline indicator */}
          {hasIp ? (
            tvOnline
              ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200"><Wifi className="w-2.5 h-2.5"/>TV</span>
              : <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200"><WifiOff className="w-2.5 h-2.5"/>Offline</span>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-200">No IP</span>
          )}
        </div>
      </div>

      {/* Status & Timer */}
      <div className="px-4 pb-3 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>

        {isActive && (
          <>
            <div className="text-2xl font-black text-slate-800 tabular-nums">
              {formatTime(table.remainingMinutes)}
            </div>
            {table.activeTransaction?.customerName && (
              <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                👤 {table.activeTransaction.customerName}
              </div>
            )}
            {table.remainingMinutes !== undefined && table.sessionType === 'prepaid' && (
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${table.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, ((table.remainingMinutes || 0) / 120) * 100)}%` }}
                />
              </div>
            )}
          </>
        )}

        {/* IP Editor */}
        <div className="mt-2">
          {editIp ? (
            <div className="flex items-center gap-1">
              <input
                value={ipVal}
                onChange={e => setIpVal(e.target.value)}
                placeholder="192.168.1.x"
                className="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                onKeyDown={e => {
                  if (e.key === 'Enter') { onIpChange(table.id, ipVal); setEditIp(false); }
                  if (e.key === 'Escape') { setEditIp(false); setIpVal(table.ipAddress || ''); }
                }}
                autoFocus
              />
              <button onClick={() => { onIpChange(table.id, ipVal); setEditIp(false); }}
                className="p-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Check className="w-3 h-3"/></button>
              <button onClick={() => { setEditIp(false); setIpVal(table.ipAddress || ''); }}
                className="p-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"><X className="w-3 h-3"/></button>
            </div>
          ) : (
            <button onClick={() => setEditIp(true)}
              className="text-[10px] text-slate-400 hover:text-indigo-600 font-mono flex items-center gap-1 transition-colors">
              <Settings className="w-2.5 h-2.5"/>
              {table.ipAddress || 'Set IP Address'}
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex flex-wrap gap-1.5">
        {table.status === 'available' && (
          <button onClick={() => onStart(table.id)} disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black py-2 rounded-xl transition-all active:scale-95">
            <Play className="w-3 h-3"/> Mulai
          </button>
        )}
        {isActive && (
          <>
            <button onClick={() => onExtend(table.id)} disabled={isSubmitting}
              className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-black px-2.5 py-2 rounded-xl transition-all active:scale-95">
              <Plus className="w-3 h-3"/> Tambah
            </button>
            <button onClick={() => onStop(table.id)} disabled={isSubmitting}
              className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black px-2.5 py-2 rounded-xl transition-all active:scale-95">
              <Square className="w-3 h-3"/> Stop
            </button>
          </>
        )}
        {hasIp && (
          <>
            <button onClick={() => onLock(table.id)} disabled={isSubmitting} title="Kunci Layar TV"
              className="flex items-center gap-1 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-[10px] font-black px-2 py-2 rounded-xl transition-all active:scale-95">
              <Lock className="w-3 h-3"/>
            </button>
            <button onClick={() => onUnlock(table.id)} disabled={isSubmitting} title="Buka Layar TV"
              className="flex items-center gap-1 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 text-[10px] font-black px-2 py-2 rounded-xl transition-all active:scale-95">
              <Unlock className="w-3 h-3"/>
            </button>
            <button onClick={() => onSendMessage(table.id)} disabled={isSubmitting} title="Kirim Pesan ke TV"
              className="flex items-center gap-1 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 text-[10px] font-black px-2 py-2 rounded-xl transition-all active:scale-95">
              <Send className="w-3 h-3"/>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlaystationPage() {
  const { billiardTables, loadingBilliard, refetchBilliard } = useRealtimeData();
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();

  // Filter only PS tables
  const psTables = useMemo<PsTable[]>(() =>
    (billiardTables as any[]).filter((t: any) => t.stationType === 'PLAYSTATION') as PsTable[],
    [billiardTables]
  );

  // ─── State ─────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onlineMap,    setOnlineMap]    = useState<Record<number, boolean>>({});
  const [pingLoading,  setPingLoading]  = useState(false);

  // Modals
  const [startModal,   setStartModal]   = useState<number | null>(null);
  const [extendModal,  setExtendModal]  = useState<number | null>(null);
  const [msgModal,     setMsgModal]     = useState<{ id: number; name: string } | null>(null);
  const [msgText,      setMsgText]      = useState('');

  // IP Management panel
  const [showIpPanel,  setShowIpPanel]  = useState(false);
  const [pendingIps,   setPendingIps]   = useState<Record<number, string>>({});

  // Auto-discover
  const [discovering,  setDiscovering]  = useState(false);
  const [discovered,   setDiscovered]   = useState<DiscoveredIp[]>([]);
  const [discoverSub,  setDiscoverSub]  = useState('');

  // ─── Derived filtered list ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return psTables.filter(t => {
      const matchSearch = t.tableName.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === 'ALL' ? true :
        statusFilter === 'ACTIVE' ? ['in_use','warning','waiting_payment'].includes(t.status) :
        statusFilter === 'AVAILABLE' ? t.status === 'available' :
        statusFilter === 'OFFLINE' ? onlineMap[t.id] === false :
        true;
      return matchSearch && matchStatus;
    });
  }, [psTables, search, statusFilter, onlineMap]);

  const stats = useMemo(() => ({
    total:     psTables.length,
    active:    psTables.filter(t => ['in_use','warning'].includes(t.status)).length,
    available: psTables.filter(t => t.status === 'available').length,
    offline:   psTables.filter(t => onlineMap[t.id] === false).length,
    noIp:      psTables.filter(t => !t.ipAddress).length,
  }), [psTables, onlineMap]);

  // ─── Actions ───────────────────────────────────────────────────────────

  const handleBatchPing = useCallback(async () => {
    setPingLoading(true);
    try {
      const res = await axios.post('/billiard/ps/ping-all');
      const map: Record<number, boolean> = {};
      res.data.results?.forEach((r: any) => { map[r.id] = r.online; });
      setOnlineMap(map);
      showToast('Ping Selesai', `Online: ${res.data.online}/${res.data.total}`, 'success');
    } catch {
      showToast('Error', 'Ping gagal', 'error');
    } finally {
      setPingLoading(false);
    }
  }, [showToast]);

  const handleDiscover = useCallback(async () => {
    setDiscovering(true);
    setDiscovered([]);
    try {
      const res = await axios.post('/billiard/ps/discover', { subnet: discoverSub || undefined });
      setDiscovered(res.data.found || []);
      if (res.data.found.length === 0) {
        showToast('Scan Selesai', 'Tidak ada TV yang ditemukan di jaringan ini', 'info');
      } else {
        showToast('Ditemukan!', `${res.data.found.length} TV Android di ${res.data.subnet}.x`, 'success');
      }
    } catch {
      showToast('Error', 'Auto-discover gagal', 'error');
    } finally {
      setDiscovering(false);
    }
  }, [discoverSub, showToast]);

  const handleAssignIp = useCallback(async (tableId: number, ip: string) => {
    try {
      await axios.patch('/billiard/ps/batch-update-ip', { updates: [{ id: tableId, ipAddress: ip }] });
      showToast('Berhasil', `IP ${ip} disimpan`, 'success');
      refetchBilliard();
    } catch {
      showToast('Error', 'Gagal menyimpan IP', 'error');
    }
  }, [showToast, refetchBilliard]);

  const handleIpChange = useCallback(async (id: number, ip: string) => {
    await handleAssignIp(id, ip);
  }, [handleAssignIp]);

  const handleBatchSaveIps = useCallback(async () => {
    const updates = Object.entries(pendingIps).map(([id, ip]) => ({ id: Number(id), ipAddress: ip }));
    if (!updates.length) return;
    setIsSubmitting(true);
    try {
      const res = await axios.patch('/billiard/ps/batch-update-ip', { updates });
      showToast('Tersimpan', `${res.data.updated} IP berhasil diperbarui`, 'success');
      setPendingIps({});
      refetchBilliard();
    } catch {
      showToast('Error', 'Gagal menyimpan batch IP', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingIps, showToast, refetchBilliard]);

  const handleStop = useCallback(async (id: number) => {
    setIsSubmitting(true);
    try {
      await axios.post(`/billiard/tables/${id}/stop`, { userId: user?.id });
      refetchBilliard();
      showToast('Berhasil', 'Sesi PS dihentikan', 'success');
    } catch { showToast('Error', 'Gagal stop sesi', 'error'); }
    finally { setIsSubmitting(false); }
  }, [user?.id, refetchBilliard, showToast]);

  const handleLock = useCallback(async (id: number) => {
    try {
      await axios.get(`/billiard/tables/${id}/tv-sleep`);
      showToast('🔒 Dikunci', 'Layar TV berhasil dikunci', 'warning');
    } catch { showToast('Error', 'Gagal mengunci TV', 'error'); }
  }, [showToast]);

  const handleUnlock = useCallback(async (id: number) => {
    const table = psTables.find(t => t.id === id);
    try {
      await axios.get(`/billiard/tables/${id}/tv-wakeup`, {
        params: { title: 'Lanjutkan Bermain', duration: 'Manual' }
      });
      showToast('🔓 Dibuka', 'Layar TV berhasil dibuka', 'success');
    } catch { showToast('Error', 'Gagal membuka TV', 'error'); }
  }, [psTables, showToast]);

  const handleBulkLock = useCallback(async () => {
    const targets = psTables.filter(t => t.ipAddress);
    showToast('Mengunci...', `Mengunci ${targets.length} TV`, 'info');
    await Promise.allSettled(targets.map(t => axios.get(`/billiard/tables/${t.id}/tv-sleep`).catch(() => {})));
    showToast('Selesai', `${targets.length} TV dikunci`, 'warning');
  }, [psTables, showToast]);

  const handleBulkUnlock = useCallback(async () => {
    const targets = psTables.filter(t => t.ipAddress);
    showToast('Membuka...', `Membuka ${targets.length} TV`, 'info');
    await Promise.allSettled(targets.map(t =>
      axios.get(`/billiard/tables/${t.id}/tv-wakeup`, { params: { title: 'Bermain PS', duration: 'Operator' } }).catch(() => {})
    ));
    showToast('Selesai', `${targets.length} TV dibuka`, 'success');
  }, [psTables, showToast]);

  const handleSendMessage = useCallback(async () => {
    if (!msgModal || !msgText.trim()) return;
    setIsSubmitting(true);
    try {
      await axios.post(`/billiard/tables/${msgModal.id}/send-message`, { message: msgText });
      showToast('Terkirim', `Pesan dikirim ke ${msgModal.name}`, 'success');
      setMsgModal(null);
      setMsgText('');
    } catch { showToast('Error', 'Gagal mengirim pesan', 'error'); }
    finally { setIsSubmitting(false); }
  }, [msgModal, msgText, showToast]);

  // Export CSV
  const handleExportCsv = useCallback(() => {
    const rows = ['nama_ps,ip_address,status', ...psTables.map(t => `${t.tableName},${t.ipAddress || ''},${t.status}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'ps_tables.csv'; a.click();
  }, [psTables]);

  // Import CSV
  const handleImportCsv = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = (ev.target?.result as string).split('\n').slice(1);
      const newPending: Record<number, string> = { ...pendingIps };
      lines.forEach(line => {
        const [name, ip] = line.split(',');
        const table = psTables.find(t => t.tableName.trim() === name?.trim());
        if (table && ip?.trim()) newPending[table.id] = ip.trim();
      });
      setPendingIps(newPending);
      showToast('CSV Dimuat', `${Object.keys(newPending).length} IP siap disimpan`, 'info');
    };
    reader.readAsText(file);
  }, [psTables, pendingIps, showToast]);

  const selectedTable = psTables.find(t => t.id === startModal);
  const extendTable   = psTables.find(t => t.id === extendModal);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header Nav */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4 sticky top-16 lg:top-0 z-30 shadow-sm  bg-white/80 hidden md:block">
        <div className="max-w-[1800px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-100">
              <Gamepad2 className="w-5 h-5"/>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Meja PlayStation</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PS Management Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleBulkLock}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-all active:scale-95">
              <Lock className="w-3.5 h-3.5"/> Kunci Semua TV
            </button>
            <button onClick={handleBulkUnlock}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition-all active:scale-95">
              <Unlock className="w-3.5 h-3.5"/> Buka Semua TV
            </button>
            <button onClick={handleBatchPing} disabled={pingLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-60">
              <Radio className={`w-3.5 h-3.5 ${pingLoading ? 'animate-pulse' : ''}`}/>
              {pingLoading ? 'Ping...' : 'Ping Semua PS'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1800px] mx-auto p-4 md:p-6">

        {/* ─── Stats Bar ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total PS', value: stats.total,     color: 'text-slate-700',   bg: 'bg-white',        icon: <Gamepad2 className="w-4 h-4 text-slate-400"/> },
            { label: 'Aktif',    value: stats.active,    color: 'text-blue-700',    bg: 'bg-blue-50',      icon: <Play className="w-4 h-4 text-blue-500"/> },
            { label: 'Tersedia', value: stats.available, color: 'text-emerald-700', bg: 'bg-emerald-50',   icon: <Check className="w-4 h-4 text-emerald-500"/> },
            { label: 'TV Offline',value: stats.offline,  color: 'text-rose-700',    bg: 'bg-rose-50',      icon: <WifiOff className="w-4 h-4 text-rose-500"/> },
            { label: 'Tanpa IP', value: stats.noIp,      color: 'text-amber-700',   bg: 'bg-amber-50',     icon: <AlertCircle className="w-4 h-4 text-amber-500"/> },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm`}>
              {s.icon}
              <div>
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Search & Filter Bar ─────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama PS..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          <div className="flex gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            {[
              { id: 'ALL',       label: 'Semua' },
              { id: 'ACTIVE',    label: 'Aktif' },
              { id: 'AVAILABLE', label: 'Tersedia' },
              { id: 'OFFLINE',   label: 'Offline TV' },
            ].map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === f.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          <button onClick={() => setShowIpPanel(p => !p)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 rounded-xl font-bold text-xs transition-all shadow-sm">
            <Settings className="w-3.5 h-3.5"/> IP Manager {showIpPanel ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
          </button>

          <button onClick={() => refetchBilliard()}
            className="p-2.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 rounded-xl transition-all shadow-sm">
            <RefreshCw className="w-4 h-4"/>
          </button>
        </div>

        {/* ─── IP Manager Panel ─────────────────────────────────────── */}
        {showIpPanel && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500"/>
                <span className="font-black text-sm text-slate-700">IP Address Manager</span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                  {psTables.filter(t => t.ipAddress).length}/{psTables.length} terkonfigurasi
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Auto-Discover */}
                <div className="flex items-center gap-1.5">
                  <input value={discoverSub} onChange={e => setDiscoverSub(e.target.value)}
                    placeholder="192.168.1 (opsional)"
                    className="w-44 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"/>
                  <button onClick={handleDiscover} disabled={discovering}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg disabled:opacity-60 transition-all">
                    <Zap className="w-3 h-3"/>{discovering ? 'Scanning...' : 'Auto-Discover'}
                  </button>
                </div>
                {/* CSV tools */}
                <button onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all">
                  <Download className="w-3 h-3"/> Export CSV
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer">
                  <Upload className="w-3 h-3"/> Import CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleImportCsv}/>
                </label>
                {Object.keys(pendingIps).length > 0 && (
                  <button onClick={handleBatchSaveIps} disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-60">
                    <Check className="w-3 h-3"/> Simpan {Object.keys(pendingIps).length} IP
                  </button>
                )}
              </div>
            </div>

            {/* Discovered IPs result */}
            {discovered.length > 0 && (
              <div className="px-5 py-3 bg-violet-50 border-b border-violet-100">
                <p className="text-xs font-black text-violet-700 mb-2">✅ {discovered.length} TV Ditemukan — klik untuk assign:</p>
                <div className="flex flex-wrap gap-2">
                  {discovered.map(d => (
                    <div key={d.ip} className="flex items-center gap-1.5 bg-white border border-violet-200 rounded-lg px-2 py-1.5">
                      <span className="font-mono text-xs font-bold text-violet-700">{d.ip}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{d.deviceName}</span>
                      <select defaultValue=""
                        onChange={e => { if (e.target.value) handleAssignIp(Number(e.target.value), d.ip); }}
                        className="text-[10px] border border-slate-200 rounded px-1 py-0.5">
                        <option value="">Assign ke...</option>
                        {psTables.filter(t => !t.ipAddress).map(t => (
                          <option key={t.id} value={t.id}>{t.tableName}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inline IP table */}
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase">Nama PS</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase">IP Address</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase">Status TV</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {psTables.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-700 text-xs">{t.tableName}</td>
                      <td className="px-4 py-2.5">
                        <input
                          value={pendingIps[t.id] !== undefined ? pendingIps[t.id] : (t.ipAddress || '')}
                          onChange={e => setPendingIps(p => ({ ...p, [t.id]: e.target.value }))}
                          placeholder="192.168.x.x"
                          className="font-mono text-xs border border-slate-200 rounded-lg px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        {t.ipAddress
                          ? (onlineMap[t.id] === false
                              ? <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1"><WifiOff className="w-3 h-3"/>Offline</span>
                              : onlineMap[t.id] === true
                                ? <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Wifi className="w-3 h-3"/>Online</span>
                                : <span className="text-[10px] text-slate-400">Belum di-ping</span>)
                          : <span className="text-[10px] text-amber-500 font-bold">Belum dikonfigurasi</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {pendingIps[t.id] !== undefined && pendingIps[t.id] !== t.ipAddress && (
                          <button onClick={() => { handleAssignIp(t.id, pendingIps[t.id]); setPendingIps(p => { const n = {...p}; delete n[t.id]; return n; }); }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg transition-all">
                            Simpan
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── PS Grid ──────────────────────────────────────────────── */}
        <div className="text-xs text-slate-500 font-bold mb-3">
          {filtered.length} dari {psTables.length} meja PS
        </div>

        {loadingBilliard ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 h-48 animate-pulse"/>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Gamepad2 className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
            <p className="text-slate-400 font-bold">
              {psTables.length === 0
                ? 'Belum ada meja PlayStation. Tambahkan meja PS di Settings → Meja.'
                : 'Tidak ada PS yang sesuai filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {filtered.map(table => (
              <PsCard
                key={table.id}
                table={table}
                onlineMap={onlineMap}
                onStart={id => setStartModal(id)}
                onStop={handleStop}
                onExtend={id => setExtendModal(id)}
                onLock={handleLock}
                onUnlock={handleUnlock}
                onSendMessage={id => setMsgModal({ id, name: table.tableName })}
                onIpChange={handleIpChange}
                isSubmitting={isSubmitting}
              />
            ))}
          </div>
        )}
      </main>

      {/* ─── Start Session Modal ─────────────────────────────────────── */}
      {startModal && (
        <StartSessionModal
          isOpen={true}
          onClose={() => setStartModal(null)}
          table={selectedTable as any}
          onStart={async (type, duration, customerName, packageId) => {
            setIsSubmitting(true);
            try {
              await axios.post(`/billiard/tables/${startModal}/start`, { type, duration, customerName, packageId, userId: user?.id });
              refetchBilliard();
              setStartModal(null);
              showToast('Berhasil', 'Sesi PS dimulai', 'success');
            } catch (e: any) { showToast('Error', e.response?.data?.message || 'Gagal mulai sesi', 'error'); }
            finally { setIsSubmitting(false); }
          }}
        />
      )}

      {/* ─── Extend Modal ────────────────────────────────────────────── */}
      {extendModal && (
        <ExtendSessionModal
          isOpen={true}
          onClose={() => setExtendModal(null)}
          tableId={extendModal}
          tableCategory={extendTable?.category}
          stationType="PLAYSTATION"
          onExtended={() => { refetchBilliard(); setExtendModal(null); }}
        />
      )}

      {/* ─── Send Message Modal ──────────────────────────────────────── */}
      {msgModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="font-black text-slate-800 text-lg mb-1">Kirim Pesan</h3>
            <p className="text-xs text-slate-500 mb-4">ke <strong>{msgModal.name}</strong></p>
            <textarea
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              placeholder="Ketik pesan yang akan ditampilkan di TV..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => { setMsgModal(null); setMsgText(''); }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all">
                Batal
              </button>
              <button onClick={handleSendMessage} disabled={!msgText.trim() || isSubmitting}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50">
                <Send className="w-4 h-4 inline mr-1"/> Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
