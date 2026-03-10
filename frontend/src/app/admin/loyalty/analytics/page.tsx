"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { TrendingUp, Users, Search, Target, Award, ArrowUpRight, ArrowDownRight, Edit3, Activity, Orbit, Database, Zap, Clock, ShieldCheck, Terminal, MoreVertical, User } from "lucide-react";
import { socket } from "@/lib/socket";
import InputField from "@/components/ui/InputField";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoyaltyAnalyticsPage() {
  const [stats, setStats] = useState<any>({ 
    totalPlays: 0, 
    pointsIn: 0, 
    pointsOut: 0, 
    netProfit: 0, 
    winPool: 0,
    activePlayers: 0,
    currentStrategy: "INITIALIZING",
    profitGapToday: 0,
    linearTargetToday: 0
  });
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [adjustData, setAdjustData] = useState({ memberId: 0, name: "", amount: 0, description: "" });
  const [overrideData, setOverrideData] = useState({ memberId: 0, name: "", currentRate: 0, targetRate: null as number | null });
  const [loading, setLoading] = useState(true);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [monthlyTarget, setMonthlyTarget] = useState(5000000);
  const [sortKey, setSortKey] = useState<'netProfit' | 'totalPlays' | 'points'>('netProfit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const statRes = await axios.get(`${API_BASE}/loyalty/admin/analytics`, config);
      setStats(statRes.data);
      
      const settingsRes = await axios.get(`${API_BASE}/settings`, config);
      setMonthlyTarget(settingsRes.data.gamificationTargetSurplus || 5000000);
      
      const memberStatsRes = await axios.get(`${API_BASE}/loyalty/admin/members/win-stats`, config);
      setMembers(memberStatsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    socket.connect();
    socket.on('loyalty_updated', (data) => {
       console.log("Real-time loyalty update received:", data);
       fetchData();
    });

    return () => {
       socket.off('loyalty_updated');
    };
  }, []);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Anda yakin ingin menyesuaikan poin atas nama ${adjustData.name} sebesar ${adjustData.amount} Pts?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/loyalty/admin/adjust`, {
         memberId: adjustData.memberId,
         amount: adjustData.amount,
         description: adjustData.description || "Manual Adjustment from Admin"
      }, {
         headers: { Authorization: `Bearer ${token}` }
      });
      setShowAdjustModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal melakukan adjustment poin");
    }
  };

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/loyalty/admin/members/target-winrate`, {
         memberId: overrideData.memberId,
         targetWinRate: overrideData.targetRate
      }, {
         headers: { Authorization: `Bearer ${token}` }
      });
      setShowOverrideModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal melakukan override winrate");
    }
  };

  const handleUpdateTarget = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE}/settings`, {
         gamificationTargetSurplus: monthlyTarget
      }, {
         headers: { Authorization: `Bearer ${token}` }
      });
      setIsEditingTarget(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal mengupdate target profit");
    }
  };
  
  const handlePanic = async () => {
    if (!confirm("⚠️ PERINGATAN: Anda akan menurunkan SEMUA WinRate ke 1% dan mematikan Auto Pilot. Lanjutkan?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/loyalty/admin/emergency-brake`, {}, {
         headers: { Authorization: `Bearer ${token}` }
      });
      alert("EMERGENCY BRAKE DIAKTIFKAN! Semua sistem beralih ke mode pengamanan yield.");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal mengaktifkan Emergency Brake");
    }
  };

  const openAdjust = (member: any) => {
    setAdjustData({ memberId: member.id, name: member.name, amount: 0, description: "" });
    setShowAdjustModal(true);
  };

  const openOverride = (member: any) => {
    setOverrideData({ 
        memberId: member.id, 
        name: member.name, 
        currentRate: member.actualWinRate, 
        targetRate: member.targetWinRate 
    });
    setShowOverrideModal(true);
  };

  if (loading) {
    return (
        <div className="flex h-[70vh] items-center justify-center">
            <Orbit className="animate-spin text-indigo-500 w-12 h-12" />
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-32">
       <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-slate-900 rounded-2xl shadow-xl shadow-slate-200">
                 <Database className="w-8 h-8 text-indigo-400" />
            </div>
            GAMIFICATION <span className="text-indigo-600">ANALYTICS</span>
          </h1>
          <p className="text-slate-500 mt-2 font-bold uppercase tracking-[0.3em] text-[10px] sm:text-xs">
            DATA ENGINE // MONITORING PLAYER PSYCHOLOGY & POINT DYNAMICS
          </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest font-mono">LIVE FEED ACTIVE</span>
            </div>
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200 flex items-center gap-3">
                <Database className="w-4 h-4 text-white" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest font-mono shadow-sm">1 PT = Rp {(stats.pointValue || 1000).toLocaleString()}</span>
            </div>
        </div>
      </header>

      {/* Main Economic Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
        <AnalyticCard 
            label="SCRATCH PLAYS" 
            value={`${stats.totalPlays || 0}x`} 
            trend="+12%" 
            icon={TrendingUp} 
            color="indigo" 
            desc="Total putaran permainan Scratch Bomb"
        />
        <AnalyticCard 
            label="POINTS ABSORBED" 
            value={`+${(stats.pointsIn || 0).toLocaleString()} Pts`} 
            trend="Incoming" 
            icon={ArrowDownRight} 
            color="emerald" 
            desc="Poin yang masuk ke sistem (Biaya main)"
        />
        <AnalyticCard 
            label="JACKPOT DISTRIBUTED" 
            value={`-${(stats.pointsOut || 0).toLocaleString()} Pts`} 
            trend="Outgoing" 
            icon={ArrowUpRight} 
            color="rose" 
            desc="Poin yang dimenangkan oleh member"
        />
        <AnalyticCard 
            label="NET POIN PROFIT" 
            value={`${stats.netProfit >= 0 ? '+' : ''}${(stats.netProfit || 0).toLocaleString()} Pts`} 
            trend={stats.netProfit >= 0 ? 'Safe' : 'Critical'} 
            icon={Award} 
            color={stats.netProfit >= 0 ? "amber" : "rose"} 
            desc="Laba bersih poin (Drain Mechanism)"
        />
        <AnalyticCard 
            label="WINPOOL AMUNITION" 
            value={`${(stats.winPool || 0).toLocaleString()} Pts`} 
            trend="Budget" 
            icon={Target} 
            color="indigo" 
            desc="Saldo amunisi Jackpot mesin"
        />
        <AnalyticCard 
            label="LIVE LOBBY" 
            value={`${stats.activePlayers || 0}`} 
            trend="Players" 
            icon={Users} 
            color="amber" 
            desc="User aktif bermain dalam 15 menit terakhir"
        />
        <AnalyticCard 
            label="AI OPERATIONAL MODE" 
            value={stats.currentStrategy?.replace(/_/g, ' ') || "IDLE"} 
            trend={stats.currentStrategy === 'LOYALTY_REWARD_MODE' ? 'Boosted' : 'Protected'} 
            icon={Activity} 
            color={stats.currentStrategy === 'LOYALTY_REWARD_MODE' ? "emerald" : (stats.currentStrategy === 'PROTECTION_MODE' ? "rose" : "amber")} 
            desc="Strategi ARME AI saat ini berdasarkan performa"
        />
        <AnalyticCard 
            label="REVENUE PROTECTION" 
            value={`Rp ${(stats.netProfit * (stats.pointValue || 1000)).toLocaleString('id-ID')}`} 
            trend="Surplus" 
            icon={ShieldCheck} 
            color="emerald" 
            desc="Uang riil yang sudah aman di kas (Omzet Member - Hadiah Keluar)"
        />
      </div>

      {/* Economic Projection Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-10 opacity-10">
                  <Activity className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black tracking-widest text-indigo-400 flex items-center gap-3 uppercase">
                          <Terminal className="w-5 h-5" /> Economic Health Score
                      </h3>
                      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Monthly Target:</span>
                          {isEditingTarget ? (
                              <div className="flex items-center gap-2">
                                  <input 
                                      type="number" 
                                      className="bg-white/10 text-white font-mono text-xs px-2 py-1 rounded outline-none border border-indigo-500/50 w-32" 
                                      value={monthlyTarget} 
                                      onChange={e => setMonthlyTarget(parseInt(e.target.value))}
                                  />
                                  <button onClick={handleUpdateTarget} className="p-1 bg-emerald-500 rounded text-white hover:bg-emerald-400 transition-colors">
                                      <Zap className="w-3 h-3" />
                                  </button>
                              </div>
                          ) : (
                              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsEditingTarget(true)}>
                                  <span className="text-sm font-black font-mono">Rp {monthlyTarget.toLocaleString()}</span>
                                  <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                              </div>
                          )}
                      </div>
                  </div>
                  
                  {/* Integrated Financial Logic */}
                  {(() => {
                      const now = new Date();
                      const dayOfMonth = now.getDate();
                      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                      const linearTargetToday = (monthlyTarget / daysInMonth) * dayOfMonth;
                      const actualProfitIdr = (stats.netProfit || 0) * (stats.pointValue || 1000);
                      const profitGap = linearTargetToday - actualProfitIdr;
                      const isSecure = profitGap <= 0;

                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                              <div>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-2">Liability Ratio</p>
                                  {(() => {
                                      const ratio = (stats.pointsOut / (stats.pointsIn || 1) * 100);
                                      const ratioColor = ratio > 85 ? 'text-rose-500 animate-pulse' : (ratio > 70 ? 'text-amber-500' : 'text-emerald-400');
                                      return (
                                          <>
                                            <p className={`text-3xl font-black font-mono ${ratioColor}`}>{ratio.toFixed(1)}%</p>
                                            <p className={`text-[7px] font-black uppercase tracking-widest mt-1 ${ratio > 85 ? 'text-rose-400' : 'text-slate-400'}`}>
                                                {ratio > 85 ? 'CRITICAL RISK' : (ratio > 70 ? 'MEDIUM LEAK' : 'SECURE MARGIN')}
                                            </p>
                                          </>
                                      );
                                  })()}
                                  <p className="text-[9px] text-slate-400 mt-2 uppercase font-bold">Rasio poin keluar vs masuk</p>
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-2">Profit Gap Today</p>
                                  <p className={`text-3xl font-black font-mono ${isSecure ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {isSecure ? 'SURPLUS' : `Rp ${Math.abs(Math.round(profitGap)).toLocaleString()}`}
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-2 uppercase font-bold">Jarak ke target hari ini</p>
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-2">Health Status</p>
                                  <p className={`text-3xl font-black ${isSecure ? "text-emerald-500" : "text-rose-500"}`}>
                                      {isSecure ? "OPTIMAL" : "YIELD RISK"}
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-2 uppercase font-bold">Keamanan Finansial Sistem</p>
                              </div>
                          </div>

                          <div className="mt-10 p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                  <div className={`w-2 h-2 rounded-full animate-pulse ${isSecure ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                  <p className="text-[10px] font-bold text-slate-300">
                                      AI DECISION: {isSecure 
                                        ? "Profit target amankan. Mode Reward Aktif (WinRate Stabil)." 
                                        : `Profit di bawah target (Gap Rp ${Math.round(profitGap).toLocaleString()}). Menyarankan penurunan WinRate Global 3-5%.`}
                                      {stats.currentStrategy && (
                                        <span className="ml-2 px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30">
                                            {stats.currentStrategy.replace(/_/g, ' ')}
                                        </span>
                                      )}
                                  </p>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">ARME AI ACTIVE</span>
                                  <button 
                                    onClick={handlePanic}
                                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[8px] font-black rounded-lg shadow-lg shadow-rose-900/40 transition-all active:scale-95 flex items-center gap-2 border border-rose-400/20"
                                  >
                                    <Zap className="w-3 h-3" /> EMERGENCY BRAKE
                                  </button>
                              </div>
                          </div>
                        </>
                      );
                  })()}
              </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-xl">
              <h3 className="text-lg font-black text-slate-800 tracking-widest mb-6 flex items-center gap-3 uppercase italic">
                  <Database className="w-5 h-5 text-indigo-600" /> Tier Valuation
              </h3>
              <div className="space-y-4">
                  {[
                        { pts: 2, label: "PLAY COST" },
                        { pts: 20, label: "AVERAGE WIN" },
                        { pts: 100, label: "JACKPOT" },
                        { pts: 500, label: "ELITE GOAL" }
                  ].map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div>
                              <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase">{t.label}</p>
                              <p className="text-sm font-black text-slate-800">{t.pts} PTS</p>
                          </div>
                          <div className="text-right">
                              <p className="text-[8px] font-bold text-indigo-400 uppercase">Valuasi Omzet</p>
                              <p className="text-md font-black text-indigo-600">Rp {(t.pts * (stats.pointValue || 1000)).toLocaleString()}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* Member Management Section */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 italic">
                    <Users className="w-7 h-7 text-indigo-600" />
                    MEMBER COMMANDER
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 ml-10">Real-time Win Stats & Neural Override</p>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button onClick={() => {setSortKey('netProfit'); setSortOrder('desc')}} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortKey === 'netProfit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Top Winners</button>
                    <button onClick={() => {setSortKey('totalPlays'); setSortOrder('desc')}} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortKey === 'totalPlays' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>The Hooked</button>
                    <button onClick={() => {setSortKey('points'); setSortOrder('desc')}} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortKey === 'points' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>High Credits</button>
                </div>
                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search by code or name..."
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 shadow-inner"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50/50">
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identification Member</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Win Stats</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Member P/L</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Override Status</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Credit Balance</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Operation</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {members
                      .filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.memberCode.toLowerCase().includes(search.toLowerCase()))
                      .sort((a, b) => {
                          const valA = a[sortKey];
                          const valB = b[sortKey];
                          return sortOrder === 'desc' ? valB - valA : valA - valB;
                      })
                      .map(member => (
                      <tr key={member.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                         <td className="px-10 py-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-black text-slate-800 text-lg tracking-tighter group-hover:text-indigo-600 transition-colors">{member.name}</div>
                                    <div className="text-[10px] font-mono text-slate-400 font-bold tracking-[0.2em] mt-1">{member.memberCode}</div>
                                </div>
                            </div>
                         </td>
                         <td className="px-10 py-8">
                            <div className="flex flex-col">
                                <span className={`text-xl font-black font-mono tracking-tighter ${member.actualWinRate > 20 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {member.actualWinRate}%
                                </span>
                                 <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">From {member.totalPlays} Plays</span>
                            </div>
                         </td>
                         <td className="px-10 py-8">
                             <div className="flex flex-col items-center group/profit relative">
                                 <span className={`text-md font-black font-mono tracking-tighter ${member.netProfit > 0 ? 'text-emerald-500' : (member.netProfit < 0 ? 'text-rose-500' : 'text-slate-400')}`}>
                                     {member.netProfit > 0 ? '+' : ''}{member.netProfit} <span className="text-[8px] opacity-40">Pts</span>
                                 </span>
                                 <div className={`mt-1 h-0.5 w-12 rounded-full ${member.netProfit > 0 ? 'bg-emerald-500' : (member.netProfit < 0 ? 'bg-rose-500' : 'bg-slate-200 opacity-30')}`}></div>
                                 
                                 {/* Hover Detail Tooltip */}
                                 <div className="absolute bottom-full mb-2 hidden group-hover/profit:block z-50 animate-in fade-in zoom-in duration-200">
                                     <div className="bg-slate-900 text-white text-[9px] font-black p-3 rounded-xl shadow-2xl border border-white/10 whitespace-nowrap">
                                         <p className="text-indigo-400 mb-1 tracking-widest uppercase">MEMBER PERFORMANCE</p>
                                         <p className="text-lg">Rp {(member.estimatedIdrProfit || 0).toLocaleString('id-ID')}</p>
                                         <div className="mt-2 text-[7px] text-slate-400 flex gap-2">
                                            <span>SPENT: {member.pointsIn}</span>
                                            <span>WON: {member.pointsOut}</span>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         </td>
                         <td className="px-10 py-8">
                            {member.targetWinRate !== null ? (
                                <div className="inline-flex flex-col">
                                    <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                                        <ShieldCheck className="w-3 h-3" /> MANUAL
                                    </span>
                                    <span className="text-[10px] font-black text-rose-500/50 font-mono ml-1">SET: {member.targetWinRate}%</span>
                                </div>
                            ) : (
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Orbit className="w-3 h-3 animate-spin-slow" /> AUTO PILOT
                                </span>
                            )}
                         </td>
                         <td className="px-10 py-8 text-right">
                           <div className="flex flex-col items-end">
                              <span className="text-2xl font-black text-slate-800 font-mono tracking-tighter group-hover:text-indigo-600 transition-colors">
                                  {member.points.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest -mt-1">Points Available</span>
                           </div>
                         </td>
                         <td className="px-10 py-8">
                            <div className="flex items-center justify-center gap-2">
                                <button 
                                    onClick={() => openOverride(member)} 
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 text-indigo-600 hover:text-white font-black text-[9px] rounded-xl transition-all shadow-sm active:scale-95 uppercase tracking-widest"
                                >
                                    <Target className="w-3.5 h-3.5" />
                                    OVERRIDE
                                </button>
                                <button 
                                    onClick={() => openAdjust(member)} 
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-900 border border-slate-200 text-slate-400 hover:text-white font-black text-[9px] rounded-xl transition-all shadow-sm active:scale-95 uppercase tracking-widest"
                                >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
            </table>
        </div>
      </section>

      {/* Adjust Modal */}
      {showAdjustModal && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 md:p-10 border border-slate-200 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-slate-900"></div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-6">Point Adjust</h2>
              <form onSubmit={handleAdjust} className="space-y-6">
                 <InputField label="NILAI POIN" type="number" isEditing={true} value={adjustData.amount || ""} onChange={v => setAdjustData({...adjustData, amount: Number(v)})} />
                 <InputField label="NOTES" isEditing={true} value={adjustData.description} onChange={v => setAdjustData({...adjustData, description: v})} />
                 <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setShowAdjustModal(false)} className="flex-1 px-4 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">Batal</button>
                    <button type="submit" className="flex-[2] px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-xl transition-all active:scale-95 uppercase tracking-widest">Update Poin</button>
                 </div>
              </form>
           </div>
         </div>
      )}

      {/* Neural Override Modal */}
      {showOverrideModal && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 md:p-10 border border-slate-200 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
              <div className="mb-8">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Win Rate Override</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Probability Control Engine</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject</p>
                      <p className="font-black text-slate-800 text-xs truncate">{overrideData.name}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Actual RTP</p>
                      <p className="font-black text-indigo-600 font-mono">{overrideData.currentRate}%</p>
                  </div>
              </div>

              <form onSubmit={handleOverride} className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Win Probability (0-100%)</label>
                    <div className="flex items-center gap-4">
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            value={overrideData.targetRate === null ? 50 : overrideData.targetRate}
                            onChange={e => setOverrideData({...overrideData, targetRate: parseInt(e.target.value)})}
                        />
                        <span className="w-16 text-right font-black text-xl font-mono text-indigo-600">
                            {overrideData.targetRate === null ? "OFF" : `${overrideData.targetRate}%`}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setOverrideData({...overrideData, targetRate: 100})} className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded-lg">FORCE WIN</button>
                        <button type="button" onClick={() => setOverrideData({...overrideData, targetRate: 0})} className="px-2 py-1 bg-rose-50 text-rose-600 text-[8px] font-black rounded-lg">FORCE LOSS</button>
                        <button type="button" onClick={() => setOverrideData({...overrideData, targetRate: null})} className="px-2 py-1 bg-slate-100 text-slate-500 text-[8px] font-black rounded-lg">RESET TO AUTO</button>
                    </div>
                 </div>

                 <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setShowOverrideModal(false)} className="flex-1 px-4 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">Batal</button>
                    <button type="submit" className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest">
                        <Zap className="w-4 h-4" /> APPLY OVERRIDE
                    </button>
                 </div>
              </form>
           </div>
         </div>
      )}
    </div>
  );
}

function AnalyticCard({ label, value, trend, icon: Icon, color, desc }: any) {
    const colors: any = {
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        rose: "text-rose-600 bg-rose-50 border-rose-100",
        amber: "text-amber-600 bg-amber-50 border-amber-100",
    }
    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl hover:-translate-y-1 transition-all group flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${colors[color]}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${colors[color]}`}>{trend}</span>
                </div>
                <div className="text-3xl font-black text-slate-800 tracking-tighter mb-2 font-mono">{value}</div>
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-[9px] text-slate-300 font-medium leading-tight">{desc}</p>
            </div>
        </div>
    )
}
