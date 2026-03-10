'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Coins, Zap, Trophy, History, SkipForward, Play, 
    Home, Info, Star, ChevronLeft, Volume2, Sparkles, 
    ArrowUpRight, LayoutDashboard, Database, RotateCcw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { socket } from '@/lib/socket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Mahjong Symbols Definition
const SYMBOLS: Record<number, { name: string; color: string; bg: string; char: string; value: number }> = {
    1: { name: 'Red Dragon', color: '#B91C1C', bg: '#FEE2E2', char: '中', value: 50 }, 
    2: { name: 'Green Dragon', color: '#15803D', bg: '#DCFCE7', char: '發', value: 30 },
    3: { name: 'White Dragon', color: '#1E40AF', bg: '#DBEAFE', char: '白', value: 20 },
    4: { name: 'Bamboo 8', color: '#166534', bg: '#F0FDF4', char: '🀐', value: 10 },
    5: { name: 'Bamboo 5', color: '#15803D', bg: '#F0FDF4', char: '🀓', value: 5 },
    6: { name: 'Dot 8', color: '#3730A3', bg: '#EEF2FF', char: '🀙', value: 3 },
    7: { name: 'Dot 5', color: '#4338CA', bg: '#EEF2FF', char: '🀜', value: 2 },
    8: { name: 'Char 8', color: '#92400E', bg: '#FFFBEB', char: '🀇', value: 1 },
    9: { name: 'Char 5', color: '#B45309', bg: '#FFFBEB', char: '🀄', value: 0.5 },
    10: { name: 'Wild', color: '#9333EA', bg: '#F3E8FF', char: '金', value: 0 },
};

