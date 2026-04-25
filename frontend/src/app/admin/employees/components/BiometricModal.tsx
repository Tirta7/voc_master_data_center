'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X, Fingerprint, RefreshCw } from 'lucide-react';

interface BiometricModalProps {
  isMounted: boolean;
  showBiometricModal: boolean;
  handleCloseBiometricModal: () => void;
  biometricScanning: boolean;
  biometricData: string | null;
  biometricInstruction: string;
  biometricStep: number;
  handleStartBiometricScan: () => void;
}

export function BiometricModal({
  isMounted,
  showBiometricModal,
  handleCloseBiometricModal,
  biometricScanning,
  biometricData,
  biometricInstruction,
  biometricStep,
  handleStartBiometricScan
}: BiometricModalProps) {
  if (!isMounted || !showBiometricModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[3000000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl"
        onClick={() => {
          if (!biometricScanning) handleCloseBiometricModal();
        }}
      />
      <div className="relative bg-white/5 border border-white/10 w-full max-w-[500px] rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-10 text-center relative">
          <div className="absolute top-0 right-0 p-8">
            <button
              onClick={handleCloseBiometricModal}
              className="p-2 hover:bg-white/10 rounded-xl text-white/40 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-10 inline-flex p-1 bg-white/5 rounded-2xl border border-white/10">
            <div className="px-4 py-2 bg-indigo-500 rounded-xl text-[9px] font-black text-white uppercase tracking-widest">
              Advanced Biometric
            </div>
            <div className="px-4 py-2 text-[9px] font-black text-white/60 uppercase tracking-widest">
              v3.2 Secure
            </div>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight mb-2">
            PEMINDAIAN SIDIK JARI
          </h2>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mb-12">
            Mohon Ikuti Instruksi Visual Di Bawah
          </p>

          {/* Scanner Visualizer */}
          <div className="relative w-48 h-48 mx-auto mb-12">
            <div
              className={`absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl transition-opacity duration-1000 ${
                biometricScanning ? "opacity-100 animate-pulse" : "opacity-0"
              }`}
            />
            <div className="absolute inset-0 border-4 border-white/5 rounded-[3rem]" />
            <div className="absolute inset-4 border-2 border-white/10 border-dashed rounded-[2rem] animate-[spin_20s_linear_infinite]" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Digital DNA Procedural Pattern */}
                {biometricData && (
                  <svg
                    className="absolute inset-0 w-full h-full opacity-40 animate-pulse"
                    viewBox="0 0 100 100"
                  >
                    <defs>
                      <linearGradient
                        id="dnaGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>
                    {/* Procedural lines based on biometric data hash */}
                    {Array.from({ length: 12 }).map((_, i) => {
                      const seed =
                        (biometricData.charCodeAt(i % biometricData.length) ||
                          0) + i;
                      const x1 = 50 + Math.cos(seed * 0.5) * 30;
                      const y1 = 50 + Math.sin(seed * 0.5) * 30;
                      const x2 = 50 + Math.cos(seed * 1.5) * 40;
                      const y2 = 50 + Math.sin(seed * 1.5) * 40;
                      return (
                        <path
                          key={i}
                          d={`M ${x1} ${y1} Q 50 50 ${x2} ${y2}`}
                          stroke="url(#dnaGradient)"
                          strokeWidth="0.5"
                          fill="none"
                          className="animate-in fade-in duration-1000"
                          style={{ animationDelay: `${i * 100}ms` }}
                        />
                      );
                    })}
                  </svg>
                )}

                <Fingerprint
                  className={`w-24 h-24 transition-all duration-700 relative z-10 ${
                    biometricScanning
                      ? "text-indigo-400 scale-110"
                      : biometricData
                      ? "text-emerald-400 rotate-[360deg]"
                      : "text-white/20"
                  }`}
                />

                {/* Laser Scanning Line */}
                {biometricScanning && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                )}
              </div>
            </div>
          </div>

          {/* Instruction Alert */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl mb-10 transition-all duration-500">
            <p
              className={`text-xs font-black uppercase tracking-widest transition-all ${
                biometricScanning
                  ? "text-indigo-400"
                  : biometricData
                  ? "text-emerald-400"
                  : "text-white/60"
              }`}
            >
              {biometricInstruction}
            </p>
            <div className="flex justify-center gap-2 mt-4">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-700 ${
                    s <= biometricStep
                      ? "w-12 bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                      : "w-4 bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Data Preview (Simulated Minutiae) */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-white/30 uppercase mb-1">
                Minutiae Points
              </p>
              <p className="text-xl font-black text-white">
                {biometricData ? "107" : "--"}
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-white/30 uppercase mb-1">
                Quality Index
              </p>
              <p className="text-xl font-black text-emerald-500">
                {biometricData ? "0.94" : "--"}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            {!biometricData ? (
              <>
                <button
                  type="button"
                  onClick={() => handleStartBiometricScan()}
                  disabled={biometricScanning}
                  className={`flex-[2] bg-indigo-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3`}
                >
                  {biometricScanning ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> Scanning...
                    </>
                  ) : (
                    "Mulai Pemindaian"
                  )}
                </button>
                {biometricScanning && (
                  <button
                    type="button"
                    onClick={handleCloseBiometricModal}
                    className="flex-1 bg-rose-500 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-2xl shadow-rose-500/20 active:scale-95"
                  >
                    BATAL
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleCloseBiometricModal}
                className="flex-1 bg-emerald-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-500/20 active:scale-95"
              >
                Gunakan Sidik Jari Ini
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
