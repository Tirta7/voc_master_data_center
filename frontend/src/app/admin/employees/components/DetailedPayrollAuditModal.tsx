'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, DollarSign, Coffee, AlertTriangle, RefreshCw, Zap, Activity } from 'lucide-react';

interface DetailedPayrollAuditModalProps {
  isMounted: boolean;
  showDetailedModal: boolean;
  setShowDetailedModal: (show: boolean) => void;
  selectedDetailedEmployee: any;
  detailedTab: 'status' | 'sales' | 'production' | 'penalties';
  setDetailedTab: (tab: 'status' | 'sales' | 'production' | 'penalties') => void;
  detailedLoading: boolean;
  detailedReport: any;
  fmt: (n: any) => string;
}

export function DetailedPayrollAuditModal({
  isMounted,
  showDetailedModal,
  setShowDetailedModal,
  selectedDetailedEmployee,
  detailedTab,
  setDetailedTab,
  detailedLoading,
  detailedReport,
  fmt
}: DetailedPayrollAuditModalProps) {
  if (!isMounted || !showDetailedModal || !selectedDetailedEmployee) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-2 sm:p-6 overscroll-contain overflow-hidden">
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={() => setShowDetailedModal(false)}
      />
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] animate-in fade-in slide-in-from-bottom-8 duration-300">
        {/* Header - Compact */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-lg">
              {selectedDetailedEmployee.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {selectedDetailedEmployee.name}
              </h2>
              <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest">
                {selectedDetailedEmployee.role?.name || "Staff"} • Financial Audit Ledger
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDetailedModal(false)}
            className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Denser */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex gap-4 no-print overflow-x-auto scrollbar-hide shrink-0">
          {[
            { id: "status", label: "Activity", icon: Clock },
            { id: "sales", label: "Sales", icon: DollarSign },
            { id: "production", label: "Prep", icon: Coffee },
            { id: "penalties", label: "Fines", icon: AlertTriangle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDetailedTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all shrink-0 ${detailedTab === tab.id ? "bg-white text-indigo-600 shadow-sm border border-slate-200 font-black" : "text-slate-400 font-bold hover:text-slate-600"}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-widest">
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Content - Optimized Spacing */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/20">
          {detailedLoading ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-indigo-500/30" />
              <p className="text-[9px] font-black uppercase tracking-widest">Compiling Records...</p>
            </div>
          ) : detailedReport ? (
            <div className="space-y-6">
              {/* Stats Grid - Denser */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Sales Revenue", val: detailedReport.salesLedger.reduce((s: any, i: any) => s + Number(i.total || 0), 0), icon: DollarSign, color: "emerald" },
                  { label: "Prep Commission", val: (detailedReport.productionLedger || []).reduce((s: any, i: any) => s + Number(i.commissionAmount || 0), 0), icon: Zap, color: "amber" },
                  { label: "Penalties", val: detailedReport.penaltyLedger.reduce((s: any, i: any) => s + Number(i.penaltyAmount || 0), 0), icon: AlertTriangle, color: "rose" },
                ].map((stat, i) => (
                  <div key={i} className={`bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm`}>
                    <div className={`w-9 h-9 bg-${stat.color}-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-${stat.color}-600/10`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`text-[8px] font-black text-${stat.color}-600 uppercase tracking-widest leading-none mb-1`}>{stat.label}</p>
                      <p className="text-base font-black text-slate-900 tabular-nums leading-none">{fmt(stat.val)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {detailedTab === "status" && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3">Active</th>
                          <th className="px-5 py-3">Away</th>
                          <th className="px-5 py-3">Offline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(detailedReport.dailySummary || []).map((day: any) => (
                          <tr key={day.date} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-5 py-3">
                              <p className="text-[10px] font-black text-slate-900 leading-none">
                                {new Date(day.date).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" })}
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-[11px] font-black text-emerald-600 tabular-nums leading-none">
                                {Math.floor(day.active / 3600)}h {Math.floor((day.active % 3600) / 60)}m
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-[11px] font-black text-amber-600 tabular-nums leading-none">
                                {Math.floor(day.away / 3600)}h {Math.floor((day.away % 3600) / 60)}m
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-[10px] font-bold text-slate-400 tabular-nums leading-none">
                                {Math.floor(day.offline / 3600)}h {Math.floor((day.offline % 3600) / 60)}m
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Transition Logs</h4>
                    </div>
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-slate-50">
                        {(detailedReport.statusLogs || []).slice(0, 15).map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-5 py-2.5">
                              <p className="text-[10px] font-black text-slate-700 leading-none mb-1">
                                {new Date(log.startedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase">{new Date(log.startedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</p>
                            </td>
                            <td className="px-5 py-2.5">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${log.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : log.status === "AWAY" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <p className="text-[10px] font-black text-slate-900 tabular-nums">
                                {log.durationSeconds > 0 ? `${Math.floor(log.durationSeconds / 60)}m ${log.durationSeconds % 60}s` : "Online"}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detailedTab === "sales" && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-5 py-3">Item</th>
                        <th className="px-5 py-3">Table</th>
                        <th className="px-5 py-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detailedReport.salesLedger || []).map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-indigo-50 rounded flex items-center justify-center text-[9px] font-black text-indigo-600 shrink-0">{entry.itemName.charAt(0)}</div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-black text-slate-900 truncate leading-none mb-1">{entry.itemName}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate">{entry.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{entry.tableName}</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <p className="text-[11px] font-black text-slate-900 tabular-nums leading-none mb-1">{fmt(entry.total)}</p>
                            <p className="text-[8px] font-bold text-emerald-600">+{fmt(entry.commissionAmount)} <span className="text-slate-300">({entry.commissionPercent}%)</span></p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {detailedTab === "production" && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-5 py-3">Prepared Item</th>
                        <th className="px-5 py-3 text-right">Comm.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detailedReport.productionLedger || []).map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-amber-50 rounded flex items-center justify-center text-[9px] font-black text-amber-600 shrink-0">{entry.itemName.charAt(0)}</div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-black text-slate-900 truncate leading-none mb-1">{entry.itemName}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{entry.category} • Qty {entry.quantity}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <p className="text-[11px] font-black text-amber-600 tabular-nums leading-none mb-1">+{fmt(entry.commissionAmount)}</p>
                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">{entry.commissionPercent}% share</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {detailedTab === "penalties" && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-5 py-3">Incident</th>
                        <th className="px-5 py-3">Description</th>
                        <th className="px-5 py-3 text-right">Deduction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detailedReport.penaltyLedger || []).map((v: any) => (
                        <tr key={v.id} className="hover:bg-rose-50/10 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-[10px] font-black text-slate-900 leading-none mb-1 truncate max-w-[80px]">{v.type.replace("_", " ")}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(v.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</p>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{v.description}</p>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <p className="text-[11px] font-black text-rose-600 tabular-nums leading-none">-{fmt(v.penaltyAmount)}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400">
              <Activity className="w-10 h-10 opacity-10 mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest">No Operational Records</p>
            </div>
          )}
        </div>

        {/* Footer - Compact */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50 shrink-0">
          <button
            onClick={() => setShowDetailedModal(false)}
            className="px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all border border-slate-200"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
