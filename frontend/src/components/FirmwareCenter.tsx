'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { socket } from '@/lib/socket';
// import { API_URL } from '@/utils/urlUtils';
import { toast } from 'react-hot-toast';
import {
  Terminal,
  Cpu,
  CloudUpload,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  RefreshCw,
  Code,
  Activity
} from 'lucide-react';
import PinTester from '@/components/PinTester';

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: string;
}

interface Table {
  id: number;
  tableName: string;
  macAddress: string;
  ipAddress: string | null;
  status: string;
  rssi?: number | null;
  uptime?: number | null;
}

const DEFAULT_INO = `/*
 * ESP32 Web Flash - Spot On Billiard
 */
#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  Serial.println("Booting...");
  
  // OTA setup will be handled here
  ArduinoOTA.setHostname("SpotOn-Custom");
  ArduinoOTA.begin();
}

void loop() {
  ArduinoOTA.handle();
  
  // Send heartbeat every 5 seconds
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 5000) {
    lastHeartbeat = millis();
    
    StaticJsonDocument<200> doc;
    doc["mac"] = WiFi.macAddress();
    doc["ip"] = WiFi.localIP().toString();
    doc["rssi"] = WiFi.RSSI();
    doc["uptime"] = millis() / 1000;
    
    String output;
    serializeJson(doc, output);
    // Logic to send to MQTT status topic would go here
  }
} / * Custom logic below * /`;

