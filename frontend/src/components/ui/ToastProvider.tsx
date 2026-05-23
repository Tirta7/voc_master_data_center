'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Bell, Clock, X, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';

interface Toast {
    id: string;
    title: string;
    message: string;
    type: 'expiry' | 'info' | 'warning' | 'success' | 'error';
    tableId?: number;
}

interface ToastContextType {
    showToast: (title: string, message: string, type: Toast['type'], tableId?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((title: string, message: string, type: Toast['type'], tableId?: number) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, title, message, type, tableId }]);

        // Auto remove after 10 seconds for expiry alerts (longer than usual info)
        setTimeout(() => {
            removeToast(id);
        }, 10000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const handleAction = (toast: Toast) => {
        if (toast.tableId) {
            window.location.href = `/billing?tableId=${toast.tableId}&type=billiard`;
        }
        removeToast(toast.id);
    };

    return (
        <ToastContext.Provider value={{ showToast, removeToast }}>
            {children}

            <div className="fixed top-[100px] lg:top-6 right-4 lg:right-6 z-[9999] flex flex-col gap-4 w-[calc(100%-2rem)] lg:w-full max-w-sm pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 rounded-[2rem] p-5 shadow-2xl shadow-indigo-500/10 animate-in slide-in-from-right duration-500"
                    >
                        {/* Status Bar */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${
                            toast.type === 'success' ? 'bg-emerald-500' :
                            toast.type === 'error' ? 'bg-rose-500' :
                            toast.type === 'warning' ? 'bg-amber-500' :
                            'bg-indigo-600'
                        }`} />

                        <div className="flex gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                toast.type === 'success' ? 'bg-emerald-50' :
                                toast.type === 'error' ? 'bg-rose-50' :
                                toast.type === 'warning' ? 'bg-amber-50' :
                                'bg-indigo-50'
                            }`}>
                                {toast.type === 'expiry' ? (
                                    <Clock className="w-6 h-6 text-indigo-600 animate-pulse" />
                                ) : toast.type === 'success' ? (
                                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                                ) : toast.type === 'error' ? (
                                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                                ) : (
                                    <Bell className="w-6 h-6 text-indigo-600" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">
                                    {toast.title}
                                </h4>
                                <p className="text-xs font-medium text-slate-500 leading-relaxed mb-4">
                                    {toast.message}
                                </p>

                                {toast.tableId && (
                                    <button
                                        onClick={() => handleAction(toast)}
                                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 group/btn"
                                    >
                                        Buka Billing
                                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Progress Bar (Visual only) */}
                        <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-100 w-full overflow-hidden">
                            <div className="h-full bg-indigo-600/30 animate-progress origin-left" />
                        </div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @keyframes progress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                .animate-progress {
                    animation: progress 10s linear forwards;
                }
            `}</style>
        </ToastContext.Provider>
    );
};
