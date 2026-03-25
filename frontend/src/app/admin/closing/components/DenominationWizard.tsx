'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, Coins, Banknote, RefreshCcw } from 'lucide-react';

interface Denomination {
    value: number;
    label: string;
}

const denominations: Denomination[] = [
    { value: 100000, label: '100.000' },
    { value: 50000, label: '50.000' },
    { value: 20000, label: '20.000' },
    { value: 10000, label: '10.000' },
    { value: 5000, label: '5.000' },
    { value: 2000, label: '2.000' },
    { value: 1000, label: '1.000' },
    { value: 500, label: '500' },
    { value: 100, label: '100' },
];

interface DenominationWizardProps {
    onApply: (total: number) => void;
    currentTotal: number;
}

export default function DenominationWizard({ onApply, currentTotal }: DenominationWizardProps) {
    const [counts, setCounts] = useState<Record<number, number>>({});
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const newTotal = Object.entries(counts).reduce((acc, [val, count]) => {
            return acc + (Number(val) * count);
        }, 0);
        setTotal(newTotal);
    }, [counts]);

    const handleCountChange = (value: number, count: string) => {
        const n = parseInt(count) || 0;
        setCounts(prev => ({ ...prev, [value]: n }));
    };

    const reset = () => {
        setCounts({});
        setTotal(0);
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 lg:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 leading-tight tracking-tight">Kalkulator Kas</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hitung Uang Fisik</p>
                    </div>
                </div>
                <button 
                    onClick={reset}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Reset"
                >
                    <RefreshCcw className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {denominations.map((denom) => (
                    <div key={denom.value} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 group focus-within:border-indigo-200 focus-within:bg-indigo-50/30 transition-all">
                        <div className="w-12 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {denom.value >= 1000 ? <Banknote className="w-4 h-4 mb-1" /> : <Coins className="w-4 h-4 mb-1" />}
                            {denom.label}
                        </div>
                        <div className="text-slate-300 font-bold ml-1">×</div>
                        <input
                            type="number"
                            min="0"
                            value={counts[denom.value] || ''}
                            onChange={(e) => handleCountChange(denom.value, e.target.value)}
                            placeholder="0"
                            className="bg-transparent border-b border-transparent focus:border-indigo-400 outline-none w-full text-right font-black text-slate-700 placeholder:text-slate-300 transition-all"
                        />
                    </div>
                ))}
            </div>

            <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Terhitung</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">
                            Rp {total.toLocaleString('id-ID')}
                        </p>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase ${total === currentTotal ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {total === currentTotal ? 'MATCH' : 'DIFFERENT'}
                    </div>
                </div>

                <button
                    onClick={() => onApply(total)}
                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
                >
                    Terapkan Ke Form
                </button>
            </div>
        </div>
    );
}
