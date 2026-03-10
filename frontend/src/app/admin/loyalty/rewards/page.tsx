"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit2, Trash2, Search, Gift, Package, Layers, Info, Filter, MoreVertical, CheckCircle2, XCircle, ShoppingBag, CreditCard, Loader2 } from "lucide-react";
import InputField from "@/components/ui/InputField";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function RewardsAdminPage() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "BILLIARD",
    pointCost: 0,
    stock: 0,
    isActive: true,
    image: "",
    menuItemId: undefined as number | undefined
  });
  const [search, setSearch] = useState("");
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRewards = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/loyalty/admin/rewards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRewards(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/cafe/menu`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenuItems(res.data);
    } catch (err) {
      console.error("Gagal load menu cafe:", err);
    }
  };

  useEffect(() => {
    fetchRewards();
    fetchMenuItems();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingId) {
        await axios.put(`${API_BASE}/loyalty/admin/rewards/${editingId}`, formData, config);
      } else {
        await axios.post(`${API_BASE}/loyalty/admin/rewards`, formData, config);
      }
      setShowModal(false);
      fetchRewards();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Hapus item ini dari katalog reward?")) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE}/loyalty/admin/rewards/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchRewards();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: "", category: "CAFE", pointCost: 0, stock: 0, isActive: true, image: "", menuItemId: undefined });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      category: item.category,
      pointCost: item.pointCost,
      stock: item.stock,
      isActive: item.isActive,
      image: item.image || "",
      menuItemId: item.menuItemId || undefined
    });
    setShowModal(true);
  };

  if (loading) {
    return (
        <div className="flex h-[70vh] items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500 w-12 h-12" />
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-32">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Gift className="w-10 h-10 text-indigo-600" />
            Katalog Reward
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Kelola item penukaran poin untuk meningkatkan loyalitas member.</p>
        </div>
        <button 
            onClick={openAdd} 
            className="group bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl flex items-center gap-3 font-black shadow-xl shadow-indigo-200 transition-all active:scale-95 shrink-0"
        >
          <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-90 transition-transform">
             <Plus className="w-5 h-5" />
          </div>
          TAMBAH REWARD
        </button>
      </header>

      {/* Search & Statistics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <div className="lg:col-span-3 h-full"> 
            <div className="bg-white rounded-3xl p-2 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center relative h-full">
                <Search className="absolute left-6 text-slate-400 w-5 h-5 pointer-events-none"/>
                <input 
                    type="text" 
                    placeholder="Cari nama reward atau kategori..." 
                    className="w-full bg-transparent border-none text-slate-700 rounded-2xl pl-14 pr-6 py-4 font-bold text-lg focus:ring-0 focus:outline-none placeholder:text-slate-300"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 flex flex-col justify-center">
             <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Total Aktif</div>
             <div className="text-3xl font-black">{rewards.filter(r => r.isActive).length} <span className="text-sm opacity-60 font-medium">Items</span></div>
          </div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {rewards
           .filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()))
           .map(reward => (
          <div key={reward.id} className={`group bg-white rounded-[2rem] overflow-hidden border transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${reward.isActive ? "border-slate-100" : "border-rose-100 opacity-70 grayscale-[0.5]"}`}>
             
             <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                {reward.image ? (
                  <img src={reward.image} alt={reward.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
                    <Gift className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                
                {/* Points Badge */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white flex items-center gap-2">
                   <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                   <span className="font-black text-slate-800 text-sm">{reward.pointCost.toLocaleString()} Pts</span>
                </div>

                {/* Category Badge */}
                <div className="absolute bottom-4 left-4 bg-indigo-600/80 backdrop-blur-sm px-3 py-1 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-indigo-400/30">
                   {reward.category === 'BILLIARD' ? <Layers className="w-3 h-3 inline mr-1" /> : <ShoppingBag className="w-3 h-3 inline mr-1" />}
                   {reward.category}
                </div>
             </div>

             <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-black text-slate-800 text-xl leading-tight mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tighter truncate">{reward.name}</h3>
                  <div className="flex items-center gap-2">
                     <div className={`w-1.5 h-1.5 rounded-full ${reward.stock > 0 ? "bg-emerald-500" : "bg-rose-500"}`}></div>
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        STOK: {reward.stock} {reward.category !== 'MERCHANDISE' ? '(SYNC)' : ''}
                     </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => openEdit(reward)} 
                    className="flex-1 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 py-3 rounded-2xl flex items-center justify-center font-black text-xs transition-all border border-slate-100 hover:border-indigo-100"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-2" /> EDIT
                  </button>
                  <button 
                    onClick={() => handleDelete(reward.id)} 
                    className="p-3 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl transition-all border border-rose-100 hover:border-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
             </div>
          </div>
        ))}
        
        {/* Add Shortcut Card */}
        <button 
            onClick={openAdd}
            className="group border-4 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-8 gap-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all min-h-[300px]"
        >
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                <Plus className="w-8 h-8" />
            </div>
            <div className="text-center">
                <p className="font-black text-slate-500 group-hover:text-indigo-600 uppercase tracking-widest text-sm">Reward Baru</p>
                <p className="text-[10px] text-slate-400 font-medium">Tambah pilihan penukaran</p>
            </div>
        </button>
      </div>

      {/* Premium Redemption Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-8 md:p-10 border border-slate-200 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_auto] animate-[gradient_3s_linear_infinite]"></div>
              
              <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">{editingId ? 'Edit' : 'Create'} Reward</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Konfigurasi Katalog Poin Member</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors">
                     <XCircle className="w-6 h-6 text-slate-300" />
                  </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                 <div className="grid grid-cols-1 gap-6">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Kategori Produk</label>
                       <div className="grid grid-cols-3 gap-3">
                           {['CAFE', 'BILLIARD', 'MERCHANDISE'].map(cat => (
                               <button 
                                key={cat}
                                type="button"
                                onClick={() => setFormData({...formData, category: cat, menuItemId: cat === 'MERCHANDISE' ? undefined : formData.menuItemId})}
                                className={`px-2 py-3 rounded-xl text-[10px] font-black transition-all border ${formData.category === cat ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}
                               >
                                   {cat}
                               </button>
                           ))}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                          {formData.category === "MERCHANDISE" ? "Nama Item Baru" : "Pilih dari Menu Aktif"}
                       </label>
                       
                       {formData.category === "MERCHANDISE" ? (
                          <InputField 
                            label="NAMA REWARD"
                            isEditing={true}
                            value={formData.name} 
                            onChange={v => setFormData({...formData, name: v})} 
                            placeholder="Contoh: Gantungan Kunci VOC" 
                          />
                       ) : (
                          <div className="relative group/sel">
                            <select 
                                required 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-indigo-500 focus:outline-none appearance-none transition-all" 
                                value={formData.menuItemId || ""} 
                                onChange={e => {
                                    const selected = menuItems.find(m => m.id === Number(e.target.value));
                                    if (selected) {
                                        setFormData({...formData, menuItemId: selected.id, name: selected.name, image: formData.image || selected.imageUrl || ""});
                                    }
                                }}
                            >
                                <option value="" disabled>-- Hubungkan ke Inventory --</option>
                                {menuItems.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} (HPP: Rp {m.price.toLocaleString()})</option>
                                ))}
                            </select>
                            <MoreVertical className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5" />
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <InputField 
                        label="HARGA POIN (COST)"
                        type="number"
                        value={formData.pointCost} 
                        onChange={v => setFormData({...formData, pointCost: Number(v)})} 
                        isEditing={true}
                    />
                    <InputField 
                        label="URL GAMBAR"
                        type="text"
                        value={formData.image} 
                        onChange={v => setFormData({...formData, image: v})} 
                        isEditing={true}
                        placeholder="https://..."
                    />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                    <div className={formData.category !== 'MERCHANDISE' ? "opacity-40 grayscale pointer-events-none" : ""}>
                        <InputField 
                            label="STOK FISIK MANUAl"
                            type="number"
                            value={formData.stock} 
                            onChange={v => setFormData({...formData, stock: Number(v)})} 
                            isEditing={formData.category === 'MERCHANDISE'}
                        />
                    </div>
                    
                    <div className="flex flex-col justify-center">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Status Publikasi</label>
                        <div 
                            onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                            className="flex items-center gap-3 cursor-pointer group/sw"
                        >
                            <div className={`relative w-12 h-6 rounded-full transition-colors flex items-center px-1 ${formData.isActive ? "bg-emerald-500" : "bg-slate-200"}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.isActive ? "translate-x-6" : "translate-x-0 shadow-sm"}`}></div>
                            </div>
                            <span className={`text-xs font-black uppercase tracking-widest ${formData.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                                {formData.isActive ? "Aktif di Katalog" : "Draft (Hidden)"}
                            </span>
                        </div>
                    </div>
                 </div>

                 <div className="pt-4 flex gap-4">
                    <button 
                        type="button" 
                        onClick={() => setShowModal(false)} 
                        className="flex-1 px-4 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs hover:bg-slate-100 transition-colors uppercase tracking-widest"
                    >
                        Batal
                    </button>
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        {saving ? 'Menyimpan...' : 'SIMPAN REWARD'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