export default function FirmwareCenter() {
  const [code, setCode] = useState(DEFAULT_INO);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDeploying, setIsDeploying] = useState<number | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [isCompiled, setIsCompiled] = useState(false);
  const [showPinTester, setShowPinTester] = useState(false);
  const [selectedTableForPinTest, setSelectedTableForPinTest] = useState<Table | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTables();
    fetchSource();

    // Listen to real-time compilation/flashing logs from backend
    socket.on('firmwareLog', (data: any) => {
      const type = data.error ? 'error' : (data.success ? 'success' : 'info');
      addLog(data.message || data.error, type);
    });

    return () => {
      socket.off('firmwareLog');
    };
  }, []);

  const fetchSource = async () => {
    try {
      const resp = await axios.post(`/billiard/firmware/source/get`, {});
      if (resp.data.success && resp.data.code) {
        setCode(resp.data.code);
        addLog('Source code terakhir berhasil dimuat dari server.', 'success');
      }
    } catch (e) {
      console.error('Failed to fetch source:', e);
    }
  };

  const saveSource = async (codeToSave: string) => {
    try {
      await axios.post(`/billiard/firmware/source`, { code: codeToSave });
    } catch (e) {
      console.error('Failed to save source:', e);
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchTables = async () => {
    try {
      const resp = await axios.get(`/billiard/tables`);
      setTables(resp.data);
    } catch (e) {
      toast.error('Gagal mengambil data meja');
    }
  };

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, {
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    setIsCompiled(false);
    setLogs([]);
    addLog('Menyimpan source code...', 'info');
    await saveSource(code);
    addLog('Memulai kompilasi di server...', 'info');

    try {
      const resp = await axios.post(`/billiard/firmware/compile`, { code });
      
      if (resp.data.success) {
        addLog('Kompilasi BINARY berhasil!', 'success');
        setIsCompiled(true);
        toast.success('Kompilasi Selesai');
      } else {
        addLog('Kompilasi Gagal. Periksa error di terminal.', 'error');
        toast.error('Kompilasi Gagal');
      }
    } catch (e) {
      addLog('Error menghubungi server compiler', 'error');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDeploy = async (tableId: number) => {
    if (!isCompiled) {
      toast.error('Kompilasi kode terlebih dahulu!');
      return;
    }

    setIsDeploying(tableId);
    addLog(`Menyiapkan injeksi firmware ke Meja ID: ${tableId}...`, 'info');

    try {
      const resp = await axios.post(`/billiard/firmware/deploy/${tableId}`, {});
      
      if (resp.data.success) {
        addLog(`Injeksi ke Meja ${tableId} BERHASIL! Perangkat akan segera reboot.`, 'success');
        toast.success('Firmware Berhasil Disuntikkan!');
      } else {
        addLog(`Injeksi Gagal: ${resp.data.log || 'Unknown error'}`, 'error');
        toast.error('Injeksi Gagal');
      }
    } catch (e) {
      addLog('Timeout atau error jaringan saat injeksi OTA', 'error');
    } finally {
      setIsDeploying(null);
    }
  };

  const groupTablesByController = (tables: Table[]) => {
    const groups: Record<string, {
      macAddress: string;
      ipAddress: string | null;
      status: string;
      rssi?: number | null;
      uptime?: number | null;
      tables: Table[];
    }> = {};

    tables.forEach(table => {
      const key = table.macAddress || 'unknown';
      if (!groups[key]) {
        groups[key] = {
          macAddress: table.macAddress,
          ipAddress: table.ipAddress,
          status: table.status,
          rssi: table.rssi,
          uptime: table.uptime,
          tables: [table]
        };
      } else {
        groups[key].tables.push(table);
        // Use the best available status/rssi/ip for the controller
        if (table.status === 'online') groups[key].status = 'online';
        if (table.ipAddress) groups[key].ipAddress = table.ipAddress;
        if (table.rssi && (!groups[key].rssi || table.rssi > groups[key].rssi)) groups[key].rssi = table.rssi;
        if (table.uptime && (!groups[key].uptime || table.uptime > groups[key].uptime)) groups[key].uptime = table.uptime;
      }
    });

    return Object.values(groups);
  };

  const controllers = groupTablesByController(tables);

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-950 text-gray-100 rounded-[1.5rem] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl min-h-[850px] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Header */}
      <div className="relative flex items-center justify-between pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
            <Cpu className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Firmware Web Center
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">OTA Virtual Injection • v1.1.0</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              saveSource(code);
              toast.success('Source Code Saved');
              addLog('Source code disimpan secara manual.', 'success');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-all border border-white/10 text-xs font-bold active:scale-95"
          >
            <CloudUpload className="w-4 h-4" />
            Save Code
          </button>
          <button
            onClick={fetchTables}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-90"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-90">
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        {/* Left: Code Editor */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
              <Code className="w-4 h-4 text-blue-400" />
              <span>firmware.ino</span>
            </div>
            {isCompiled && (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Binary Ready
                </span>
              </div>
            )}
          </div>

          <div className="relative flex-1 group rounded-2xl border border-white/10 bg-black/40 overflow-hidden shadow-2xl focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full h-full min-h-[450px] bg-transparent p-6 font-mono text-[13px] leading-relaxed text-blue-100/90 focus:outline-none transition-all resize-none custom-scrollbar"
            />
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          </div>

          <button
            onClick={handleCompile}
            disabled={isCompiling}
            className={`w-full py-4 flex items-center justify-center gap-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
              isCompiling
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]'
            }`}
          >
            {isCompiling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            {isCompiling ? 'Building Firmware...' : 'Compile Source Code'}
          </button>
        </div>

        {/* Right: Controller Monitor & Logs */}
        <div className="flex flex-col gap-6">
          {/* Controller Monitor */}
          <div className="bg-white/5 backdrop-blur-md rounded-[1.5rem] border border-white/10 overflow-hidden flex flex-col h-[380px] shadow-2xl relative">
            <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center relative z-10">
              <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                Physical Controller Monitor
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const diagnosticTarget = tables.find(t => t.ipAddress) || tables.find(t => t.status === 'online') || tables[0];
                    if (diagnosticTarget) {
                      setSelectedTableForPinTest(diagnosticTarget);
                      setShowPinTester(true);
                    } else {
                      toast.error('Tidak ada meja yang tersedia untuk diagnosa');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl border border-amber-500/20 text-[10px] font-black uppercase transition-all"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Live Diags
                </button>
                <div className="h-4 w-[1px] bg-white/10" />
                <span className="text-[10px] font-bold text-gray-500 uppercase">{controllers.length} Units</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {controllers.map(controller => (
                <div key={controller.macAddress} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${controller.status === 'online' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]' : 'bg-gray-600'}`} />
                      {controller.status === 'online' && (
                        <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-black flex items-center gap-2">
                        {controller.macAddress}
                        <span className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase font-black">
                          {controller.tables.length} Tables Connected
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                        {controller.tables.map(t => (
                          <span key={t.id} className="text-[9px] font-black text-gray-500 bg-black/30 px-1.5 py-0.5 rounded">
                            {t.tableName}
                          </span>
                        ))}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-1.5 opacity-60">{controller.ipAddress || 'OFFLINE / NO IP'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                       {controller.rssi !== undefined && controller.rssi !== null && (
                         <span className={`text-[10px] font-bold font-mono ${controller.rssi > -60 ? 'text-blue-400' : 'text-amber-400'}`}>
                           {controller.rssi} dBm
                         </span>
                       )}
                       {controller.uptime !== undefined && controller.uptime !== null && (
                         <div className="text-[9px] font-bold text-gray-500 uppercase">
                           UP: {Math.floor(controller.uptime / 3600)}h {Math.floor((controller.uptime % 3600) / 60)}m
                         </div>
                       )}
                    </div>

                    <button
                      onClick={() => handleDeploy(controller.tables[0].id)}
                      disabled={!isCompiled || isDeploying !== null || !controller.ipAddress}
                      className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                        !isCompiled || !controller.ipAddress
                          ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed opacity-50'
                          : isDeploying !== null
                            ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        }`}
                    >
                      {isDeploying !== null ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                      Flash unit
                    </button>
                  </div>
                </div>
              ))}
              {controllers.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2 opacity-50">
                   <Cpu className="w-10 h-10" />
                   <p className="text-[10px] font-black uppercase tracking-widest">No Physical Controllers Detected</p>
                </div>
              )}
            </div>
          </div>

          {/* Terminal Console */}
          <div className="flex-1 bg-black/60 rounded-[1.5rem] border border-white/10 overflow-hidden flex flex-col min-h-[250px] shadow-2xl relative">
            <div className="px-6 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" />
                <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">Build Pipeline Console</span>
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-gray-500 hover:text-rose-400 transition-colors uppercase font-black"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 p-6 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-1.5 custom-scrollbar">
              {logs.length === 0 && (
                <div className="text-gray-700 italic select-none">SYSTEM READY. WAITING FOR COMMAND...</div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-gray-600 select-none opacity-40">[{log.timestamp}]</span>
                  <span className={`${
                    log.type === 'error' ? 'text-rose-400 font-bold' :
                      log.type === 'success' ? 'text-emerald-400 font-bold' : 'text-blue-300'
                  }`}>
                    {log.type === 'error' && <XCircle className="inline w-3.5 h-3.5 mr-1.5" />}
                    {log.type === 'success' && <CheckCircle2 className="inline w-3.5 h-3.5 mr-1.5" />}
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] text-center pt-6 border-t border-white/5 mt-4 opacity-50">
        WiFi Cloud Injektor • Secure Physical Handshake Required • SpotOn Protocol
      </div>

      {/* Pin Tester Modal */}
      {showPinTester && selectedTableForPinTest && (
        <PinTester
          table={selectedTableForPinTest as any}
          onClose={() => {
            setShowPinTester(false);
            setSelectedTableForPinTest(null);
          }}
        />
      )}
    </div>
  );
}
