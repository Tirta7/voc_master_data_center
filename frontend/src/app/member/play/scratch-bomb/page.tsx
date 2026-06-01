"use client";

import { useEffect, useState, useCallback, useRef, memo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { ChevronLeft, Gift, Bomb, PlayCircle, TrendingUp, Sparkles, Target, Zap, History } from "lucide-react";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import { socket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";

// --- MEMOIZED MINI-COMPONENTS FOR EXTREME PERFORMANCE ---
const Box = memo(({ index, value, isOpened, isMatch, onClick, highTension, row, col }: any) => {
  const [localOpen, setLocalOpen] = useState(isOpened);
  const uniqueId = `box_r${row || 0}_c${col || 0}`;

  useEffect(() => {
    setLocalOpen(isOpened);
  }, [isOpened]);

  const onBoxClick = useCallback((e: any) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    if (!localOpen && !isOpened) {
      setLocalOpen(true);
      onClick(index, uniqueId);
    }
  }, [localOpen, isOpened, index, uniqueId, onClick]);

  const displayOpen = localOpen || isOpened;

  return (
    <motion.div 
      layout
      onPointerDown={onBoxClick}
      className={`relative w-full aspect-square transition-all duration-300 ${
        displayOpen 
          ? "cursor-default pointer-events-none opacity-100" 
          : "cursor-pointer hover:scale-105 active:scale-95"
      }`}
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      <div className={`w-full h-full rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
        displayOpen 
          ? (value === "BOMB" ? "bg-red-500/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-orange-500/10 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]") 
          : "bg-slate-900 border-white/10 hover:border-white/30"
      }`}>
        {displayOpen ? (
          value === "BOMB" ? (
             <Bomb className="w-8 h-8 text-red-500 animate-pulse" />
          ) : (
             <div className="flex flex-col items-center">
                <span className="text-3xl font-black font-mono text-orange-400 tracking-tighter">{value}</span>
                <span className="text-[8px] font-black text-orange-400/60 uppercase -mt-1">POINTS</span>
             </div>
          )
        ) : (
          <div className="flex flex-col items-center opacity-10">
             <Target className={`w-5 h-5 text-white ${highTension ? "animate-pulse text-amber-500 opacity-100" : ""}`} />
             <span className="text-[6px] font-mono mt-1">{row}:{col}</span>
          </div>
        )}
      </div>
      {highTension && !displayOpen && (
        <div className="absolute inset-0 rounded-lg border border-amber-500/30 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.2)]"></div>
      )}
    </motion.div>
  );
});
Box.displayName = 'Box';

// import { getApiUrl } from '@/utils/urlUtils';
// const API_URL = getApiUrl();

// --- GLOBAL PATCHES ---
if (typeof window !== 'undefined') {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type: string, listener: any, options?: any) {
    let modOptions = options;
    if (['touchstart', 'touchmove', 'mousemove', 'mousedown', 'mouseup', 'touchcancel', 'wheel', 'scroll'].includes(type)) {
      if (typeof options === 'object') {
        modOptions = { ...options, passive: false };
      } else if (typeof options === 'boolean') {
        modOptions = { capture: options, passive: false };
      } else {
        modOptions = { passive: false };
      }
    }
    return originalAddEventListener.call(this, type, listener, modOptions);
  };
}

