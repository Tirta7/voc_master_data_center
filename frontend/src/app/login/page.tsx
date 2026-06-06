'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Lock, User, Eye, EyeOff, ShieldCheck, Zap, Clock, ClipboardPaste, XCircle, Fingerprint, Activity } from 'lucide-react';
import { socket } from '@/lib/socket';
import AccessPendingOverlay from '@/components/AccessPendingOverlay';
import { useLanguage } from '@/context/LanguageContext';
// import { API_URL } from '@/utils/urlUtils';

export default function LoginPage() {
    const { login, pendingAccessData, handlePendingAccess } = useAuth();
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [businessName, setBusinessName] = useState('VOC BILLIARD');

    React.useEffect(() => {
        axios.get('/settings')
            .then(res => {
                if (res.data?.businessName) {
                    setBusinessName(res.data.businessName);
                }
            })
            .catch(err => console.error('Failed to fetch business name:', err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Ensure socket is connected to get a stable socketId
            if (!socket.connected) {
                socket.connect();
                // Wait up to 3 seconds for connection
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
                    username: username // Ensure username is stored
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
        <div className="min-h-screen bg-gradient-to-br from-[#020617] via-purple-900/20 to-[#020617] bg-[length:400%_400%] animate-gradient-xy flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden relative selection:bg-indigo-500/30">
            {/* Immersive Moving Gradient Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[130px] mix-blend-screen animate-blob" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[130px] mix-blend-screen animate-blob animation-delay-2000" />
            <div className="absolute top-[20%] right-[20%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob animation-delay-4000" />

            <div className="w-full max-w-5xl relative z-10 animate-in fade-in zoom-in duration-1000">
                <div className="flex flex-col md:flex-row group/card transition-all duration-500 w-full relative">
                    
                    {/* Left Column (Branding) */}
                    <div className="w-full md:w-5/12 p-8 md:p-12 flex flex-col justify-center items-center md:items-start text-center md:text-left relative">
                        <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
                        
                        <div className="relative z-10 w-full flex flex-col items-center md:items-start">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/40 transform -rotate-12 group-hover/card:rotate-0 transition-all duration-700 ease-out">
                                <Zap className="w-8 h-8 md:w-10 md:h-10 text-white fill-white animate-pulse" />
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
                        
                        {/* Mobile Icons (only shown on mobile since desktop has it on left column) */}
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