export default function MahjongWaysPage() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id') || '1';
    const [member, setMember] = useState<any>(null);
    const [grid, setGrid] = useState<number[][]>(Array(5).fill(0).map(() => Array(4).fill(1))); // 5 reels, 4 rows
    const [spinning, setSpinning] = useState(false);
    const [winAmount, setWinAmount] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWin, setShowWin] = useState(false);
    const [winLines, setWinLines] = useState<any[]>([]);
    const [showPaytable, setShowPaytable] = useState(false);
    const [turboMode, setTurboMode] = useState(false);
    const [bigWins, setBigWins] = useState<any[]>([]);
    const [winRate, setWinRate] = useState(15);
    const [playCost, setPlayCost] = useState(2);
    const [autoPlayCount, setAutoPlayCount] = useState(0);
    const autoPlayRef = useRef(0);
    useEffect(() => { autoPlayRef.current = autoPlayCount; }, [autoPlayCount]);
    const [winPool, setWinPool] = useState(0);
    const [activePlayers, setActivePlayers] = useState(0);
    const [isHighTension, setIsHighTension] = useState(false);

    useEffect(() => {
        if (id) fetchData();

        axios.get(`${API_URL}/loyalty/portal/game/stats`)
            .then(res => {
                if (res.data.mahjongSlotWinRate) setWinRate(res.data.mahjongSlotWinRate);
                if (res.data.scratchBombPlayCost) setPlayCost(res.data.scratchBombPlayCost);
            })
            .catch(err => console.error(err));

        socket.connect();
        socket.on('loyalty_updated', (data: any) => {
            if (data.type === 'GLOBAL_BIG_WIN') {
                setBigWins(prev => [data, ...prev].slice(0, 1));
                setTimeout(() => setBigWins([]), 6000);
            }
            if (data.type === 'SETTINGS_UPDATE' && data.settings) {
                if (data.settings.scratchBombPlayCost !== undefined) setPlayCost(data.settings.scratchBombPlayCost);
                if (data.settings.mahjongSlotWinRate !== undefined) setWinRate(data.settings.mahjongSlotWinRate);
                if (data.settings.winPool !== undefined) setWinPool(data.settings.winPool);
                if (data.settings.activePlayers) setActivePlayers(data.settings.activePlayers);
            }
            if (data.memberId === parseInt(id || '0', 10)) {
                if (data.type === 'ADJUST') {
                    setMember((m: any) => ({ ...m, points: data.newBalance }));
                }
            }
        });
        return () => { socket.off('loyalty_updated'); };
    }, [id]);

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API_URL}/loyalty/portal/member/${id}`);
            setMember(res.data);
            if (res.data.winPool) setWinPool(res.data.winPool);
            if (res.data.activePlayers) setActivePlayers(res.data.activePlayers);
            
            const histRes = await axios.get(`${API_URL}/loyalty/ledger/${id}`);
            setHistory(histRes.data.filter((l: any) => l.description.includes('Mahjong')).slice(0, 5));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setIsHighTension(activePlayers > 3 || winPool > 500);
    }, [activePlayers, winPool]);

    const playSound = (type: 'spin' | 'stop' | 'win' | 'cascade' | 'bigwin') => {
        try {
            const audio = new Audio();
            if (type === 'spin') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3';
            if (type === 'stop') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3';
            if (type === 'win') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3';
            if (type === 'cascade') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2007/2007-preview.mp3';
            if (type === 'bigwin') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3';
            audio.volume = 0.2;
            audio.play().catch(() => {});
        } catch(e) {}
    };

    const spin = async () => {
        const cost = playCost;
        if (spinning || (member?.points || 0) < cost) {
            if ((member?.points || 0) < cost) setAutoPlayCount(0);
            return;
        }

        setSpinning(true);
        setShowWin(false);
        setWinAmount(0);
        setMultiplier(1);
        setWinLines([]);
        playSound('spin');

        try {
            setMember((m: any) => ({ ...m, points: m.points - cost }));

            const res = await axios.post(`${API_URL}/loyalty/game/mahjong`, { memberId: parseInt(id || '0', 10) });
            const { cascades, totalWin, newBalance } = res.data;

            // 1. Reel Stop Animation
            for (let i = 0; i < 5; i++) {
                if (!turboMode) await new Promise(r => setTimeout(r, 150 + i * 120));
                setGrid(prev => {
                    const next = [...prev];
                    next[i] = cascades[0].grid[i];
                    return next;
                });
                playSound('stop');
            }

            // 2. Resolve Cascades
            let cumulativeWin = 0;
            for (let i = 0; i < cascades.length; i++) {
                const step = cascades[i];
                if (step.win > 0) {
                    cumulativeWin += step.win;
                    setWinLines(step.lines);
                    setMultiplier(step.multiplier);
                    playSound('cascade');
                    if (!turboMode) await new Promise(r => setTimeout(r, 600));

                    setWinAmount(cumulativeWin);
                    
                    if (!turboMode) await new Promise(r => setTimeout(r, 400));

                    if (cascades[i+1]) {
                        setGrid(cascades[i+1].grid);
                        setWinLines([]);
                        if (!turboMode) await new Promise(r => setTimeout(r, 500));
                    }
                }
            }

            if (totalWin > 0) {
                setShowWin(true);
                if (totalWin > 50) playSound('bigwin');
                else playSound('win');
                if (!turboMode) await new Promise(r => setTimeout(r, 2500));
            }
            
            setMember((m: any) => ({ ...m, points: newBalance }));
            fetchData();

        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.message || "Gagal memutar slot");
            fetchData();
        } finally {
            setSpinning(false);
            // Handle Auto-Play logic after spin completes
            if (autoPlayRef.current !== 0) {
                setTimeout(() => {
                    let shouldContinue = true;
                    if (autoPlayRef.current !== -1) {
                        const nextCount = autoPlayRef.current - 1;
                        setAutoPlayCount(nextCount < 0 ? 0 : nextCount);
                        if (nextCount <= 0) shouldContinue = false;
                    }

                    if (shouldContinue) {
                        spin();
                    }
                }, turboMode ? 200 : 1500);
            }
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#052E16] flex items-center justify-center">
            <RotateCcw className="w-12 h-12 text-yellow-400 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#061612] text-slate-200 font-['Outfit'] relative overflow-hidden">
            {/* Global Win Ticker */}
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full px-6 max-w-sm pointer-events-none">
                {bigWins.map((win, i) => (
                    <div key={i} className="animate-in fade-in zoom-in duration-500">
                        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent backdrop-blur-2xl border border-amber-500/30 p-4 rounded-3xl flex items-center gap-4 shadow-2xl">
                            <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                                <Trophy className="w-5 h-5 text-black" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest">Global Jackpot Hit!</p>
                                <p className="text-[13px] font-black text-white">
                                    {win.memberName} Won <span className="text-emerald-400">{win.amount} PTS</span>
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Background VFX */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[#053228]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] brightness-200"></div>
                <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-yellow-500/20 to-transparent blur-[100px]"></div>
            </div>

            {/* PAYTABLE MODAL */}
            {showPaytable && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-[#064E3B] border-2 border-yellow-500/30 rounded-[3rem] p-10 overflow-hidden relative">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-2xl font-black text-yellow-500 tracking-[0.2em] uppercase">Symbol Value Table</h2>
                            <button onClick={() => setShowPaytable(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 h-[400px] overflow-y-auto no-scrollbar pr-2">
                            {Object.entries(SYMBOLS).map(([sid, sym]) => (
                                <div key={sid} className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                                    <div className="w-16 h-20 rounded-xl flex items-center justify-center text-3xl font-black shadow-xl" style={{ backgroundColor: sym.bg, color: sym.color }}>{sym.char}</div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sym.name}</p>
                                        <p className="text-xl font-black text-yellow-400 font-mono">x{sym.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MINIMAL FLOATING NAVIGATION */}
            <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
                <button 
                    onClick={() => window.location.href=`/member/dashboard?id=${id}`} 
                    className="p-3 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl text-amber-500/50 hover:text-amber-500 hover:bg-black/60 transition-all pointer-events-auto mechanical-btn"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex flex-col items-center opacity-40">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-1 h-1 rounded-full bg-amber-500"></div>
                        <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest">LOYALTY ENGINE V4.0</span>
                    </div>
                </div>

                <div onClick={() => window.location.reload()} className="p-3 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl text-amber-500/50 hover:text-amber-500 hover:bg-black/60 transition-all pointer-events-auto mechanical-btn cursor-pointer">
                    <RotateCcw className="w-5 h-5" />
                </div>
            </div>

            <main className="pt-20 px-2 sm:px-4 max-w-4xl mx-auto space-y-4 relative z-10 pb-24">
                {/* HUD INTEGRATED */}
                <div className="slot-border rounded-2xl p-4 flex items-center justify-between mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent animate-pulse"></div>
                    <div className="flex flex-col relative z-20">
                       <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-1.5">WINPOOL AMMUNITON</p>
                       <div className="lcd-display px-4 py-1 rounded-lg">
                          <span className={`text-2xl font-black font-mono tracking-widest ${winPool > 100 ? "fire-text scale-110" : "gold-text"}`}>
                             {(winPool || 0).toLocaleString()}
                          </span>
                       </div>
                    </div>
                    <div className="flex flex-col items-end relative z-20">
                       <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1.5">PTS BALANCE</p>
                       <div className="lcd-display px-4 py-1 rounded-lg">
                          <span className="text-xl font-black font-mono text-indigo-400">{(member?.points || 0).toLocaleString()}</span>
                       </div>
                    </div>
                </div>
                
                {/* Multiplier Bar */}
                <div className="flex justify-center gap-2">
                    {[1, 2, 3, 5].map(m => (
                        <div key={m} className={`lcd-display flex flex-col items-center justify-center w-16 h-14 rounded-xl border transition-all duration-500 ${multiplier === m ? "border-amber-500/50 scale-110 shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "border-white/5 opacity-40"}`}>
                            <span className={`text-lg font-black font-mono tracking-tighter ${multiplier === m ? "gold-text" : "text-white/30"}`}>x{m}</span>
                        </div>
                    ))}
                </div>

                {/* GAME STAGE */}
                <div className="relative mx-auto max-w-[420px]">
                    <div className="slot-border p-3 rounded-[2.5rem] border-[12px] border-[#1e293b] shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                        {/* Custom Texture Background */}
                        <div className="absolute inset-0 opacity-[0.1] mix-blend-overlay bg-[url('/mahjong_grid_background_1773044010327.png')] bg-cover"></div>
                        
                        <div className="grid grid-cols-5 gap-1.5 relative z-10">
                            {grid.map((reel, rIdx) => (
                                <div key={rIdx} className="flex flex-col gap-1.5">
                                    {reel.map((symId, sIdx) => (
                                        <Tile key={`${rIdx}-${sIdx}`} id={symId} spinning={spinning} winLine={winLines.some(l => l.symbol === symId)} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* BIG WIN OVERLAY */}
                    {showWin && (
                        <div className="absolute inset-0 flex items-center justify-center z-40 animate-in zoom-in duration-700 pointer-events-none">
                            <div className="bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-[3rem] p-10 shadow-[0_30px_90px_rgba(0,0,0,0.8)] border-4 border-white text-center transform scale-110">
                                <h4 className="text-[10px] font-black text-emerald-950 uppercase tracking-widest mb-2 font-mono">JACKPOT REACHED</h4>
                                <h3 className="text-6xl font-black text-emerald-900 font-mono tracking-tighter">+{winAmount.toLocaleString()}</h3>
                            </div>
                        </div>
                    )}
                </div>

                {/* ACTION HUD */}
                <div className="flex flex-col items-center gap-4 pb-4">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setShowPaytable(true)} className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/5 mechanical-btn">
                            <Info className="w-6 h-6 text-indigo-400" />
                        </button>
                        
                        <div className="relative">
                            <div className="absolute -inset-4 bg-amber-500/10 rounded-full blur-2xl animate-pulse"></div>
                            <button 
                                onClick={spin}
                                disabled={spinning || (member?.points || 0) < playCost}
                                className={`w-24 h-24 rounded-full flex items-center justify-center border-4 border-[#1e293b] shadow-2xl transition-all active:scale-95 relative overflow-hidden mechanical-btn ${spinning ? "opacity-90" : "hover:scale-105"}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600"></div>
                                <div className="absolute inset-1 border border-white/10 rounded-full"></div>
                                <div className="relative z-10 text-amber-950">
                                    {spinning ? <RotateCcw className="w-10 h-10 animate-spin" /> : <Play className="w-10 h-10 fill-current translate-x-0.5" />}
                                </div>
                            </button>
                        </div>

                        <button onClick={() => setTurboMode(!turboMode)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border mechanical-btn ${turboMode ? "bg-amber-500/20 border-amber-400/50 text-amber-500" : "bg-white/5 border-white/5 text-white/20"}`}>
                            <Zap className={`w-6 h-6 ${turboMode ? "fill-amber-500" : ""}`} />
                        </button>
                    </div>

                    <div className="flex w-full max-w-[380px] gap-2">
                        <div className="slot-border flex-1 py-2 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                            <p className="text-[7px] font-black text-white/30 uppercase tracking-widest mb-0.5">STAKE</p>
                            <p className="text-sm font-black text-white font-mono leading-none">{playCost} <span className="text-[8px] text-white/20">PTS</span></p>
                        </div>
                        <div className="slot-border flex-1 py-2 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                            <p className="text-[7px] font-black text-white/30 uppercase tracking-widest mb-0.5">DYNAMIC RTP</p>
                            <p className="text-sm font-black text-amber-500 font-mono tracking-tighter leading-none">{winRate}%</p>
                        </div>
                    </div>

                    {/* AUTO PLAY CONTROLS */}
                    <div className="w-full max-w-[380px] flex flex-col items-center gap-3">
                        <div className="flex gap-1.5 w-full">
                            {[10, 30, 50, 100].map(count => (
                                <button
                                    key={count}
                                    onClick={() => { setAutoPlayCount(count); if(!spinning) spin(); }}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all mechanical-btn ${autoPlayCount === count ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-lg' : 'bg-white/5 text-white/30 border border-white/5'}`}
                                >
                                    {count}x
                                </button>
                            ))}
                            <button
                                onClick={() => { setAutoPlayCount(autoPlayCount === -1 ? 0 : -1); if(autoPlayCount === 0 && !spinning) spin(); }}
                                className={`w-12 py-3 rounded-xl text-[14px] font-black transition-all mechanical-btn ${autoPlayCount === -1 ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400 animate-pulse' : 'bg-white/5 text-white/30 border border-white/5'}`}
                            >
                                ∞
                            </button>
                        </div>
                        {autoPlayCount !== 0 && (
                            <button 
                                onClick={() => setAutoPlayCount(0)}
                                className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors animate-pulse"
                            >
                                TERMINATE AUTO SEQUENCE
                            </button>
                        )}
                    </div>
                </div>

                {/* RECENT RECORDS */}
                <div className="space-y-4 pt-4">
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] px-2 flex items-center gap-3">
                        <History className="w-3 h-3" /> SESSION BROADCAST
                    </h4>
                    <div className="space-y-2">
                        {history.map((h, i) => (
                            <div key={i} className="bg-black/20 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${h.amount > 0 ? "bg-yellow-500 text-black" : "bg-white/5 text-slate-500"}`}>
                                        {h.amount > 0 ? <Trophy className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-200 uppercase">{h.description}</p>
                                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">{new Date(h.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                                <p className={`text-base font-black font-mono tracking-tighter ${h.amount > 0 ? "text-yellow-400" : "text-slate-500"}`}>
                                    {h.amount > 0 ? `+${h.amount}` : h.amount}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Premium Mobile Navigation Bar */}
            <nav className="fixed bottom-4 left-4 right-4 z-50 bg-black/40 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-[2.5rem] flex justify-around shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <NavIcon icon={Home} label="Lobby" onClick={() => window.location.href='/member/play'} />
                <NavIcon icon={LayoutDashboard} label="Admin" onClick={() => window.location.href='/member/dashboard'} />
                <NavIcon icon={Database} label="Vault" active />
            </nav>

            <style jsx global>{`
                :root {
                    --gold: #f59e0b;
                    --gold-light: #fef08a;
                    --gold-dark: #b45309;
                    --lcd-bg: #020617;
                }
                
                .slot-border {
                    border: 3px solid #1e293b;
                    box-shadow: 
                        inset 0 0 10px rgba(0,0,0,0.5),
                        0 0 0 1px rgba(255,255,255,0.05),
                        0 4px 15px rgba(0,0,0,0.8);
                    background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
                }

                .lcd-display {
                    background: var(--lcd-bg);
                    border: 1px solid rgba(255,255,255,0.05);
                    box-shadow: inset 0 2px 10px rgba(0,0,0,0.8);
                    position: relative;
                    overflow: hidden;
                }
                .lcd-display::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to bottom, rgba(255,255,255,0.02) 0%, transparent 50%, rgba(0,0,0,0.1) 100%);
                    pointer-events: none;
                }

                .mechanical-btn {
                    background: linear-gradient(to bottom, #1e293b, #0f172a);
                    border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 4px 0 #020617, 0 8px 15px rgba(0,0,0,0.4);
                    transition: all 0.1s;
                }
                .mechanical-btn:active {
                    transform: translateY(2px);
                    box-shadow: 0 2px 0 #020617, 0 4px 8px rgba(0,0,0,0.4);
                }

                .gold-text {
                    background: linear-gradient(to bottom, #fef08a 0%, #f59e0b 50%, #b45309 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                    font-weight: 900;
                }

                .fire-text {
                    background: linear-gradient(to bottom, #fef08a, #f97316, #ef4444);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.6));
                }

                @font-face {
                    font-family: 'Outfit';
                    src: url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
                }
                @keyframes tile-drop {
                    0% { transform: translateY(-30px) scale(0.9); opacity: 0; filter: blur(10px); }
                    100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
                }
                @keyframes spin-slow {
                    to { transform: rotate(360deg); }
                }
                .animate-tile-drop { animation: tile-drop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                .animate-spin-slow { animation: spin-slow 2s linear infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}

const Tile = React.memo(function Tile({ id, spinning, winLine }: { id: number; spinning: boolean; winLine: boolean }) {
    const sym = SYMBOLS[id] || SYMBOLS[1];
    return (
        <div className={`aspect-[4/5] rounded-xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${spinning ? "scale-95 opacity-50" : "animate-tile-drop"} ${winLine ? "scale-105 z-10" : ""}`}>
            {/* 3D Tile Structure */}
            <div className={`absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-300 rounded-xl border-b-[6px] border-r-[4px] border-slate-400 shadow-[0_10px_20px_rgba(0,0,0,0.5)] ${winLine ? "border-amber-400 brightness-110" : ""}`}></div>
            
            {/* Symbol Layer */}
            <div className="relative z-10 flex flex-col items-center">
                <span className={`text-4xl md:text-5xl font-black select-none transition-all duration-500 transform-gpu ${winLine ? "scale-110" : "scale-100"}`} style={{ color: sym.color, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
                    {sym.char}
                </span>
                
                {id !== 10 && (
                     <div className="mt-2 flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sym.color }}></div>
                        <div className="w-1 h-1 rounded-full opacity-30" style={{ backgroundColor: sym.color }}></div>
                     </div>
                )}
            </div>

            {/* Glossy Reflection */}
            <div className="absolute top-1 left-2 w-1/2 h-[2px] bg-white opacity-40 rounded-full"></div>

            {/* Special Visual: Wild or High Value Aura */}
            {id === 10 && (
                <div className={`absolute inset-0 bg-purple-500/20 mix-blend-overlay`}></div>
            )}
            
            {winLine && (
                <div className="absolute inset-x-2 inset-y-2 border-2 border-amber-400/50 rounded-lg pointer-events-none"></div>
            )}
        </div>
    );
});

function NavIcon({ icon: Icon, label, active, onClick }: any) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all group ${active ? "text-yellow-400 scale-110" : "text-emerald-500/40 hover:text-emerald-300"}`}>
            <div className={`p-1 rounded-lg ${active ? "bg-yellow-400/10" : "group-hover:bg-emerald-500/10"}`}>
                <Icon className="w-5 h-5 shadow-sm" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] font-mono">{label}</span>
        </button>
    );
}
