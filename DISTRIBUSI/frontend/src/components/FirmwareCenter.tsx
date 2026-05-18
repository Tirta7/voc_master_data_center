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
 * ESP32 Web Flash - VOC Billiard
 */
#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  Serial.println("Booting...");
  
  // OTA setup will be handled here
  ArduinoOTA.setHostname("VOC-Custom");
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
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* ACTION HEADER */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-200 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            System Online
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {controllers.length} Controllers • {tables.length} Tables
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              saveSource(code);
              toast.success('Source Code Saved');
              addLog('Source code disimpan secara manual.', 'success');
            }}
            className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:border-indigo-600 transition-all shadow-sm active:scale-95"
          >
            <CloudUpload className="w-4 h-4" />
            Save Code
          </button>
          <button
            onClick={fetchTables}
            className="p-3 bg-white border-2 border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all shadow-sm active:scale-90"
          >
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT: Code Editor (Main Control) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">Firmware Source</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">production_core.ino</p>
                </div>
              </div>
              {isCompiled && (
                <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full font-black text-[10px] uppercase tracking-widest border border-emerald-100 flex items-center gap-2 animate-in zoom-in duration-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Binary Ready
                </div>
              )}
            </div>

            <div className="relative group rounded-3xl border-2 border-slate-50 bg-slate-900 overflow-hidden shadow-inner min-h-[500px]">
              <div className="absolute top-0 left-0 w-12 h-full bg-slate-800/50 border-r border-white/5 flex flex-col items-center pt-6 text-[10px] font-mono text-slate-500 select-none opacity-40">
                {Array(25).fill(0).map((_, i) => <div key={i} className="h-6">{(i + 1).toString().padStart(2, '0')}</div>)}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="w-full h-full min-h-[500px] bg-transparent pl-16 pr-6 pt-6 font-mono text-[13px] leading-6 text-indigo-100 focus:outline-none transition-all resize-none custom-scrollbar selection:bg-indigo-500/30"
              />
            </div>

            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className={`w-full py-5 flex items-center justify-center gap-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl ${isCompiling
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-slate-900 active:scale-[0.98]'
                }`}
            >
              {isCompiling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              {isCompiling ? 'Building Matrix Firmware...' : 'Compile Source Code'}
            </button>
          </div>
        </div>

        {/* RIGHT: Operational Monitor & Terminal */}
        <div className="lg:col-span-5 space-y-8">

          {/* DIAGONAL MONITOR */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Physical Units</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Real-time OTA Handshake</p>
              </div>
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
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm"
              >
                <Activity className="w-4 h-4" />
                Live Diags
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[400px] custom-scrollbar">
              {controllers.map(controller => (
                <div key={controller.macAddress} className="group p-5 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:border-indigo-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={`w-3.5 h-3.5 rounded-full ${controller.status === 'online' ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-300'}`} />
                        {controller.status === 'online' && (
                          <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-25" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 tracking-tight">{controller.macAddress}</p>
                        <p className="text-[10px] font-mono text-slate-400 font-bold">{controller.ipAddress || 'DISCONNECTED'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {controller.rssi !== undefined && controller.rssi !== null && (
                        <div className={`text-[10px] font-black uppercase ${controller.rssi > -60 ? 'text-indigo-400' : 'text-amber-500'}`}>
                          {controller.rssi} dBm
                        </div>
                      )}
                      <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Signal Strength</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {controller.tables.map(t => (
                      <span key={t.id} className="text-[9px] font-black text-slate-500 bg-white border border-slate-100 px-3 py-1 rounded-full shadow-sm">
                        {t.tableName}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => handleDeploy(controller.tables[0].id)}
                    disabled={!isCompiled || isDeploying !== null || !controller.ipAddress}
                    className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${!isCompiled || !controller.ipAddress
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : isDeploying !== null
                        ? 'bg-amber-100 text-amber-600 animate-pulse'
                        : 'bg-slate-900 border-2 border-slate-900 text-white hover:bg-indigo-600 hover:border-indigo-600 shadow-xl shadow-slate-200'
                      }`}
                  >
                    {isDeploying !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                    {isDeploying !== null ? 'Deploying...' : 'Flash Virtual Firmware'}
                  </button>
                </div>
              ))}
              {controllers.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-slate-300 gap-3 grayscale opacity-40">
                  <Cpu className="w-12 h-12" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No Controllers Detected</p>
                </div>
              )}
            </div>
          </div>

          {/* TERMINAL CONSOLE (PRO-TOOLS LOOK) */}
          <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[300px]">
            <div className="px-8 py-4 bg-slate-800/50 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Matrix Pipeline Console</span>
              </div>
              <button
                onClick={() => setLogs([])}
                className="px-3 py-1 rounded-lg text-[9px] font-black text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all uppercase tracking-widest border border-white/5"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 p-8 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-2.5 custom-scrollbar selection:bg-indigo-500/40">
              {logs.length === 0 && (
                <div className="text-slate-600 font-bold uppercase tracking-widest flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
                  Terminal Idle 0x0
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-slate-600 font-bold opacity-50 shrink-0">[{log.timestamp}]</span>
                  <span className={`${log.type === 'error' ? 'text-rose-400' :
                    log.type === 'success' ? 'text-emerald-400' : 'text-indigo-300'
                    } font-medium`}>
                    <span className="opacity-50 mr-2 font-black">{log.type === 'error' ? 'ERR' : log.type === 'success' ? 'SUC' : 'INF'} &gt;</span>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

        </div>
      </div>

      <div className="pt-8 border-t border-slate-200 mt-8 flex justify-between items-center text-slate-400 text-[8px] font-black uppercase tracking-[0.3em]">
        <span>Secured Hardware Channel</span>
        <span>VOC Virtual Handshake Protocol</span>
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
