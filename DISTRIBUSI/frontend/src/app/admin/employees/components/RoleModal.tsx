'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Shield, Check, RefreshCw, Save } from 'lucide-react';
import { PERMISSION_GROUPS } from "@/constants/permissions";

interface RoleModalProps {
  isMounted: boolean;
  showRoleModal: boolean;
  setShowRoleModal: (show: boolean) => void;
  editingRole: any;
  setEditingRole: (role: any) => void;
  newRole: any;
  setNewRole: (role: any) => void;
  handleCreateRole: (e: React.FormEvent) => void;
  roleLoading: boolean;
  toggleGroup: (groupLabel: string) => void;
  togglePermission: (permId: string) => void;
}

export function RoleModal({
  isMounted,
  showRoleModal,
  setShowRoleModal,
  editingRole,
  setEditingRole,
  newRole,
  setNewRole,
  handleCreateRole,
  roleLoading,
  toggleGroup,
  togglePermission
}: RoleModalProps) {
  if (!isMounted || !showRoleModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 sm:p-6 overscroll-contain overflow-hidden">
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-2xl animate-in fade-in duration-500"
        onClick={() => {
          setShowRoleModal(false);
          setEditingRole(null);
          setNewRole({ name: "", permissions: [] });
        }}
      />
      <form
        onSubmit={handleCreateRole}
        className="relative bg-white w-full max-w-[900px] h-[95vh] sm:h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="p-10 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {editingRole ? "EDIT ROLE" : "KONFIGURASI ROLE BARU"}
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">
              Atur Hak Akses Berdasarkan Matrix Izin
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowRoleModal(false);
              setEditingRole(null);
              setNewRole({ name: "", permissions: [] });
            }}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                Nama Jabatan / Role
              </label>
              <input
                type="text"
                placeholder="Misal: WAITRESS, KASIR, OWNER"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 px-8 text-xl font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                value={newRole.name}
                onChange={(e) =>
                  setNewRole({ ...newRole, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                Tingkat Approval (Level Hierarki)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-32 bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xl font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all tabular-nums text-center"
                  value={newRole.approvalLevel || 0}
                  onChange={(e) =>
                    setNewRole({
                      ...newRole,
                      approvalLevel: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <div className="flex-1 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                  <p className="text-sm font-black text-indigo-900">
                    {newRole.approvalLevel === 0
                      ? "Level 0: Tanpa Akses"
                      : `Level ${newRole.approvalLevel}: Otoritas ke-${newRole.approvalLevel}`}
                  </p>
                  <p className="text-[10px] text-indigo-400/80 font-bold mt-0.5">
                    Bebas diisi angka berapapun. Angka lebih besar =
                    Jabatan lebih tinggi.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                Deskripsi Singkat
              </label>
              <textarea
                placeholder="Misal: Akses penuh untuk manajemen kasir..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-8 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 h-[68px] resize-none"
                value={newRole.description}
                onChange={(e) =>
                  setNewRole({
                    ...newRole,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
              Pilih Template Akses Masal (Presets)
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                {
                  name: "KASIR",
                  label: "Kasir (Full Billiard & Cafe)",
                  color: "bg-emerald-500",
                  perms: [
                    "DASHBOARD_VIEW", "DASHBOARD_TABLE", "START_TABLE", "STOP_TABLE",
                    "CAFE_ORDER", "CAFE_VIEW", "BILLING_VIEW", "PAYMENT_PROCESS",
                    "TABLE_MANAGE", "BILLIARD_PRICING",
                  ],
                },
                {
                  name: "WAITER",
                  label: "Waiter (Order & Table)",
                  color: "bg-indigo-500",
                  perms: [
                    "DASHBOARD_VIEW", "DASHBOARD_TABLE", "START_TABLE", "STOP_TABLE",
                    "CAFE_ORDER", "CAFE_VIEW", "SHIFT_START",
                  ],
                },
                {
                  name: "KITCHEN",
                  label: "Kitchen (KDS Only)",
                  color: "bg-orange-500",
                  perms: ["ACCESS_KDS"],
                },
                {
                  name: "BARTENDER",
                  label: "Bartender (BDS Only)",
                  color: "bg-blue-500",
                  perms: ["ACCESS_BDS"],
                },
                {
                  name: "INVENTORY",
                  label: "Logistik (Gudang)",
                  color: "bg-slate-700",
                  perms: [
                    "INV_VIEW", "INV_MANAGE", "SUPPLIER_MANAGE",
                  ],
                },
              ].map((tmpl) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() =>
                    setNewRole({
                      ...newRole,
                      name: tmpl.name,
                      permissions: tmpl.perms,
                      description: tmpl.label,
                    })
                  }
                  className={`px-5 py-3 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 ${tmpl.color} hover:brightness-110 flex items-center gap-2`}
                >
                  <Zap className="w-3 h-3" />
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <Shield className="w-5 h-5 text-indigo-500" />
              Permission Checklist Matrix
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {PERMISSION_GROUPS.map((group) => {
                const groupPermIds = group.permissions.map((p) => p.id);
                const allInGroupSelected = groupPermIds.every((id) =>
                  newRole.permissions.includes(id),
                );
                const someInGroupSelected = groupPermIds.some((id) =>
                  newRole.permissions.includes(id),
                );

                return (
                  <div
                    key={group.label}
                    className="space-y-4 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200/50 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/50">
                      <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                        {group.label}
                      </h4>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.label)}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${allInGroupSelected ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}`}
                      >
                        {allInGroupSelected
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {group.permissions.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-center gap-3 cursor-pointer group/perm p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100"
                        >
                          <div
                            onClick={() => togglePermission(perm.id)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${newRole.permissions.includes(perm.id) ? "bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-600/30 font-bold text-white" : "bg-white border-slate-200 group-hover/perm:border-indigo-300"}`}
                          >
                            {newRole.permissions.includes(perm.id) && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 group-hover/perm:text-indigo-600 transition-colors uppercase tracking-tight leading-none">
                              {perm.label}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">
                              {perm.id}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                    {someInGroupSelected && !allInGroupSelected && (
                      <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-400/30" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-10 border-t border-slate-100 flex justify-end gap-4 bg-slate-50/50">
            <button
              type="button"
              onClick={() => {
                setShowRoleModal(false);
                setEditingRole(null);
                setNewRole({ name: "", permissions: [] });
              }}
              className="px-8 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                roleLoading ||
                !newRole.name ||
                newRole.permissions.length === 0
              }
              className={`bg-indigo-600 text-white px-10 py-3 rounded-xl font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {roleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingRole
                ? "SIMPAN PERUBAHAN"
                : "BUAT ROLE SEKARANG"}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
}
