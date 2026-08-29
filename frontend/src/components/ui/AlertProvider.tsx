'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, CheckCircle, HelpCircle, Info, Lock } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface AlertOptions {
    variant?: 'success' | 'error' | 'warning' | 'info';
    confirmLabel?: string;
    cancelLabel?: string;
    requirePin?: boolean;
}

interface AlertContextType {
    showAlert: (title: string, message: string, options?: AlertOptions) => Promise<void>;
    showConfirm: (title: string, message: string, options?: AlertOptions) => Promise<any>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

interface AlertState {
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    variant: 'success' | 'error' | 'warning' | 'info';
    confirmLabel: string;
    cancelLabel: string;
    requirePin?: boolean;
    resolve: (value: any) => void;
}

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<AlertState | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');

    useBodyScrollLock(!!state?.isOpen);

    const showAlert = useCallback((title: string, message: string, options?: AlertOptions) => {
        setIsProcessing(false);
        return new Promise<void>((resolve) => {
            setState({
                isOpen: true,
                type: 'alert',
                title,
                message,
                variant: options?.variant || 'info',
                confirmLabel: options?.confirmLabel || 'OK',
                cancelLabel: '',
                resolve: () => {
                    setState(null);
                    resolve();
                },
            });
        });
    }, []);

    const showConfirm = useCallback((title: string, message: string, options?: AlertOptions) => {
        setIsProcessing(false);
        setPin('');
        setPinError('');
        return new Promise<any>((resolve) => {
            setState({
                isOpen: true,
                type: 'confirm',
                title,
                message,
                variant: options?.variant || 'warning',
                confirmLabel: options?.confirmLabel || 'Ya, Lanjutkan',
                cancelLabel: options?.cancelLabel || 'Batal',
                requirePin: options?.requirePin,
                resolve: (val) => {
                    setState(null);
                    resolve(val);
                },
            });
        });
    }, []);

    const handleClose = (result: boolean) => {
        if (state?.resolve && !isProcessing) {
            if (result && state.requirePin) {
                if (!pin || pin.trim().length < 4) {
                    setPinError('Mohon masukkan PIN (Min. 4 digit)');
                    return;
                }
            }
            setIsProcessing(true);
            state.resolve(result && state.requirePin ? pin : result);
        }
    };

    const getIcon = (variant: string) => {
        switch (variant) {
            case 'success': return <CheckCircle className="w-12 h-12 text-emerald-500" />;
            case 'error': return <AlertCircle className="w-12 h-12 text-rose-500" />;
            case 'warning': return <HelpCircle className="w-12 h-12 text-amber-500" />;
            default: return <Info className="w-12 h-12 text-indigo-500" />;
        }
    };

    const getColors = (variant: string) => {
        switch (variant) {
            case 'success': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200';
            case 'error': return 'bg-rose-600 hover:bg-rose-700 shadow-rose-200';
            case 'warning': return 'bg-amber-600 hover:bg-amber-700 shadow-amber-200';
            default: return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200';
        }
    };

    return (
        <AlertContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {state?.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40  transition-all duration-300 overscroll-contain">
                    {/* Modal Card */}
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="flex justify-center mb-4">
                                <div className={`p-3 rounded-full ${state.variant === 'success' ? 'bg-emerald-50' :
                                    state.variant === 'error' ? 'bg-rose-50' :
                                        state.variant === 'warning' ? 'bg-amber-50' : 'bg-indigo-50'
                                    }`}>
                                    {getIcon(state.variant)}
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight">
                                {state.title}
                            </h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6 whitespace-pre-line">
                                {state.message}
                            </p>

                            {state.type === 'confirm' && state.requirePin && (
                                <div className="mb-6 text-left">
                                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1 mb-1.5 flex items-center gap-1.5">
                                        <Lock className="w-3 h-3" /> PIN Manager / Supervisor
                                    </label>
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => {
                                            setPin(e.target.value);
                                            setPinError('');
                                        }}
                                        placeholder="Masukkan PIN Otorisasi"
                                        className={`w-full bg-slate-50 border ${pinError ? 'border-rose-500' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-300 text-center tracking-[0.5em]`}
                                        maxLength={6}
                                        autoFocus
                                    />
                                    {pinError && <p className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-pulse">{pinError}</p>}
                                </div>
                            )}

                            <div className="flex gap-3 justify-center">
                                {state.type === 'confirm' && (
                                    <button
                                        onClick={() => handleClose(false)}
                                        disabled={isProcessing}
                                        className={`flex-1 px-5 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {state.cancelLabel}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleClose(true)}
                                    disabled={isProcessing}
                                    className={`flex-1 px-5 py-3 rounded-xl text-white font-black shadow-lg shadow-offset-2 transition-all active:scale-95 ${getColors(state.variant)} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isProcessing ? '...' : state.confirmLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AlertContext.Provider>
    );
};
