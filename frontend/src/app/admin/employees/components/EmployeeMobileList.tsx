'use client';

import React from 'react';
import { 
  Shield, Activity, Zap, Fingerprint, Lock, Unlock, Mail, TrendingUp, 
  Clock, AlertTriangle, Edit2, Trash2 
} from 'lucide-react';

interface EmployeeMobileListProps {
  filteredEmployees: any[];
  fmt: (n: any) => string;
  handleEditEmployee: (emp: any) => void;
  handleDeleteEmployee: (id: string) => void;
  handleShowViolationModal: (emp: any) => void;
  handleViewDetailedPayroll: (emp: any) => void;
}

export function EmployeeMobileList({
  filteredEmployees,
  fmt,
  handleEditEmployee,
  handleDeleteEmployee,
  handleShowViolationModal,
  handleViewDetailedPayroll
}: EmployeeMobileListProps) {
  return (
    <div className="md:hidden flex flex-col gap-3">
      {filteredEmployees.length === 0 && (
        <div className="py-12 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">
          No matching personnel found
        </div>
      )}
      {filteredEmployees.map((emp) => (
        <div
          key={emp.id}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-lg shadow-inner shrink-0">
                {emp.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-black text-slate-900 leading-tight mb-0.5 truncate">
                  {emp.name}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                    @{emp.username}
                  </p>
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${emp.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : emp.status === "AWAY" ? "bg-amber-500" : "bg-slate-300"}`}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {/* Security Mode Mini Badge */}
              <div className="flex items-center gap-1">
                {emp.securityMode === "RFID_ONLY" && <Zap className="w-3 h-3 text-blue-500" />}
                {emp.securityMode === "FINGERPRINT_ONLY" && <Fingerprint className="w-3 h-3 text-emerald-500" />}
                {emp.securityMode === "HYBRID" && <Activity className="w-3 h-3 text-indigo-500" />}
                {emp.securityMode === "DUAL" && <Shield className="w-3 h-3 text-rose-500" />}
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                  {emp.securityMode?.replace("_ONLY", "") || "N/A"}
                </span>
              </div>
              <div className="flex gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${emp.rfid ? "bg-blue-500" : "bg-slate-200"}`} />
                <div className={`w-1.5 h-1.5 rounded-full ${emp.pin ? "bg-emerald-500" : "bg-slate-200"}`} />
                <div className={`w-1.5 h-1.5 rounded-full ${emp.fingerprintData ? "bg-amber-500" : "bg-slate-200"}`} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2 bg-slate-50/50 rounded-xl border border-slate-100">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Role</p>
              <p className="text-[9px] font-black text-slate-700 uppercase truncate">{emp.role?.name || "Staff"}</p>
            </div>
            <div className="px-3 py-2 bg-slate-50/50 rounded-xl border border-slate-100">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Joined</p>
              <p className="text-[9px] font-black text-slate-700 tabular-nums">
                {new Date(emp.createdAt || emp.joinedAt || new Date()).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-50">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3 text-slate-300" />
                <span className="text-[9px] font-bold text-slate-400 truncate max-w-[100px]">{emp.email || "No Email"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-slate-300" />
                <span className="text-[9px] font-bold text-slate-400 truncate max-w-[100px]">{emp.baseShift || "No Shift"}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-black text-slate-900 tabular-nums leading-none mb-1">
                {fmt(emp.estimatedPayroll || 0)}
              </p>
              <span className="text-[7px] font-black text-emerald-500 uppercase">Live Est.</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { icon: TrendingUp, label: "Audit", color: "text-indigo-600 bg-indigo-50 border-indigo-100", onClick: () => handleViewDetailedPayroll(emp) },
              { icon: AlertTriangle, label: "Fine", color: "text-rose-600 bg-rose-50 border-rose-100", onClick: () => handleShowViolationModal(emp) },
              { icon: Edit2, label: "Edit", color: "text-slate-600 bg-slate-50 border-slate-100", onClick: () => handleEditEmployee(emp) },
              { icon: Trash2, label: "Del", color: "text-slate-600 bg-slate-50 border-slate-100", onClick: () => handleDeleteEmployee(emp.id) },
            ].map((btn, i) => (
              <button
                key={i} onClick={btn.onClick}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border gap-1 active:scale-95 transition-all ${btn.color}`}
              >
                <btn.icon className="w-3.5 h-3.5" />
                <span className="text-[7px] font-black uppercase">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
