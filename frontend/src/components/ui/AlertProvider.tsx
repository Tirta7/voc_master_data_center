'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, CheckCircle, HelpCircle, Info } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface AlertOptions {
    variant?: 'success' | 'error' | 'warning' | 'info';
    confirmLabel?: string;
    cancelLabel?: string;
}

interface AlertContextType {
    showAlert: (title: string, message: string, options?: AlertOptions) => Promise<void>;
    showConfirm: (title: string, message: string, options?: AlertOptions) => Promise<boolean>;
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
    resolve: (value: boolean | void | PromiseLike<boolean | void>) => void;
}

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<AlertState | null>(null);

    useBodyScrollLock(!!state?.isOpen);

    const showAlert = useCallback((title: string, message: string, options?: AlertOptions) => {
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
        return new Promise<boolean>((resolve) => {
            setState({
                isOpen: true,
                type: 'confirm',
                title,
                message,
                variant: options?.variant || 'warning',
                confirmLabel: options?.confirmLabel || 'Ya, Lanjutkan',
                cancelLabel: options?.cancelLabel || 'Batal',
                resolve: (val) => {
                    setState(null);
                    resolve(val as boolean);
                },
            });
        });
    }, []);

    const handleClose = (result: boolean) => {
        if (state?.resolve) {
            state.resolve(result);
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300 overscroll-contain">
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

                            <div className="flex gap-3 justify-center">
                                {state.type === 'confirm' && (
                                    <button
                                        onClick={() => handleClose(false)}
                                        className="flex-1 px-5 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        {state.cancelLabel}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleClose(true)}
                                    className={`flex-1 px-5 py-3 rounded-xl text-white font-black shadow-lg shadow-offset-2 transition-all active:scale-95 ${getColors(state.variant)}`}
                                >
                                    {state.confirmLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AlertContext.Provider>
    );
};
