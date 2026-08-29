'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/utils/urlUtils';
import { useToast } from '@/components/ui/ToastProvider';
import { Plus, Edit, Trash2, Ticket, Check, X, Target, AlertCircle, TrendingUp, TrendingDown, Activity, Info } from 'lucide-react';

const VoucherTypes = [
  { value: 'DISCOUNT_PERCENT', label: 'Diskon Persentase (%)' },
  { value: 'DISCOUNT_FIXED', label: 'Potongan Harga (Rp)' },
  { value: 'FREE_BILLIARD_MINUTES', label: 'Gratis Menit Bermain' },
  { value: 'FREE_ITEM', label: 'Gratis Item (F&B)' },
  { value: 'SPECIAL_PRICE', label: 'Harga Spesial (Flat Rate)' },
  { value: 'BUY_X_GET_Y_BILLIARD', label: 'Beli X Gratis Y Jam' },
  { value: 'BUNDLE_DEAL', label: 'Paket Bundling Rahasia' },
  { value: 'CASHBACK_BALANCE', label: 'Cashback Saldo Member' },
];

export default function VoucherPage() {
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'REGULAR' | 'BOUNCE_BACK'>('REGULAR');
  const [bounceBackConfig, setBounceBackConfig] = useState<any[]>([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState<any>({
    code: '',
    name: '',
    description: '',
    type: 'DISCOUNT_PERCENT',
    discountValue: 0,
    maxDiscountAmount: 0,
    minTransactionAmount: 0,
    usageLimit: '',
    startDate: '',
    endDate: '',
    isActive: true,
    freeMenuItemId: '',
  });

  useEffect(() => {
    fetchVouchers();
    fetchSettings();
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await axios.get(`${API_URL}/cafe/menu?includeInactive=false`);
      setMenuItems(res.data);
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
    }
  };

  // Real-time Validation Engine
  useEffect(() => {
    if (!isModalOpen) return;
    
    const errors: Record<string, string> = {};
    
    if (!formData.code || formData.code.trim() === '') {
      errors.code = 'Kode Voucher wajib diisi.';
    }
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Nama Promo wajib diisi.';
    }

    if (formData.type === 'DISCOUNT_PERCENT' && (!formData.maxDiscountAmount || Number(formData.maxDiscountAmount) <= 0)) {
      errors.maxDiscountAmount = 'Batas maksimal diskon wajib diisi agar tidak menguras margin Anda.';
    }

    if (formData.type === 'FREE_ITEM' && !formData.freeMenuItemId) {
      errors.freeMenuItemId = 'Wajib memilih item spesifik yang akan digratiskan.';
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        errors.endDate = 'Tanggal Berakhir tidak boleh lebih awal dari Tanggal Mulai.';
      }
    }

    // Profit Lock Validation
    if (formData.type === 'DISCOUNT_FIXED' && Number(formData.discountValue) > 0) {
      if (Number(formData.minTransactionAmount) < Number(formData.discountValue) * 3) {
        errors.minTransactionAmount = '⚠️ Risiko Profit: Syarat Min. Transaksi direkomendasikan minimal 3x lipat dari diskon.';
      }
    }

    if (formData.type === 'SPECIAL_PRICE' && (!formData.discountValue || Number(formData.discountValue) <= 0)) {
      errors.discountValue = 'Harga Spesial (Flat Rate) wajib diisi dengan nilai > 0.';
    }

    setFormErrors(errors);
  }, [formData, isModalOpen]);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings`);
      setBounceBackConfig(res.data.bounceBackConfig || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveBounceBackConfig = async () => {
    setIsSavingConfig(true);
    try {
      await axios.patch(`${API_URL}/settings`, { bounceBackConfig });
      showToast('Berhasil', 'Aturan Bounce-Back berhasil disimpan', 'success');
    } catch (err: any) {
      showToast('Gagal', 'Gagal menyimpan aturan Bounce-Back', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleAddTier = () => {
    setBounceBackConfig([...bounceBackConfig, {
      tierName: `Tier ${bounceBackConfig.length + 1}`,
      minAmount: 0,
      maxAmount: 0,
      rewardType: 'FREE_ITEM',
      rewardValue: 1,
      minClaimTransaction: 0,
      expiryDays: 14,
      validStartTime: '',
      validEndTime: ''
    }]);
  };

  const handleRemoveTier = (index: number) => {
    const newConfig = [...bounceBackConfig];
    newConfig.splice(index, 1);
    setBounceBackConfig(newConfig);
  };

  const fetchVouchers = async () => {
    try {
      const res = await axios.get(`${API_URL}/vouchers`);
      setVouchers(res.data);
    } catch (err: any) {
      showToast('Gagal memuat data voucher', err.response?.data?.message || 'Error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (voucher: any = null) => {
    if (voucher) {
      setEditingVoucher(voucher);
      setFormData({
        ...voucher,
        startDate: voucher.startDate ? new Date(voucher.startDate).toISOString().slice(0, 16) : '',
        endDate: voucher.endDate ? new Date(voucher.endDate).toISOString().slice(0, 16) : '',
        discountValue: Number(voucher.discountValue) || 0,
        minTransactionAmount: Number(voucher.minTransactionAmount) || 0,
        usageLimit: voucher.usageLimit || '',
        maxDiscountAmount: voucher.maxDiscountAmount ? Number(voucher.maxDiscountAmount) : '',
        validDays: voucher.validDays || [],
        validStartTime: voucher.validStartTime ? voucher.validStartTime.substring(0, 5) : '',
        validEndTime: voucher.validEndTime ? voucher.validEndTime.substring(0, 5) : '',
        memberId: voucher.memberId || '',
        freeMenuItemId: voucher.freeMenuItemId || '',
        ruleJson: voucher.ruleJson || {},
      });
    } else {
      setEditingVoucher(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        type: 'DISCOUNT_PERCENT',
        discountValue: 0,
        maxDiscountAmount: 0,
        minTransactionAmount: 0,
        usageLimit: '',
        startDate: '',
        endDate: '',
        isActive: true,
        validDays: [],
        validStartTime: '',
        validEndTime: '',
        memberId: '',
        ruleJson: {},
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Object.keys(formErrors).length > 0) {
      // Pick the first error to show in Toast
      const firstErrorKey = Object.keys(formErrors)[0];
      showToast('Validasi Gagal', formErrors[firstErrorKey], 'error');
      return;
    }

    try {
      const payload = { ...formData };
      
      // Sanitasi Tipe Data agar kompatibel dengan PostgreSQL Integer/Decimal
      payload.discountValue = Number(payload.discountValue) || 0;
      payload.minTransactionAmount = Number(payload.minTransactionAmount) || 0;
      
      if (!payload.usageLimit) payload.usageLimit = null;
      else payload.usageLimit = Number(payload.usageLimit);

      if (!payload.maxDiscountAmount) payload.maxDiscountAmount = null;
      if (!payload.freeMenuItemId) payload.freeMenuItemId = null;
      if (!payload.memberId) payload.memberId = null;

      if (!payload.startDate) payload.startDate = null;
      if (!payload.endDate) payload.endDate = null;
      if (!payload.validStartTime) payload.validStartTime = null;
      if (!payload.validEndTime) payload.validEndTime = null;
      
      if (Object.keys(payload.ruleJson || {}).length === 0) payload.ruleJson = null;

      if (editingVoucher) {
        await axios.patch(`${API_URL}/vouchers/${editingVoucher.id}`, payload);
        showToast('Voucher diperbarui', 'Voucher berhasil diperbarui', 'success');
      } else {
        await axios.post(`${API_URL}/vouchers`, payload);
        showToast('Voucher dibuat', 'Voucher berhasil dibuat', 'success');
      }
      setIsModalOpen(false);
      fetchVouchers();
    } catch (err: any) {
      showToast('Gagal menyimpan', err.response?.data?.message || 'Terjadi kesalahan', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus voucher ini?')) return;
    try {
      await axios.delete(`${API_URL}/vouchers/${id}`);
      showToast('Dihapus', 'Voucher dihapus', 'success');
      fetchVouchers();
    } catch (err: any) {
      showToast('Gagal', 'Gagal menghapus voucher', 'error');
    }
  };

  const handleToggleActive = async (id: number, currentIsActive: boolean) => {
    try {
      await axios.patch(`${API_URL}/vouchers/${id}`, { isActive: !currentIsActive });
      showToast('Berhasil', `Voucher ${!currentIsActive ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      fetchVouchers();
    } catch (err: any) {
      showToast('Gagal', 'Gagal mengubah status voucher', 'error');
    }
  };

  const displayedVouchers = vouchers.filter((v) => 
    activeTab === 'REGULAR' ? !v.isBounceBack : v.isBounceBack
  );

  const renderLiveInsight = () => {
    let isSafe = true;
    let riskTitle = 'SANGAT AMAN';
    let riskDesc = 'Strategi promo mengunci margin profit.';
    let simulation = null;

    const discountValue = Number(formData.discountValue) || 0;
    const maxDiscount = Number(formData.maxDiscountAmount) || 0;
    const minTrx = Number(formData.minTransactionAmount) || 0;

    if (formData.type === 'DISCOUNT_FIXED') {
      if (minTrx < discountValue * 3) {
        isSafe = false;
        riskTitle = 'BERISIKO TINGGI';
        riskDesc = 'Syarat belanja terlalu rendah berbanding nilai diskon tunai.';
      }
      if (minTrx >= discountValue) {
        const netRevenue = minTrx - discountValue;
        simulation = { netRevenue, ops: netRevenue * 0.7, inv: netRevenue * 0.3 };
      }
    } else if (formData.type === 'DISCOUNT_PERCENT') {
      if (!maxDiscount || maxDiscount <= 0) {
        isSafe = false;
        riskTitle = 'SANGAT BERBAHAYA';
        riskDesc = 'Tidak ada batas maksimal diskon. Transaksi besar akan membocorkan profit.';
      } else if (minTrx < maxDiscount * 3) {
        isSafe = false;
        riskTitle = 'BERISIKO';
        riskDesc = 'Maksimal diskon terlalu tinggi berbanding Min. Transaksi.';
      } else {
        const netRevenue = minTrx - maxDiscount;
        simulation = { netRevenue, ops: netRevenue * 0.7, inv: netRevenue * 0.3 };
      }
    } else if (formData.type === 'FREE_BILLIARD_MINUTES') {
      if (minTrx < 150000) {
        isSafe = false;
        riskTitle = 'PERINGATAN';
        riskDesc = 'Hadiah waktu meja sebaiknya difokuskan pada transaksi > Rp 150rb (upsell F&B).';
      } else {
        simulation = { netRevenue: minTrx, ops: minTrx * 0.7, inv: minTrx * 0.3, note: '*HPP listrik biliar < Rp 2.500/jam' };
      }
    } else if (formData.type === 'SPECIAL_PRICE') {
      const flatPrice = Number(formData.discountValue) || 0;
      if (flatPrice <= 0) {
        isSafe = false;
        riskTitle = 'BELUM DIISI';
        riskDesc = 'Isi Harga Spesial terlebih dahulu untuk melihat simulasi profit.';
      } else {
        // Estimasi: anggap minimal 1 jam main = tarif normal ~20rb/jam
        const estimatedNormalRate = minTrx > 0 ? minTrx : flatPrice * 1.5;
        const breakEvenHours = flatPrice > 0 ? (flatPrice / 2500).toFixed(1) : '?';
        riskDesc = `Harga flat Rp ${flatPrice.toLocaleString('id-ID')}. Break-even HPP listrik ≥ ${breakEvenHours} jam main.`;
        if (flatPrice < 25000) {
          isSafe = false;
          riskTitle = 'HARGA TERLALU RENDAH';
        } else {
          simulation = { netRevenue: flatPrice, ops: flatPrice * 0.7, inv: flatPrice * 0.3, note: `*Override total tagihan menjadi Rp ${flatPrice.toLocaleString('id-ID')} berapapun durasinya` };
        }
      }
    } else if (formData.type === 'FREE_ITEM') {
      riskTitle = 'AMAN BERSYARAT';
      riskDesc = 'Pastikan HPP Item yang digratiskan tidak melebihi 5% dari Min. Transaksi.';
      if (minTrx > 0) {
        simulation = { netRevenue: minTrx, ops: minTrx * 0.7, inv: minTrx * 0.3 };
      }
    }

    return (
      <div className={`mt-8 p-6 rounded-[2rem] border-2 transition-all duration-500 relative overflow-hidden ${
        isSafe 
          ? 'bg-gradient-to-br from-emerald-50 via-teal-50/30 to-white border-emerald-100 shadow-xl shadow-emerald-100/40' 
          : 'bg-gradient-to-br from-rose-50 via-orange-50/30 to-white border-rose-200 shadow-xl shadow-rose-100/40'
      }`}>
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -mr-20 -mt-20 ${isSafe ? 'bg-emerald-200' : 'bg-rose-200'}`} />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex-1">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] sm:text-sm font-black tracking-widest uppercase mb-3 ${
              isSafe ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {isSafe ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              Status Keamanan Profit
            </div>
            <h4 className={`text-xl font-black tracking-tight mb-1 ${isSafe ? 'text-emerald-900' : 'text-rose-900'}`}>
              {riskTitle}
            </h4>
            <p className={`text-sm font-medium ${isSafe ? 'text-emerald-700/80' : 'text-rose-700/80'}`}>
              {riskDesc}
            </p>
          </div>

          {simulation && (
            <div className="w-full md:w-auto bg-white/60  rounded-2xl p-4 border border-white/40 shadow-sm min-w-[280px]">
              <div className="flex items-center gap-2 mb-3 text-xs sm:text-sm font-black text-slate-500 uppercase tracking-widest">
                <Activity className="w-4 h-4 text-indigo-500" />
                Simulasi Bagi Hasil
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                  <span>Proyeksi Pemasukan</span>
                  <span className="text-emerald-600">Rp {simulation.netRevenue.toLocaleString('id-ID')}</span>
                </div>
                <div className="h-px w-full bg-slate-200/60" />
                <div className="flex justify-between items-center text-xs sm:text-sm font-semibold text-slate-500">
                  <span>Alokasi Operasional (70%)</span>
                  <span className="text-slate-700">Rp {simulation.ops.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm font-semibold text-slate-500">
                  <span>Alokasi Investor (30%)</span>
                  <span className="text-slate-700">Rp {simulation.inv.toLocaleString('id-ID')}</span>
                </div>
                {(simulation as any).note && (
                  <div className="text-[10px] sm:text-sm italic text-slate-400 mt-2">
                    {(simulation as any).note}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden p-0 md:p-6 lg:p-12 text-slate-900">
      {/* Hero Header */}
      <header className="mb-8 md:mb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-0">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-6 lg:p-10 text-white shadow-xl shadow-indigo-200">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20  rounded-2xl flex items-center justify-center shadow-inner">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/60 text-[10px] sm:text-sm font-black uppercase tracking-[0.3em]">Promo & Discount Engine</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Manajemen Voucher</h1>
              <p className="text-white/60 text-sm font-semibold mt-1 max-w-xl leading-relaxed">
                Buat dan kelola kode voucher promo, diskon, dan cashback untuk menarik pelanggan dan meningkatkan omzet dengan strategi bisnis yang cerdas.
              </p>
            </div>
            <button 
              onClick={() => handleOpenModal()} 
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-3.5 rounded-2xl flex items-center gap-2 font-black text-sm uppercase tracking-wider shadow-lg shadow-black/10 active:scale-95 transition-all group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Buat Voucher Baru
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          
          {/* Tabs Section */}
          <div className="flex bg-slate-100/50 p-1 rounded-2xl w-full md:w-fit mb-8 border border-slate-200/60 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button
              onClick={() => { setActiveTab('REGULAR'); setCurrentPage(1); }}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'REGULAR' 
                  ? 'bg-white text-indigo-600 shadow-sm shadow-black/5' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Voucher Reguler
            </button>
            <button
              onClick={() => { setActiveTab('BOUNCE_BACK'); setCurrentPage(1); }}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'BOUNCE_BACK' 
                  ? 'bg-white text-indigo-600 shadow-sm shadow-black/5' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Tracking Bounce-Back
            </button>
          </div>

          {/* Table Header Section */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Ticket className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">
                {activeTab === 'REGULAR' ? 'Daftar Voucher Aktif' : 'Riwayat Promo Struk'}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-400 mt-0.5">
                {activeTab === 'REGULAR' ? 'Semua kode promo yang dibuat manual' : 'Voucher hasil cetak otomatis dari kasir'}
              </p>
            </div>
          </div>

          {activeTab === 'BOUNCE_BACK' && (
            <div className="mb-10 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-[2rem] p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                    <Target className="w-6 h-6 text-indigo-600" />
                    Aturan Hadiah Bounce-Back (Dinamis)
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">
                    Sistem otomatis mencetak voucher berdasarkan total tagihan kasir yang masuk dalam rentang Tier di bawah ini.
                  </p>
                </div>
                <button
                  onClick={handleSaveBounceBackConfig}
                  disabled={isSavingConfig}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSavingConfig ? 'Menyimpan...' : (
                    <>
                      <Check className="w-4 h-4" /> Simpan Konfigurasi
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-4">
                {bounceBackConfig.map((tier, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative group">
                    <button
                      onClick={() => handleRemoveTier(idx)}
                      className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 p-1.5 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest">Nama Tier</label>
                        <input
                          type="text"
                          value={tier.tierName}
                          onChange={(e) => {
                            const newConf = [...bounceBackConfig];
                            newConf[idx].tierName = e.target.value;
                            setBounceBackConfig(newConf);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest">Min. Transaksi (Rp)</label>
                        <input
                          type="number"
                          value={tier.minAmount}
                          onChange={(e) => {
                            const newConf = [...bounceBackConfig];
                            newConf[idx].minAmount = Number(e.target.value);
                            setBounceBackConfig(newConf);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest">Maks. Transaksi (Rp)</label>
                        <input
                          type="number"
                          value={tier.maxAmount}
                          onChange={(e) => {
                            const newConf = [...bounceBackConfig];
                            newConf[idx].maxAmount = Number(e.target.value);
                            setBounceBackConfig(newConf);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest">Masa Berlaku (Hari)</label>
                        <input
                          type="number"
                          value={tier.expiryDays}
                          onChange={(e) => {
                            const newConf = [...bounceBackConfig];
                            newConf[idx].expiryDays = Number(e.target.value);
                            setBounceBackConfig(newConf);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest">Tipe Hadiah</label>
                        <select
                          value={tier.rewardType}
                          onChange={(e) => {
                            const newConf = [...bounceBackConfig];
                            newConf[idx].rewardType = e.target.value;
                            if (e.target.value !== 'FREE_ITEM') {
                                newConf[idx].freeMenuItemId = null;
                            }
                            setBounceBackConfig(newConf);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        >
                          <option value="FREE_ITEM">Gratis Item F&B</option>
                          <option value="DISCOUNT_FIXED">Potongan Harga (Rp)</option>
                          <option value="FREE_BILLIARD_MINUTES">Gratis Menit Bermain</option>
                        </select>
                      </div>

                      {tier.rewardType === 'FREE_ITEM' && (
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] sm:text-sm font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                            Pilih Item Spesifik <AlertCircle className="w-3 h-3" />
                          </label>
                          <select
                            value={tier.freeMenuItemId || ''}
                            onChange={(e) => {
                              const newConf = [...bounceBackConfig];
                              newConf[idx].freeMenuItemId = Number(e.target.value);
                              setBounceBackConfig(newConf);
                            }}
                            className="w-full bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 text-sm font-bold focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none"
                          >
                            <option value="">-- Wajib Pilih Item Gratis --</option>
                            {menuItems.map(item => (
                              <option key={item.id} value={item.id}>{item.name} - Rp {Number(item.price).toLocaleString('id-ID')}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest">
                          {tier.rewardType === 'FREE_ITEM' ? 'Nilai (QTY GRATIS)' : tier.rewardType === 'FREE_BILLIARD_MINUTES' ? 'Nilai (MENIT)' : 'Nilai (RP)'}
                        </label>
                        <input
                          type="number"
                          value={tier.rewardValue}
                          onChange={(e) => {
                            const newConf = [...bounceBackConfig];
                            newConf[idx].rewardValue = e.target.value;
                            setBounceBackConfig(newConf);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest">Syarat Min. Klaim (Rp)</label>
                        <input
                          type="number"
                          value={tier.minClaimTransaction}
                          onChange={(e) => {
                            const newConf = [...bounceBackConfig];
                            newConf[idx].minClaimTransaction = Number(e.target.value);
                            setBounceBackConfig(newConf);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Jam Mulai Berlaku <Info className="w-3 h-3"/></label>
                        <input
                          type="time"
                          value={tier.validStartTime || ''}
                          onChange={(e) => {
                            const newConf = [...bounceBackConfig];
                            newConf[idx].validStartTime = e.target.value;
                            setBounceBackConfig(newConf);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Jam Selesai Berlaku <Info className="w-3 h-3"/></label>
                        <input
                          type="time"
                          value={tier.validEndTime || ''}
                          onChange={(e) => {
                            const newConf = [...bounceBackConfig];
                            newConf[idx].validEndTime = e.target.value;
                            setBounceBackConfig(newConf);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={handleAddTier}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-500 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Tambah Tier Baru
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-slate-50/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-white border-b border-slate-100 text-slate-400 uppercase font-black text-[10px] sm:text-sm tracking-widest">
                <tr>
                  <th className="px-6 py-5 rounded-tl-3xl">Kode Promo</th>
                  <th className="px-6 py-5">Nama Voucher</th>
                  <th className="px-6 py-5">Tipe & Value</th>
                  <th className="px-6 py-5">Kuota Terpakai</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right rounded-tr-3xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {displayedVouchers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((v) => (
                  <tr key={v.id} className="hover:bg-white transition-colors group">
                    <td className="px-6 py-5">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-bold text-xs sm:text-sm rounded-xl group-hover:bg-indigo-100 transition-colors">
                        <Ticket className="w-3.5 h-3.5" />
                        {v.code}
                      </div>
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-800">{v.name}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] sm:text-sm font-black uppercase tracking-wider text-slate-400">
                          {VoucherTypes.find((t) => t.value === v.type)?.label || v.type}
                        </span>
                        <span className="font-bold text-emerald-600">
                          {v.type === 'DISCOUNT_PERCENT' && `${Number(v.discountValue)}%`}
                          {v.type === 'DISCOUNT_FIXED' && `Rp ${Number(v.discountValue).toLocaleString('id-ID')}`}
                          {v.type === 'FREE_BILLIARD_MINUTES' && `${Number(v.discountValue)} ${v.ruleJson?.unit === 'hours' ? 'Jam' : 'Menit'} Gratis`}
                          {v.type === 'FREE_ITEM' && (v.freeMenuItem?.name || `Item #${v.freeMenuItemId}`)}
                          {v.type === 'SPECIAL_PRICE' && <span className="text-violet-600">Flat Rp {Number(v.discountValue).toLocaleString('id-ID')}</span>}
                          {v.type === 'CASHBACK_BALANCE' && `Cashback Rp ${Number(v.discountValue).toLocaleString('id-ID')}`}
                          {!['DISCOUNT_PERCENT','DISCOUNT_FIXED','FREE_BILLIARD_MINUTES','FREE_ITEM','SPECIAL_PRICE','CASHBACK_BALANCE'].includes(v.type) && `Rp ${Number(v.discountValue).toLocaleString('id-ID')}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                          <div 
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: v.usageLimit ? `${Math.min(100, (v.usageCount / v.usageLimit) * 100)}%` : '0%' }}
                          />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-600">
                          {v.usageCount} <span className="text-slate-400">/ {v.usageLimit || '∞'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2 items-start">
                        <button 
                          onClick={() => handleToggleActive(v.id, v.isActive)}
                          className="flex items-center gap-3 group/toggle outline-none focus:outline-none"
                        >
                          <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            v.isActive ? 'bg-indigo-600' : 'bg-slate-200'
                          }`}>
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              v.isActive ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </div>
                          <span className={`text-[10px] sm:text-sm font-black uppercase tracking-widest transition-colors ${
                            v.isActive ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                            {v.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </button>
                        {v.isBounceBack && (
                           v.usageCount >= 1 ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-[10px] sm:text-sm font-black uppercase tracking-widest border border-slate-200">
                              <Check className="w-3 h-3" />
                              Terpakai
                            </div>
                           ) : v.endDate && new Date(v.endDate) < new Date() ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-700 text-[10px] sm:text-sm font-black uppercase tracking-widest border border-rose-100">
                              <X className="w-3 h-3" />
                              Kedaluwarsa
                            </div>
                           ) : null
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right space-x-2">
                      {!v.isBounceBack && (
                        <button onClick={() => handleOpenModal(v)} className="p-2.5 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-xl transition-all shadow-sm group/btn active:scale-95">
                          <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(v.id)} className="p-2.5 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-all shadow-sm group/btn active:scale-95">
                        <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
                {vouchers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Ticket className="w-12 h-12 mb-3 text-slate-200" />
                        <span className="font-bold">Belum ada voucher.</span>
                        <span className="text-xs sm:text-sm">Klik "Buat Voucher Baru" untuk memulai.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {displayedVouchers.length > itemsPerPage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, displayedVouchers.length)} of {displayedVouchers.length}
              </p>
              <div className="flex gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Prev
                </button>
                <button 
                  disabled={currentPage * itemsPerPage >= displayedVouchers.length}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40  animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex justify-between items-center bg-white/90  z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Ticket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">
                    {editingVoucher ? 'Edit Voucher' : 'Buat Voucher Baru'}
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-slate-400">Konfigurasi nilai, syarat, dan batasan promo</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Kode Voucher</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Ticket className="w-4 h-4 text-indigo-400" />
                    </div>
                    <input
                      className={`w-full bg-white border rounded-2xl pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm uppercase font-mono font-bold text-indigo-700 focus:ring-4 outline-none transition-all shadow-sm ${
                        formErrors.code 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/30' 
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                      }`}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="GRANDOPENING"
                    />
                  </div>
                  {formErrors.code && (
                    <div className="mt-1 flex items-start gap-1.5 text-rose-600">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-bold">{formErrors.code}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Nama Promo</label>
                  <input
                    className={`w-full bg-white border rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-slate-800 font-bold focus:ring-4 outline-none transition-all shadow-sm ${
                      formErrors.name 
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/30' 
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                    }`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Diskon Pembukaan"
                  />
                  {formErrors.name && (
                    <div className="mt-1 flex items-start gap-1.5 text-rose-600">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-bold">{formErrors.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Tipe Voucher</label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const newFormData = { ...formData, type: newType };
                    if (newType !== 'FREE_ITEM') {
                        newFormData.freeMenuItemId = '';
                    }
                    setFormData(newFormData);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-slate-800 font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                >
                  {VoucherTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                
                {/* DYNAMIC PROFIT FORMULA TIPS */}
                <div className="mt-4 p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-10 -mt-10" />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-amber-700 font-black mb-3">
                      <div className="p-1.5 bg-amber-200/50 rounded-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      RUMUS BISNIS ANTI-RUGI
                    </div>
                    {formData.type === 'DISCOUNT_PERCENT' && (
                      <div className="text-amber-900/80 leading-relaxed text-[11px] font-medium space-y-2">
                        <p><strong className="text-amber-800">Rumus:</strong> Wajib menetapkan <code>Maks. Diskon</code>. Jika dilepas, transaksi sultan akan menguras profit margin Anda.</p>
                        <p><strong className="text-amber-800">Isian Ideal:</strong> Nilai = 15 (15%), Maks Diskon = 50.000, Min Transaksi = 150.000 (Mancing upsell).</p>
                      </div>
                    )}
                    {formData.type === 'DISCOUNT_FIXED' && (
                      <div className="text-amber-900/80 leading-relaxed text-[11px] font-medium space-y-2">
                        <p><strong className="text-amber-800">Rumus:</strong> <code>Min. Transaksi</code> wajib diset 3x sampai 5x lipat dari besaran <code>Nilai Potongan</code>.</p>
                        <p><strong className="text-amber-800">Isian Ideal:</strong> Nilai = 25.000, Min Transaksi = 100.000, Maks Diskon = (kosongkan).</p>
                      </div>
                    )}
                    {formData.type === 'FREE_BILLIARD_MINUTES' && (
                      <div className="text-amber-900/80 leading-relaxed text-[11px] font-medium space-y-2">
                        <p><strong className="text-amber-800">Rumus:</strong> HPP listrik meja biliar sangat murah. Jadikan voucher ini *bait* untuk menaikkan pesanan F&B.</p>
                        <p><strong className="text-amber-800">Isian Ideal:</strong> Nilai = 60 (60 menit), Min Transaksi = 150.000 (Target jualan F&B).</p>
                      </div>
                    )}
                    {formData.type === 'FREE_ITEM' && (
                      <div className="text-amber-900/80 leading-relaxed text-[11px] font-medium space-y-2">
                        <p><strong className="text-amber-800">Rumus:</strong> Pilih item yang Harga Jualnya mahal tapi HPP-nya sangat murah (Cth: Teh/Kentang).</p>
                        <p><strong className="text-amber-800">Isian Ideal:</strong> Nilai = 1. Tulis di Nama Promo: "Gratis 1 Pitcher Es Lemon Tea".</p>
                      </div>
                    )}
                    {formData.type === 'CASHBACK_BALANCE' && (
                      <div className="text-amber-900/80 leading-relaxed text-[11px] font-medium space-y-2">
                        <p><strong className="text-amber-800">Rumus:</strong> Uang Anda tidak hilang, tapi berubah jadi retensi. Pelanggan pasti kembali!</p>
                        <p><strong className="text-amber-800">Isian Ideal:</strong> Nilai = 15.000, Min Transaksi = 100.000.</p>
                      </div>
                    )}
                    {formData.type === 'SPECIAL_PRICE' && (
                      <div className="text-amber-900/80 leading-relaxed text-[11px] font-medium space-y-2">
                        <p><strong className="text-amber-800">Cara Kerja:</strong> <code>GrandTotal = Harga Flat</code> berapapun durasinya. Berbeda dengan Diskon (pengurangan), ini adalah <em>override assignment</em>.</p>
                        <p><strong className="text-amber-800">Isian Ideal:</strong> Harga Flat = 50.000 ("Main Sepuasnya Weekend Rp 50rb"). Pastikan ≥ HPP listrik × estimasi durasi rata-rata.</p>
                        <p><strong className="text-amber-800">Promo Stacking:</strong> Jika pelanggan adalah Member, diskon loyalty tetap dapat berjalan di atas ini.</p>
                      </div>
                    )}
                    {(formData.type === 'BUY_X_GET_Y_BILLIARD' || formData.type === 'BUNDLE_DEAL') && (
                      <div className="text-amber-900/80 leading-relaxed text-[11px] font-medium space-y-2">
                        <p><strong className="text-amber-800">Rumus:</strong> Bebankan beban promo pada margin operasional meja yang tinggi. Ideal untuk Happy Hour.</p>
                        <p><strong className="text-amber-800">Isian Ideal:</strong> Sesuaikan value dengan jam paket khusus Anda.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-6">
                {formData.type === 'FREE_ITEM' && (
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] sm:text-sm font-black text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                      Pilih Item Spesifik <AlertCircle className="w-3 h-3" />
                    </label>
                    <select
                      value={formData.freeMenuItemId || ''}
                      onChange={(e) => setFormData({ ...formData, freeMenuItemId: Number(e.target.value) })}
                      className={`w-full bg-rose-50 border text-rose-700 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all shadow-sm appearance-none cursor-pointer ${
                        formErrors.freeMenuItemId ? 'border-rose-500' : 'border-rose-200'
                      }`}
                    >
                      <option value="">-- Wajib Pilih Item Gratis --</option>
                      {menuItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name} - Rp {Number(item.price).toLocaleString('id-ID')}</option>
                      ))}
                    </select>
                    {formErrors.freeMenuItemId && (
                      <div className="mt-1 flex items-start gap-1.5 text-rose-600">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] font-bold">{formErrors.freeMenuItemId}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {(formData.type !== 'BUY_X_GET_Y_BILLIARD' && formData.type !== 'BUNDLE_DEAL') ? (
                  <>
                    {/* SPECIAL_PRICE: hanya field Harga Flat */}
                    {formData.type === 'SPECIAL_PRICE' ? (
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] sm:text-sm font-black text-violet-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                          Harga Flat / Special Rate (Rp) <AlertCircle className="w-3 h-3" />
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-4 flex items-center text-violet-400 font-black text-sm pointer-events-none">Rp</span>
                          <input
                            type="number"
                            min="0"
                            className={`w-full bg-violet-50 border rounded-2xl pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm font-black text-violet-900 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none transition-all shadow-sm ${
                              formErrors.discountValue ? 'border-rose-400' : 'border-violet-200'
                            }`}
                            value={formData.discountValue}
                            onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                            placeholder="Contoh: 50000 (Main sepuasnya Rp 50.000)"
                          />
                        </div>
                        {formErrors.discountValue && (
                          <div className="mt-1 flex items-start gap-1.5 text-rose-600">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[11px] font-bold">{formErrors.discountValue}</span>
                          </div>
                        )}
                        <p className="text-[10px] sm:text-sm text-violet-500/70 font-medium ml-1">Total tagihan akan di-override ke nilai ini, berapapun durasi bermainnya.</p>
                      </div>
                    ) : (
                    <>
                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">
                        {formData.type === 'DISCOUNT_PERCENT' ? 'Nilai (%)'
                          : formData.type === 'FREE_ITEM' ? 'Nilai (Qty Gratis)'
                          : formData.type === 'FREE_BILLIARD_MINUTES' ? 'Durasi Gratis'
                          : 'Nilai (Rp)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-white border border-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-black text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                        placeholder={formData.type === 'FREE_BILLIARD_MINUTES' ? 'Contoh: 60 (untuk 1 jam)' : ''}
                      />
                    </div>
                    {/* Satuan Waktu untuk FREE_BILLIARD_MINUTES */}
                    {formData.type === 'FREE_BILLIARD_MINUTES' ? (
                      <div className="space-y-2">
                        <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Satuan Waktu</label>
                        <select
                          value={formData.ruleJson?.unit || 'minutes'}
                          onChange={(e) => setFormData({ ...formData, ruleJson: { ...formData.ruleJson, unit: e.target.value } })}
                          className="w-full bg-white border border-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                        >
                          <option value="minutes">Menit</option>
                          <option value="hours">Jam</option>
                        </select>
                        <p className="text-[10px] sm:text-sm text-slate-400 font-medium ml-1">
                          Durasi gratis: {formData.discountValue || 0} {formData.ruleJson?.unit === 'hours' ? 'jam' : 'menit'}
                          {' '}({formData.ruleJson?.unit === 'hours' ? (Number(formData.discountValue) * 60) : formData.discountValue} menit total)
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                          Maks. Diskon (Rp)
                        </label>
                        <input
                          type="number"
                          min="0"
                          className={`w-full bg-white border rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold text-slate-800 focus:ring-4 outline-none transition-all shadow-sm placeholder:font-normal placeholder:text-slate-300 ${
                            formErrors.maxDiscountAmount 
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/30' 
                              : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                          }`}
                          value={formData.maxDiscountAmount}
                          onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                          placeholder={formData.type === 'DISCOUNT_PERCENT' ? "Wajib diisi (Cth: 50000)" : "Kosongkan jika tak ada batas"}
                        />
                        {formErrors.maxDiscountAmount && (
                          <div className="mt-2 flex items-start gap-1.5 text-rose-600">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="text-[11px] font-bold leading-tight">{formErrors.maxDiscountAmount}</span>
                          </div>
                        )}
                      </div>
                    )}
                    </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-sm font-black text-indigo-500 uppercase tracking-widest ml-1">
                        Syarat Beli Waktu (Menit)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-indigo-50 border border-indigo-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-black text-indigo-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all shadow-sm"
                        value={formData.ruleJson?.buyAmountX || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          ruleJson: { ...formData.ruleJson, buyAmountX: Number(e.target.value) } 
                        })}
                        placeholder="Contoh: 120 (Untuk 2 Jam)"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-sm font-black text-emerald-500 uppercase tracking-widest ml-1">
                        Hadiah Waktu Biliar (Menit)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-black text-emerald-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                        value={formData.ruleJson?.getAmountY || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          ruleJson: { ...formData.ruleJson, getAmountY: Number(e.target.value) },
                          discountValue: Number(e.target.value) // Set discountValue automatically as fallback
                        })}
                        placeholder="Contoh: 60 (Untuk 1 Jam)"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Min. Transaksi (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    className={`w-full bg-white border rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold text-slate-800 focus:ring-4 outline-none transition-all shadow-sm ${
                      formErrors.minTransactionAmount 
                        ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/20 bg-amber-50/30' 
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                    }`}
                    value={formData.minTransactionAmount}
                    onChange={(e) => setFormData({ ...formData, minTransactionAmount: Number(e.target.value) })}
                  />
                  {formErrors.minTransactionAmount && (
                    <div className="mt-2 flex items-start gap-1.5 text-amber-600">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="text-[11px] font-bold leading-tight">{formErrors.minTransactionAmount}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Batas Kuota Promo</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm placeholder:font-normal placeholder:text-slate-300"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder="Kosongkan = Unlimited"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 space-y-6">
                <div className="flex items-center gap-2 text-indigo-700 font-black">
                  <div className="p-1.5 bg-indigo-50 rounded-lg">
                    <Target className="w-4 h-4" />
                  </div>
                  Targeting & Happy Hour
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Voucher Khusus Member Spesifik (Opsional)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm placeholder:font-normal placeholder:text-slate-300"
                    value={formData.memberId}
                    onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                    placeholder="Masukkan ID Member (Kosongkan jika untuk publik)"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Berlaku Pada Hari (Happy Hour)</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 1, label: 'Sen' }, { id: 2, label: 'Sel' }, { id: 3, label: 'Rab' },
                      { id: 4, label: 'Kam' }, { id: 5, label: 'Jum' }, { id: 6, label: 'Sab' }, { id: 7, label: 'Min' }
                    ].map(day => (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          const days = formData.validDays.includes(day.id)
                            ? formData.validDays.filter((d: number) => d !== day.id)
                            : [...formData.validDays, day.id];
                          setFormData({ ...formData, validDays: days });
                        }}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl text-[10px] sm:text-sm font-bold transition-all ${
                          formData.validDays.includes(day.id) 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] sm:text-sm text-slate-400 font-medium ml-1">Kosongkan jika berlaku setiap hari.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Jam Mulai (Happy Hour)</label>
                    <input
                      type="time"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                      value={formData.validStartTime}
                      onChange={(e) => setFormData({ ...formData, validStartTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Jam Berakhir</label>
                    <input
                      type="time"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                      value={formData.validEndTime}
                      onChange={(e) => setFormData({ ...formData, validEndTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Tanggal Mulai</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Tanggal Berakhir</label>
                  <input
                    type="datetime-local"
                    className={`w-full bg-white border rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm ${
                      formErrors.endDate 
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/30' 
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                    }`}
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                  {formErrors.endDate && (
                    <div className="mt-2 flex items-start gap-1.5 text-rose-600">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="text-[11px] font-bold leading-tight">{formErrors.endDate}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-4 cursor-pointer p-4 rounded-2xl border-2 border-indigo-50 bg-indigo-50/30 hover:bg-indigo-50 transition-colors group">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${formData.isActive ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="opacity-0 absolute"
                    />
                    {formData.isActive && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <div className="font-black text-slate-800 text-sm">Aktifkan Voucher Ini</div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">Jika tidak dicentang, voucher akan dibekukan dan tidak bisa diklaim di kasir.</div>
                  </div>
                </label>
              </div>

              {/* PREMIUM LIVE INSIGHT COMPONENT */}
              {renderLiveInsight()}

            {/* Modal Footer */}
            <div className="p-6 mt-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-3.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-2xl font-black text-sm transition-colors"
              >
                Batalkan
              </button>
              <button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black text-sm flex items-center shadow-lg shadow-indigo-200 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4 mr-2" />
                {editingVoucher ? 'Simpan Perubahan' : 'Buat Voucher'}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