const GLOBAL_SCRATCH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=JetBrains+Mono:wght@800&display=swap');
  :root { --gold: #f59e0b; --gold-light: #fef08a; --gold-dark: #b45309; --royal-blue: #6366f1; --danger: #ef4444; --lcd-bg: #020617; }
  * { -webkit-tap-highlight-color: transparent; }
  html, body { overscroll-behavior: none; background: #020617; color: white; }
  .gold-text { background: linear-gradient(to bottom, #fef08a 0%, #f59e0b 50%, #b45309 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); font-weight: 900; }
  .glass-card { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); }
  .animate-marquee { display: flex; width: max-content; animation: marquee 25s linear infinite; }
  @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
`;

const GlobalWinToast = ({ win }: any) => (
  <div className="fixed top-20 right-4 z-[9999] animate-bounce-in bg-slate-900/95 backdrop-blur-xl border-2 border-yellow-500/50 rounded-2xl p-4 shadow-2xl max-w-[280px]">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/40">
        <Sparkles className="w-6 h-6 text-black" />
      </div>
      <div>
        <p className="text-[11px] font-black text-yellow-500 uppercase tracking-widest">Global Big Win!</p>
        <p className="text-white font-black text-base">{win.memberName}</p>
        <p className="text-white/60 text-[10px] font-bold uppercase tracking-tighter">WIN <span className="text-yellow-400">+{win.amount} PTS</span> on {win.game}</p>
      </div>
    </div>
  </div>
);

export default function ScratchBombPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '1';
  const [points, setPoints] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [gameResult, setGameResult] = useState<any[]>([]);
  const [scratchedBoxes, setScratchedBoxes] = useState<number[]>([]);
  const [gameOverMessage, setGameOverMessage] = useState("");
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const isGameOverRef = useRef(false);
  const scratchedBoxesRef = useRef<number[]>([]);
  const [winReward, setWinReward] = useState(0);
  const [winMultiplier, setWinMultiplier] = useState(1);
  const [winValidation, setWinValidation] = useState<any>(null); // EXPERT PAYLOAD
  const [highTension, setHighTension] = useState(false);
  const [playCost, setPlayCost] = useState(2);
  const [betAmount, setBetAmount] = useState(2);
  const [isStarting, setIsStarting] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [currentPlayRef, setCurrentPlayRef] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [winRate, setWinRate] = useState(50);
  const [showPaytable, setShowPaytable] = useState(false);
  const [isAutoReveal, setIsAutoReveal] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);
  const [winnersFeed, setWinnersFeed] = useState<any[]>([]);
  const [autoPlayCount, setAutoPlayCount] = useState<number>(0); 
  const [isWonGame, setIsWonGame] = useState(false);
  const [winPool, setWinPool] = useState(0);
  const [showScatterShop, setShowScatterShop] = useState(false);
  const [activeScatter, setActiveScatter] = useState(0);
  const [globalWin, setGlobalWin] = useState<any>(null);
  const [activePlayers, setActivePlayers] = useState(0);
  const [showMultiplierPopup, setShowMultiplierPopup] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [liveV, setLiveV] = useState(1.0);
  const [hitLock, setHitLock] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [personalHistory, setPersonalHistory] = useState<any[]>([]);

  const isStartingRef = useRef(false);
  const autoPlayCountRef = useRef(0);
  const pointsRef = useRef(0);

  useEffect(() => { isStartingRef.current = isStarting; }, [isStarting]);
  useEffect(() => { autoPlayCountRef.current = autoPlayCount; }, [autoPlayCount]);
  useEffect(() => { pointsRef.current = points; }, [points]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const playSound = useCallback((type: 'coin' | 'win' | 'jackpot' | 'explosion') => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContextClass();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === 'coin') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); }
      else if (type === 'explosion') { osc.type = 'square'; osc.frequency.setValueAtTime(60, now); gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6); osc.start(now); osc.stop(now + 0.6); }
      else if (type === 'jackpot') { osc.type = 'sine'; osc.frequency.setValueAtTime(880, now); gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2); osc.start(now); osc.stop(now + 1.2); }
      else if (type === 'win') { osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5); osc.start(now); osc.stop(now + 0.5); }
    } catch (e) {}
  }, []);

  useBodyScrollLock(isPlaying && !showResultOverlay);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [memberRes, statsRes] = await Promise.all([
          axios.get(`/loyalty/portal/member/${id}`),
          axios.get(`/loyalty/portal/game/stats`)
        ]);
        if (memberRes.data) { setPoints(memberRes.data.points); setPlayCost(memberRes.data.scratchBombPlayCost || 2); }
        if (statsRes.data) { setWinPool(statsRes.data.winPool || 0); setWinRate(statsRes.data.scratchBombWinRate || 50); setActivePlayers(statsRes.data.activePlayers || 0); }
      } catch (err) {}
    };
    fetchData();
    socket.connect();
    socket.on('loyalty_updated', (data: any) => {
      if (data.type === 'ADJUST' && String(data.memberId) === String(id)) setPoints(data.newBalance);
      if (data.type === 'GLOBAL_BIG_WIN') { setGlobalWin(data); setTimeout(() => setGlobalWin(null), 5000); }
      if (data.type === 'SETTINGS_UPDATE') {
        if (data.settings?.winPool !== undefined) setWinPool(data.settings.winPool);
        if (data.settings?.scratchBombWinRate !== undefined) setWinRate(data.settings.scratchBombWinRate);
        if (data.settings?.activePlayers !== undefined) setActivePlayers(data.settings.activePlayers);
      }
    });
    setWinnersFeed([{ id:1, name:"PLAYER_ONE", amount:500, tier:"JACKPOT" }, { id:2, name:"PLAYER_TWO", amount:100, tier:"BIG WIN" }]);
  }, [id]);

  const startGame = async () => {
    if (isStarting) return;
    try {
      if (points < betAmount) { setAutoPlayCount(0); alert("Poin tidak cukup!"); return; }
      playSound('coin');
      setIsStarting(true); setShowResultOverlay(false);
      const res = await axios.post(`/loyalty/game/scratch`, { memberId: parseInt(id, 10), betAmount });
      const data = res.data;
      setTimeout(() => {
        setPoints(Number(data.newBalance));
        setGameResult(data.matrix_map || data.result || []);
        setWinValidation(data.win_validation || null);
        setScratchedBoxes([]);
        scratchedBoxesRef.current = [];
        setIsGameOver(false); isGameOverRef.current = false;
        
        // --- SINGLE SOURCE OF TRUTH ---
        let win = false; let reward = 0; let mult = 1;
        if (data.win_validation) {
            win = data.win_validation.is_winner;
            reward = data.win_validation.payout_amount;
            mult = data.win_validation.multiplier;
        } else {
            win = data.isWin || false; reward = data.winReward || 0; mult = data.multiplier || 1;
        }

        setWinReward(reward);
        setWinMultiplier(mult);
        setIsWonGame(win);
        setLiveV(data.liveV || 1.0);
        if (data.activePlayers !== undefined) setActivePlayers(data.activePlayers);
        setCurrentPlayRef(data.session_id || data.referenceId || null);
        setIsPlaying(true);
        setGameKey(p => p + 1);
        setIsStarting(false);
      }, 50);
    } catch (err) { setIsStarting(false); setIsPlaying(false); }
  };

  const handleBoxClick = useCallback((idx: number) => {
    if (isGameOverRef.current || isProcessing || isStarting || scratchedBoxesRef.current.includes(idx)) return;
    
    // Priority 0: Instant Lockdown if BOM
    const val = gameResult[idx];
    scratchedBoxesRef.current.push(idx);
    setScratchedBoxes([...scratchedBoxesRef.current]);

    if (val === "BOMB") {
      setIsGameOver(true);
      isGameOverRef.current = true;
      setIsWonGame(false);
      setIsProcessing(true);
      setGameOverMessage(scratchedBoxesRef.current.length === 1 ? "ZONK! KOTAK PERTAMA BOM!" : "BOOM! Kena Bom!");
      playSound('explosion');

      const unrevealed = Array.from({ length: 25 }, (_, i) => i)
        .filter(i => !scratchedBoxesRef.current.includes(i))
        .sort(() => Math.random() - 0.5); // Random pop order
        
      const revealDelay = isTurbo ? 10 : 60;
      let currentReveal = 0;
      
      const revealInterval = setInterval(() => {
        if (currentReveal < unrevealed.length) {
          scratchedBoxesRef.current.push(unrevealed[currentReveal]);
          setScratchedBoxes([...scratchedBoxesRef.current]);
          currentReveal++;
        } else {
          clearInterval(revealInterval);
          const finalDelay = isTurbo ? 300 : 1200;
          setTimeout(() => {
            setIsProcessing(false);
            if (autoPlayCountRef.current !== 0) {
              if (autoPlayCountRef.current > 0) setAutoPlayCount(p => p - 1);
              if (autoPlayCountRef.current !== 0 && pointsRef.current >= betAmount) startGame();
              else setShowResultOverlay(true);
            } else {
              setShowResultOverlay(true);
            }
          }, finalDelay);
        }
      }, revealDelay);
      
      return;
    }

    // Logic for Cumulative Match-4
    const matches = scratchedBoxesRef.current.filter(i => gameResult[i] === val).length;
    
    if (matches < 4) {
      playSound('coin');
    }

    // High Tension Trigger: Finding 3 of a kind
    if (matches === 3) {
      setHighTension(true);
      // Visual feedback here if needed
    }

    if (matches === 4) {
      // --- SERVER-SIDE AUTHORITATIVE VALIDATION ---
      let isValidWin = true;
      let hash = "";
      if (winValidation) {
          isValidWin = winValidation.is_winner && winValidation.matching_symbol === val;
          hash = winValidation.secure_hash;
      }

      setIsGameOver(true);
      isGameOverRef.current = true;
      setIsProcessing(true);
      
      if (isValidWin) {
          setIsWonGame(true);
          setGameOverMessage(winReward >= betAmount * 10 ? "MEGA WIN!" : "VICTORY!");
          playSound('win');
          setPersonalHistory(prev => [{ 
            reward: winReward, 
            type: winReward >= betAmount * 10 ? "MEGA WIN" : "SMALL WIN", 
            multiplier: winMultiplier, 
            time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'}) 
          }, ...prev]);
          if (winMultiplier >= 5) setShowConfetti(true);
          axios.post(`/loyalty/game/scratch/claim`, { memberId: parseInt(id, 10), referenceId: currentPlayRef, security_hash: hash });
      } else {
          setIsWonGame(false);
          setGameOverMessage("ANOMALY BLOCKED");
          playSound('explosion');
      }

      const delay = isTurbo ? 600 : 2500;
      setTimeout(() => {
        setIsProcessing(false);
        setHighTension(false);
        if (autoPlayCountRef.current !== 0) {
          if (autoPlayCountRef.current > 0) setAutoPlayCount(p => p - 1);
          if (autoPlayCountRef.current !== 0 && pointsRef.current >= betAmount) startGame();
          else setShowResultOverlay(true);
        } else {
          setShowResultOverlay(true);
        }
      }, delay);
    }
  }, [gameResult, isStarting, isProcessing, winReward, winMultiplier, isWonGame, currentPlayRef, id, betAmount, playSound, isTurbo]);

  // --- AUTO BREACH ENGINE ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoReveal && isPlaying && !isGameOverRef.current && !isProcessing && !isStarting) {
      interval = setInterval(() => {
        const unrevealed = Array.from({ length: 25 }, (_, i) => i).filter(i => !scratchedBoxesRef.current.includes(i));
        if (unrevealed.length > 0) {
          const randomIndex = Math.floor(Math.random() * unrevealed.length);
          handleBoxClick(unrevealed[randomIndex]);
        }
      }, isTurbo ? 15 : 280);
    }
    return () => clearInterval(interval);
  }, [isAutoReveal, isPlaying, isProcessing, isStarting, isTurbo, handleBoxClick]);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(67,56,202,0.15)_0%,transparent_60%)] pointer-events-none"></div>

      <AnimatePresence>
        {showPaytable && (
           <div className="fixed inset-0 z-[200] flex items-center sm:items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
              <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="w-full max-w-[420px] glass-card rounded-[3rem] p-10 border-white/10">
                 <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black gold-text tracking-widest">ROYAL PAYTABLE</h3>
                    <button onClick={() => setShowPaytable(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">✕</button>
                 </div>
                 <div className="space-y-4">
                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between">
                       <p className="text-[11px] font-black text-yellow-400">QUAD-LINK JACKPOT</p>
                       <p className="text-xs font-black">UP TO 500x</p>
                    </div>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      <div className="bg-indigo-950/60 border-y border-white/5 py-2 overflow-hidden relative z-40">
         <div className="animate-marquee flex gap-12 items-center">
            {winnersFeed.concat(winnersFeed).map((win, i) => (
               <div key={i} className="flex items-center gap-3 whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-[11px] font-bold text-white/50">{win.name}</span>
                  <span className="text-[11px] font-black text-indigo-400">{win.tier}: {win.amount} PTS</span>
               </div>
            ))}
         </div>
      </div>

      <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
          <Link href={`/member/dashboard?id=${id}`} className="p-3 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl pointer-events-auto"><ChevronLeft className="w-5 h-5"/></Link>
          <button onClick={() => setShowPaytable(true)} className="p-3 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl pointer-events-auto"><TrendingUp className="w-5 h-5"/></button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative z-10 px-5 pt-20 pb-2">
         <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex items-center justify-between mb-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
             <div className="flex flex-col relative z-20">
                <p className="text-[9px] text-amber-500 font-black tracking-[0.2em] mb-1 uppercase">WINPOOL AMMUNITION</p>
                <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-black font-mono gold-text">{(winPool || 0).toLocaleString()}</span>
                   <span className="text-[10px] text-amber-500 font-bold uppercase">PTS</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                   <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/20">
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></span>
                      <span className="text-[6px] font-black text-indigo-300 uppercase leading-none">{activePlayers} SESSIONS</span>
                   </div>
                   <p className="text-[7px] text-amber-500/40 font-black uppercase tracking-widest leading-none">AI LIQUIDITY</p>
                </div>
             </div>
             <div className="flex flex-col items-center relative z-10 gap-2">
                <div className="text-right">
                   <p className="text-[8px] text-white/30 font-black mb-0.5 uppercase tracking-widest leading-none">CASHIER BALANCE</p>
                   <span className="text-lg font-mono font-black text-indigo-400">{(points || 0).toLocaleString()} <span className="text-[8px] opacity-40">PTS</span></span>
                </div>
                <div className="text-right">
                   <p className="text-[8px] text-white/30 font-black mb-0.5 uppercase tracking-widest leading-none">V-CORE INDEX</p>
                   <span className={`text-lg font-mono font-black transition-colors duration-500 ${liveV > 5 ? "text-red-400" : "text-emerald-400"}`}>{liveV.toFixed(2)}</span>
                </div>
             </div>
         </div>

         {!isPlaying ? (
           <div className="min-h-[50vh] flex flex-col items-center justify-center text-center py-6">
              <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-950/80 border-2 border-indigo-500/30 flex items-center justify-center mb-8" onClick={startGame}>
                 <PlayCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-black text-white mb-8 tracking-tighter uppercase">SCRATCH <br/><span className="gold-text">ROYALE</span></h2>
              <div className="w-full max-w-[320px] mb-8 grid grid-cols-4 gap-2">
                 {[1, 2, 5, 10, 20, 50, 100, 250].map(amt => (
                    <button key={amt} onClick={() => setBetAmount(amt)} className={`py-2.5 rounded-xl font-mono text-xs font-black ${betAmount === amt ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white/40'}`}>{amt}</button>
                 ))}
              </div>
              <button onClick={startGame} disabled={isStarting} className="w-full max-w-[260px] bg-white text-black py-4 rounded-2xl font-black opacity-100 disabled:opacity-50">
                 {isStarting ? "SYNCHING..." : "ENTER SESSION"}
              </button>
           </div>
         ) : (
           <div className="flex flex-col items-center flex-1 min-h-0 overflow-y-auto no-scrollbar">
               <div className="w-full mb-3 flex items-center justify-between px-2">
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Psychology RTP</span>
                       <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                             <div key={i} className={`w-4 h-1 rounded-full ${i <= (winRate/20) ? "bg-amber-500" : "bg-white/10"}`}></div>
                          ))}
                       </div>
                    </div>
                  </div>
               </div>

                <div className="w-full flex-shrink-0 flex items-center justify-center relative">
                   <div className={`w-[400px] h-[400px] grid grid-cols-5 gap-3 p-3 rounded-3xl bg-black/60 border-2 transition-all duration-700 ${isGameOver ? "pointer-events-none grayscale-[0.8]" : ""} ${highTension ? "border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.15)] ring-4 ring-amber-500/10" : "border-white/5"}`}>
                     {gameResult.map((val: any, idx: number) => (
                        <Box key={`${gameKey}-${idx}`} index={idx} row={Math.floor(idx/5)+1} col={(idx%5)+1} value={val} isOpened={scratchedBoxes.includes(idx)} onClick={handleBoxClick} highTension={highTension} />
                     ))}
                   </div>
                   {highTension && !isGameOver && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.3em] animate-bounce shadow-xl">Quantum Sync Detected</div>
                    )}
                   {isProcessing && !isTurbo && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="px-6 py-3 bg-indigo-600 text-white font-black rounded-full animate-pulse shadow-2xl text-[10px] tracking-widest uppercase">Analyzing DNA...</div>
                       </div>
                    )}
                </div>

               <div className="mt-3 text-[10px] font-black text-white/10 tracking-[0.3em] uppercase">ABY-204 - PROBABLE GAIN</div>

               <div className="w-full max-w-[400px] mt-6">
                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-black text-white/40 uppercase">Session Logs:</span>
                    {personalHistory.map((log, i) => (
                        <div key={i} className="flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
                           <span className="text-xs font-black text-orange-400">+{log.reward}</span>
                           {log.multiplier > 1 && <span className="text-[10px] text-yellow-500">x{log.multiplier}</span>}
                        </div>
                    ))}
                  </div>
               </div>

               <div className="w-full mt-10 bg-black/40 backdrop-blur-xl rounded-[2rem] p-6 border border-white/5 max-w-[420px] mb-20 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
                  
                  <div className="flex items-center justify-between mb-5">
                     <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-400" />
                        <p className="text-[10px] font-black text-white/40 tracking-[0.3em]">AUTO BREACH</p>
                     </div>
                     {autoPlayCount !== 0 && (
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black text-indigo-400 animate-pulse">{autoPlayCount > 0 ? `${autoPlayCount} LEFT` : "∞ ACTIVE"}</span>
                           <button onClick={() => { setAutoPlayCount(0); setIsAutoReveal(false); }} className="px-5 py-1.5 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)]">STOP</button>
                        </div>
                     )}
                  </div>
                  
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-1.5 flex gap-1 mb-4 shadow-inner">
                     {[5, 10, 30, 50, 100].map(c => (
                         <button key={c} onClick={() => { setAutoPlayCount(c); setIsAutoReveal(true); }} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${autoPlayCount === c ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" : "text-white/30 hover:text-white hover:bg-white/5"}`}>{c}</button>
                     ))}
                     <button onClick={() => { setAutoPlayCount(-1); setIsAutoReveal(true); }} className={`w-14 py-3 rounded-xl text-[14px] font-black transition-all ${autoPlayCount === -1 ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" : "text-indigo-400 hover:text-indigo-300 hover:bg-white/5"}`}>∞</button>
                  </div>
                  
                  <button onClick={() => setIsTurbo(!isTurbo)} className={`w-full py-3 rounded-2xl border flex items-center justify-center gap-2 transition-all duration-300 ${isTurbo ? "bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10"}`}>
                     <Target className={`w-4 h-4 ${isTurbo ? "animate-spin-slow" : ""}`} />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isTurbo ? "TURBO OVERDRIVE" : "ENABLE TURBO"}</span>
                  </button>
               </div>
            </div>
         )}
      </div>

      <AnimatePresence>
        {showResultOverlay && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
              <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} className={`relative w-full max-w-[380px] rounded-[3rem] border-2 glass-card p-10 flex flex-col items-center ${isWonGame ? "border-amber-500/50" : "border-white/10"}`}>
                  <div className={`w-24 h-24 mb-8 rounded-full flex items-center justify-center border-4 ${isWonGame ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.2)]" : "border-slate-500/50 bg-slate-500/10 shadow-[0_0_30px_rgba(100,116,139,0.2)]"}`}>
                     {isWonGame ? <Sparkles className="w-12 h-12 text-amber-500" /> : <Bomb className="w-12 h-12 text-slate-400" />}
                  </div>
                 
                 <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.4em] mb-2">RESULTS DECLARED</p>
                  <h2 className={`text-4xl font-black mb-8 text-center uppercase tracking-tighter ${isWonGame ? "gold-text" : "text-white"}`}>
                     {isWonGame ? (winReward >= betAmount * 10 ? "MEGA WIN!" : "VICTORY!") : (gameOverMessage)}
                  </h2>

                 <div className="w-full bg-slate-900/80 border border-white/5 rounded-[2.5rem] p-10 mb-8 text-center relative overflow-hidden">
                    <div className="absolute top-2 right-6 px-2 py-0.5 rounded bg-white/5 text-[7px] font-black text-white/40 border border-white/10">CERTIFIED SAFE</div>
                    
                    {winMultiplier > 1 && isWonGame && (
                       <div className="absolute -left-6 top-8 transform -rotate-12 bg-red-600 border-2 border-red-400 font-black text-white px-8 py-1 tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.5)] z-20">
                          BOOST x{winMultiplier}
                       </div>
                    )}
                    
                    <p className={`${isWonGame ? "text-amber-500/60" : "text-slate-500/60"} text-[10px] font-black mb-2 uppercase tracking-widest relative z-10`}>TOTAL YIELD</p>
                    <p className={`text-7xl font-black font-mono tracking-tighter relative z-10 ${winMultiplier > 1 && isWonGame ? "text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "text-white"}`}>
                       +{isWonGame ? winReward : 0}
                    </p>
                    <p className="text-[8px] font-mono text-white/20 mt-4 relative z-10">TX-ID: {currentPlayRef || "N/A"}</p>
                    
                    {winMultiplier > 1 && isWonGame && (
                        <div className="absolute inset-0 bg-amber-500/10 animate-pulse"></div>
                    )}
                 </div>

                 <button onClick={startGame} className="w-full py-5 rounded-[2rem] font-black text-sm bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all outline-none">
                    <PlayCircle className="w-5 h-5"/> CONTINUE CYCLE
                 </button>
                 
                 <button onClick={() => setShowResultOverlay(false)} className="mt-8 text-[11px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white transition-colors">EXIT TO VAULT</button>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {globalWin && <GlobalWinToast win={globalWin} />}

      <style dangerouslySetInnerHTML={{ __html: GLOBAL_SCRATCH_STYLES }} />
      <style jsx global>{`
         @keyframes scanline { 0% { transform: translateY(-100%); opacity:0; } 50% { opacity:1; } 100% { transform: translateY(500%); opacity:0; } }
         .animate-marquee { animation: marquee 20s linear infinite; }
         @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}
