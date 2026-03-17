'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    TrendingUp,
    RefreshCw,
    Save,
    CheckCircle,
    LayoutDashboard,
    Flame,
    Snowflake,
    Zap,
    ChevronDown,
    Plus,
    Minus,
    AlertCircle,
    Send,
    Award,
    Users,
    Clock,
    AlertTriangle,
    Eye,
    Megaphone,
    Search,
    Delete,
    X,
    History,
    BarChart3,
    ArrowRight,
    Shield,
    Info,
    Lightbulb,
    Target,
    Download,
    MessageSquare
} from 'lucide-react';
import ChatWindow from '@/components/ChatWindow';
import { socket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { useRealtimeData } from '@/context/RealtimeDataContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const fmt = (n: any) => {
    const val = Number(n);
    if (isNaN(val)) return 'Rp 0';
    return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
};

interface SimulatedItem {
    id: number;
    name: string;
    targetQuantity: number;
    price: number;
    margin: number;
    stock?: number;
    label: string; 
    justification?: string;
    type: 'CAFE' | 'BILLIARD';
}

export default function AIOrchestrator() {
    const { user } = useAuth();
    const { performancePulse, aiCampaigns, waiterStats, intensityData } = useRealtimeData();
    const canPromote = ['ADMIN', 'OWNER', 'CASHIER'].includes(user?.role?.toUpperCase() || '');
    const { showToast } = useToast();
    const [targetRevenue, setTargetRevenue] = useState<number>(0);
    const [businessDayId, setBusinessDayId] = useState<number | null>(null);
    const [strategyHistory, setStrategyHistory] = useState<any[]>([]);
    const [coachingData, setCoachingData] = useState<any>(null);
    const [missionReport, setMissionReport] = useState<any>(null);
    const [aiAutoPromote, setAiAutoPromote] = useState(false);
    const [activeChat, setActiveChat] = useState<{ id: number, name: string } | null>(null);

    useEffect(() => {
        const fetchMission = async () => {
            if (!businessDayId) return;
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/ai/mission-report/${businessDayId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMissionReport(res.data);
            } catch (err) {
                console.error('Failed to fetch mission report:', err);
            }
        };

        fetchMission();
        const interval = setInterval(fetchMission, 120000); // Pulse every 2 minutes
        return () => clearInterval(interval);
    }, [businessDayId]);

    useEffect(() => {
        const fetchCoaching = async () => {
            if (!businessDayId) return;
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/ai/coaching-tips/${businessDayId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCoachingData(res.data);
            } catch (err) {
                console.error('Failed to fetch coaching tips:', err);
            }
        };

        fetchCoaching();
        const interval = setInterval(fetchCoaching, 60000); // Pulse every minute
        return () => clearInterval(interval);
    }, [businessDayId]);

    const [simulatedItems, setSimulatedItems] = useState<SimulatedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalProjected, setTotalProjected] = useState(0);
    const [strategyBrief, setStrategyBrief] = useState("");
    const [forecast, setForecast] = useState<any>(null);
    const [comboRules, setComboRules] = useState<any[]>([]);
    const [allMenu, setAllMenu] = useState<any[]>([]);
    const [showMenuPicker, setShowMenuPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingQuantityItem, setEditingQuantityItem] = useState<SimulatedItem | null>(null);
    const [numpadValue, setNumpadValue] = useState("");
    const [activeTab, setActiveTab] = useState<'FORC' | 'ROI' | 'HST'>('FORC');
    const [strategyScore, setStrategyScore] = useState<number | null>(null);
    const [suggestedTargetInfo, setSuggestedTargetInfo] = useState<any>(null);
    const hasInitialized = React.useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/ai/history?limit=7`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStrategyHistory(res.data || []);
            } catch (err) {
                console.error('Failed to fetch AI history:', err);
            }
        };

        fetchHistory();
        fetchActiveBusinessDay();
        fetchForecast();
        fetchComboRules();
        fetchAllMenu();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAiAutoPromote(res.data.aiAutoPromote || false);
        } catch (err) {
            console.error("Failed to fetch settings", err);
        }
    };

    const toggleAutoPromote = async () => {
        const newValue = !aiAutoPromote;
        setAiAutoPromote(newValue);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/settings`, { aiAutoPromote: newValue }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast("Setting Updated", `AI Auto-Promote ${newValue ? 'Enabled' : 'Disabled'}.`, "success");
        } catch (err) {
            setAiAutoPromote(!newValue); // Rollback
            showToast("Update Failed", "Gagal memperbarui pengaturan AI.", "error");
        }
    };

    // Reactive projection calculation
    useEffect(() => {
        const total = simulatedItems.reduce((sum, item) => sum + (item.price * item.targetQuantity), 0);
        setTotalProjected(total);
    }, [simulatedItems]);

    const fetchComboRules = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/ai/combo-rules`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setComboRules(res.data);
        } catch (err) {
            console.error("Failed to fetch combo rules", err);
        }
    };

    const fetchForecast = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/ai/predict-traffic`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setForecast(res.data);
            if (targetRevenue === 0 && res.data.predictedRevenue) {
                setTargetRevenue(Math.round(res.data.predictedRevenue));
            }
        } catch (err) {
            console.error("Failed to fetch forecast", err);
        }
    };

    const fetchAllMenu = async () => {
        try {
            const token = localStorage.getItem('token');
            const [cafeRes, billiardRes] = await Promise.all([
                axios.get(`${API_URL}/cafe/menu`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/billiard/packages`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const combined = [
                ...cafeRes.data.map((i: any) => ({ ...i, type: 'CAFE' })),
                ...billiardRes.data.map((p: any) => {
                    let price = Number(p.price) > 0 ? Number(p.price) : Number(p.minutePrice) * 60;
                    if (price <= 0) price = 30000; // Fallback for simulation
                    return { ...p, price, type: 'BILLIARD' };
                })
            ];
            setAllMenu(combined);
        } catch (err) {
            console.error("Failed to fetch menu", err);
        }
    };

    const handleAddItem = (item: any) => {
        if (simulatedItems.find(it => it.id === item.id && it.type === item.type)) {
            showToast("Item exists", "Item sudah ada dalam daftar simulasi.", "warning");
            return;
        }

        const newItem: SimulatedItem = {
            id: item.id,
            name: item.name,
            price: Number(item.price),
            targetQuantity: 1,
            margin: item.type === 'BILLIARD' ? Number(item.price) * 0.9 : (item.productFinance ? Number(item.price) - Number(item.productFinance.baseHpp) : Number(item.price) * 0.3),
            label: "✨ CUSTOM",
            type: item.type
        };

        setSimulatedItems([...simulatedItems, newItem]);
        setShowMenuPicker(false);
    };

    const handleRemoveItem = (id: number, type: 'CAFE' | 'BILLIARD') => {
        setSimulatedItems(simulatedItems.filter(it => !(it.id === id && it.type === type)));
    };

    const handleBroadcastItem = async (itemId: number, type: 'CAFE' | 'BILLIARD') => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/ai/broadcast-item`, { itemId, type }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast("Broadcast Sent", "Promosi item telah dikirim ke seluruh tim.", "success");
        } catch (err) {
            console.error("Failed to broadcast item", err);
            showToast("Error", "Gagal mengirim broadcast.", "error");
        }
    };

    const fetchActiveBattlePlan = async (bDayId: number) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/ai/battle-plan/${bDayId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && res.data.items && res.data.items.length > 0) {
                setTargetRevenue(res.data.targetRevenue);
                setStrategyBrief(res.data.aiStrategyBrief || "");

                const items = res.data.items.map((it: any) => {
                    let price = 0;
                    if (it.menuItem) {
                        price = Number(it.menuItem.price || 0);
                    } else if (it.billiardPackage) {
                        price = Number(it.billiardPackage.price) > 0
                            ? Number(it.billiardPackage.price)
                            : Number(it.billiardPackage.minutePrice || 0) * 60;

                        if (price <= 0) price = 30000; // Fallback consistent with simulation
                    }

                    const cost = Number(it.menuItem?.productFinance?.baseHpp || 0);

                    return {
                        id: it.menuItemId || it.packageId,
                        name: it.menuItem?.name || it.billiardPackage?.name || "Item",
                        targetQuantity: Number(it.targetQuantity || 0),
                        price: price,
                        margin: it.menuItem ? (price - cost || price * 0.3) : price * 0.9,
                        label: it.aiLabel || "✨ ACTIVE",
                        type: it.menuItemId ? 'CAFE' : 'BILLIARD'
                    };
                });
                setSimulatedItems(items);
                showToast("Battle Plan Loaded", "Active battle plan has been loaded for editing.", "info");
            }
        } catch (err) {
            console.error("Failed to fetch active battle plan", err);
        }
    };

    const fetchActiveBusinessDay = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/finance/shifts/business-day/active`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setBusinessDayId(res.data.id);
                fetchActiveBattlePlan(res.data.id);
            }
        } catch (err) {
            console.error("Failed to fetch active business day", err);
        }
    };

    const handleSimulate = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/ai/simulate-target`,
                { targetRevenue },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Map labels and justifications
            const items = res.data.items.map((it: any) => ({
                ...it,
                label: it.aiLabel || (it.targetQuantity > 50 ? "🔥 Laris" : "🚀 Upsell"),
                justification: it.justification // New Phase 41 field
            }));

            setSimulatedItems(items);
            setTotalProjected(res.data.predictedRevenue);
            setStrategyBrief(res.data.aiStrategyBrief);
            setStrategyScore(res.data.strategyScore);

            showToast("AI Simulation Complete", "Target mix recalculated successfully.", "info");
        } catch (err: any) {
            showToast("Simulation Failed", err.response?.data?.message || err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestTarget = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/ai/suggest-target`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTargetRevenue(res.data.suggestedTarget);
            setSuggestedTargetInfo(res.data);
            showToast("AI Suggestion", "AI telah menyarankan target omset berdasarkan tren.", "success");
        } catch (err) {
            showToast("Error", "Gagal mengambil saran AI", "error");
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!businessDayId) {
            showToast("Error", "No active business day found.", "error");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // 1. Create/Update Battle Plan
            const res = await axios.post(`${API_URL}/ai/battle-plan`, {
                businessDayId,
                targetRevenue,
                items: simulatedItems.map(it => ({
                    id: it.id,
                    type: it.type,
                    menuItemId: it.type === 'CAFE' ? it.id : null,
                    packageId: it.type === 'BILLIARD' ? it.id : null,
                    targetQuantity: it.targetQuantity,
                    aiLabel: it.label
                })),
                aiStrategyBrief: strategyBrief
            }, { headers: { Authorization: `Bearer ${token}` } });

            // 2. Publish
            await axios.post(`${API_URL}/ai/battle-plan/${res.data.id}/publish`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showToast("Success", "Battle Plan published to Kasir!", "success");
        } catch (err: any) {
            showToast("Publish Failed", err.response?.data?.message || err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleReoptimize = async () => {
        if (!businessDayId) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/ai/battle-plan/${businessDayId}/reoptimize`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast("AI Re-optimized", "Mid-day targets adjusted based on current trends.", "success");
        } catch (err: any) {
            showToast("Re-optimization Failed", err.response?.data?.message || err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleNumpadInput = (val: string) => {
        if (numpadValue === "0" && val !== "0") {
            setNumpadValue(val);
        } else {
            setNumpadValue(prev => prev + val);
        }
    };

    const handleNumpadDelete = () => {
        setNumpadValue(prev => prev.slice(0, -1));
    };

    const handleNumpadConfirm = () => {
        if (editingQuantityItem) {
            const val = parseInt(numpadValue) || 0;
            const newItems = [...simulatedItems];
            const idx = newItems.findIndex(i => i.id === editingQuantityItem.id && i.type === editingQuantityItem.type);
            if (idx !== -1) {
                newItems[idx].targetQuantity = val;
                setSimulatedItems(newItems);
            }
        }
        setEditingQuantityItem(null);
        setNumpadValue("");
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-slate-200">
            {/* Slim Premium Top Bar */}
            <div className="sticky top-0 z-40 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/5 px-6 lg:px-12 py-4">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                            <Zap className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">AI REVENUE ORCHESTRATOR</h1>
                            <div className="flex gap-3 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                <span>Powering establishment growth</span>
                                <span className="text-indigo-500/50">•</span>
                                <span className="text-indigo-400">Live Simulation</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <a
                            href="/admin/waiter-performance"
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-black uppercase text-[10px] tracking-widest"
                        >
                            <Award className="w-4 h-4 text-indigo-400" />
                            Waiter Performance
                        </a>
                        <button
                            onClick={handleReoptimize}
                            disabled={loading}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-black uppercase text-[10px] tracking-widest"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
                            Re-Optimize
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto p-6 lg:p-12 animate-in fade-in duration-1000">
                <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-8 items-start">

                    {/* LEFT SIDEBAR: Controls & Intelligence */}
                    <aside className="space-y-6 lg:sticky lg:top-28">
                        {/* Target Input Card */}
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
                                <Target className="w-3.5 h-3.5" />
                                Daily Revenue Target
                            </p>
                            <div className="space-y-6">
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-600">Rp</span>
                                    <input
                                        type="number"
                                        value={targetRevenue || ''}
                                        onChange={(e) => setTargetRevenue(Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 pl-14 pr-4 text-3xl font-black text-white focus:border-indigo-500 transition-all outline-none"
                                    />
                                    {suggestedTargetInfo && (
                                        <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-full animate-bounce shadow-lg shadow-emerald-500/40">
                                            AI SUGGESTED
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSuggestTarget}
                                        disabled={loading}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-white/5"
                                    >
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                        AI Suggest
                                    </button>
                                    <button
                                        onClick={handleSimulate}
                                        disabled={loading}
                                        className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                                        Run AI Calc
                                    </button>
                                </div>
                                {suggestedTargetInfo && (
                                    <p className="text-[10px] text-slate-500 font-medium italic leading-relaxed">
                                        "{suggestedTargetInfo.justification}"
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* PHASE 37: AI PROACTIVE TOGGLE */}
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${aiAutoPromote ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-slate-800 border-white/5'}`}>
                                        <Zap className={`w-5 h-5 ${aiAutoPromote ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-white uppercase tracking-widest">AI Auto-Promote</h4>
                                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Proactive Peak Mode</p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleAutoPromote}
                                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${aiAutoPromote ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 transform ${aiAutoPromote ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                                    "Jika aktif, AI akan otomatis mempromosikan item yang tertinggal saat tamu ramai ({'>'}60% okupansi)."
                                </p>
                            </div>
                        </div>

                        {/* PHASE 38: ROI LEADERBOARD & INTENSITY Prediction */}
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-6">
                            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4 mb-2">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setActiveTab('FORC')}
                                        className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'FORC' ? 'text-indigo-400 border-b-2 border-indigo-500 pb-1' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Forecasting
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('ROI')}
                                        className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ROI' ? 'text-emerald-400 border-b-2 border-emerald-500 pb-1' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        ROI Leaderboard
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('HST')}
                                        className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'HST' ? 'text-amber-400 border-b-2 border-amber-500 pb-1' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Historical Trends
                                    </button>
                                </div>
                                {intensityData && (
                                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase flex items-center gap-1.5 ${intensityData.score >= 6 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                                        <Zap className="w-3 h-3" />
                                        HEAT: {intensityData.label} ({intensityData.score}/10)
                                    </div>
                                )}
                            </div>

                            {activeTab === 'FORC' && (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-slate-400">Predicted traffic flow for next 2 hours:</p>
                                    <div className="flex items-end gap-1.5 h-16 px-2">
                                        {[...Array(12)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`flex-1 rounded-t-sm transition-all duration-700 ${i > 7 ? 'bg-indigo-500/40 animate-pulse' : 'bg-slate-700'}`}
                                                style={{ height: `${20 + Math.random() * 60}%` }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                                        <span>Current Velocity: {intensityData?.currentVelocity || 0} Tx/h</span>
                                        <span>Expected: {intensityData?.expectedVelocity || 0} Tx/h</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ROI' && (
                                <div className="space-y-3">
                                    {waiterStats.slice(0, 4).map((staff, idx) => (
                                        <div key={staff.userId} className="group relative flex items-center justify-between bg-black/40 border border-white/5 p-3 rounded-2xl hover:border-emerald-500/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-slate-800 text-slate-400'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-white uppercase truncate max-w-[120px]">{staff.userName}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[8px] font-bold text-slate-500 uppercase">{staff.aiConversions || 0} Conversions</p>
                                                        <button 
                                                            onClick={() => setActiveChat({ id: staff.userId, name: staff.userName })}
                                                            className="p-1 bg-indigo-500/10 hover:bg-indigo-500/20 rounded border border-indigo-500/20 transition-colors"
                                                            title="Chat with waiter"
                                                        >
                                                            <MessageSquare className="w-2 h-2 text-indigo-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-emerald-400">{fmt(staff.aiRoi)}</p>
                                                <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (staff.aiRoi / 500000) * 100)}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {waiterStats.length === 0 && <p className="text-[10px] text-center text-slate-500 py-4 italic">No conversions tracked yet today.</p>}
                                </div>
                            )}

                            {activeTab === 'HST' && (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-slate-400">AI ROI Performance (Last 7 Days):</p>
                                    <div className="flex items-end gap-2 h-16 px-2">
                                        {strategyHistory.map((h, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 group relative"
                                            >
                                                <div
                                                    className="w-full bg-amber-500/40 rounded-t-sm hover:bg-amber-400/60 transition-all cursor-help"
                                                    style={{ height: `${Math.min(100, (h.roi / 200000) * 100 + 10)}%` }}
                                                />
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                                                    <div className="bg-slate-800 text-[8px] font-bold text-white px-2 py-1 rounded border border-white/10 whitespace-nowrap">
                                                        {h.roi > 0 ? fmt(h.roi) : 'No ROI'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {strategyHistory.length === 0 && Array(7).fill(0).map((_, i) => (
                                            <div key={i} className="flex-1 bg-slate-800/50 h-2 rounded-t-sm" />
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                                        <span>7 Days Ago</span>
                                        <span>Trend Strike: {strategyHistory.length > 0 ? Math.round(strategyHistory.reduce((s, h) => s + h.strikeRate, 0) / strategyHistory.length) : 0}%</span>
                                        <span>Today</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {simulatedItems.length > 0 && (
                            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Projection</p>
                                        <p className="text-xl font-black text-white">{fmt(totalProjected)}</p>
                                    </div>
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Menu Mix</p>
                                        <p className="text-xl font-black text-white">{simulatedItems.length} Focus</p>
                                    </div>
                                </div>

                                {strategyBrief && (
                                    <div className="bg-black/20 rounded-2xl p-6 border border-white/5 relative group/brief overflow-hidden">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">AI Strategy Brief</p>
                                            {strategyScore !== null && (
                                                <div className="flex items-center gap-2 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                                    <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest">Strategy Score</span>
                                                    <span className={`text-[10px] font-black ${strategyScore > 80 ? 'text-emerald-400' : strategyScore > 60 ? 'text-indigo-400' : 'text-amber-400'}`}>
                                                        {strategyScore}/100
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-slate-400 leading-relaxed italic relative z-10">"{strategyBrief}"</p>
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full translate-x-16 -translate-y-16" />
                                    </div>
                                )}

                                <button
                                    onClick={handlePublish}
                                    disabled={loading}
                                    className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all hover:bg-indigo-50 active:scale-95 disabled:opacity-50"
                                >
                                    <Send className="w-5 h-5" />
                                    PUBLISH KE KASIR
                                </button>
                            </div>
                        )}
                        {/* PHASE 29: AI Commander's Log & Anomaly Alerts */}
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-red-500/5 to-transparent flex items-center gap-3">
                                <Shield className="w-5 h-5 text-red-400" />
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">AI Commander's Log</h3>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Anomaly Alerts (Cold Streaks) */}
                                {coachingData?.anomalies?.length > 0 ? (
                                    coachingData.anomalies.map((anno: any, i: number) => (
                                        <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
                                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                            <p className="text-[11px] font-bold text-red-400 leading-relaxed">{anno.message}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center gap-3">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">System Nominal: No Anomalies</p>
                                    </div>
                                )}

                                {/* Coaching Tips */}
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Proactive Shift Coaching</p>
                                    {coachingData?.tips?.map((tip: any, i: number) => (
                                        <div key={i} className={`rounded-2xl p-4 border flex items-start gap-3 ${tip.type === 'URGENT' ? 'bg-amber-500/10 border-amber-500/20' :
                                            tip.type === 'POSITIVE' ? 'bg-indigo-500/10 border-indigo-500/20' :
                                                'bg-white/5 border-white/5'
                                            }`}>
                                            {tip.type === 'URGENT' ? <Shield className="w-4 h-4 text-amber-500 shrink-0" /> :
                                                tip.type === 'POSITIVE' ? <Award className="w-4 h-4 text-indigo-400 shrink-0" /> :
                                                    <Lightbulb className="w-4 h-4 text-slate-400 shrink-0" />}
                                            <p className="text-[10px] font-medium text-slate-300 leading-relaxed">{tip.message}</p>
                                        </div>
                                    ))}
                                    {(!coachingData?.tips || coachingData.tips.length === 0) && (
                                        <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                            <p className="text-[10px] text-slate-500 italic">Analyzing shift patterns... No coaching logs generated yet.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Micro Stats */}
                                {coachingData && (
                                    <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Shift Strike Rate</p>
                                            <p className={`text-sm font-black ${coachingData.currentStrikeRate > coachingData.benchmark ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {coachingData.currentStrikeRate}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Weekly Bench.</p>
                                            <p className="text-sm font-black text-indigo-400">{coachingData.benchmark}%</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* RIGHT CONTENT AREA */}
                    <div className="space-y-8 min-w-0">
                        {/* PHASE 30: AI Mission Report & Executive Grade */}
                        {missionReport && (
                            <div className="relative group overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-indigo-500/20 rounded-[2.5rem] p-10 shadow-2xl animate-in fade-in zoom-in duration-700">
                                {/* Premium Shimmer Effects */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-transparent opacity-10 group-hover:opacity-20 transition-opacity duration-1000" />
                                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent animate-shimmer" />

                                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[100px] -mr-32 -mt-32" />
                                <div className="absolute top-0 left-0 w-4 h-full bg-indigo-500/20" />

                                <div className="relative flex flex-col md:flex-row items-center gap-12">
                                    <div className="relative shrink-0">
                                        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                                        <div className="grade-badge-premium w-32 h-32 rounded-full border-4 border-indigo-500/30 flex items-center justify-center bg-black/40 backdrop-blur-md relative z-10">
                                            <span className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">{missionReport.grade}</span>
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-xl border-2 border-[#0F172A] z-20">
                                            {missionReport.score}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <Target className="w-4 h-4 text-indigo-400" />
                                                <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em]">Daily Mission Report</h2>
                                            </div>
                                            <p className="text-lg font-medium text-slate-300 leading-relaxed italic">
                                                "{missionReport.commentary}"
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Achievement</p>
                                                <p className="text-xl font-black text-white">{Math.round(missionReport.achievement)}%</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Revenue</p>
                                                <p className="text-xl font-black text-emerald-400">{fmt(missionReport.totalRevenue)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI ROI Contribution</p>
                                                <p className="text-xl font-black text-indigo-400">+{fmt(missionReport.aiRoi)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Team Strike Rate</p>
                                                <p className="text-xl font-black text-amber-400">{missionReport.strikeRate}%</p>
                                            </div>

                                            {/* MVP & Intensity Insights (Phase 39) */}
                                            {missionReport.topWaiter && (
                                                <div className="space-y-1 border-l border-white/10 pl-4 bg-indigo-500/5 py-1 rounded-r-lg">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Award className="w-3 h-3" />
                                                        Shift MVP
                                                    </p>
                                                    <p className="text-sm font-black text-white truncate">{missionReport.topWaiter.name}</p>
                                                    <p className="text-[9px] font-bold text-indigo-500/60 uppercase">ROI: {fmt(missionReport.topWaiter.roi)}</p>
                                                </div>
                                            )}

                                            {missionReport.intensityStats && (
                                                <div className="space-y-1 border-l border-white/10 pl-4 bg-rose-500/5 py-1 rounded-r-lg">
                                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Flame className="w-3 h-3" />
                                                        Max Intensity
                                                    </p>
                                                    <p className="text-sm font-black text-white truncate">{missionReport.intensityStats.label}</p>
                                                    <p className="text-[9px] font-bold text-rose-500/60 uppercase">Score: {missionReport.intensityStats.score}/10</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex flex-col items-center gap-3">
                                        <button
                                            onClick={() => businessDayId && window.open(`${API_URL}/ai/mission-report/${businessDayId}/pdf`, '_blank')}
                                            className="group flex flex-col items-center gap-2"
                                        >
                                            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 group-hover:bg-indigo-500/20 group-hover:scale-105 transition-all duration-300">
                                                <Download className="w-8 h-8 text-indigo-400" />
                                            </div>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center group-hover:text-indigo-400 transition-colors">Export PDF<br />Summary</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {simulatedItems.length > 0 ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">

                                {simulatedItems.some(it => it.label === "✨ ACTIVE") && (
                                    <div className="bg-amber-500/10 text-amber-500 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-3">
                                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                                        <span>BATTLE PLAN SEDANG BERJALAN: Anda sedang menyesuaikan strategi aktif</span>
                                    </div>
                                )}

                                {/* Performance Pulse: Live Achievement Gauge */}
                                {performancePulse && (
                                    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl pointer-events-none" />

                                        <div className="flex flex-col md:flex-row items-center gap-10">
                                            {/* Circular Gauge */}
                                            <div className="relative w-48 h-48 shrink-0">
                                                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                                    {/* Track */}
                                                    <circle
                                                        cx="50" cy="50" r="45"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="8"
                                                        className="text-slate-800"
                                                    />
                                                    {/* Progress */}
                                                    <circle
                                                        cx="50" cy="50" r="45"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="8"
                                                        strokeDasharray={`${2 * Math.PI * 45}`}
                                                        strokeDashoffset={`${(2 * Math.PI * 45) * (1 - (Number(performancePulse?.achievementPercent || 0) || 0) / 100)}`}
                                                        strokeLinecap="round"
                                                        className="text-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-1000 ease-out"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <p className="text-4xl font-black text-white">{Math.round(Number(performancePulse?.achievementPercent || 0)) || 0}%</p>
                                                    <p className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">Target</p>
                                                </div>
                                            </div>

                                            {/* Metrics Grid */}
                                            <div className="flex-1 space-y-8 w-full">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                                            PERFORMANCE PULSE
                                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                                                        </h2>
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Real-time revenue achievement analysis</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Est. Gap</p>
                                                        <p className="text-xl font-black text-amber-500 mt-1">{fmt(performancePulse.gap)}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Actual</p>
                                                        <p className="text-sm font-black text-white">{fmt(performancePulse.actualRevenue)}</p>
                                                    </div>
                                                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Target</p>
                                                        <p className="text-sm font-black text-white">{fmt(performancePulse.targetRevenue)}</p>
                                                    </div>
                                                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                                        <p className={`text-sm font-black p-0 ${(Number(performancePulse?.achievementPercent || 0) || 0) > 80 ? 'text-emerald-500' : (Number(performancePulse?.achievementPercent || 0) || 0) > 40 ? 'text-indigo-400' : 'text-amber-500'}`}>
                                                            {(Number(performancePulse?.achievementPercent || 0) || 0) > 95 ? 'TARGET HIT' : (Number(performancePulse?.achievementPercent || 0) || 0) > 70 ? 'ON TRACK' : 'PACING'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Live At</p>
                                                        <p className="text-sm font-black text-white">
                                                            {performancePulse?.timestamp && !isNaN(new Date(performancePulse.timestamp).getTime())
                                                                ? new Date(performancePulse.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                                                : 'Counting...'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PHASE 27: AI Campaign ROI & Staff Engagement */}
                                {Object.keys(aiCampaigns || {}).length > 0 && (
                                    <div className="bg-slate-900/40 backdrop-blur-xl border border-emerald-500/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl pointer-events-none" />
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5 relative">
                                                    <Award className="w-8 h-8 text-emerald-400" />
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping opacity-20" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                                                        AI Campaign Impact
                                                        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded tracking-[0.2em]">LIVE ROI</span>
                                                    </h3>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Real-time conversion tracking & staff engagement</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-12">
                                                <div className="text-center">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Staff Engaged</p>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Users className="w-4 h-4 text-emerald-400" />
                                                        <span className="text-2xl font-black text-white">
                                                            {Object.values(aiCampaigns).reduce((sum, c) => sum + c.ackCount, 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="w-px h-12 bg-white/5" />
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Generated ROI</p>
                                                    <p className="text-2xl font-black text-emerald-400">
                                                        {fmt(Object.values(aiCampaigns).reduce((sum, c) => sum + c.conversionValue, 0))}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PHASE 28: Historical Strategy Trends */}
                                {strategyHistory.length > 0 && (
                                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                                    <History className="w-6 h-6 text-indigo-400" />
                                                    Historical Strategy Trends
                                                </h3>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Multi-day AI Performance Analytics</p>
                                            </div>
                                            <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                                                <BarChart3 className="w-4 h-4 text-indigo-400" />
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Last 7 Days</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end h-32">
                                            {strategyHistory.map((day, idx) => (
                                                <div key={day.id} className="flex flex-col items-center gap-2 group relative">
                                                    {/* ROI Tooltip */}
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl pointer-events-none">
                                                        ROI: {fmt(day.roi)}
                                                    </div>

                                                    {/* Bar Visualization */}
                                                    <div className="w-full flex flex-col justify-end h-20 gap-1 bg-white/[0.02] rounded-t-lg overflow-hidden border-x border-t border-white/5">
                                                        {/* Target Achievement Strip */}
                                                        <div
                                                            className={`w-full ${day.achievement > 90 ? 'bg-emerald-500' : 'bg-indigo-500'} opacity-40 transition-all duration-1000`}
                                                            style={{ height: `${Math.min(day.achievement, 100)}%` }}
                                                        />
                                                        {/* ROI Overlay - Relative to Peak ROI */}
                                                        <div
                                                            className="absolute bottom-6 w-full bg-amber-500 opacity-60 rounded-full blur-[2px]"
                                                            style={{
                                                                height: `${Math.max(...strategyHistory.map(d => d.roi)) > 0
                                                                    ? (day.roi / Math.max(...strategyHistory.map(d => d.roi))) * 80
                                                                    : 0}%`
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="text-center">
                                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                                                            {new Date(day.date).toLocaleDateString('id-ID', { weekday: 'short' })}
                                                        </p>
                                                        <p className="text-[9px] font-black text-white mt-0.5">{day.strikeRate}%</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-6">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg. Strike Rate</p>
                                                <p className="text-lg font-black text-white">
                                                    {Math.round(strategyHistory.reduce((sum, d) => sum + d.strikeRate, 0) / strategyHistory.length)}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Peak ROI</p>
                                                <p className="text-lg font-black text-emerald-400">
                                                    {fmt(Math.max(...strategyHistory.map(d => d.roi)))}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Impact</p>
                                                <p className="text-lg font-black text-indigo-400">
                                                    {fmt(strategyHistory.reduce((sum, d) => sum + d.roi, 0))}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Insights</p>
                                                <p className="text-[10px] font-black text-slate-300 leading-tight">
                                                    {strategyHistory[strategyHistory.length - 1]?.roi > strategyHistory[0]?.roi
                                                        ? "Positive trend in AI adoption."
                                                        : "Stability maintained across shifts."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* High-Density Menu Mix List */}
                                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
                                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-white/[0.02] to-transparent">
                                        <div>
                                            <h3 className="text-xl font-black text-white">Recommended Menu Mix</h3>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Focus targets for peak efficiency</p>
                                        </div>
                                        <button
                                            onClick={() => setShowMenuPicker(true)}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Menu
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-white/[0.01]">
                                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Name & Strategy</th>
                                                    <th className="px-6 py-5 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Price / Margin</th>
                                                    <th className="px-6 py-5 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Stock</th>
                                                    <th className="px-6 py-5 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Qty</th>
                                                    <th className="px-6 py-5 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue</th>
                                                    <th className="px-8 py-5 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {simulatedItems.map((item) => (
                                                    <tr key={`${item.type}-${item.id}`} className="group hover:bg-white/[0.03] transition-colors">
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-2 h-2 rounded-full ${item.type === 'BILLIARD' ? 'bg-indigo-500' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(99,102,241,0.5)]`} />
                                                                <div>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className="text-sm font-black text-white uppercase tracking-tight">{item.name}</span>
                                                                        {item.justification && (
                                                                            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                                                {item.justification}
                                                                            </span>
                                                                        )}
                                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${item.label.includes('🔥') ? 'text-orange-400 bg-orange-500/10' :
                                                                            item.label.includes('🚀') ? 'text-indigo-400 bg-indigo-500/10' :
                                                                                item.label.includes('📦') ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' :
                                                                                    'text-slate-500 bg-slate-500/10'
                                                                            }`}>
                                                                            {item.label}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{item.type}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <div className="text-xs font-black text-slate-300">{fmt(item.price)}</div>
                                                            <div className="text-[9px] font-bold text-emerald-500/60 mt-0.5">{fmt(item.margin)} Margin</div>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            {item.type === 'CAFE' ? (
                                                                <>
                                                                    <div className={`text-xs font-black ${(item.stock ?? 0) < 10 ? 'text-red-400' : 'text-slate-400'}`}>{item.stock ?? 0}</div>
                                                                    <div className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Units</div>
                                                                </>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-700 font-black">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <div className="flex items-center justify-center gap-3">
                                                                <button
                                                                    onClick={() => {
                                                                        const newItems = [...simulatedItems];
                                                                        const idx = newItems.findIndex(i => i.id === item.id && i.type === item.type);
                                                                        newItems[idx].targetQuantity = Math.max(0, newItems[idx].targetQuantity - 1);
                                                                        setSimulatedItems(newItems);
                                                                    }}
                                                                    className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingQuantityItem(item);
                                                                        setNumpadValue(item.targetQuantity.toString());
                                                                    }}
                                                                    className="w-10 py-1.5 bg-black/40 border border-white/5 rounded-lg text-lg font-black text-white hover:border-indigo-500 transition-colors"
                                                                >
                                                                    {item.targetQuantity}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const newItems = [...simulatedItems];
                                                                        const idx = newItems.findIndex(i => i.id === item.id && i.type === item.type);
                                                                        newItems[idx].targetQuantity += 1;
                                                                        setSimulatedItems(newItems);
                                                                    }}
                                                                    className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className="text-sm font-black text-white">{fmt(item.price * item.targetQuantity)}</span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {canPromote && (
                                                                    <button
                                                                        onClick={() => handleBroadcastItem(item.id, item.type)}
                                                                        className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all active:scale-95"
                                                                        title="Broadcast to Waiters"
                                                                    >
                                                                        <Megaphone className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleRemoveItem(item.id, item.type)}
                                                                    className="p-2.5 bg-red-500/10 rounded-xl text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Secondary Intelligence Row: MBA & Forecast */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-6 shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl" />
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-black text-white flex items-center gap-3">
                                                <Award className="w-4 h-4 text-emerald-400" />
                                                Combo Affinity (MBA)
                                            </h3>
                                            <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded tracking-widest">AI DISCOVERY</span>
                                        </div>
                                        <div className="space-y-3">
                                            {comboRules.slice(0, 4).map((rule: any, idx: number) => {
                                                const confidence = Math.round(rule.confidence * 100);
                                                const confColor = confidence > 70 ? 'text-emerald-400' : confidence > 40 ? 'text-indigo-400' : 'text-slate-400';

                                                return (
                                                    <div key={idx} className="bg-white/[0.03] rounded-xl p-4 border border-white/5 flex items-center justify-between gap-4 group hover:border-emerald-500/30 transition-all">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-slate-400 truncate">{rule.antecedentName}</span>
                                                                <span className="text-slate-700 font-black">+</span>
                                                                <span className="text-xs font-black text-white truncate">{rule.consequentName}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-[10px] font-black ${confColor}`}>{confidence}%</div>
                                                            <div className="flex gap-0.5 mt-1">
                                                                {[1, 2, 3].map(i => (
                                                                    <div key={i} className={`w-1 h-1 rounded-full ${i <= (confidence / 33) ? (confidence > 70 ? 'bg-emerald-500' : 'bg-indigo-500') : 'bg-slate-800'}`} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {comboRules.length === 0 && (
                                                <div className="py-12 text-center opacity-30 italic text-xs">Analyzing historical patterns...</div>
                                            )}
                                        </div>
                                    </div>

                                    {forecast && (
                                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-6 shadow-xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl" />
                                            <h3 className="text-lg font-black text-white flex items-center gap-3">
                                                <Eye className="w-4 h-4 text-indigo-400" />
                                                Traffic Forecast
                                            </h3>

                                            {/* Peak Hours Heatmap Visual */}
                                            {forecast.hourlyTraffic && forecast.hourlyTraffic.length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between px-1">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">24H Peak Intensity</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-indigo-500/20" />
                                                            <div className="w-2 h-2 rounded-full bg-indigo-500/60" />
                                                            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                                        </div>
                                                    </div>
                                                    <div className="h-10 w-full bg-white/[0.02] rounded-xl border border-white/5 p-1 flex gap-0.5 group/chart">
                                                        {(() => {
                                                            const max = Math.max(...forecast.hourlyTraffic.map((h: any) => h.count), 1);
                                                            return forecast.hourlyTraffic.map((h: any, i: number) => {
                                                                const intensity = h.count / max;
                                                                const isPeak = forecast.peakHours.some((ph: string) => ph.startsWith(h.hour.split(':')[0]));

                                                                // Dynamic color based on intensity
                                                                let bgColor = 'bg-indigo-500/5';
                                                                if (intensity > 0.8) bgColor = 'bg-indigo-500';
                                                                else if (intensity > 0.5) bgColor = 'bg-indigo-500/60';
                                                                else if (intensity > 0.2) bgColor = 'bg-indigo-500/30';
                                                                else if (intensity > 0.05) bgColor = 'bg-indigo-500/15';

                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        className={`flex-1 rounded-sm transition-all duration-700 relative group/cell ${bgColor} ${isPeak ? 'ring-1 ring-white/20' : ''}`}
                                                                        title={`${h.hour}: ${h.count.toFixed(1)} visitors`}
                                                                    >
                                                                        {isPeak && (
                                                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-pulse" />
                                                                        )}
                                                                        {/* Tooltip on hover */}
                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-[8px] font-black text-white px-1.5 py-0.5 rounded opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                                                            {h.hour}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                    <div className="flex justify-between px-1 text-[8px] font-black text-slate-600 tracking-tighter uppercase">
                                                        <span>00:00</span>
                                                        <span>06:00</span>
                                                        <span>12:00</span>
                                                        <span>18:00</span>
                                                        <span>23:00</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Cust/Day</p>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-indigo-400" />
                                                        <span className="text-lg font-black text-white">{forecast.predictedCustomerCount}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-right">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Peak Hour</p>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Clock className="w-4 h-4 text-indigo-400" />
                                                        <span className="text-sm font-black text-white">{forecast.peakHours[0] || '--:--'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-1.5">
                                                    <Zap className="w-3 h-3" />
                                                    Labor Advice
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
                                                    {forecast.staffRecommendation}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[600px] bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:border-indigo-500/30 transition-all shadow-2xl" onClick={handleSimulate}>
                                <div className="w-24 h-24 bg-indigo-500/20 rounded-[2.5rem] flex items-center justify-center mb-8 border border-indigo-500/30 group-hover:scale-110 group-hover:bg-indigo-500/30 transition-all duration-500">
                                    <Target className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Ready to Sculpt Revenue?</h3>
                                <p className="text-slate-500 max-w-sm font-medium leading-relaxed">
                                    Masukkan target omset harian Anda di panel sebelah kiri, lalu tekan <span className="text-indigo-400 font-bold italic">Run AI Calculation</span> untuk memulai optimasi cerdas.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modals Container */}
                {showMenuPicker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-black/60 animate-in fade-in duration-300">
                        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-black text-white">Add Menu Item</h3>
                                    <button onClick={() => setShowMenuPicker(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Cari menu..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 transition-all outline-none"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {allMenu
                                        .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map((item) => (
                                            <button
                                                key={`${item.type}-${item.id}`}
                                                onClick={() => handleAddItem(item)}
                                                className="flex flex-col p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-indigo-500/50 transition-all text-left group"
                                            >
                                                <span className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors uppercase truncate">{item.name}</span>
                                                <span className="text-[10px] font-bold text-slate-500">{fmt(item.price)}</span>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {editingQuantityItem && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 backdrop-blur-md bg-black/40 animate-in fade-in duration-300">
                        <div className="bg-slate-900 border border-white/20 rounded-[2.5rem] w-full max-w-xs flex flex-col p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Set Target</h3>
                                <button onClick={() => setEditingQuantityItem(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="mb-8">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 truncate">{editingQuantityItem.name}</p>
                                <div className="bg-black/40 border border-white/5 rounded-2xl py-6 px-4 text-center">
                                    <span className="text-5xl font-black text-white">{numpadValue || "0"}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0].map((btn) => (
                                    <button
                                        key={btn}
                                        onClick={() => btn === "C" ? setNumpadValue("") : handleNumpadInput(btn.toString())}
                                        className={`h-16 rounded-2xl text-xl font-black transition-all active:scale-95 flex items-center justify-center ${btn === "C" ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-white/5 text-white hover:bg-white/10'
                                            }`}
                                    >
                                        {btn}
                                    </button>
                                ))}
                                <button onClick={handleNumpadDelete} className="h-16 bg-white/5 text-white rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-95">
                                    <Delete className="w-6 h-6" />
                                </button>
                            </div>
                            <button
                                onClick={handleNumpadConfirm}
                                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                SET QUANTITY
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        {activeChat && (
          <ChatWindow 
            receiverId={0} 
            receiverName="Group Chat Management" 
            onClose={() => setActiveChat(null)} 
            socket={socket}
          />
        )}
      </div>
    );
}
