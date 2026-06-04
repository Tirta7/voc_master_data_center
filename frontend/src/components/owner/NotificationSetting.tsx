import React, { useState } from 'react';
import { registerAndSubscribePush } from '../../utils/pushNotification';
import axios from 'axios'; 
import { BellRing, CheckCircle2, Loader2, XCircle } from 'lucide-react';

export default function NotificationSetting() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleEnableNotification = async () => {
    setLoading(true);
    setStatus('idle');
    try {
      await registerAndSubscribePush(axios); 
      setStatus('success');
      setMsg('Notifikasi transaksi berhasil diaktifkan di HP ini!');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMsg(error.message || 'Gagal mengaktifkan notifikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-8 border border-slate-100 mt-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none" />
      
      <div className="flex items-start gap-5 relative z-10">
        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
          <BellRing className="w-7 h-7" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Notifikasi Real-time Owner</h3>
          <p className="text-slate-500 font-medium text-sm mt-1 mb-6 leading-relaxed max-w-2xl">
            Aktifkan fitur ini agar perangkat Anda menerima Push Notification seketika dari sistem setiap kali ada pelunasan transaksi pembayaran oleh kasir, layaknya aplikasi native iOS/Android.
          </p>
          
          <button
            onClick={handleEnableNotification}
            disabled={loading}
            className={`px-6 py-3.5 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg active:scale-95 flex items-center gap-3 ${
              loading 
                ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-500' 
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-200'
            }`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BellRing className="w-5 h-5" />}
            {loading ? 'Memproses...' : 'Aktifkan Notifikasi Transaksi'}
          </button>

          {status === 'success' && (
            <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 className="w-5 h-5" /> {msg}
            </div>
          )}
          {status === 'error' && (
            <div className="mt-4 flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-bottom-2">
              <XCircle className="w-5 h-5" /> {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
