'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Monitor, Mail, Lock, Power, Shield, Clock,
  DollarSign, Zap, ShieldAlert, Key, Save, Fingerprint, X, Trash2,
  CreditCard, Activity, ShieldCheck, Fingerprint as BioIcon, Smartphone, Cpu
} from 'lucide-react';

interface RegisterModalProps {
  isMounted: boolean;
  showRegisterModal: boolean;
  setShowRegisterModal: (show: boolean) => void;
  resetRegisterForm: () => void;
  editingEmployee: any;
  newEmployee: any;
  setNewEmployee: (emp: any) => void;
  handleRegister: (e: React.FormEvent) => void;
  roles: any[];
  availableShifts: any[];
  categories: any[];
  handleStartBiometricScan: (count?: number) => void;
  isScanningRFID: boolean;
  handleStartRfidScan: () => void;
  handleCancelScan: () => void;
}

export function RegisterModal({
  isMounted,
  showRegisterModal,
  setShowRegisterModal,
  resetRegisterForm,
  editingEmployee,
  newEmployee,
  setNewEmployee,
  handleRegister,
  roles,
  availableShifts,
  categories,
  handleStartBiometricScan,
  isScanningRFID,
  handleStartRfidScan,
  handleCancelScan
}: RegisterModalProps) {
  if (!isMounted || !showRegisterModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={() => {
          setShowRegisterModal(false);
          resetRegisterForm();
        }}
      />

      {/* Modal Container - Responsive Layout */}
      <div className="relative w-full max-w-[1400px] max-h-[95vh] bg-[#F8FAFC] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white mx-2 sm:mx-4">

        {/* Header - Adaptive padding */}
        <div className="px-6 sm:px-10 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-indigo-600 rounded-full hidden sm:block" />
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">User Management</h2>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Identity & System Authorization Matrix</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="bg-emerald-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-2 border border-emerald-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[8px] sm:text-[9px] font-black text-emerald-600 uppercase tracking-widest">Access Granted</span>
            </div>
            <button
              onClick={() => {
                setShowRegisterModal(false);
                resetRegisterForm();
              }}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Content Area - Responsive Columns */}
        <form
          id="employee-form"
          onSubmit={handleRegister}
          className="flex-1 overflow-y-auto p-4 sm:p-10 bg-[#F8FAFC] custom-scrollbar"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">

            {/* COLUMN 1: PERSONNEL PROFILE */}
            <div className="space-y-6">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 h-full">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">Personnel Profile</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Base Identity & Access Credentials</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="text" required placeholder="TIRTA"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        value={newEmployee.name}
                        onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                      <div className="relative">
                        <Monitor className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input
                          type="text" required placeholder="Username"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                          value={newEmployee.username}
                          onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input
                          type="email" required placeholder="Email"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                          value={newEmployee.email}
                          onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No. HP / WhatsApp</label>
                      <span className="text-[7px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest border border-emerald-200">WA Notif Otomatis</span>
                    </div>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="text" placeholder="08999964538"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        value={newEmployee.phone}
                        onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">PIN (6 Digit)</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input
                          type="password" maxLength={6} placeholder="Contoh: 123456"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                          value={newEmployee.pin}
                          onChange={(e) => setNewEmployee({ ...newEmployee, pin: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Login</label>
                      <div className="relative">
                        <Power className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input
                          type="password" placeholder="Biarkan kosong"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                          value={newEmployee.password}
                          onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Jabatan & Hak Akses</label>
                      <div className="relative">
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <select
                          required
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none"
                          value={newEmployee.roleId}
                          onChange={(e) => setNewEmployee({ ...newEmployee, roleId: e.target.value === "" ? "" : +e.target.value })}
                        >
                          <option value="">Pilih Jabatan...</option>
                          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Shift Kerja Utama</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <select
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none"
                          value={newEmployee.baseShift || ""}
                          onChange={(e) => setNewEmployee({ ...newEmployee, baseShift: e.target.value })}
                        >
                          <option value="">Pilih Shift...</option>
                          {availableShifts.map((s) => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 mt-6 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Governance</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="relative group">
                        <label className="text-[8px] font-black text-slate-400 uppercase absolute -top-2 left-4 px-1 bg-white z-10 group-focus-within:text-rose-500 transition-colors">Late Attendance Penalty</label>
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 hover:border-rose-200 transition-all">
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-rose-400 uppercase leading-none mb-1">Per Minute</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-400">Rp</span>
                              <input
                                type="number" className="text-sm font-black text-slate-900 outline-none w-full bg-transparent"
                                value={newEmployee.penaltyLate ? Math.round(Number(newEmployee.penaltyLate)) : ""}
                                onChange={(e) => setNewEmployee({ ...newEmployee, penaltyLate: e.target.value === "" ? "" : +e.target.value })}
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <Clock className="w-4 h-4 text-rose-100" />
                        </div>
                      </div>

                      <div className="relative group">
                        <label className="text-[8px] font-black text-slate-400 uppercase absolute -top-2 left-4 px-1 bg-white z-10 group-focus-within:text-rose-500 transition-colors">Away Status Penalty (Idle)</label>
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 hover:border-rose-200 transition-all">
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-rose-400 uppercase leading-none mb-1">Per Session</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-400">Rp</span>
                              <input
                                type="number" className="text-sm font-black text-slate-900 outline-none w-full bg-transparent"
                                value={newEmployee.penaltyIdle ? Math.round(Number(newEmployee.penaltyIdle)) : ""}
                                onChange={(e) => setNewEmployee({ ...newEmployee, penaltyIdle: e.target.value === "" ? "" : +e.target.value })}
                                placeholder="5000"
                              />
                            </div>
                          </div>
                          <Activity className="w-4 h-4 text-rose-100" />
                        </div>
                      </div>

                      <div className="relative group">
                        <label className="text-[8px] font-black text-slate-400 uppercase absolute -top-2 left-4 px-1 bg-white z-10 group-focus-within:text-indigo-500 transition-colors">Idle Timeout Threshold</label>
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:bg-white hover:border-indigo-200 transition-all">
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Max Inactivity</span>
                            <input
                              type="number" className="text-sm font-black text-slate-900 outline-none w-full bg-transparent"
                              value={newEmployee.idleThreshold || ""}
                              onChange={(e) => setNewEmployee({ ...newEmployee, idleThreshold: e.target.value === "" ? "" : +e.target.value })}
                              placeholder="5"
                            />
                          </div>
                          <span className="text-[7px] font-black text-slate-400 uppercase">Minutes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: FINANCIAL MATRIX */}
            <div className="space-y-6">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 h-full">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">Financial Matrix</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Base Salary & Commissions Architecture</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Gaji Pokok Utama</label>
                    <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 flex items-center gap-4">
                      <span className="text-2xl font-black text-slate-900">Rp</span>
                      <input
                        type="number"
                        className="bg-transparent text-4xl font-black text-slate-900 outline-none w-full tabular-nums"
                        value={newEmployee.basicSalary ? Math.round(Number(newEmployee.basicSalary)) : ""}
                        onChange={(e) => setNewEmployee({ ...newEmployee, basicSalary: e.target.value === "" ? "" : +e.target.value })}
                        placeholder="3000000"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bonus & Service Multipliers</h4>
                    </div>

                    <div className="space-y-5">
                      <div className="relative">
                        <label className="text-[8px] font-black text-slate-400 uppercase absolute -top-2 left-4 px-1 bg-white z-10">Uang Lembur (Rate/Jam)</label>
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4">
                          <input
                            type="number" className="text-sm font-black text-slate-900 outline-none w-full"
                            value={newEmployee.overtimeRate ? Math.round(Number(newEmployee.overtimeRate)) : ""}
                            onChange={(e) => setNewEmployee({ ...newEmployee, overtimeRate: e.target.value === "" ? "" : +e.target.value })}
                            placeholder="19997"
                          />
                          <span className="text-[7px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-md font-black uppercase">Automatic Calc</span>
                        </div>
                      </div>

                      <div className="relative">
                        <label className="text-[8px] font-black text-slate-400 uppercase absolute -top-2 left-4 px-1 bg-white z-10">Insentif Per Meja (Billiard)</label>
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4">
                          <input
                            type="number" className="text-sm font-black text-slate-900 outline-none w-full"
                            value={newEmployee.commissionService ? Math.round(Number(newEmployee.commissionService)) : ""}
                            onChange={(e) => setNewEmployee({ ...newEmployee, commissionService: e.target.value === "" ? "" : +e.target.value })}
                            placeholder="0"
                          />
                          <span className="text-[7px] bg-emerald-50 text-emerald-500 px-2 py-0.5 rounded-md font-black uppercase">Per Session</span>
                        </div>
                      </div>

                      <div className="relative">
                        <label className="text-[8px] font-black text-slate-400 uppercase absolute -top-2 left-4 px-1 bg-white z-10">General Revenue Share</label>
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4">
                          <input
                            type="number" className="text-sm font-black text-slate-900 outline-none w-full"
                            value={newEmployee.commissionSalesPercent ? Math.round(Number(newEmployee.commissionSalesPercent)) : ""}
                            onChange={(e) => setNewEmployee({ ...newEmployee, commissionSalesPercent: e.target.value === "" ? "" : +e.target.value })}
                            placeholder="0"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-[7px] bg-amber-50 text-amber-500 px-2 py-0.5 rounded-md font-black uppercase">Global Rate</span>
                            <span className="text-lg font-black text-slate-300">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Share Breakdown</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {categories
                        .filter((cat) => cat.type === "MENU" || cat.type === "BOTH")
                        .map((cat) => (
                          <div key={cat.id} className="group p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all duration-300">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-[7px] font-black text-slate-400 uppercase truncate" title={cat.name}>{cat.name}</p>
                              <div className="w-1 h-1 bg-slate-200 rounded-full group-hover:bg-indigo-400" />
                            </div>
                            <div className="flex items-center justify-between">
                              <input
                                type="number" className="text-sm font-black text-slate-900 outline-none w-16 bg-transparent"
                                placeholder="0"
                                value={newEmployee.categoryCommissions[cat.name] || ""}
                                onChange={(e) => setNewEmployee({ ...newEmployee, categoryCommissions: { ...newEmployee.categoryCommissions, [cat.name]: e.target.value === "" ? 0 : +e.target.value } })}
                              />
                              <span className="text-[10px] font-black text-slate-300">%</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 3: SECURITY & RFID */}
            <div className="space-y-8">
              {/* Security Protocol Grid */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100">
                    <ShieldAlert className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">Security Protocol</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Multi-Factor Authentication Strategy</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "RFID Key", sub: "Secure NFC Token", icon: CreditCard, value: "RFID_ONLY" },
                    { label: "Biometric", sub: "Fingerprint Scan", icon: BioIcon, value: "FINGERPRINT_ONLY" },
                    { label: "Hybrid", sub: "Flexible Access", icon: Smartphone, value: "HYBRID" },
                    { label: "Dual-Factor", sub: "Max Security", icon: Lock, value: "DUAL" },
                  ].map((item, i) => {
                    const isActive = newEmployee.securityMode === item.value;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNewEmployee({ ...newEmployee, securityMode: item.value })}
                        className={`p-5 rounded-[1.5rem] border text-left transition-all active:scale-95 ${isActive ? "bg-slate-900 border-slate-900 text-white shadow-xl" : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-indigo-100"}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-300"}`} />
                          {isActive && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <h5 className={`text-[10px] font-black uppercase mb-1 ${isActive ? "text-white" : "text-slate-900"}`}>{item.label}</h5>
                        <p className={`text-[7px] font-bold uppercase ${isActive ? "text-slate-400" : "text-slate-400"}`}>{item.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Biometric Registry Card */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                      <BioIcon className={`w-6 h-6 ${newEmployee.isVerified ? "text-emerald-600" : "text-slate-300"}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase">Biometric Registry</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Fingerprint Enrollment & Verification</p>
                    </div>
                  </div>
                  {newEmployee.isVerified && (
                    <div className="bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-emerald-100">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[7px] font-black text-emerald-600 uppercase">Encrypted Bio</span>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                    <Fingerprint className={`w-5 h-5 ${newEmployee.isVerified ? "text-emerald-500" : "text-slate-300"}`} />
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-900 uppercase leading-none">
                        {newEmployee.fingerprintData ? "Biometric Hub" : "No Bio Data Detected"}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {newEmployee.fingerprintData ? (
                          newEmployee.fingerprintData.split(',').filter(Boolean).map((_: string, idx: number) => (
                            <span key={idx} className="text-[7px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 animate-in zoom-in-50 duration-300">
                              ID{idx + 1}
                            </span>
                          ))
                        ) : (
                          <p className="text-[8px] text-slate-400 font-bold uppercase">Please initialize hardware scan</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button" onClick={() => handleStartBiometricScan(1)}
                      className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-95`}
                    >
                      <BioIcon className="w-4 h-4" />
                      Scan 1x
                    </button>
                    <button
                      type="button" onClick={() => handleStartBiometricScan(5)}
                      className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95`}
                    >
                      <Zap className="w-4 h-4 fill-amber-300 stroke-amber-300" />
                      Turbo 5x
                    </button>
                    {newEmployee.isVerified && (
                      <button
                        type="button" onClick={() => setNewEmployee({ ...newEmployee, isVerified: false, fingerprintId: null, fingerprintData: null })}
                        className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* RFID Registry Card */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                      <Zap className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase">RFID Registry</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Encryption & Key Management</p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-emerald-100">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[7px] font-black text-emerald-600 uppercase">Active Link</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                    <span className="text-lg font-black text-slate-300">#</span>
                    <input
                      type="text" className="bg-transparent text-lg font-black text-indigo-600 outline-none w-full tabular-nums"
                      placeholder="5B44F706"
                      value={newEmployee.rfid || ""}
                      onChange={(e) => setNewEmployee({ ...newEmployee, rfid: e.target.value })}
                    />
                    {newEmployee.rfid && (
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter shrink-0">Scanned UID</span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {isScanningRFID ? (
                      <button
                        type="button" onClick={() => handleCancelScan()}
                        className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 bg-rose-500 text-white shadow-xl shadow-rose-200"
                      >
                        <X className="w-4 h-4" />
                        Batal Scan
                      </button>
                    ) : (
                      <button
                        type="button" onClick={() => handleStartRfidScan()}
                        className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Initialize Scan
                      </button>
                    )}
                    <button
                      type="button" onClick={() => setNewEmployee({ ...newEmployee, rfid: "" })}
                      className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>

        {/* Modern Footer - Responsive stack */}
        <div className="px-6 sm:px-10 py-4 sm:py-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          {editingEmployee ? (
            <button
              type="button"
              onClick={() => {
                // Logic deletion handled via direct function call
                // We'll pass this via prop if possible, or use a window event
                const confirmMsg = `Hapus akun ${editingEmployee.name}? Semua data penggajian juga akan terhapus.`;
                if (window.confirm(confirmMsg)) {
                  // Trigger the delete logic from parent
                  (window as any).triggerDeleteEmployee?.();
                }
              }}
              className="w-full sm:w-auto px-6 py-3 bg-rose-50 text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest border border-rose-100 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Terminate Account
            </button>
          ) : <div className="hidden sm:block" />}

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setShowRegisterModal(false);
                resetRegisterForm();
              }}
              className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors py-2"
            >
              Dismiss
            </button>
            <button
              type="submit"
              form="employee-form"
              className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Save className="w-5 h-5" />
              Commit Changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Missing icon from lucide
function RefreshCw({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
