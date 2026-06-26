import React from 'react';
import { Cat, Coffee } from 'lucide-react';

export default function WaitingCat() {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-6 opacity-70">
            <style>{`
                @keyframes tailWag {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(15deg); }
                }
                @keyframes breathe {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes floatZzz {
                    0% { transform: translateY(0) scale(0.8); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(-20px) scale(1.2); opacity: 0; }
                }
            `}</style>
            <div className="relative">
                <div style={{ animation: 'breathe 3s ease-in-out infinite' }} className="text-[#818cf8]">
                    <Cat size={48} strokeWidth={1.5} />
                </div>
                {/* Zzz marks */}
                <span className="absolute -top-4 -right-4 text-[#818cf8] text-xs font-black" style={{ animation: 'floatZzz 2.5s ease-in-out infinite' }}>z</span>
                <span className="absolute -top-6 -right-1 text-[#818cf8] text-sm font-black" style={{ animation: 'floatZzz 3s ease-in-out infinite 0.5s' }}>Z</span>
                <span className="absolute -top-8 -right-6 text-[#818cf8] text-lg font-black" style={{ animation: 'floatZzz 3.5s ease-in-out infinite 1s' }}>Z</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#818cf8] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-[#818cf8] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-[#818cf8] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="text-[10px] font-black text-[#818cf8] uppercase tracking-[0.2em] animate-pulse">Menunggu Pembayaran</p>
        </div>
    );
}
