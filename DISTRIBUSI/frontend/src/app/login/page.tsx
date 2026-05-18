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
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 overflow-hidden relative selection:bg-indigo-500/30">
            {/* Immersive Background Blobs */}
            <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-blob" />
            <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-rose-600/10 rounded-full blur-[120px] animate-blob animation-delay-2000" />
            <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px] animate-blob animation-delay-4000" />

            <div className="w-full max-w-[480px] relative z-10 animate-in fade-in zoom-in duration-1000">
                <div className="mb-12 text-center">
                    <div className="relative inline-block group">
                        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/40 transform -rotate-12 group-hover:rotate-0 transition-all duration-700 ease-out border border-white/20">
                            <Zap className="w-12 h-12 text-white fill-white animate-pulse" />
                        </div>
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-3 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        {businessName.toUpperCase()}
                    </h1>
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-500" />
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                            Enterprise OS • System Audit
                        </p>
                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-500" />
                    </div>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 lg:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group/card transition-all duration-500 hover:border-white/20">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 opacity-50 group-hover/card:opacity-100 transition-opacity" />
                    
                    {/* Inner Glow */}
                    <div className="absolute inset-0 rounded-[3rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] pointer-events-none" />

                    <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] ml-2 flex justify-between items-center">
                                {t('login.username')}
                                <span className="w-1 h-1 bg-indigo-500 rounded-full animate-ping" />
                            </label>
                            <div className="relative group/input">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-all duration-300">
                                    <User className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 pl-16 pr-6 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-slate-700 text-base"
                                    placeholder="operator_id"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                                <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] ml-2">{t('login.password')}</label>
                            <div className="relative group/input">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-all duration-300">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 pl-16 pr-16 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-slate-700 text-base"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors p-2"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                                <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500" />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl text-[11px] font-black uppercase tracking-tight flex items-center gap-3 animate-shake border-l-4 border-l-rose-500">
                                <XCircle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative group/btn overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-800 group-hover/btn:from-indigo-500 group-hover/btn:to-indigo-700 transition-all duration-500" />
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] group-hover/btn:animate-[shimmer_2s_infinite] pointer-events-none" />
                            
                            <div className="relative py-5 rounded-2xl font-black text-lg text-white shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-transform active:scale-[0.98]">
                                {loading ? (
                                    <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {t('login.loginButton')}
                                        <Zap className="w-5 h-5 fill-white group-hover/btn:scale-125 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    {/* Security Manifest Footer */}
                    <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-indigo-500 opacity-50" />
                            <span>AES-256 SECURED</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span>V-SYSTEM 4.0 ACTIVE</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] space-y-4">
                    <p className="opacity-50">Authorized Personnel Only</p>
                    <div className="flex items-center justify-center gap-8 opacity-20 hover:opacity-100 transition-all duration-1000">
                        <Fingerprint className="w-6 h-6" />
                        <ShieldCheck className="w-6 h-6" />
                        <Activity className="w-6 h-6" />
                    </div>
                </div>
            </div>
        </div>
    );
}
