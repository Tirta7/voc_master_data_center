'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Bell, Clock, X, ChevronRight, AlertTriangle, CheckCircle, ZapOff } from 'lucide-react';

interface Toast {
    id: string;
    title: string;
    message: string;
    type: 'expiry' | 'info' | 'warning' | 'success' | 'error' | 'critical';
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

        // 'critical' alerts (hardware failure) MUST be dismissed manually — no auto-close.
        // All other types auto-dismiss after 10 seconds.
        if (type !== 'critical') {
            setTimeout(() => {
                removeToast(id);
            }, 10000);
        }
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

            <div className="fixed top-[60px] md:top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 w-max max-w-[90vw] md:max-w-sm pointer-events-none transition-all duration-300">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto relative overflow-hidden bg-black/95 backdrop-blur-2xl rounded-full pl-2 pr-4 py-2 flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/10 animate-in slide-in-from-top-8 fade-in zoom-in-95 duration-400"
                    >
                        {/* Icon Container */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                            toast.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                            toast.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                            toast.type === 'critical' ? 'bg-red-500/20 text-red-500 animate-pulse ring-1 ring-red-500/50' :
                            'bg-indigo-500/20 text-indigo-400'
                        }`}>
                            {toast.type === 'expiry' ? (
                                <Clock className="w-4 h-4 animate-pulse" />
                            ) : toast.type === 'success' ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : toast.type === 'error' ? (
                                <AlertTriangle className="w-4 h-4" />
                            ) : toast.type === 'critical' ? (
                                <ZapOff className="w-4 h-4" />
                            ) : (
                                <Bell className="w-4 h-4" />
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col min-w-0 flex-1 cursor-default">
                            <h4 className="text-[11px] font-bold text-white leading-tight truncate max-w-[200px] sm:max-w-[250px]">
                                {toast.title}
                            </h4>
                            <p className="text-[10px] font-medium text-slate-400 leading-tight truncate max-w-[200px] sm:max-w-[250px]">
                                {toast.message}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                            {toast.tableId && (
                                <button
                                    onClick={() => handleAction(toast)}
                                    className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                                >
                                    Buka
                                </button>
                            )}

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="w-6 h-6 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Progress Bar (Visual only) */}
                        <div className="absolute bottom-0 left-0 h-[1.5px] bg-white/10 w-full overflow-hidden">
                            <div className={`h-full animate-progress origin-left ${
                                toast.type === 'success' ? 'bg-emerald-500' :
                                toast.type === 'error' ? 'bg-rose-500' :
                                toast.type === 'warning' ? 'bg-amber-500' :
                                toast.type === 'critical' ? 'bg-red-500' :
                                'bg-indigo-500'
                            }`} />
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
