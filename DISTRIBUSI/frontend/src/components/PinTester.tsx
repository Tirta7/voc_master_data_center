'use client';

import React, { useState } from 'react';
import { 
  X, 
  Cpu, 
  Zap, 
  Wifi, 
  Volume2, 
  ToggleLeft, 
  ToggleRight,
  Activity,
  AlertCircle,
  RefreshCcw,
  Signal,
  Clock,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAlert } from '@/components/ui/AlertProvider';
import { socket } from '@/lib/socket';

interface PinTesterProps {
  table: any;
  onClose: () => void;
}


const PINS = [
  { id: 2, label: 'LED WIFI', icon: Wifi, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 5, label: 'MODE SWITCH', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { id: 4, label: 'TRANSISTOR', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { id: 19, label: 'BUZZER', icon: Volume2, color: 'text-red-400', bg: 'bg-red-400/10' },
];

export default function PinTester({ table, onClose }: PinTesterProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [rebooting, setRebooting] = useState(false);
  const [pinStates, setPinStates] = useState<Record<number, boolean>>({});
  const [telemetry, setTelemetry] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'esp32' | 'relays'>('esp32');
  const { showAlert } = useAlert();

  React.useEffect(() => {
    const onHeartbeat = (data: any) => {
      if (data.tableId === table.id) {
        setTelemetry(data);
      }
    };

    socket.on('heartbeat', onHeartbeat);
    return () => { socket.off('heartbeat', onHeartbeat); };
  }, [table.id]);

  const togglePin = async (pin: number, isRelay = false) => {
    const currentState = isRelay 
      ? telemetry?.relays?.[pin - 100] || false
      : pinStates[pin] || false;
    
    const newState = !currentState;
    setLoading(pin);
    
    try {
      const url = `/billiard/tables/${table.id}/gpio/${pin}`;
      await axios.patch(url, { isOn: newState });
      
      if (!isRelay) {
        setPinStates((prev: Record<number, boolean>) => ({ ...prev, [pin]: newState }));
      }
      showAlert('Success', `${isRelay ? 'Relay' : 'Pin'} ${isRelay ? pin-100 : pin} set to ${newState ? 'ON' : 'OFF'}`, { variant: 'success' });
    } catch (error: any) {
      console.error('Failed to toggle pin:', error);
      showAlert('Error', error.response?.data?.message || 'Gagal mengubah status pin', { variant: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const handleReboot = async () => {
    if (!confirm('Apakah kamu yakin ingin merestart ESP32 ini secara remote?')) return;
    setRebooting(true);
    try {
      await axios.patch(`/billiard/tables/${table.id}/reboot`, {});
      showAlert('Rebooting', 'Perintah reboot telah dikirim. ESP32 akan offline sejenak.', { variant: 'info' });
    } catch (error: any) {
      showAlert('Error', 'Gagal mengirim perintah reboot', { variant: 'error' });
    } finally {
      setTimeout(() => setRebooting(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#1a1c24] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-blue-500/10 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <Cpu className="text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Hardware Diagnostic</h2>
              <p className="text-sm text-gray-400">Testing Table: <span className="text-blue-400 font-medium">{table.tableName}</span></p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/40 p-1 m-4 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('esp32')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'esp32' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            ESP32 NATIVE PINS
          </button>
          <button
            onClick={() => setActiveTab('relays')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'relays' ? 'bg-purple-500 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            RELAY MODULES (PCF8575)
            {telemetry?.relays && (
              <span className="px-1.5 py-0.5 rounded-md bg-black/20 text-[8px]">{telemetry.relays.length} PINS</span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-0">
          <AnimatePresence mode="wait">
            {activeTab === 'esp32' ? (
              <motion.div 
                key="esp32-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col md:flex-row gap-8 items-center"
              >
                {/* ESP32 Mockup */}
                <div className="relative w-full max-w-[280px] aspect-[1/1.5] bg-[#2a2d3a] rounded-xl border-4 border-[#3a3d4a] p-4 flex flex-col items-center justify-center shadow-inner">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-silver-400 rounded-b-md border-x border-b border-white/10" />
                  <div className="w-24 h-32 bg-[#12141a] rounded-lg border border-white/5 flex items-center justify-center mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 to-transparent" />
                    <span className="text-[10px] font-mono text-gray-600 rotate-90">ESP32-WROOM-32</span>
                  </div>
                  {/* Pin Indicators */}
                  {PINS.map((pin, idx) => (
                    <div
                      key={pin.id}
                      className={`absolute opacity-50 ${idx % 2 === 0 ? '-left-8' : '-right-8'} p-1 px-2 rounded-md bg-[#1a1c24] border border-white/10 flex items-center gap-2`}
                      style={{ top: `${20 + idx * 20}%` }}
                    >
                      <div className={`w-2 h-2 rounded-full ${pinStates[pin.id] ? 'bg-blue-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-600'}`} />
                      <span className="text-[10px] font-bold text-gray-300">IO{pin.id}</span>
                    </div>
                  ))}
                  <div className="mt-auto text-[8px] font-mono text-gray-500 uppercase opacity-30 tracking-tighter">ESP32 Internal IO</div>
                </div>

                {/* ESP32 Controls */}
                <div className="flex-1 w-full grid grid-cols-1 gap-3">
                  {PINS.map((pin) => {
                    const Icon = pin.icon;
                    const isActive = pinStates[pin.id];
                    const isCompLoading = loading === pin.id;
                    return (
                      <button
                        key={pin.id}
                        onClick={() => togglePin(pin.id)}
                        disabled={loading !== null}
                        className={`group relative p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between overflow-hidden ${
                          isActive ? 'bg-white/5 border-white/20' : 'bg-black/20 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-4 z-10">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? pin.bg + ' ' + pin.color : 'bg-white/5 text-gray-500'}`}>
                            <Icon size={20} />
                          </div>
                          <div className="text-left">
                            <span className="block text-[10px] text-gray-500 font-mono uppercase font-black tracking-tighter">Diagnostic Pin IO {pin.id}</span>
                            <span className={`text-sm font-black tracking-tighter uppercase ${isActive ? 'text-white' : 'text-gray-400'}`}>{pin.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 z-10">
                          {isCompLoading ? (
                            <RefreshCcw className="animate-spin text-blue-500" size={20} />
                          ) : (
                            <div className={isActive ? 'text-blue-500' : 'text-gray-600'}>
                              {isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="relays-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 gap-4"
              >
                {!telemetry?.relays ? (
                  <div className="p-12 text-center bg-black/20 rounded-2xl border border-white/5 border-dashed">
                    <Activity className="mx-auto text-gray-600 mb-4 animate-pulse" size={48} />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Waiting for Relay Telemetry...</p>
                    <p className="text-[10px] text-gray-600 mt-2 uppercase">Pastikan ESP32 Online & Terkoneksi MQTT</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* PCF8575 Module Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {telemetry.relays.map((state: boolean, idx: number) => (
                        <button
                          key={`relay-${idx}`}
                          onClick={() => togglePin(100 + idx, true)}
                          disabled={loading !== null}
                          className={`p-3 rounded-xl border transition-all relative overflow-hidden flex flex-col items-center gap-1 ${
                            state 
                              ? 'bg-purple-500/10 border-purple-500/30' 
                              : 'bg-black/30 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {state && <motion.div layoutId="relay-glow" className="absolute inset-0 bg-purple-500/10 blur-xl px-4" />}
                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">P{idx < 10 ? `0${idx}` : idx}</span>
                          <span className={`text-[10px] font-black tracking-tighter ${state ? 'text-purple-400' : 'text-gray-500'}`}>
                            RELAY {idx + 1}
                          </span>
                          <div className={`mt-1 w-2 h-2 rounded-full ${state ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-gray-800'}`} />
                          
                          {loading === (100 + idx) && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                                <RefreshCcw size={14} className="animate-spin text-purple-400" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex items-start gap-3">
                      <Zap className="text-purple-400 shrink-0" size={18} />
                      <p className="text-[11px] text-gray-400 leading-relaxed uppercase font-bold tracking-tight">
                        <span className="text-purple-400 font-black block mb-1">PCF8575 Extension Modules:</span>
                        Meja Billiard Anda dikontrol oleh modul expander ini. Setiap modul mendukung 16 pin relay. Status di atas adalah status aktual yang dilaporkan oleh hardware (Real-time).
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info Bar */}
        <div className="px-8 py-3 bg-black/20 border-y border-white/5 flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
                <Signal className={telemetry ? 'text-emerald-400' : 'text-gray-600'} size={14} />
                <span className="text-[10px] font-bold text-gray-500 uppercase">RSSI:</span>
                <span className={`text-[10px] font-mono ${telemetry ? 'text-white' : 'text-gray-600'}`}>{telemetry?.rssi ? `${telemetry.rssi} dBm` : '---'}</span>
            </div>
            <div className="flex items-center gap-2">
                <Clock className={telemetry ? 'text-blue-400' : 'text-gray-600'} size={14} />
                <span className="text-[10px] font-bold text-gray-500 uppercase">Uptime:</span>
                <span className={`text-[10px] font-mono ${telemetry ? 'text-white' : 'text-gray-600'}`}>{telemetry?.uptime ? `${Math.floor(telemetry.uptime / 3600)}j ${Math.floor((telemetry.uptime % 3600) / 60)}m` : '---'}</span>
            </div>
            <div className="flex items-center gap-2">
                <HardDrive className={telemetry ? 'text-purple-400' : 'text-gray-600'} size={14} />
                <span className="text-[10px] font-bold text-gray-500 uppercase">Heap:</span>
                <span className={`text-[10px] font-mono ${telemetry ? 'text-white' : 'text-gray-600'}`}>{telemetry?.freeHeap ? `${(telemetry.freeHeap / 1024).toFixed(1)} KB` : '---'}</span>
            </div>
            <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                <Activity className={telemetry?.mode === 'AUTO' ? 'text-emerald-400' : 'text-amber-400'} size={12} />
                <span className="text-[10px] font-black text-white/50 uppercase tracking-tighter">Safe Mode:</span>
                <span className={`text-[10px] font-black ${telemetry?.mode === 'AUTO' ? 'text-emerald-400' : 'text-amber-400'}`}>{telemetry?.mode || 'DETECTING...'}</span>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-black/40 flex items-center justify-between px-8">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${telemetry ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                    {telemetry ? 'Live Diagnostics Stream Active' : 'Waiting for Telemetry...'}
                </span>
            </div>
            
            <button
                onClick={handleReboot}
                disabled={rebooting}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 transition-all active:scale-95 disabled:opacity-50"
            >
                <RefreshCcw size={14} className={rebooting ? 'animate-spin' : ''} />
                <span className="text-[10px] font-black uppercase">Reboot ESP32</span>
            </button>
        </div>
      </motion.div>
    </div>
  );
}
