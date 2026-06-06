'use client';

import React, { useState } from 'react';
import {
  Check, ChevronRight, Zap, Cpu, Wifi, Smartphone, Users,
  Lightbulb, BookOpen, Receipt, Gift, ArrowRight, ShieldCheck, Database
} from 'lucide-react';
import Head from 'next/head';

export default function PromoLandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // Harga Dummy (bisa diubah nanti)
  const pricing = {
    basic: { monthly: 249000, yearly: 199000 },
    pro: { monthly: 499000, yearly: 399000 },
    expert: { monthly: 999000, yearly: 799000 }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-indigo-500/30 overflow-x-hidden font-sans">
      <Head>
        <title>VOC Billiard Management System | Aplikasi Super Canggih</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      {/* Global CSS for animations & gradient text */}
      <style>{`
        .text-gradient {
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      {/* Navigation (Transparent) */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-[calc(env(safe-area-inset-top,0)+16px)] pb-4 px-6 md:px-12 backdrop-blur-md bg-[#020617]/50 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xl">V</div>
            <span className="font-bold text-lg text-white tracking-tight">VOC System</span>
          </div>
          <button className="hidden md:flex items-center gap-2 text-sm font-semibold bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full transition-all text-white border border-white/5 backdrop-blur-lg">
            Masuk ke Dasbor
            <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-[calc(env(safe-area-inset-top,0)+120px)] pb-20 px-6 md:px-12 overflow-hidden min-h-[90vh] flex items-center">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[1000px] h-[600px] md:h-[1000px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 w-fit mx-auto lg:mx-0">
              <span className="flex w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Aplikasi Billiard & Cafe #1</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Manajemen Cerdas,<br />
              <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 text-gradient">Laba Meningkat Tajam.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Tinggalkan cara manual. VOC System mengotomatisasi pemotongan stok bahan baku, menghubungkan pesanan waiter langsung ke dapur, dan ditenagai kecerdasan buatan (AI) terintegrasi secara *Real-Time*.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105">
                Lihat Paket Harga
              </button>
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all border border-slate-700">
                Hubungi Sales
              </button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none animate-float hidden md:block">
            {/* Abstrak Mockup Kaca */}
            <div className="relative rounded-[2.5rem] bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 p-6 shadow-2xl aspect-4/3 overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 to-purple-500/10" />
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="grid grid-cols-3 gap-4 h-full">
                <div className="col-span-2 space-y-4">
                  <div className="h-12 rounded-xl bg-slate-800/50 border border-slate-700/50 animate-pulse" />
                  <div className="h-32 rounded-xl bg-slate-800/50 border border-slate-700/50 animate-pulse delay-75" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 rounded-xl bg-indigo-500/20 border border-indigo-500/30 animate-pulse delay-150" />
                    <div className="h-20 rounded-xl bg-slate-800/50 border border-slate-700/50 animate-pulse delay-200" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-full rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col justify-end p-4">
                     <div className="h-8 w-8 rounded-full bg-purple-500/40 mb-2 animate-bounce" />
                     <div className="h-2 w-full bg-purple-500/30 rounded-full mb-1" />
                     <div className="h-2 w-2/3 bg-purple-500/30 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Badges */}
            <div className="absolute -right-12 top-20 bg-slate-900/80 backdrop-blur-xl border border-green-500/30 p-4 rounded-2xl flex items-center gap-4 shadow-xl translate-y-8 animate-[float_5s_ease-in-out_infinite_reverse]">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold">Stok Bahan Baku</p>
                <p className="text-sm text-white font-bold">-2 Porsi (Otomatis)</p>
              </div>
            </div>

            <div className="absolute -left-12 bottom-20 bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 p-4 rounded-2xl flex items-center gap-4 shadow-xl animate-[float_7s_ease-in-out_infinite]">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Wifi size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold">Real-Time Sync</p>
                <p className="text-sm text-white font-bold">0.02ms Latency</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION (Bento Grid) */}
      <section className="py-24 px-6 md:px-12 bg-[#020617] relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Fitur Super Canggih <br className="hidden md:block"/>Bukan Sekadar Kasir Biasa.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Dirancang untuk kecepatan, akurasi, dan kontrol penuh. Semua perangkat dan divisi dalam bisnis Anda terhubung layaknya satu otak cerdas.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Fitur 1 */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 hover:bg-slate-800/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <Database size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Auto-Cut Stok Resep</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tidak ada lagi pembukuan manual. Setiap Nasi Goreng yang terjual otomatis memotong gramasi beras, telur, dan bumbu di gudang secara presisi.
              </p>
            </div>

            {/* Fitur 2 */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 hover:bg-slate-800/50 transition-colors group lg:col-span-2 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <Smartphone size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Orderan Waiter &gt; Dapur (Seamless)</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                  Pelayan mencatat pesanan via tablet, dan *BOOM*! Tiket pesanan langsung tercetak di Dapur atau layar Bartender secara *real-time*. Memangkas waktu bolak-balik hingga 80%.
                </p>
              </div>
            </div>

            {/* Fitur 3 */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 hover:bg-slate-800/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <Cpu size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI Assistant Terintegrasi</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Asisten kecerdasan buatan akan merekomendasikan *combo* menu terlaris, menganalisa jam sibuk, dan menyusun laporan untuk strategi promosi Anda.
              </p>
            </div>

            {/* Fitur 4 */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 hover:bg-slate-800/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                <Lightbulb size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">IoT Control Lampu Meja</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Billing waktu mulai? Lampu meja otomatis menyala. Waktu habis? Lampu mati. Kendali kelistrikan cerdas mencegah kecurangan 100%.
              </p>
            </div>

            {/* Fitur 5 */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 hover:bg-slate-800/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Gift size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Kelola Voucher Taktis</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Edukasi pasar Anda. Berikan voucher cerdas (*bundling* / minimal belanja) daripada merusak harga pasar (banting harga). Naikkan retensi pelanggan dengan elegan.
              </p>
            </div>

            {/* Fitur 6 (Grid Full) */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 hover:bg-slate-800/50 transition-colors group lg:col-span-3">
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400"><Users size={20}/></div>
                    <h4 className="font-bold text-white">Membership QR</h4>
                  </div>
                  <p className="text-sm text-slate-400">Sistem member digital berbasis QR. Cukup scan di HP kasir, data pelanggan & poin diskon langsung terdeteksi otomatis.</p>
                </div>
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400"><BookOpen size={20}/></div>
                    <h4 className="font-bold text-white">Buku Besar (Ledger)</h4>
                  </div>
                  <p className="text-sm text-slate-400">Pembukuan otomatis, transparan, dan detail. Semua arus kas masuk & keluar, shift kasir, terekam secara aman dan akuntabel.</p>
                </div>
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400"><Receipt size={20}/></div>
                    <h4 className="font-bold text-white">Multi-Hardware</h4>
                  </div>
                  <p className="text-sm text-slate-400">Terintegrasi penuh dengan Push Notifikasi (PWA), Printer Bluetooth Thermal untuk Waiter, dan USB Printer untuk Kasir.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="py-24 px-6 md:px-12 bg-[#020617] relative z-20">
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-slate-700 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Pilih Skala Bisnis Anda</h2>
            <p className="text-slate-400 max-w-2xl mx-auto mb-10">Beralihlah ke masa depan manajemen Billiard & Cafe dengan investasi yang masuk akal dan transparan.</p>
            
            {/* Toggle Billing */}
            <div className="inline-flex bg-slate-900 border border-slate-800 rounded-full p-1 relative">
              <button 
                onClick={() => setBillingCycle('monthly')}
                className={`relative z-10 px-6 py-2.5 text-sm font-bold rounded-full transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Bulanan
              </button>
              <button 
                onClick={() => setBillingCycle('yearly')}
                className={`relative z-10 px-6 py-2.5 text-sm font-bold rounded-full transition-colors ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Tahunan <span className="ml-1 text-emerald-400 text-[10px] uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full">Hemat 20%</span>
              </button>
              {/* Highlight Background */}
              <div 
                className={`absolute top-1 bottom-1 w-[100px] bg-indigo-600 rounded-full transition-transform duration-300 ease-out ${billingCycle === 'yearly' ? 'translate-x-[96px] w-[140px]' : 'translate-x-0'}`}
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
            
            {/* BASIC */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 hover:border-slate-700 transition-colors">
              <h3 className="text-xl font-bold text-white mb-2">Basic</h3>
              <p className="text-slate-400 text-sm h-10">Sempurna untuk merintis usaha billiard kecil tanpa ribet.</p>
              
              <div className="my-6">
                <p className="text-slate-500 text-sm line-through mb-1">{formatRupiah(pricing.basic.monthly)}/bln</p>
                <div className="flex items-baseline gap-1">
                  <h4 className="text-4xl font-extrabold text-white">{formatRupiah(billingCycle === 'yearly' ? pricing.basic.yearly : pricing.basic.monthly)}</h4>
                  <span className="text-slate-400">/bln</span>
                </div>
              </div>

              <button className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors mb-8">
                Pilih Basic
              </button>

              <div className="space-y-4">
                <p className="text-sm font-bold text-white mb-4">Fitur Utama:</p>
                {[
                  'Manajemen Maksimal 5 Meja',
                  'Aplikasi Kasir (POS) Standar',
                  'Cetak Struk Thermal (USB)',
                  'Laporan Shift Kasir Dasar',
                  'Support Email'
                ].map((ftr, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="mt-0.5 p-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-sm text-slate-300">{ftr}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PRO (Highlighted) */}
            <div className="bg-linear-to-b from-indigo-900/80 to-slate-900/80 border border-indigo-500/40 rounded-3xl p-8 relative transform lg:-translate-y-4 shadow-2xl shadow-indigo-900/20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-linear-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full shadow-lg">
                Paling Populer
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-indigo-200 text-sm h-10">Cocok untuk bisnis menengah yang butuh integrasi Cafe & Dapur.</p>
              
              <div className="my-6">
                <p className="text-indigo-300/60 text-sm line-through mb-1">{formatRupiah(pricing.pro.monthly)}/bln</p>
                <div className="flex items-baseline gap-1">
                  <h4 className="text-5xl font-extrabold text-white">{formatRupiah(billingCycle === 'yearly' ? pricing.pro.yearly : pricing.pro.monthly)}</h4>
                  <span className="text-indigo-200">/bln</span>
                </div>
              </div>

              <button className="w-full py-4 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] mb-8">
                Pilih Pro
              </button>

              <div className="space-y-4">
                <p className="text-sm font-bold text-white mb-4">Semua fitur Basic, plus:</p>
                {[
                  'Manajemen Hingga 15 Meja',
                  'Integrasi Dapur & Waiter PWA',
                  'Cetak Struk Jarak Jauh (Bluetooth)',
                  'Auto-Cut Stok Bahan Baku',
                  'Membership QR Code',
                  'Push Notifikasi Transaksi'
                ].map((ftr, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="mt-0.5 p-0.5 rounded-full bg-indigo-500 text-white">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-sm text-indigo-100">{ftr}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* EXPERT */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 hover:border-slate-700 transition-colors">
              <h3 className="text-xl font-bold text-white mb-2">Expert</h3>
              <p className="text-slate-400 text-sm h-10">Solusi pamungkas untuk arena besar dengan kecerdasan IoT & AI.</p>
              
              <div className="my-6">
                <p className="text-slate-500 text-sm line-through mb-1">{formatRupiah(pricing.expert.monthly)}/bln</p>
                <div className="flex items-baseline gap-1">
                  <h4 className="text-4xl font-extrabold text-white">{formatRupiah(billingCycle === 'yearly' ? pricing.expert.yearly : pricing.expert.monthly)}</h4>
                  <span className="text-slate-400">/bln</span>
                </div>
              </div>

              <button className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors mb-8">
                Pilih Expert
              </button>

              <div className="space-y-4">
                <p className="text-sm font-bold text-white mb-4">Semua fitur Pro, plus:</p>
                {[
                  'Unlimited Meja Billiard',
                  'IoT Control Lampu Meja Otomatis',
                  'AI Assistant (Combo Suggestion)',
                  'Buku Besar (Ledger) Akuntansi',
                  'Manajemen Kelola Voucher Taktis',
                  'Prioritas Support 24/7'
                ].map((ftr, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="mt-0.5 p-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-sm text-slate-300">{ftr}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER / CTA */}
      <footer className="border-t border-slate-800 bg-[#020617] pt-16 pb-8 px-6 md:px-12 relative z-20">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-6">Siap Mengubah Cara Anda Berbisnis?</h2>
          <p className="text-slate-400 mb-8">Berhentilah menebak-nebak pembukuan dan stok Anda. Percayakan pada sistem cerdas kami dan fokuslah mengembangkan arena Billiard Anda.</p>
          <button className="px-8 py-4 rounded-full bg-white text-slate-900 font-bold hover:bg-slate-200 transition-colors shadow-lg">
            Mulai Uji Coba Gratis 14 Hari
          </button>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center font-bold text-white text-xs">V</div>
             <span>&copy; 2026 VOC Billiard System. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a>
            <a href="#" className="hover:text-white transition-colors">Syarat Ketentuan</a>
            <a href="#" className="hover:text-white transition-colors">Bantuan</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
