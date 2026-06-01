'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Cpu,
  Clock,
  Signal,
  Power,
  Search,
  ChevronRight,
  ShieldCheck,
  Zap,
  HardDrive,
  Orbit,
  Radio,
  Router,
  Users,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { useMqtt } from '@/context/MqttContext';

interface Table {
  id: number;
  tableName: string;
  category: string;
  macAddress: string;
  ipAddress: string | null;
  status: string;
  rssi?: number | null;
  uptime?: number | null;
  lastHeartbeat?: string | null;
  relayPin?: number | null;
  hardwareType?: 'PCF8575' | 'MOC3062' | 'ESPNOW_NODE' | null;
  floorNumber?: number | null;        // Lantai fisik (1–4)
  espnowGatewayMac?: string | null;   // MAC Gateway yang mengontrol meja ini
}

interface GatewayStatus {
  status: 'online' | 'offline';
  uptime?: number;
  rssi?: number;
  ip?: string;
  mac?: string;
  peerCount?: number;
  peersOnline?: number;
  freeHeap?: number;
  hwType?: string;
  lastSeen?: Date;
}

export default function AdminHardwarePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const { subscribe, publish } = useMqtt();
  const [rebootingId, setRebootingId] = useState<number | null>(null);

  // Gateway state — single legacy (floor unknown)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>({ status: 'offline' });
  const [gatewayPollStatus, setGatewayPollStatus] = useState<'idle' | 'polling' | 'done'>('idle');
  // Multi-gateway map by MAC → status (for per-floor gateways)
  const [gatewayMap, setGatewayMap] = useState<Record<string, GatewayStatus>>({});
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerForm, setRegisterForm] = useState({ mesaId: '', mac: '', floor: 1 });
  const [registerLoading, setRegisterLoading] = useState(false);
  const registerLoadingRef = React.useRef(false);

  // ── Data Fetch ─────────────────────────────────────────────────────────────
  const fetchHardwareData = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await axios.get(`/billiard/tables`);
      setTables(resp.data);
    } catch (e) {
      showToast('Error', 'Gagal mengambil data hardware', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchHardwareData();
    const interval = setInterval(fetchHardwareData, 10000);
    return () => clearInterval(interval);
  }, [fetchHardwareData]);

  // ── MQTT Subscribe: Gateway Status ─────────────────────────────────────────
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Gateway heartbeat / status — topik global (backward compat)
    unsubs.push(subscribe('billiard/gateway/status', (data: any) => {
      const parsed: GatewayStatus = {
        status: data.status === 'online' ? 'online' : 'offline',
        uptime: data.uptime, rssi: data.rssi, ip: data.ip, mac: data.mac,
        peerCount: data.peerCount, peersOnline: data.peersOnline,
        freeHeap: data.freeHeap, hwType: data.hwType, lastSeen: new Date(),
      };
      setGatewayStatus(parsed);
      // Juga masukkan ke gatewayMap jika ada MAC
      if (data.mac) {
        setGatewayMap(prev => ({ ...prev, [data.mac.replace(/[:\-]/g, '').toUpperCase()]: parsed }));
      }
    }));

    // Per-floor gateway: billiard/gateway/{mac}/status
    unsubs.push(subscribe('billiard/gateway/+/status', (data: any, topic?: string) => {
      if (!topic) return;
      const parts = topic.split('/');
      const mac = parts[2]?.replace(/[:\-]/g, '').toUpperCase();
      if (!mac || mac === 'status') return; // ignore global topic
      setGatewayMap(prev => ({
        ...prev,
        [mac]: {
          status: data.status === 'online' ? 'online' : 'offline',
          uptime: data.uptime, rssi: data.rssi, ip: data.ip, mac: data.mac || mac,
          peerCount: data.peerCount, peersOnline: data.peersOnline,
          freeHeap: data.freeHeap, hwType: data.hwType, lastSeen: new Date(),
        },
      }));
    }));

    // Register ACK
    unsubs.push(subscribe('billiard/gateway/register/ack', (data: any) => {
      if (data.ok) {
        showToast('Berhasil', `Prajurit Meja-${data.mesaId} (${data.mac}) terdaftar!`, 'success');
        registerLoadingRef.current = false;
        setRegisterLoading(false);
        setShowRegisterForm(false);
        setRegisterForm({ mesaId: '', mac: '', floor: 1 });
      }
    }));

    return () => unsubs.forEach(u => u());
  }, [subscribe, showToast]);

  // ── Gateway Actions ────────────────────────────────────────────────────────
  const handlePollAll = () => {
    setGatewayPollStatus('polling');
    publish('billiard/gateway/poll', {});
    setTimeout(() => setGatewayPollStatus('done'), 3000);
    setTimeout(() => setGatewayPollStatus('idle'), 6000);
    showToast('Poll Terkirim', 'Gateway sedang meminta status semua Prajurit...', 'info');
  };

  const handleRegisterPrajurit = () => {
    if (!registerForm.mesaId || !registerForm.mac) {
      showToast('Validasi', 'ID Meja dan MAC Address wajib diisi', 'warning');
      return;
    }
    registerLoadingRef.current = true;
    setRegisterLoading(true);
    publish('billiard/gateway/register', {
      mesaId: Number(registerForm.mesaId),
      mac: registerForm.mac.trim(),
    });
    // Timeout fallback jika ACK tidak datang
    setTimeout(() => {
      if (registerLoadingRef.current) {
        registerLoadingRef.current = false;
        setRegisterLoading(false);
        showToast('Timeout', 'Tidak ada respons dari Gateway. Pastikan Gateway online.', 'warning');
      }
    }, 10000);
  };

  const handleRebootNode = (mesaId: number) => {
    publish('billiard/gateway/reboot', { mesaId });
    showToast('Reboot Terkirim', `Perintah reboot dikirim ke Prajurit Meja-${mesaId}`, 'info');
  };

  const handleReboot = async (tableId: number, name: string) => {
    if (!confirm(`Reboot perangkat ESP32 pada Meja ${name}?`)) return;
    try {
      setRebootingId(tableId);
      const resp = await axios.post(`/billiard/tables/${tableId}/reboot`);
      if (resp.data.success) {
        showToast('Success', `Perintah reboot dikirim ke ${name}`, 'success');
      } else {
        showToast('Error', resp.data.message || 'Gagal mengirim perintah reboot', 'error');
      }
    } catch {
      showToast('Error', 'Terjadi kesalahan sistem', 'error');
    } finally {
      setRebootingId(null);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  // ── Online Check Helper ──────────────────────────────────────────────────
  // Backend throttles DB write setiap 5 menit → threshold harus > 5 menit
  // Pakai 7 menit (420 detik) agar ada buffer untuk network jitter
  const ONLINE_THRESHOLD_MS = 7 * 60 * 1000; // 7 menit

  const isTableOnline = (lastHeartbeat?: string | null): boolean => {
    if (!lastHeartbeat) return false;
    return (Date.now() - new Date(lastHeartbeat).getTime()) < ONLINE_THRESHOLD_MS;
  };

  const getSignalStrength = (rssi?: number | null) => {
    if (rssi === undefined || rssi === null) return { percent: 0, color: 'text-gray-500', label: 'Unknown' };
    if (rssi === 0) return { percent: 0, color: 'text-gray-500', label: 'Disconnected' };
    const percent = Math.min(100, Math.max(0, 2 * (rssi + 100)));
    let color = 'text-green-400';
    let label = 'Strong';
    if (percent < 30) { color = 'text-rose-400'; label = 'Weak'; }
    else if (percent < 70) { color = 'text-amber-400'; label = 'Fair'; }
    return { percent, color, label };
  };

  const formatUptime = (seconds?: number | null) => {
    if (!seconds || seconds === 0) return 'Offline';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(' ');
  };

  const formatLastSeen = (timestamp?: string | null) => {
    if (!timestamp) return 'Never';
    const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (diff < 15) return <span className="text-green-400 animate-pulse font-black">Just now</span>;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(timestamp).toLocaleTimeString();
  };

  const gwLastSeenAge = gatewayStatus.lastSeen
    ? Math.floor((Date.now() - gatewayStatus.lastSeen.getTime()) / 1000)
    : 9999;
  const gwOnline = gatewayStatus.status === 'online' && gwLastSeenAge < 180;

  const filteredTables = tables.filter(t =>
    t.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.macAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ipAddress?.includes(searchTerm)
  );

  const espNowNodes = filteredTables.filter(t => t.hardwareType === 'ESPNOW_NODE');
  const wifiNodes = filteredTables.filter(t => t.hardwareType !== 'ESPNOW_NODE');

  // Derive unique gateways per floor from table data
  const floorGatewayMap = React.useMemo(() => {
    const map: Record<number, { mac: string; floorNumber: number; tableCount: number }> = {};
    tables.filter(t => t.hardwareType === 'ESPNOW_NODE').forEach(t => {
      const floor = t.floorNumber ?? 1;
      const mac = (t.espnowGatewayMac || t.macAddress || '').toUpperCase();
      if (!map[floor] && mac) {
        map[floor] = { mac, floorNumber: floor, tableCount: 0 };
      }
      if (map[floor]) map[floor].tableCount++;
    });
    return map;
  }, [tables]);

  // ── Stats — pakai threshold 7 menit agar sinkron dengan isTableOnline ─────
  const onlineTables = tables.filter(t => isTableOnline(t.lastHeartbeat));
  const activeNodesCount = onlineTables.length;
  
  const onlineWifiNodes  = tables.filter(t => t.hardwareType !== 'ESPNOW_NODE' && isTableOnline(t.lastHeartbeat) && t.rssi);
  const avgRssi = onlineWifiNodes.length > 0
    ? Math.round(onlineWifiNodes.reduce((acc, t) => acc + (t.rssi || 0), 0) / onlineWifiNodes.length)
    : 0;
  
  const offlineCount = tables.length - activeNodesCount;

  return (
    <div className="min-h-screen bg-[#020617] p-4 lg:p-10 space-y-10 animate-in fade-in duration-700">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/8 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/8 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">
              Hybrid IoT Node Diagnostics
            </div>
            {loading && <div className="w-2 h-2 bg-violet-500 rounded-full animate-ping" />}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Hardware <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">Health Center</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-xl font-medium leading-relaxed">
            Real-time monitoring: <span className="text-violet-400 font-bold">Gateway (Komandan)</span> + <span className="text-cyan-400 font-bold">Prajurit ESP-NOW</span> + node WiFi langsung.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group w-full sm:w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
            <input
              type="text"
              placeholder="Cari Meja, IP, atau MAC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-900/40 border border-slate-800 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder:text-slate-600 backdrop-blur-md"
            />
          </div>
          <button
            onClick={fetchHardwareData}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          GATEWAY (KOMANDAN) PANEL
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Router className="w-4 h-4 text-violet-400" />
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Gateway — Si Komandan</h2>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black ${
            gwOnline
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${gwOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            {gwOnline ? 'ONLINE' : 'OFFLINE / Belum ada data'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Status Card */}
          <div className={`relative overflow-hidden rounded-[2rem] border p-6 backdrop-blur-xl transition-all ${
            gwOnline
              ? 'bg-violet-500/5 border-violet-500/20'
              : 'bg-slate-900/40 border-slate-800'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

            <div className="flex items-center gap-4 mb-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${
                gwOnline ? 'bg-violet-500/20 border-violet-500/40' : 'bg-slate-800 border-slate-700'
              }`}>
                <Router className={`w-7 h-7 ${gwOnline ? 'text-violet-400' : 'text-slate-600'}`} />
              </div>
              <div>
                <p className="text-white font-black text-sm">ESP32 Gateway</p>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  Komandan — MQTT + ESP-NOW
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: 'MAC Address',
                  value: gatewayStatus.mac
                    ? gatewayStatus.mac.replace(/(.{2})(?=.)/g, '$1:').toUpperCase()
                    : '—',
                  mono: true,
                },
                { label: 'IP Address', value: gatewayStatus.ip || '—', mono: true },
                { label: 'Uptime', value: formatUptime(gatewayStatus.uptime) },
                {
                  label: 'WiFi RSSI',
                  value: gatewayStatus.rssi ? `${gatewayStatus.rssi} dBm` : '—',
                  color: gatewayStatus.rssi && gatewayStatus.rssi > -70
                    ? 'text-emerald-400'
                    : 'text-amber-400',
                },
                { label: 'Free Heap', value: gatewayStatus.freeHeap ? `${Math.round(gatewayStatus.freeHeap / 1024)} KB` : '—' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{row.label}</span>
                  <span className={`text-[11px] font-black ${row.color || 'text-white'} ${row.mono ? 'font-mono' : ''}`}>
                    {row.value}
                  </span>
                </div>
              ))}

              {gatewayStatus.lastSeen && (
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Last Seen</span>
                  <span className="text-[11px] font-black text-slate-400">
                    {gatewayStatus.lastSeen.toLocaleTimeString('id-ID')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Peer Stats Card */}
          <div className="relative overflow-hidden rounded-[2rem] border bg-slate-900/40 border-slate-800 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-5">
              <Users className="w-5 h-5 text-cyan-400" />
              <p className="text-white font-black text-sm uppercase tracking-widest">Prajurit Terdaftar</p>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div>
                <p className="text-5xl font-black text-white leading-none">
                  {gatewayStatus.peersOnline ?? '—'}
                </p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Online</p>
              </div>
              {gatewayStatus.peerCount !== undefined && (
                <div className="mb-1">
                  <p className="text-slate-400 font-black text-lg">/ {gatewayStatus.peerCount}</p>
                  <p className="text-[10px] font-black text-slate-600 uppercase">Terdaftar</p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {gatewayStatus.peerCount !== undefined && gatewayStatus.peerCount > 0 && (
              <div className="mb-6">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-1000"
                    style={{ width: `${((gatewayStatus.peersOnline ?? 0) / gatewayStatus.peerCount) * 100}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-600 mt-1 font-bold">
                  {Math.round(((gatewayStatus.peersOnline ?? 0) / gatewayStatus.peerCount) * 100)}% node aktif
                </p>
              </div>
            )}

            {/* Poll All */}
            <button
              onClick={handlePollAll}
              disabled={!gwOnline || gatewayPollStatus === 'polling'}
              className={`w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
                gatewayPollStatus === 'polling'
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30 animate-pulse'
                  : gatewayPollStatus === 'done'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : gwOnline
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20'
                      : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {gatewayPollStatus === 'polling' ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Polling...</>
              ) : gatewayPollStatus === 'done' ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Poll Selesai</>
              ) : (
                <><Radio className="w-3.5 h-3.5" /> Poll Semua Prajurit</>
              )}
            </button>
          </div>

          {/* Register Prajurit Card */}
          <div className="relative overflow-hidden rounded-[2rem] border bg-slate-900/40 border-slate-800 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-emerald-400" />
                <p className="text-white font-black text-sm uppercase tracking-widest">Daftarkan Prajurit</p>
              </div>
              <button
                onClick={() => setShowRegisterForm(!showRegisterForm)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
              >
                {showRegisterForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>

            {!showRegisterForm ? (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Setelah flash firmware <span className="text-violet-400 font-bold">espnow_node_prajurit.ino</span>,
                  catat MAC Address dari Serial Monitor, lalu daftarkan di sini.
                </p>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Alur Registrasi</p>
                  {[
                    { step: '①', text: 'Flash firmware Prajurit ke ESP32 masing-masing meja' },
                    { step: '②', text: 'Catat MAC Address dari Serial Monitor' },
                    { step: '③', text: 'Klik + dan daftarkan ID Meja + MAC' },
                    { step: '④', text: 'Gateway akan simpan ke SPIFFS otomatis' },
                  ].map(s => (
                    <div key={s.step} className="flex items-start gap-2">
                      <span className="text-[9px] font-black text-violet-400 shrink-0">{s.step}</span>
                      <p className="text-[9px] text-slate-500">{s.text}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowRegisterForm(true)}
                  className="w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Prajurit Baru
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    ID Meja (mesaId)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={registerForm.mesaId}
                    onChange={e => setRegisterForm(p => ({ ...p, mesaId: e.target.value }))}
                    placeholder="Contoh: 5"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  <p className="text-[9px] text-slate-600 mt-1">
                    Harus cocok dengan <code className="text-violet-400">#define MESA_ID</code> di firmware
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    MAC Address Prajurit
                  </label>
                  <input
                    type="text"
                    value={registerForm.mac}
                    onChange={e => setRegisterForm(p => ({ ...p, mac: e.target.value }))}
                    placeholder="AA:BB:CC:DD:EE:FF"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  <p className="text-[9px] text-slate-600 mt-1">
                    Dari Serial Monitor Prajurit saat boot
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegisterPrajurit}
                    disabled={registerLoading || !gwOnline}
                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      registerLoading
                        ? 'bg-violet-500/20 text-violet-400 animate-pulse border border-violet-500/30'
                        : gwOnline
                          ? 'bg-violet-600 text-white hover:bg-violet-500'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {registerLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {registerLoading ? 'Menunggu ACK...' : 'Daftarkan'}
                  </button>
                  <button
                    onClick={() => { setShowRegisterForm(false); setRegisterForm({ mesaId: '', mac: '', floor: 1 }); }}
                    className="px-4 py-2.5 rounded-xl text-[11px] font-black bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                </div>
                {!gwOnline && (
                  <p className="text-[10px] text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> Gateway offline — tidak bisa kirim perintah registrasi
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Summary ──────────────────────────────────────────────────── */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: ShieldCheck,
            value: activeNodesCount,
            label: 'Active Nodes',
            sub: 'Meja dengan heartbeat < 7 menit',
            from: 'from-green-500/20', to: 'to-emerald-600/5',
            border: 'border-green-500/30', color: 'text-green-400',
            hover: 'hover:border-green-500/30',
          },
          {
            icon: Zap,
            value: `${avgRssi} dBm`,
            label: 'Avg WiFi Quality',
            sub: `Rata-rata RSSI ${onlineWifiNodes.length} node aktif`,
            from: 'from-amber-500/20', to: 'to-orange-600/5',
            border: 'border-amber-500/30', color: 'text-amber-400',
            hover: 'hover:border-amber-500/30',
          },
          {
            icon: Power,
            value: offlineCount,
            label: 'Offline Units',
            sub: 'Node tanpa heartbeat > 7 menit',
            from: 'from-rose-500/20', to: 'to-red-600/5',
            border: 'border-rose-500/30', color: 'text-rose-400',
            hover: 'hover:border-rose-500/30',
          },
        ].map((s, i) => (
          <div key={i} className={`group relative overflow-hidden bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl transition-all ${s.hover}`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <s.icon className="w-24 h-24" />
            </div>
            <div className="flex items-center gap-6 mb-4">
              <div className={`w-14 h-14 bg-gradient-to-br ${s.from} ${s.to} rounded-3xl flex items-center justify-center border ${s.border} shadow-inner`}>
                <s.icon className={`w-7 h-7 ${s.color}`} />
              </div>
              <div>
                <div className="text-3xl font-black text-white">{s.value}</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mt-1">{s.label}</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium italic">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ESP-NOW PRAJURIT NODES
      ══════════════════════════════════════════════════════════════════════ */}
      {espNowNodes.length > 0 && (
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Radio className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Node ESP-NOW — Prajurit</h2>
            <span className="text-[10px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full">
              {espNowNodes.length} node
            </span>
          </div>

          {/* Group by Floor */}
          <div className="space-y-8">
            {[1, 2, 3, 4].map(floor => {
              const floorNodes = espNowNodes.filter(t => (t.floorNumber ?? 1) === floor);
              if (floorNodes.length === 0) return null;
              const gwInfo = floorGatewayMap[floor];
              const gwStatus = gwInfo ? gatewayMap[gwInfo.mac] : null;
              const gwAge = gwStatus?.lastSeen ? Math.floor((Date.now() - new Date(gwStatus.lastSeen).getTime()) / 1000) : 9999;
              const floorGwOnline = !!gwStatus && gwStatus.status === 'online' && gwAge < 180;

              return (
                <div key={floor}>
                  {/* Floor + Gateway row */}
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-violet-500/10">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center">
                      <Radio className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Lantai {floor}</p>
                      <p className="text-xs font-black text-white">{floorNodes.length} Prajurit</p>
                    </div>
                    {/* Per-floor gateway badge */}
                    {gwInfo ? (
                      <div className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black transition-all ${
                        floorGwOnline
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${floorGwOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                        Gateway Lantai {floor}: {floorGwOnline ? 'ONLINE' : 'OFFLINE'}
                        {gwStatus?.peerCount != null && floorGwOnline && (
                          <span className="ml-1 text-slate-500">· {gwStatus.peersOnline ?? '?'}/{gwStatus.peerCount} peers</span>
                        )}
                      </div>
                    ) : (
                      <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black bg-slate-800/60 border-slate-700 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                        Gateway Lantai {floor}: belum dideteksi
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {floorNodes.map(table => {
                      const isOnline = isTableOnline(table.lastHeartbeat);
                      return (
                        <div key={table.id}
                          className={`bg-slate-900/40 border rounded-2xl p-4 transition-all hover:border-violet-500/30 ${
                            isOnline ? 'border-violet-500/20' : 'border-slate-800'
                          }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                isOnline ? 'bg-violet-500/20 border border-violet-500/30' : 'bg-slate-800 border border-slate-700'
                              }`}>
                                <Radio className={`w-4 h-4 ${isOnline ? 'text-violet-400' : 'text-slate-600'}`} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-white">{table.tableName}</p>
                                <p className="text-[9px] font-bold text-violet-400">ID: {table.relayPin ?? '?'}</p>
                              </div>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Gateway MAC</span>
                              <span className="text-[9px] font-mono text-slate-400 max-w-[100px] truncate">
                                {table.macAddress || '—'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Last Seen</span>
                              <span className="text-[9px] font-bold">
                                {formatLastSeen(table.lastHeartbeat)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRebootNode(table.relayPin!)}
                            disabled={!floorGwOnline}
                            className="mt-3 w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 bg-slate-800 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 border border-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Power className="w-3 h-3" /> Reboot via Gateway
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════════
          WIFI DIRECT NODES (MOC3062 / PCF8575)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10">
        {wifiNodes.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Node WiFi Langsung</h2>
            <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
              {wifiNodes.length} node
            </span>
          </div>
        )}

        <div className="bg-slate-900/30 border border-slate-800/60 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-white/5">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hardware Node</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Network Identity</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">WiFi Quality</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Heartbeat</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(searchTerm ? filteredTables : wifiNodes).map((table) => {
                  const signal = getSignalStrength(table.rssi);
                  const isOnline = isTableOnline(table.lastHeartbeat);

                  return (
                    <tr key={table.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center border-2 transition-all duration-500 group-hover:scale-105 shadow-xl ${
                            isOnline
                              ? 'bg-indigo-600/10 border-indigo-500/30 shadow-indigo-500/10'
                              : 'bg-slate-800/50 border-slate-700/50'
                          }`}>
                            <Cpu className={`w-7 h-7 ${isOnline ? 'text-indigo-400 animate-pulse' : 'text-slate-600'}`} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
                              {table.tableName}
                              <span className="px-2 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400 border border-slate-700 tracking-normal font-bold">{table.category}</span>
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded border border-white/5 shrink-0">MAC</span>
                              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                                {table.macAddress || '--:--:--:--:--:--'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${
                              table.hardwareType === 'MOC3062'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : table.hardwareType === 'PCF8575'
                                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {table.hardwareType === 'MOC3062' ? 'MOC3062 WiFi'
                                : table.hardwareType === 'PCF8575' ? 'PCF8575 Panel'
                                  : 'WiFi Direct'}
                            </span>
                          </div>
                          {table.ipAddress ? (
                            <a
                              href={`http://${table.ipAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl transition-all"
                            >
                              <Orbit className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="text-xs font-bold text-indigo-300">{table.ipAddress}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-indigo-500/50" />
                            </a>
                          ) : (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                              <WifiOff className="w-3.5 h-3.5 text-slate-600" />
                              <span className="text-xs font-bold text-slate-500">Node Unreachable</span>
                            </div>
                          )}
                          <p className="text-[9px] text-slate-500 font-bold pl-1">
                            {table.hardwareType === 'MOC3062'
                              ? `MOC Pin: GPIO${table.relayPin ?? '?'}`
                              : `PCF Channel: ${table.relayPin ?? '?'}`
                            }
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-0.5">
                              <span className={`text-[10px] font-black ${signal.color} uppercase tracking-tight`}>{signal.label}</span>
                              <span className="text-[11px] font-black text-white">{signal.percent}%</span>
                            </div>
                            <div className="flex-1 min-w-[80px] h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div
                                className={`h-full bg-gradient-to-r transition-all duration-1000 ${
                                  signal.percent > 70 ? 'from-green-500 to-emerald-400'
                                    : signal.percent > 30 ? 'from-amber-500 to-orange-400'
                                      : 'from-rose-600 to-red-500'
                                } shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                                style={{ width: `${signal.percent}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/50 border border-white/5 rounded-full w-fit">
                            <Signal className={`w-3 h-3 ${signal.color}`} />
                            <span className="text-[9px] font-bold text-slate-500">{table.rssi || 0} dBm</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-white/5">
                              <Clock className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Runtime</span>
                              <span className="text-xs font-black text-white">{formatUptime(table.uptime)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/50 border border-white/5 rounded-full w-fit">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              isOnline
                                ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                                : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                            }`} />
                            <span className="text-[10px] font-bold text-slate-400">{formatLastSeen(table.lastHeartbeat)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => handleReboot(table.id, table.tableName)}
                          disabled={rebootingId === table.id || !table.macAddress}
                          className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                            rebootingId === table.id
                              ? 'bg-amber-500/20 text-amber-500 animate-pulse border border-amber-500/30'
                              : 'bg-white/5 text-white hover:bg-rose-600 hover:text-white border border-white/10 hover:border-rose-500 shadow-lg'
                          } disabled:opacity-20 disabled:cursor-not-allowed`}
                        >
                          {rebootingId === table.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Power className="w-3.5 h-3.5 text-rose-500 group-hover:text-white transition-colors" />
                          )}
                          Restart Node
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {(searchTerm ? filteredTables : wifiNodes).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <HardDrive className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500 font-bold text-sm">
                        {searchTerm ? 'Tidak ada node yang cocok dengan pencarian' : 'Belum ada node WiFi terdaftar'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
