"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Wallet, Gift, Gamepad2, Settings, ShieldCheck, Zap, Sparkles, TrendingUp, Cpu, Trophy, Star, CheckCircle2, ChevronRight, Loader2, Database } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { socket } from "@/lib/socket";
import { /* getApiUrl */ } from "@/utils/urlUtils";

// const API_URL = getApiUrl();

export default function DashboardPage() {

  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '1';
  
  const [member, setMember] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [isClaiming, setIsClaiming] = useState<number | null>(null);
  const [bigWins, setBigWins] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchData = () => {
      // Fetch Member
      axios.get(`/loyalty/portal/member/${id}`)
        .then(res => setMember(res.data))
        .catch(err => console.error("Gagal load member:", err));
      
      // Fetch Ledger History
      axios.get(`/loyalty/ledger/${id}`)
        .then(res => setHistory(res.data))
        .catch(err => console.error("Gagal load ledger:", err));

      // Fetch Missions
      axios.get(`/loyalty/missions/${id}`)
        .then(res => setMissions(res.data))
        .catch(err => console.error("Gagal load missions:", err));
    };

    fetchData();

    socket.connect();
    socket.on('member_update', (data) => {
        if (data.id === parseInt(id, 10)) {
            fetchData();
        }
    });

    socket.on('loyalty_updated', (data) => {
        if (data.type === 'GLOBAL_BIG_WIN') {
            setBigWins(prev => [data, ...prev].slice(0, 5));
            setTimeout(() => setBigWins(prev => prev.slice(0, -1)), 8000);
        }
        if (data.memberId === parseInt(id, 10)) {
            fetchData();
        }
    });

    socket.on('mission_completed', (data) => {
        if (data.memberId === parseInt(id, 10)) {
            fetchData();
            // Optional: Show toast for mission completion
        }
    });

    return () => {
       socket.off('member_update');
       socket.off('loyalty_updated');
       socket.off('mission_completed');
    };
  }, [id]);


  if (!member) {
    return (
       <div className="flex h-screen items-center justify-center bg-gray-950 font-mono shadow-inner shadow-cyan-900/20">
          <div className="text-cyan-400 tracking-widest animate-pulse flex flex-col items-center">
             <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
             LOADING MEMBER DATA...
          </div>
       </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#020617] text-white font-['Outfit'] relative overflow-x-hidden pb-12">
      {/* Global Win Ticker */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-full px-6 max-w-md pointer-events-none">
         {bigWins.map((win, i) => (
            <div key={i} className="animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-transparent backdrop-blur-xl border border-yellow-500/20 p-4 rounded-2xl flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  <div className="relative">
                     <div className="absolute inset-0 bg-yellow-400 blur-md opacity-20 animate-pulse"></div>
                     <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center relative">
                        <Trophy className="w-5 h-5 text-black" />
                     </div>
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Big Win Broadcast</span>
                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">Live</span>
                     </div>
                     <p className="text-[11px] font-black leading-tight">
                        <span className="text-white brightness-125">{win.memberName}</span>
                        <span className="text-white/40 font-bold mx-1">hit</span>
                        <span className="text-emerald-400 font-mono">+{win.amount} PTS</span>
                        <span className="text-white/40 font-bold mx-1">on</span>
                        <span className="text-indigo-400">{win.game}</span>
                     </p>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="flex flex-col p-6 space-y-8 relative z-10 pt-12 pb-24 h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            VOC BILLIARD
          </h1>
          <p className="text-gray-400 text-sm mt-1">Halo, {member.name}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 px-3 py-1 rounded-full flex items-center shadow-lg">
          <span className="w-2 h-2 rounded-full bg-cyan-400 mr-2 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
          <span className="text-sm font-semibold text-gray-200 tracking-wider">{member.tier}</span>
        </div>
      </div>

      {/* Digital Card & QR */}
      <div className="w-full aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-black p-1 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent"></div>
        <div className="w-full h-full rounded-xl border border-gray-700/50 bg-gray-900 flex flex-col justify-between p-6 relative z-10">
           <div className="flex justify-between items-start w-full">
              <div className="opacity-80">
                 <p className="text-[10px] tracking-[0.2em] font-medium text-cyan-400">DIGITAL MEMBER</p>
                 <p className="font-mono text-lg mt-1 tracking-widest">{member.memberCode}</p>
              </div>
              <Settings className="text-gray-500 w-5 h-5"/>
           </div>

           <div className="flex justify-between items-end w-full">
              <div>
                 <p className="text-xl font-semibold">{member.name}</p>
              </div>
              <div className="bg-white p-2 rounded-lg shadow-inner">
                <QRCodeSVG 
                  value={member.memberCode} 
                  size={64}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                />
              </div>
           </div>
        </div>
      </div>

      {/* Dual Balance Display */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center">
          <Wallet className="text-cyan-400 mb-2" />
          <p className="text-xs text-gray-400 font-medium tracking-widest">WALLET</p>
          <p className="text-lg font-bold mt-1">Rp {member.balance.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-500/10 rounded-full blur-xl"></div>
          <Gift className="text-yellow-400 mb-2 relative z-10" />
          <p className="text-xs text-gray-400 font-medium tracking-widest relative z-10">ROYALTY</p>
          <p className="text-lg font-bold text-yellow-400 mt-1 relative z-10">{member.points.toLocaleString('id-ID')} Pts</p>
        </div>
      </div>

      {/* ELITE MEMBERSHIP CAMPAIGN SECTION */}
      <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl group">
         <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Cpu className="w-24 h-24 text-cyan-500" />
         </div>
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                  <Sparkles className="w-4 h-4 text-white" />
               </div>
               <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Neural Precision</span>
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider mb-2 leading-none">Elite Territory</h2>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-6 uppercase tracking-widest max-w-[80%]">Experience the next generation of hospitality through our neural gamification network.</p>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <TrendingUp className="w-4 h-4 text-emerald-400 mb-2" />
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Yield Multiplier</p>
                  <p className="text-sm font-bold text-white uppercase">1.5x Boost</p>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <ShieldCheck className="w-4 h-4 text-blue-400 mb-2" />
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vault Security</p>
                  <p className="text-sm font-bold text-white uppercase">Active</p>
               </div>
            </div>
         </div>
      </div>

      {/* LIVE TELEMETRY FEED */}
      <div className="bg-white/5 border-y border-white/5 py-3 overflow-hidden group">
         <div className="flex animate-marquee gap-8 items-center whitespace-nowrap">
            {[1,2,3,4,5].map(i => (
               <div key={i} className="flex items-center gap-2 opacity-40 group-hover:opacity-80 transition-opacity">
                  <div className="w-1 h-1 rounded-full bg-yellow-400"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">SYSTEM_STATUS: STABLE_ALPHA</span>
                  <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">NETWORK_LATENCY: 14MS</span>
                  <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">THROUGHPUT: 1.2M_OPS</span>
               </div>
            ))}
         </div>
      </div>

      {/* ELITE MISSIONS SECTION */}
      <div className="mt-8 px-2">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-sm font-black tracking-[0.3em] uppercase flex items-center gap-2">
               <Trophy className="w-4 h-4 text-yellow-500" /> Mission Deck
            </h2>
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">Elite Tier</span>
         </div>
         
         <div className="space-y-4">
            {missions.length === 0 ? (
               <div className="p-8 border border-dashed border-white/10 rounded-3xl text-center text-[10px] text-slate-600 font-bold">SCANNING FOR AVAILABLE MISSIONS...</div>
            ) : (
               missions.map((m, i) => {
                  const progress = (m.currentValue / m.targetValue) * 100;
                  const canClaim = m.isCompleted && !m.isClaimed;
                  return (
                     <div key={m.id} className={`relative overflow-hidden p-6 rounded-[2rem] border transition-all duration-500 ${m.isClaimed ? "bg-white/[0.02] border-white/5 opacity-50" : canClaim ? "bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)]" : "bg-white/5 border-white/5"}`}>
                        <div className="flex items-center justify-between relative z-10">
                           <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl ${canClaim ? "bg-indigo-500 text-white" : "bg-black/40 text-slate-500"}`}>
                                 {m.icon === 'Zap' ? <Zap className="w-4 h-4" /> : m.icon === 'Gem' ? <Sparkles className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                              </div>
                              <div>
                                 <h3 className="text-xs font-black text-white uppercase tracking-widest">{m.title}</h3>
                                 <p className="text-[9px] text-slate-500 font-medium mt-1 uppercase">{m.description}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-yellow-500">+{m.rewardPoints} <span className="text-[7px] opacity-40">PTS</span></p>
                           </div>
                        </div>

                        {!m.isClaimed && (
                           <div className="mt-5 relative z-10">
                              <div className="flex items-center justify-between mb-2">
                                 <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{m.isCompleted ? 'Target Achieved' : `${m.currentValue}/${m.targetValue}`}</span>
                                 <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{Math.round(progress)}%</span>
                              </div>
                              <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                                 <div className={`h-full transition-all duration-1000 ${canClaim ? "bg-indigo-500 shadow-[0_0_10px_#6366f1]" : "bg-slate-700"}`} style={{width: `${progress}%`}}></div>
                              </div>
                           </div>
                        )}

                        {canClaim && (
                           <button 
                              onClick={async () => {
                                 setIsClaiming(m.id);
                                 try {
                                    await axios.post(`/loyalty/missions/claim`, { memberId: parseInt(id, 10), missionId: m.id });
                                    const res = await axios.get(`/loyalty/missions/${id}`);
                                    setMissions(res.data);
                                 } catch (err) { console.error(err); }
                                 setIsClaiming(null);
                              }}
                              disabled={isClaiming === m.id}
                              className="mt-4 w-full py-3 bg-white text-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-white/5 flex items-center justify-center gap-2 active:scale-95 transition-all"
                           >
                              {isClaiming === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Claim Reward
                           </button>
                        )}

                        {m.isClaimed && (
                           <div className="absolute top-4 right-4 text-emerald-500/20">
                              <CheckCircle2 className="w-12 h-12" />
                           </div>
                        )}
                     </div>
                  );
               })
            )}
         </div>
      </div>

      {/* Game Center */}
      <div className="mt-8 px-2 space-y-4 pb-8">
         <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-sm font-black tracking-[0.3em] uppercase flex items-center gap-2">
               <Gamepad2 className="w-4 h-4 text-emerald-500" /> Game Center
            </h2>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <Link href={`/member/redeem?id=${id}`} className="group relative overflow-hidden bg-white/5 backdrop-blur-md border border-white/5 p-6 rounded-[2rem] flex flex-col items-center justify-center shadow-lg transition-all duration-300 hover:border-cyan-500/50">
               <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="p-3 bg-gray-950 rounded-2xl mb-3 border border-gray-800 relative z-10 transition-transform group-hover:scale-110">
                  <Gift className="text-cyan-400 w-5 h-5" />
               </div>
               <h3 className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em] relative z-10">Klaim Reward</h3>
            </Link>

            <Link href={`/member/play/scratch-bomb?id=${id}`} className="group relative overflow-hidden bg-white/5 backdrop-blur-md border border-white/5 p-6 rounded-[2rem] flex flex-col items-center justify-center shadow-lg transition-all duration-300 hover:border-yellow-500/50">
               <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="p-3 bg-gray-950 rounded-2xl mb-3 border border-gray-800 relative z-10 transition-transform group-hover:scale-110">
                  <div className="absolute inset-0 bg-yellow-400/10 blur animate-pulse rounded-2xl"></div>
                  <Zap className="text-yellow-400 w-5 h-5 relative z-10" />
               </div>
               <h3 className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em] relative z-10">Scratch Bomb</h3>
            </Link>
         </div>

         <Link href={`/member/play/mahjong-ways?id=${id}`} className="group relative overflow-hidden bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 backdrop-blur-md border border-emerald-500/20 p-6 rounded-[2rem] flex items-center justify-between shadow-lg transition-all duration-300 hover:border-emerald-500/50 w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-4 relative z-10">
               <div className="p-3 bg-gray-950/50 rounded-2xl border border-emerald-500/30 relative">
                  <div className="absolute inset-0 bg-emerald-400/20 blur animate-pulse rounded-2xl"></div>
                  <Database className="text-emerald-400 w-5 h-5 relative z-10" />
               </div>
               <div>
                  <h3 className="font-black text-[11px] text-white uppercase tracking-[0.2em]">Mahjong Ways</h3>
                  <p className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-widest mt-1">High Volatility Multiplier</p>
               </div>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-500/50 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
         </Link>
      </div>
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
