'use client';

import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';
import { formatRupiah as fmt } from '@/utils/formatUtils';
import { Calendar as CalendarIcon, Clock, Truck, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export function InstallmentCalendarView() {
    const { data: installments, isLoading: loadingInst } = useSWR<any[]>('/inventory/installments/all', fetcher);
    const { data: ingredients, isLoading: loadingIng } = useSWR<any[]>('/inventory/ingredients', fetcher);
    const { data: menuItems, isLoading: loadingMenu } = useSWR<any[]>('/cafe/menu?includeInactive=true', fetcher);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const isLoading = loadingInst || loadingIng || loadingMenu;

    if (isLoading) return <div className="p-10 text-center font-black text-slate-400 animate-pulse uppercase tracking-widest text-xs">Menyusun Kalender Kewajiban...</div>;

    const eventsByDate = (installments || []).reduce((acc: any, curr: any) => {
        const date = dayjs(curr.dueDate).format('YYYY-MM-DD');
        if (!acc[date]) acc[date] = { installments: [], expiry: [] };
        acc[date].installments.push(curr);
        return acc;
    }, {});

    (ingredients || []).forEach((ing: any) => {
        if (ing.expiryDate) {
            const date = dayjs(ing.expiryDate).format('YYYY-MM-DD');
            if (!eventsByDate[date]) eventsByDate[date] = { installments: [], expiry: [] };
            eventsByDate[date].expiry.push({ ...ing, type: 'INGREDIENT' });
        }
    });

    (menuItems || []).forEach((menu: any) => {
        if (menu.expiryDate) {
            const date = dayjs(menu.expiryDate).format('YYYY-MM-DD');
            if (!eventsByDate[date]) eventsByDate[date] = { installments: [], expiry: [] };
            eventsByDate[date].expiry.push({ ...menu, type: 'MENU' });
        }
    });

    const tileContent = ({ date, view }: { date: Date, view: string }) => {
        if (view === 'month') {
            const dateStr = dayjs(date).format('YYYY-MM-DD');
            const data = eventsByDate[dateStr];
            if (data) {
                return (
                    <div className="flex justify-center gap-1 mt-1">
                        {data.installments.length > 0 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                        )}
                        {data.expiry.length > 0 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                        )}
                    </div>
                );
            }
        }
        return null;
    };

    const selectedDateStr = dayjs(selectedDate).format('YYYY-MM-DD');
    const selectedEvents = eventsByDate[selectedDateStr] || { installments: [], expiry: [] };

    return (
        <div className="p-8 lg:p-12 space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-3">
                        Kalender <span className="text-rose-600">Kontrol</span> <span className="text-amber-500">Inventory</span>
                    </h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">Monitor Jatuh Tempo Cicilan & Tanggal Kedaluwarsa</p>
                </div>
                <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktivitas Mendatang</p>
                        <p className="text-xl font-black text-slate-900 tracking-tight leading-none">
                            {(installments?.length || 0) + (ingredients?.filter((i:any) => i.expiryDate).length || 0)} <span className="text-xs text-slate-400 ml-1 uppercase">Item</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Left: Calendar */}
                <div className="xl:col-span-7 bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-50">
                    <style>{`
                        .react-calendar {
                            width: 100%;
                            border: none;
                            font-family: inherit;
                        }
                        .react-calendar__navigation button {
                            font-weight: 900;
                            text-transform: uppercase;
                            font-size: 0.8rem;
                            letter-spacing: 0.1em;
                            color: #6366f1;
                        }
                        .react-calendar__month-view__weekdays__weekday {
                            font-weight: 900;
                            text-transform: uppercase;
                            font-size: 0.6rem;
                            letter-spacing: 0.2em;
                            color: #94a3b8;
                            padding-bottom: 1rem;
                        }
                        .react-calendar__tile {
                            padding: 1.5rem 0.5rem;
                            border-radius: 1.5rem;
                            font-weight: 700;
                            color: #1e293b;
                            transition: all 0.3s;
                        }
                        .react-calendar__tile--now {
                            background: #f1f5f9 !important;
                            color: #6366f1 !important;
                        }
                        .react-calendar__tile--active {
                            background: #1e293b !important;
                            color: white !important;
                            box-shadow: 0 10px 25px -5px rgba(30, 41, 59, 0.4);
                        }
                        .react-calendar__tile:hover {
                            background: #f8fafc;
                        }
                        .react-calendar__month-view__days__day--neighboringMonth {
                            color: #cbd5e1;
                        }
                    `}</style>
                    <Calendar
                        onChange={(val: any) => setSelectedDate(val)}
                        value={selectedDate}
                        tileContent={tileContent}
                        className="mx-auto"
                    />
                </div>

                {/* Right: Selected Date Info */}
                <div className="xl:col-span-5 flex flex-col gap-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200/20 relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 group-hover:rotate-12 transition-transform duration-500">
                                    <CalendarIcon className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] leading-none mb-1">Rincian Tanggal</p>
                                    <h3 className="text-2xl font-black tracking-tighter leading-none italic">
                                        {dayjs(selectedDate).format('DD MMMM YYYY')}
                                    </h3>
                                </div>
                            </div>

                            {selectedEvents.installments.length === 0 && selectedEvents.expiry.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                                    <CheckCircle2 className="w-12 h-12 mb-4" />
                                    <p className="font-black uppercase tracking-widest text-xs">Jadwal Bersih</p>
                                    <p className="text-[10px] font-medium mt-1">Tidak ada tagihan atau barang expired hari ini.</p>
                                </div>
                            ) : (
                                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                                    {selectedEvents.installments.length > 0 && (
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em] mb-2">Tagihan Cicilan</p>
                                            {selectedEvents.installments.map((it: any) => (
                                                <div key={it.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 hover:bg-white/10 transition-all cursor-pointer group/item">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
                                                                <Truck className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-white leading-none mb-1 uppercase tracking-tight">{it.stockIn?.ingredient?.name || 'Item'}</p>
                                                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{it.stockIn?.supplier?.name || 'Vendor'}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-black text-rose-400 tabular-nums">{fmt(it.amount)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {selectedEvents.expiry.length > 0 && (
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] mb-2">Barang Expired</p>
                                            {selectedEvents.expiry.map((ing: any) => (
                                                <div key={ing.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 hover:bg-white/10 transition-all cursor-pointer group/item">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20">
                                                                <AlertCircle className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-white leading-none mb-1 uppercase tracking-tight">{ing.name}</p>
                                                                <p className="text-[9px] font-bold text-amber-400/60 uppercase tracking-widest">
                                                                    {ing.type === 'MENU' ? 'Produk Menu' : `Stok: ${ing.stockQuantity} ${ing.unit}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                                                            <span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter">Cek Fisik</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="pt-4 border-t border-white/5">
                                        <div className="flex justify-between items-center px-2">
                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Ringkasan Hari Ini</span>
                                            <span className="text-xs font-black text-white italic">
                                                {selectedEvents.installments.length} Cicilan • {selectedEvents.expiry.length} Expired
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/30 flex-1">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-1">Tips Keuangan</h4>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                                    "Pastikan saldo kas operasional mencukupi 1-2 hari sebelum tanggal bertanda <span className="text-rose-600 font-black italic">merah</span>."
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
                                <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                                    Gunakan filter "Wajib Lapor" di tab Stock untuk melihat bahan yang memiliki nilai valuasi tinggi.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
