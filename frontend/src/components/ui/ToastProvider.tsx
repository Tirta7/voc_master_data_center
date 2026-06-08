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

            <div 
                className="fixed left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none transition-all duration-300 w-full"
                style={{ top: 'max(80px, calc(env(safe-area-inset-top) + 64px))' }}
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto relative overflow-hidden bg-black rounded-[20px] flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-400 min-h-[36px] py-1 pl-1 pr-2.5"
                        style={{ width: 'max-content', maxWidth: '90vw' }}
                    >
                        {/* Icon Container */}
                        <div className="w-[28px] h-[28px] bg-white rounded-full flex items-center justify-center shrink-0">
                            {toast.type === 'expiry' ? (
                                <Clock className="w-[14px] h-[14px] animate-pulse text-slate-800" />
                            ) : toast.type === 'success' ? (
                                <CheckCircle className="w-[14px] h-[14px] text-emerald-500" />
                            ) : toast.type === 'error' ? (
                                <AlertTriangle className="w-[14px] h-[14px] text-rose-500" />
                            ) : toast.type === 'critical' ? (
                                <ZapOff className="w-[14px] h-[14px] text-red-500" />
                            ) : (
                                <Bell className="w-[14px] h-[14px] text-indigo-500" />
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col min-w-0 flex-1 cursor-default justify-center pb-[1px] pt-[1px]">
                            <p className="m-0 text-white text-[12px] leading-[1.2] font-semibold tracking-[0.2px] truncate">
                                {toast.title}
                            </p>
                            {toast.message && (
                                <p className="m-0 text-slate-400 text-[10px] leading-[1.2] font-medium tracking-[0.1px] truncate">
                                    {toast.message}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center shrink-0 h-full">
                            {toast.tableId && (
                                <button
                                    onClick={() => handleAction(toast)}
                                    className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 mr-1"
                                >
                                    Buka
                                </button>
                            )}

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="w-[22px] h-[22px] rounded-full flex items-center justify-center bg-transparent hover:bg-white/10 text-slate-400 hover:text-slate-300 transition-colors"
                                title="Tutup"
                            >
                                <X size={12} />
                            </button>
                        </div>

                        {/* Progress Bar (Visual only) */}
                        <div className="absolute bottom-0 left-0 h-[1.5px] w-full overflow-hidden">
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
