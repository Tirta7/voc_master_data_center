'use client';

import React, { useState, useEffect } from 'react';
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
  Orbit
} from 'lucide-react';
// import { API_URL } from '@/utils/urlUtils';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';

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
}

export default function AdminHardwarePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [rebootingId, setRebootingId] = useState<number | null>(null);

  const fetchHardwareData = async () => {
    try {
      setLoading(true);
      const resp = await axios.get(`/billiard/tables`);
      setTables(resp.data);
    } catch (e) {
      showToast('Error', 'Gagal mengambil data hardware', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHardwareData();
    const interval = setInterval(fetchHardwareData, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, []);

  const handleReboot = async (tableId: number, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin me-restart perangkat ESP32 pada Meja ${name}?`)) return;

    try {
      setRebootingId(tableId);
      const resp = await axios.post(`/billiard/tables/${tableId}/reboot`);
      if (resp.data.success) {
        showToast('Success', `Perintah reboot dikirim ke ${name}`, 'success');
      } else {
        showToast('Error', resp.data.message || 'Gagal mengirim perintah reboot', 'error');
      }
    } catch (e) {
      showToast('Error', 'Terjadi kesalahan sistem', 'error');
    } finally {
      setRebootingId(null);
    }
  };

  const getSignalStrength = (rssi?: number | null) => {
    if (rssi === undefined || rssi === null) return { percent: 0, color: 'text-gray-500', label: 'Unknown' };
    if (rssi === 0) return { percent: 0, color: 'text-gray-500', label: 'Disconnected' };
    
    // RSSI -50 is 100%, RSSI -100 is 0%
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
    const last = new Date(timestamp).getTime();
    const now = Date.now();
    const diff = Math.floor((now - last) / 1000);
    
    if (diff < 15) return <span className="text-green-400 animate-pulse font-black">Just now</span>;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(timestamp).toLocaleTimeString();
  };

  const filteredTables = tables.filter(t => 
    t.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.macAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ipAddress?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-[#020617] p-4 lg:p-10 space-y-10 animate-in fade-in duration-700">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header Section */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
              Infrastructure Node Diagnostics
            </div>
            {loading && <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Hardware <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Health Center</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-xl font-medium leading-relaxed">
            Real-time monitoring hub untuk seluruh ekosistem ESP32. Pantau latensi, kekuatan sinyal WiFi, 
            dan stabilitas sistem secara terpusat.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group w-full sm:w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari Meja, IP, atau MAC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-900/40 border border-slate-800 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-slate-600 backdrop-blur-md"
            />
          </div>
          <button 
            onClick={fetchHardwareData}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Grid Stats Summary - Premium Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="group relative overflow-hidden bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl transition-all hover:border-indigo-500/30">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheck className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-6 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-emerald-600/5 rounded-3xl flex items-center justify-center border border-green-500/30 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <div className="text-3xl font-black text-white">{tables.filter(t => t.lastHeartbeat && (Date.now() - new Date(t.lastHeartbeat).getTime() < 60000)).length}</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mt-1">Active Nodes</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium italic">Seluruh sistem beroperasi dalam parameter optimal.</p>
        </div>

        <div className="group relative overflow-hidden bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl transition-all hover:border-amber-500/30">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-6 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-600/5 rounded-3xl flex items-center justify-center border border-amber-500/30 shadow-inner">
              <Zap className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="text-3xl font-black text-white">
                {tables.length > 0 ? Math.round(tables.reduce((acc, t) => acc + (t.rssi || 0), 0) / tables.filter(t => t.rssi).length || 0) : 0} dBm
              </div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mt-1">Avg WiFi Quality</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium italic">Kualitas sinyal rata-rata pada area operasional.</p>
        </div>

        <div className="group relative overflow-hidden bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl transition-all hover:border-rose-500/30">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Power className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-6 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-rose-500/20 to-red-600/5 rounded-3xl flex items-center justify-center border border-rose-500/30 shadow-inner">
              <Power className="w-7 h-7 text-rose-400" />
            </div>
            <div>
              <div className="text-3xl font-black text-white">
                {tables.filter(t => !t.lastHeartbeat || (Date.now() - new Date(t.lastHeartbeat).getTime() >= 60000)).length}
              </div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mt-1">Offline Units</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium italic">Perangkat yang membutuhkan atensi segera.</p>
        </div>
      </div>

      {/* Main Container - Table with Premium Styling */}
      <div className="relative z-10 bg-slate-900/30 border border-slate-800/60 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/60 border-b border-white/5">
                <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hardware Node</th>
                <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Network Identity</th>
                <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">WiFi Quality</th>
                <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Heartbeat</th>
                <th className="px-8 py-7 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Node Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTables.map((table) => {
                const signal = getSignalStrength(table.rssi);
                const isOnline = table.lastHeartbeat && (Date.now() - new Date(table.lastHeartbeat).getTime() < 60000);
                
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
                            <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">{table.macAddress || '--:--:--:--:--:--'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-2">
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
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest pl-1">TCP Protocol v1.02</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-[10px] font-black ${signal.color} uppercase tracking-tight`}>{signal.label}</span>
                            <span className="text-[11px] font-black text-white">{signal.percent}%</span>
                          </div>
                          <div className="flex-1 min-w-[100px] h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className={`h-full bg-gradient-to-r transition-all duration-1000 ${
                                signal.percent > 70 ? 'from-green-500 to-emerald-400' :
                                signal.percent > 30 ? 'from-amber-500 to-orange-400' :
                                'from-rose-600 to-red-500'
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
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Runtime</span>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
