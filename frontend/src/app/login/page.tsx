'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Lock, User, Eye, EyeOff, ShieldCheck, Zap, Clock, ClipboardPaste, XCircle, Fingerprint, Activity, Sparkles, ArrowRight } from 'lucide-react';
import { socket } from '@/lib/socket';
import AccessPendingOverlay from '@/components/AccessPendingOverlay';
import { useLanguage } from '@/context/LanguageContext';
import { getFullImageUrl } from '@/utils/urlUtils';

export default function LoginPage() {
    const { login, pendingAccessData, handlePendingAccess } = useAuth();
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [businessName, setBusinessName] = useState('VOC BILLIARD');
    const [businessLogo, setBusinessLogo] = useState<string | null>(null);
    const [logoFailed, setLogoFailed] = useState(false);

    // ── Splash Screen Animation States ───────────────────────────────────────
    // 'loading' -> 'ready' -> 'exit' -> 'done'
    const [splashState, setSplashState] = useState<'loading' | 'ready' | 'exit' | 'done'>('loading');
    const [splashProgress, setSplashProgress] = useState(0);

    useEffect(() => {
        // Fetch business settings (businessName & logoPath)
        axios.get('/settings')
            .then(res => {
                if (res.data?.businessName) {
                    setBusinessName(res.data.businessName);
                }
                const rawLogo = res.data?.logoPath || res.data?.logoUrl || res.data?.logo;
                if (rawLogo) {
                    setBusinessLogo(getFullImageUrl(rawLogo));
                }
            })
            .catch(err => console.error('Failed to fetch settings:', err));

        // Animate progress bar to 100%
        const progressInterval = setInterval(() => {
            setSplashProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    setSplashState('ready');
                    return 100;
                }
                return prev + 10;
            });
        }, 70);

        return () => {
            clearInterval(progressInterval);
        };
    }, []);

    const triggerLoginTransition = () => {
        if (splashState === 'ready' || splashState === 'loading') {
            setSplashState('exit');
            setTimeout(() => {
                setSplashState('done');
            }, 850);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (!socket.connected) {
                socket.connect();
                let attempts = 0;
                while (!socket.connected && attempts < 30) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
            }

            const response = await axios.post(`/auth/login`, {
                username,
                password,
                socketId: socket.id
            });

            if (response.data.message === 'ACCESS_PENDING') {
                handlePendingAccess({
                    ...response.data,
                    username: username
                });
            } else {
                login(response.data.access_token, response.data.user);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    if (pendingAccessData) {
        return <AccessPendingOverlay />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#020617] via-purple-950/30 to-[#020617] bg-[length:400%_400%] animate-gradient-xy flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden relative selection:bg-indigo-500/30">
            
            {/* ── INTRO LOGO SPLASH OVERLAY (Slides up when LOGIN button is clicked) ── */}
            {splashState !== 'done' && (
                <div
                    className={`fixed inset-0 z-[9999] bg-[#020617] flex flex-col justify-between items-center transition-all duration-800 ease-in-out px-4 py-8 md:py-12 ${
                        splashState === 'exit'
                            ? '-translate-y-full opacity-0 pointer-events-none'
                            : 'translate-y-0 opacity-100'
                    }`}
                >
                    {/* Atmospheric Glow Orbs */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[500px] md:h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[350px] md:h-[350px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

                    {/* Top Spacer */}
                    <div className="w-full h-8" />

                    {/* Middle: Logo & Branding Center Box */}
                    <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full my-auto">
                        {/* Dynamic Floating Logo Image (No solid box background) */}
                        <div className="relative mb-8 group flex items-center justify-center">
                            {/* Ambient Soft Glow Behind Logo */}
                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse" />
                            
                            {businessLogo && !logoFailed ? (
                                <img
                                    src={businessLogo}
                                    alt={businessName}
                                    onError={() => setLogoFailed(true)}
                                    className="w-28 h-28 md:w-36 md:h-36 object-contain filter drop-shadow-[0_0_30px_rgba(99,102,241,0.6)] animate-in zoom-in-75 duration-700 hover:scale-105 transition-all relative z-10"
                                />
                            ) : (
                                <div className="relative w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/50 border border-white/20">
                                    <Zap className="w-12 h-12 md:w-14 md:h-14 text-white fill-white animate-pulse" />
                                </div>
                            )}
                        </div>

                        {/* Business Title */}
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-[0.2em] uppercase mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/60 drop-shadow-lg">
                            {businessName}
                        </h1>

                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                            <span>ENTERPRISE OS • SYSTEM AUDIT</span>
                        </p>
                    </div>

                    {/* Bottom: Action Button Container (Placed at bottom of screen) */}
                    <div className="relative z-10 w-full max-w-md px-4 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
                        {/* Stage 1: Loading Progress Bar */}
                        {splashState === 'loading' && (
                            <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
                                <div className="w-full max-w-xs h-1.5 bg-slate-800/80 rounded-full overflow-hidden mb-3 border border-white/5 relative">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 transition-all duration-150 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]"
                                        style={{ width: `${splashProgress}%` }}
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                                    <span>MEMUAT SISTEM OS ({splashProgress}%)...</span>
                                </div>
                            </div>
                        )}

                        {/* Stage 2: Prominent Bottom Glowing LOGIN Button */}
                        {(splashState === 'ready' || splashState === 'exit') && (
                            <div className="flex flex-col items-center w-full animate-in slide-in-from-bottom-6 fade-in duration-500">
                                <button
                                    onClick={triggerLoginTransition}
                                    className="group relative w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs md:text-sm uppercase tracking-[0.25em] rounded-2xl border border-white/20 shadow-[0_0_35px_rgba(99,102,241,0.5)] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                                >
                                    <span>MASUK SEKARANG</span>
                                    <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform" />
                                </button>
                                <p className="mt-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>KLIK UNTUK MEMBUKA FORM LOGIN</span>
                                </p>
                            </div>
                        )}

                        <div className="text-[8px] md:text-[9px] font-semibold text-slate-600 uppercase tracking-widest mt-2">
                            VOC ENTERPRISE SYSTEM • V-SYSTEM 4.0
                        </div>
                    </div>
                </div>
            )}

            {/* Immersive Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[130px] mix-blend-screen animate-blob" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[130px] mix-blend-screen animate-blob animation-delay-2000" />
            <div className="absolute top-[20%] right-[20%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob animation-delay-4000" />

            {/* ── LOGIN FORM CARD (Slides UP into view when LOGIN button is clicked) ── */}
            <div
                className={`w-full max-w-5xl relative z-10 transition-all duration-800 ease-out ${
                    splashState === 'loading' || splashState === 'ready'
                        ? 'translate-y-12 opacity-0'
                        : 'translate-y-0 opacity-100'
                }`}
            >
                <div className="flex flex-col md:flex-row group/card transition-all duration-500 w-full relative">
                    
                    {/* Left Column (Branding) */}
                    <div className="w-full md:w-5/12 p-8 md:p-12 flex flex-col justify-center items-center md:items-start text-center md:text-left relative">
                        <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
                        
                        <div className="relative z-10 w-full flex flex-col items-center md:items-start">
                            {/* Dynamic Floating Business Logo or Lightning Icon */}
                            <div className="mb-6 relative flex items-center justify-center">
                                {businessLogo && !logoFailed ? (
                                    <img
                                        src={businessLogo}
                                        alt={businessName}
                                        onError={() => setLogoFailed(true)}
                                        className="w-20 h-20 md:w-24 md:h-24 object-contain filter drop-shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:scale-105 transition-transform"
                                    />
                                ) : (
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/40 transform -rotate-12 group-hover/card:rotate-0 transition-all duration-700 ease-out border border-white/20">
                                        <Zap className="w-8 h-8 md:w-10 md:h-10 text-white fill-white animate-pulse" />
                                    </div>
                                )}
                            </div>

                            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 leading-tight">
                                {businessName.toUpperCase()}
                            </h1>
                            <div className="flex items-center gap-3 mb-2 md:mb-8">
                                <div className="h-px w-6 md:w-0 bg-gradient-to-r from-transparent to-slate-500 md:hidden" />
                                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px] md:text-[10px]">
                                    Enterprise OS • System Audit
                                </p>
                                <div className="h-px w-12 bg-gradient-to-r from-slate-500 to-transparent hidden md:block" />
                                <div className="h-px w-6 bg-gradient-to-l from-transparent to-slate-500 md:hidden" />
                            </div>

                            <div className="hidden md:flex items-center gap-6 opacity-30 mt-auto pt-12">
                                <Fingerprint className="w-5 h-5 text-white" />
                                <ShieldCheck className="w-5 h-5 text-white" />
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Form) */}
                    <div className="w-full md:w-7/12 p-6 md:p-12 relative flex flex-col justify-center">
                        
                        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6 relative z-10 max-w-md mx-auto w-full">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex justify-between items-center">
                                    {t('login.username')}
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping mr-1" />
                                </label>
                                <div className="relative group/input">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors z-10">
                                        <User className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-black/40 border-0 rounded-xl py-4 md:py-4 pl-12 pr-4 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 text-sm md:text-base relative z-0"
                                        placeholder="Tirta_id"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t('login.password')}</label>
                                <div className="relative group/input">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors z-10">
                                        <Lock className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="w-full bg-black/40 border-0 rounded-xl py-4 md:py-4 pl-12 pr-12 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 text-sm md:text-base relative z-0"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1 z-10"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-tight flex items-center gap-2 animate-shake border-l-4 border-l-rose-500">
                                    <XCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="pt-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full relative group/btn overflow-hidden rounded-xl"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-800 group-hover/btn:from-indigo-500 group-hover/btn:to-indigo-700 transition-all duration-500" />
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] group-hover/btn:animate-[shimmer_2s_infinite] pointer-events-none" />
                                    
                                    <div className="relative py-4 font-black text-sm md:text-base text-white shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                                        {loading ? (
                                            <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                {t('login.loginButton')}
                                                <Zap className="w-4 h-4 fill-white group-hover/btn:scale-125 transition-transform" />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </form>

                        {/* Security Manifest Footer */}
                        <div className="mt-8 md:mt-12 pt-6 border-t border-white/5 flex items-center justify-between text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest max-w-md mx-auto w-full">
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <ShieldCheck className="w-3 h-3 text-indigo-500 opacity-50" />
                                <span>AES-256 SECURED</span>
                            </div>
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span>V-SYSTEM 4.0 ACTIVE</span>
                            </div>
                        </div>
                        
                        {/* Mobile Icons */}
                        <div className="flex md:hidden items-center justify-center gap-6 opacity-20 mt-6">
                            <Fingerprint className="w-4 h-4 text-white" />
                            <ShieldCheck className="w-4 h-4 text-white" />
                            <Activity className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
