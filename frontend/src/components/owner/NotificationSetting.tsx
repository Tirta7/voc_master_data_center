import React, { useState } from 'react';
import { registerAndSubscribePush } from '../../utils/pushNotification';
import axios from 'axios'; 
import { BellRing, CheckCircle2, Loader2, XCircle, CreditCard, AlertTriangle, FileCheck, ShieldAlert } from 'lucide-react';

export default function NotificationSetting({ settings, setSettings }: { settings?: any, setSettings?: any }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleEnableNotification = async () => {
    setLoading(true);
    setStatus('idle');
    try {
      await registerAndSubscribePush(axios); 
      setStatus('success');
      setMsg('Push notification berhasil diaktifkan di HP ini!');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMsg(error.message || 'Gagal mengaktifkan notifikasi.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = (key: string) => {
    if (!settings || !setSettings) return;
    setSettings({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-8 border border-slate-100 mt-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none" />
      
      <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Notifikasi Real-time Owner</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Push Notification & Personalisasi</p>
            </div>
          </div>
          
          <p className="text-slate-500 font-medium text-sm mt-2 mb-6 leading-relaxed">
            Aktifkan fitur ini agar perangkat Anda menerima Push Notification seketika dari sistem layaknya aplikasi native iOS/Android. Pilih jenis notifikasi yang ingin Anda terima di bawah ini.
          </p>
          
          <button
            onClick={handleEnableNotification}
            disabled={loading}
            className={`px-6 py-3 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 w-full sm:w-auto ${
              loading 
                ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-500' 
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-200'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
            {loading ? 'Memproses...' : 'Aktifkan Perangkat Ini'}
          </button>

          {status === 'success' && (
            <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 className="w-4 h-4" /> {msg}
            </div>
          )}
          {status === 'error' && (
            <div className="mt-4 flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
              <XCircle className="w-4 h-4" /> {msg}
            </div>
          )}
        </div>

        {settings && (
          <div className="flex-1 w-full bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Pilih Jenis Notifikasi</h4>
            
            {/* Toggle 1: Transactions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Transaksi Pembayaran</p>
                  <p className="text-[10px] text-slate-500 font-medium">Uang masuk / pelunasan kasir</p>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('notifyTransactions')}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 ${settings.notifyTransactions !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300 ${settings.notifyTransactions !== false ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Toggle 2: Low Stock */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-rose-500">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Laporan Stok Kritis</p>
                  <p className="text-[10px] text-slate-500 font-medium">Bahan baku menipis / habis</p>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('notifyLowStock')}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 ${settings.notifyLowStock !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300 ${settings.notifyLowStock !== false ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Toggle 3: Approvals */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-amber-500">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Approval Center</p>
                  <p className="text-[10px] text-slate-500 font-medium">Persetujuan pengeluaran / stok</p>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('notifyApprovals')}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 ${settings.notifyApprovals !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300 ${settings.notifyApprovals !== false ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Toggle 3.5: Cancel Order */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-rose-500">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Pembatalan Pesanan</p>
                  <p className="text-[10px] text-slate-500 font-medium">Request pembatalan item</p>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('notifyCancelOrder')}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 ${settings.notifyCancelOrder !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300 ${settings.notifyCancelOrder !== false ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Toggle 4: New Session */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Sesi Meja Baru</p>
                  <p className="text-[10px] text-slate-500 font-medium">Buka meja billiard & customer</p>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('notifyNewSession')}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 ${settings.notifyNewSession !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300 ${settings.notifyNewSession !== false ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Toggle 5: License Expiry */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-purple-500">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Peringatan Lisensi</p>
                  <p className="text-[10px] text-slate-500 font-medium">Masa aktif lisensi segera habis</p>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('notifyLicenseExpiry')}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 ${settings.notifyLicenseExpiry !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300 ${settings.notifyLicenseExpiry !== false ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
