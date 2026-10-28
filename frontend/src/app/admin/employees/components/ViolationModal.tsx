'use client';

import React from 'react';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

export enum ViolationType {
  LATE_LOGIN = 'LATE_LOGIN',
  IDLE_TIMEOUT = 'IDLE_TIMEOUT',
  MANUAL_PENALTY = 'MANUAL_PENALTY'
}

interface ViolationModalProps {
  showViolationModal: boolean;
  setShowViolationModal: (show: boolean) => void;
  manualViolation: {
    userName: string;
    type: ViolationType;
    durationMinutes: number;
    penaltyAmount: number;
    description: string;
  };
  setManualViolation: (violation: any) => void;
  handleLogViolation: (e: React.FormEvent, payloadOverride?: any) => void;
}

export function ViolationModal({
  showViolationModal,
  setShowViolationModal,
  manualViolation,
  setManualViolation,
  handleLogViolation
}: ViolationModalProps) {
  const [isCorrection, setIsCorrection] = React.useState(false);

  if (!showViolationModal) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 lg:p-0">
      <div
        className="absolute inset-0 bg-slate-900/80  animate-in fade-in duration-300"
        onClick={() => setShowViolationModal(false)}
      />
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-md shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] z-10 overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
        <div className="pt-4 pb-4 sm:p-8 px-6 sm:px-8 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden shrink-0" />
          <div className="flex gap-2 mb-6 bg-slate-100/70 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => { setIsCorrection(false); setManualViolation({ ...manualViolation, penaltyAmount: Math.abs(manualViolation.penaltyAmount || 0) }); }}
              className={`flex-1 py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${!isCorrection ? 'bg-white text-rose-600 shadow-sm border border-rose-200 ring-2 ring-rose-500/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Potong Denda</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsCorrection(true); setManualViolation({ ...manualViolation, type: ViolationType.MANUAL_PENALTY, penaltyAmount: Math.abs(manualViolation.penaltyAmount || 0) }); }}
              className={`flex-1 py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${isCorrection ? 'bg-white text-emerald-600 shadow-sm border border-emerald-200 ring-2 ring-emerald-500/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Batalkan / Koreksi</span>
            </button>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isCorrection ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {isCorrection ? <TrendingUp className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <h3 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight">
            {isCorrection ? "Koreksi / Batalkan Denda" : "Beri Sanksi Denda"}
          </h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
            Karyawan: {manualViolation.userName}
          </p>
        </div>

        <form onSubmit={(e) => {
            e.preventDefault();
            // Handle negative values before submitting directly
            let finalViolation = { ...manualViolation };
            if (isCorrection && manualViolation.penaltyAmount > 0) {
              finalViolation.penaltyAmount = -Math.abs(manualViolation.penaltyAmount);
            }
            // Pass the overridden payload directly to avoid React state closure delays
            handleLogViolation(e, finalViolation);
        }} className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-8 space-y-6 pb-[calc(2rem+env(safe-area-inset-bottom,20px))] sm:pb-8">
          
          {/* Live Impact Preview Card */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors ${isCorrection ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-rose-50/80 border-rose-200 text-rose-950'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isCorrection ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {isCorrection ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {isCorrection ? 'DAMPAK: MENGEMBALIKAN GAJI (KOREKSI)' : 'DAMPAK: MEMOTONG GAJI (DENDA)'}
              </p>
              <p className="text-xs font-bold mt-0.5">
                {isCorrection ? (
                  <>
                    Gaji <span className="font-black text-emerald-700">{manualViolation.userName}</span> akan <span className="text-emerald-700 font-black">bertambah +Rp {Math.abs(manualViolation.penaltyAmount || 0).toLocaleString('id-ID')}</span> (mengurangi denda sebelumnya).
                  </>
                ) : (
                  <>
                    Gaji <span className="font-black text-rose-700">{manualViolation.userName}</span> akan <span className="text-rose-700 font-black">dipotong -Rp {Math.abs(manualViolation.penaltyAmount || 0).toLocaleString('id-ID')}</span> sebagai denda pelanggaran.
                  </>
                )}
              </p>
            </div>
          </div>

          {!isCorrection && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                Jenis Pelanggaran
              </label>
              <select
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all appearance-none"
                value={manualViolation.type}
                onChange={(e) =>
                  setManualViolation({
                    ...manualViolation,
                    type: e.target.value as ViolationType,
                  })
                }
              >
                <option value={ViolationType.MANUAL_PENALTY}>
                  PELANGGARAN MANUAL / LAINNYA
                </option>
                <option value={ViolationType.LATE_LOGIN}>
                  TERLAMBAT MASUK KERJA (TIME BASED)
                </option>
                <option value={ViolationType.IDLE_TIMEOUT}>
                  IDLE TIMEOUT (OVERRIDE)
                </option>
              </select>
            </div>
          )}

          {!isCorrection && manualViolation.type === ViolationType.LATE_LOGIN ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                Durasi Terlambat (Menit)
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-rose-600 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all tabular-nums text-xl"
                  value={manualViolation.durationMinutes || ""}
                  onChange={(e) =>
                    setManualViolation({
                      ...manualViolation,
                      durationMinutes: +e.target.value,
                      penaltyAmount: 0,
                    })
                  }
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 pointer-events-none">
                  MENIT
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 italic mt-2">
                * Sistem akan otomatis menghitung denda berdasarkan rate
                per menit yang disetting di profil karyawan.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                {isCorrection ? "Nominal Pengembalian / Koreksi (Rp)" : "Nominal Potongan Denda (Rp)"}
              </label>
              <div className="relative">
                <div className={`absolute left-6 top-1/2 -translate-y-1/2 font-black ${isCorrection ? 'text-emerald-500' : 'text-rose-500'}`}>
                  Rp
                </div>
                <input
                  type="number"
                  required
                  className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 font-bold outline-none focus:ring-4 transition-all tabular-nums text-xl ${isCorrection ? 'text-emerald-600 focus:ring-emerald-500/10 focus:border-emerald-500' : 'text-rose-600 focus:ring-rose-500/10 focus:border-rose-500'}`}
                  value={Math.abs(manualViolation.penaltyAmount || 0) || ""}
                  onChange={(e) =>
                    setManualViolation({
                      ...manualViolation,
                      penaltyAmount: isCorrection ? -Math.abs(+e.target.value) : Math.abs(+e.target.value),
                      durationMinutes: 0,
                    })
                  }
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
              Keterangan / Alasan
            </label>
            <textarea
              required
              placeholder={isCorrection ? "Contoh: Koreksi denda salah input / Pembatalan denda telat shift kemarin" : "Contoh: Datang terlambat / Kerusakan fasilitas / Pelanggaran SOP"}
              className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-medium text-slate-700 outline-none focus:ring-4 transition-all h-24 resize-none ${isCorrection ? 'focus:ring-emerald-500/10 focus:border-emerald-500' : 'focus:ring-rose-500/10 focus:border-rose-500'}`}
              value={manualViolation.description}
              onChange={(e) =>
                setManualViolation({
                  ...manualViolation,
                  description: e.target.value,
                })
              }
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setShowViolationModal(false)}
              className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`flex-[2] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${isCorrection ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'}`}
            >
              {isCorrection ? "KEMBALIKAN GAJI (KOREKSI)" : "POTONG GAJI (DENDA)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
