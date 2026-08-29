import React, { useState } from 'react';
import { X, Send, AlertTriangle, Megaphone, Info } from 'lucide-react';

interface SendMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableId: number | null;
    tableName: string;
    onSend: (message: string) => void;
}

const WARNING_MESSAGES = [
    "Waktu Anda sisa 10 menit lagi!",
    "Waktu Anda sisa 5 menit lagi!",
    "Dilarang merokok di area PlayStation!",
    "Dilarang membawa makanan dari luar!",
    "Mohon menjaga kebersihan area bermain",
];

const PROMO_MESSAGES = [
    "Promo nambah 2 jam diskon 20% hari ini!",
    "Ada menu makanan & minuman baru, pesan di kasir!",
    "Beli 2 minum gratis 1 snack, tanya kasir!",
    "Daftar member sekarang untuk diskon khusus!",
];

const INFO_MESSAGES = [
    "Stick bermasalah? Silakan lapor ke kasir",
    "Game freeze/lag? Restart PS Anda",
    "Mohon kecilkan volume TV Anda",
    "Pemesanan F&B bisa langsung diantar ke meja",
];

export default function SendMessageModal({ isOpen, onClose, tableId, tableName, onSend }: SendMessageModalProps) {
    const [selectedMessage, setSelectedMessage] = useState<string>("");
    const [customMessage, setCustomMessage] = useState<string>("");

    if (!isOpen) return null;

    const handleSend = () => {
        const msg = selectedMessage || customMessage;
        if (!msg) return;
        onSend(msg);
        setSelectedMessage("");
        setCustomMessage("");
        onClose();
    };

    const toggleSelection = (msg: string) => {
        if (selectedMessage === msg) {
            setSelectedMessage("");
        } else {
            setSelectedMessage(msg);
            setCustomMessage(""); // Clear custom if picking template
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 " onClick={onClose} />
            <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Kirim Pesan ke TV</h2>
                        <p className="text-xs font-bold text-slate-400 mt-1">Target: <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{tableName}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    <p className="text-sm font-bold text-slate-500">Pilih template pesan untuk ditampilkan di layar TV {tableName}:</p>

                    {/* Warnings */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Peringatan</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {WARNING_MESSAGES.map(msg => (
                                <button key={msg} onClick={() => toggleSelection(msg)}
                                    className={`text-xs font-bold px-4 py-2.5 rounded-2xl transition-all border-2 text-left leading-tight ${selectedMessage === msg ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-md scale-105' : 'bg-white border-slate-100 text-slate-600 hover:border-rose-200 hover:bg-rose-50/50 hover:-translate-y-0.5'}`}>
                                    {msg}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Marketing */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Megaphone className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Marketing & Promo</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {PROMO_MESSAGES.map(msg => (
                                <button key={msg} onClick={() => toggleSelection(msg)}
                                    className={`text-xs font-bold px-4 py-2.5 rounded-2xl transition-all border-2 text-left leading-tight ${selectedMessage === msg ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-md scale-105' : 'bg-white border-slate-100 text-slate-600 hover:border-amber-200 hover:bg-amber-50/50 hover:-translate-y-0.5'}`}>
                                    {msg}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="w-4 h-4 text-sky-500" />
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Kegiatan & Info</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {INFO_MESSAGES.map(msg => (
                                <button key={msg} onClick={() => toggleSelection(msg)}
                                    className={`text-xs font-bold px-4 py-2.5 rounded-2xl transition-all border-2 text-left leading-tight ${selectedMessage === msg ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-md scale-105' : 'bg-white border-slate-100 text-slate-600 hover:border-sky-200 hover:bg-sky-50/50 hover:-translate-y-0.5'}`}>
                                    {msg}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Atau Ketik Sendiri</h3>
                        </div>
                        <textarea
                            value={customMessage}
                            onChange={(e) => {
                                setCustomMessage(e.target.value);
                                if (e.target.value) setSelectedMessage("");
                            }}
                            placeholder="Ketik pesan khusus di sini..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none h-24"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 bg-white">
                    <button
                        onClick={handleSend}
                        disabled={!selectedMessage && !customMessage}
                        className="w-full bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 active:scale-[0.98]"
                    >
                        <Send className="w-5 h-5" />
                        Kirim Pesan Sekarang
                    </button>
                </div>
            </div>
        </div>
    );
}
