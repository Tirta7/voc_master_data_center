'use client';

import React from 'react';
import { 
  Mail, Clock, Zap, Fingerprint, Activity, Shield, Lock, Unlock, Calendar, 
  TrendingUp, AlertTriangle, MoreVertical, Edit2, Trash2 
} from 'lucide-react';

interface EmployeeTableProps {
  filteredEmployees: any[];
  fmt: (n: any) => string;
  handleEditEmployee: (emp: any) => void;
  handleDeleteEmployee: (id: string) => void;
  handleShowViolationModal: (emp: any) => void;
  handleViewDetailedPayroll: (emp: any) => void;
}

export function EmployeeTable({
  filteredEmployees,
  fmt,
  handleEditEmployee,
  handleDeleteEmployee,
  handleShowViolationModal,
  handleViewDetailedPayroll
}: EmployeeTableProps) {
  return (
    <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50/50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Personnel Details
            </th>
            <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Access & Security Matrix
            </th>
            <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
              Status
            </th>
            <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
              Est. Payroll
            </th>
            <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredEmployees.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="py-12 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]"
              >
                No matching records found
              </td>
            </tr>
          )}
          {filteredEmployees.map((emp) => (
            <tr
              key={emp.id}
              className="hover:bg-slate-50/80 transition-colors group"
            >
              <td className="px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black text-sm shadow-inner shrink-0">
                    {emp.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 leading-none mb-1.5 truncate">
                      {emp.name}
                    </p>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight shrink-0">
                        @{emp.username}
                      </p>
                      {emp.baseShift && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-slate-300 shrink-0" />
                          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold truncate">
                            <Clock className="w-2.5 h-2.5" />
                            {emp.baseShift}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-3.5">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight">
                    {emp.role?.name || "N/A"}
                  </span>

                  {/* Security Mode Indicators - Denser */}
                  <div className="flex items-center gap-1">
                    {emp.securityMode === "RFID_ONLY" && (
                      <Zap className="w-3 h-3 text-blue-500" />
                    )}
                    {emp.securityMode === "FINGERPRINT_ONLY" && (
                      <Fingerprint className="w-3 h-3 text-emerald-500" />
                    )}
                    {emp.securityMode === "HYBRID" && (
                      <Activity className="w-3 h-3 text-indigo-500" />
                    )}
                    {emp.securityMode === "DUAL" && (
                      <Shield className="w-3 h-3 text-rose-500" />
                    )}
                  </div>

                  {/* Registry Status with IDs */}
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-1.5 ml-1">
                    {emp.rfid ? (
                      <span className="text-[7px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100" title={`UID: ${emp.rfid}`}>
                        RF:{emp.rfid.slice(-4).toUpperCase()}
                      </span>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200" title="No RFID" />
                    )}

                    {emp.pin ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="PIN Active" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200" title="No PIN" />
                    )}

                    {emp.fingerprintData ? (
                      <div className="flex flex-wrap gap-1">
                        {emp.fingerprintData.split(',').filter(Boolean).map((_: string, idx: number) => (
                          <span 
                            key={idx} 
                            className="text-[7px] font-black bg-emerald-50 text-emerald-600 px-1 py-0.5 rounded border border-emerald-100"
                          >
                            ID{idx + 1}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200" title="No Bio" />
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-3.5">
                <div className="flex justify-center">
                  <div
                    className={`px-3 py-1 rounded-full flex items-center gap-1.5 border transition-all ${
                      emp.status === "ACTIVE"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                        : emp.status === "AWAY"
                          ? "bg-amber-50 border-amber-100 text-amber-600"
                          : "bg-slate-50 border-slate-100 text-slate-400"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${emp.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : emp.status === "AWAY" ? "bg-amber-500" : "bg-slate-300"}`} />
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      {emp.status}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-3.5 text-right">
                <div className="flex flex-col items-end">
                  <p className="text-xs font-black text-slate-900 tabular-nums">
                    {fmt(emp.estimatedPayroll || 0)}
                  </p>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Live Est.</span>
                </div>
              </td>
              <td className="px-6 py-3.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  <div className="relative group/actions">
                    <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-all text-slate-400">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-[100] py-1 overflow-hidden">
                      <button
                        onClick={() => handleViewDetailedPayroll(emp)}
                        className="w-full px-4 py-2 text-left hover:bg-indigo-50 text-[10px] font-bold text-slate-600 flex items-center gap-2 transition-colors"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                        Audit Ledger
                      </button>
                      <button
                        onClick={() => handleShowViolationModal(emp)}
                        className="w-full px-4 py-2 text-left hover:bg-rose-50 text-[10px] font-bold text-slate-600 flex items-center gap-2 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        Log Violation
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditEmployee(emp)}
                    className="p-1.5 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="p-1.5 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
