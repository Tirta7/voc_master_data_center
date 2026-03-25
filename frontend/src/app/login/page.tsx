'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Lock, User, Eye, EyeOff, ShieldCheck, Zap, Clock, ClipboardPaste, XCircle } from 'lucide-react';
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
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 overflow-hidden relative">
            {/* Animated Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/10 rounded-full blur-[120px] animate-pulse delay-700" />

            <div className="w-full max-w-[480px] relative z-10">
                <div className="mb-10 text-center">
                    <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/40 rotate-12 hover:rotate-0 transition-transform duration-500">
                        <Zap className="w-10 h-10 text-white fill-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">VOC BILLIARD</h1>
                    <p className="text-slate-400 font-medium">Enterprise Resource Planning & System Audit</p>
                </div>

                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">{t('login.username')}</label>
                            <div className="relative group/input">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors">
                                    <User className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                                    placeholder="your_username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">{t('login.password')}</label>
                            <div className="relative group/input">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-14 pr-14 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 animate-shake">
                                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {t('login.loginButton')}
                                    <Zap className="w-5 h-5 fill-white group-hover:scale-125 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center space-y-4">
                    <p className="text-slate-500 text-sm font-bold">
                        Forgot access? <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors">Contact System Administrator</span>
                    </p>
                    <div className="flex items-center justify-center gap-6 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-4" alt="Stripe" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" className="h-4" alt="AWS" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Google.png" className="h-4" alt="Google" />
                    </div>
                </div>
            </div>
        </div>
    );
}
