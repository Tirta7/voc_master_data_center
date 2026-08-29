'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider';
import { 
    Gamepad2, Coffee, Save, Plus, MousePointer2, Trash2, 
    Undo2, Redo2, RotateCcw, Box, Home, ArrowUpToLine, 
    Wind, Maximize, Lock, CheckCircle2, Copy
} from 'lucide-react';

interface FloorElement {
    id: string;
    type: 'BILLIARD' | 'CAFE' | 'WALL' | 'CASHIER' | 'BAR' | 'SOFA_U' | 'SOFA_L' | 'PLANT' | 'STAIRS' | 'TOILET';
    tableId?: number;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    color?: string;
    zIndex?: number;
}

interface Floor {
    id: string;
    name: string;
    elements: FloorElement[];
}

interface TableData {
    id: number;
    tableName: string;
    type: 'BILLIARD' | 'CAFE';
}

export default function FloorPlanEditorPage() {
    const { hasPermission } = useAuth();
    const { showAlert } = useAlert();
    
    // Multi-floor state
    const [floors, setFloors] = useState<Floor[]>([{ id: 'floor_1', name: 'Lantai 1', elements: [] }]);
    const [activeFloorId, setActiveFloorId] = useState<string>('floor_1');
    
    const [availableBilliard, setAvailableBilliard] = useState<TableData[]>([]);
    const [availableCafe, setAvailableCafe] = useState<TableData[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Editor State
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });
    const [dragStartElements, setDragStartElements] = useState<{id: string, x: number, y: number}[]>([]);
    const [isRotating, setIsRotating] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizingId, setResizingId] = useState<string | null>(null);
    const [resizeStartElements, setResizeStartElements] = useState<{id: string, w: number, h: number, x: number, y: number}[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Lasso State
    const [isLassoing, setIsLassoing] = useState(false);
    const [lassoStart, setLassoStart] = useState({ x: 0, y: 0 });
    const [lassoCurrent, setLassoCurrent] = useState({ x: 0, y: 0 });

    // History (Undo/Redo)
    const [history, setHistory] = useState<Floor[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const activeFloorIndex = floors.findIndex(f => f.id === activeFloorId);
    const activeElements = floors[activeFloorIndex]?.elements || [];

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            } else if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedIds.length > 0) {
                    const idsToRemove = selectedIds.filter(id => {
                        const el = activeElements.find(e => e.id === id);
                        return el && !['BILLIARD', 'CAFE'].includes(el.type);
                    });
                    if (idsToRemove.length > 0) {
                        updateActiveFloorElements(prev => prev.filter(e => !idsToRemove.includes(e.id)));
                        setSelectedIds(prev => prev.filter(id => !idsToRemove.includes(id)));
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, activeElements]);

    const pushHistory = (newFloors: Floor[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newFloors)));
        if (newHistory.length > 30) newHistory.shift(); 
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setFloors(newFloors);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setFloors(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setFloors(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
    };

    const updateActiveFloorElements = (updater: (prev: FloorElement[]) => FloorElement[]) => {
        const newFloors = [...floors];
        newFloors[activeFloorIndex] = {
            ...newFloors[activeFloorIndex],
            elements: updater(newFloors[activeFloorIndex].elements)
        };
        pushHistory(newFloors);
    };

    const fetchData = async () => {
        try {
            const [billiardRes, cafeRes, settingsRes] = await Promise.all([
                axios.get('/billiard/tables'),
                axios.get('/cafe-table'),
                axios.get('/settings')
            ]);
            
            setAvailableBilliard(billiardRes.data);
            setAvailableCafe(cafeRes.data);
            
            if (settingsRes.data.floorPlanLayout) {
                try {
                    const parsed = typeof settingsRes.data.floorPlanLayout === 'string' 
                        ? JSON.parse(settingsRes.data.floorPlanLayout) 
                        : settingsRes.data.floorPlanLayout;
                        
                    if (parsed.floors) {
                        setFloors(parsed.floors);
                        setActiveFloorId(parsed.floors[0]?.id || 'floor_1');
                        setHistory([JSON.parse(JSON.stringify(parsed.floors))]);
                        setHistoryIndex(0);
                    } else if (parsed.elements) {
                        const initialFloors = [{ id: 'floor_1', name: 'Lantai 1', elements: parsed.elements }];
                        setFloors(initialFloors);
                        setHistory([JSON.parse(JSON.stringify(initialFloors))]);
                        setHistoryIndex(0);
                    }
                } catch (e) {
                    console.error('Failed to parse floor plan layout', e);
                }
            } else {
                setHistory([JSON.parse(JSON.stringify(floors))]);
                setHistoryIndex(0);
            }
        } catch (error) {
            showAlert('Error', 'Gagal memuat data layout', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.patch('/settings', {
                floorPlanLayout: { floors }
            });
            showAlert('Sukses', 'Layout ruangan semua lantai berhasil disimpan!', { variant: 'success' });
        } catch (error) {
            showAlert('Gagal', 'Gagal menyimpan layout', { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const getShapeStyles = (type: string) => {
        switch(type) {
            case 'BILLIARD': return { bg: '#1e293b', color: '#fff', radius: '8px' };
            case 'CAFE': return { bg: '#f59e0b', color: '#fff', radius: '50%' };
            case 'WALL': return { bg: '#94a3b8', color: '#fff', radius: '0px' };
            case 'CASHIER': return { bg: '#10b981', color: '#fff', radius: '8px' };
            case 'BAR': return { bg: '#8b5cf6', color: '#fff', radius: '12px' };
            case 'SOFA_U': return { bg: '#e2e8f0', color: '#475569', radius: '16px 16px 4px 4px', border: '4px solid #cbd5e1', borderBottom: 'none' };
            case 'SOFA_L': return { bg: '#e2e8f0', color: '#475569', radius: '16px 4px 4px 4px', border: '4px solid #cbd5e1', borderRight: 'none', borderBottom: 'none' };
            case 'PLANT': return { bg: '#22c55e', color: '#fff', radius: '50%', border: '4px solid #166534' };
            case 'STAIRS': return { bg: '#f1f5f9', color: '#94a3b8', radius: '4px', background: 'repeating-linear-gradient(0deg, #cbd5e1, #cbd5e1 5px, #f1f5f9 5px, #f1f5f9 10px)' };
            case 'TOILET': return { bg: '#38bdf8', color: '#fff', radius: '8px' };
            default: return { bg: '#e2e8f0', color: '#475569', radius: '8px' };
        }
    };

    const addDecoration = (type: FloorElement['type'], label: string, w: number, h: number) => {
        const id = `decor_${Date.now()}`;
        updateActiveFloorElements(prev => [...prev, {
            id, type, label, x: 200, y: 200, width: w, height: h, rotation: 0, zIndex: 10
        }]);
        setSelectedIds([id]);
    };

    const removeElement = (id: string) => {
        updateActiveFloorElements(prev => prev.filter(e => e.id !== id));
        setSelectedIds(prev => prev.filter(x => x !== id));
    };

    const handleAutoPlaceTables = () => {
        const allPlacedIds = floors.flatMap(f => f.elements).filter(e => e.tableId).map(e => `${e.type}_${e.tableId}`);
        
        let nextX = 50;
        let nextY = 50;
        const newElements = [...activeElements];

        const placeTable = (table: TableData, type: 'BILLIARD' | 'CAFE', w: number, h: number) => {
            const compositeId = `${type}_${table.id}`;
            if (!allPlacedIds.includes(compositeId)) {
                newElements.push({
                    id: compositeId,
                    type,
                    tableId: table.id,
                    label: table.tableName,
                    x: nextX,
                    y: nextY,
                    width: w,
                    height: h,
                    rotation: 0,
                    zIndex: 20
                });
                nextX += w + 20;
                if (nextX > 700) {
                    nextX = 50;
                    nextY += h + 20;
                }
            }
        };

        availableBilliard.forEach(t => placeTable(t, 'BILLIARD', 120, 80));
        availableCafe.forEach(t => placeTable(t, 'CAFE', 60, 60));

        updateActiveFloorElements(() => newElements);
    };

    // DRAG LOGIC
    const handlePointerDown = (e: React.PointerEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        let currentSelected = selectedIds;
        if (!currentSelected.includes(id)) {
            currentSelected = e.shiftKey ? [...currentSelected, id] : [id];
            setSelectedIds(currentSelected);
        }
        
        if (!containerRef.current) return;
        
        setDraggingId(id);
        setDragStartMouse({ x: e.clientX, y: e.clientY });
        
        const initialPos = activeElements.filter(el => currentSelected.includes(el.id)).map(el => ({ id: el.id, x: el.x, y: el.y }));
        setDragStartElements(initialPos);
        
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    // ROTATE LOGIC
    const handleRotateDown = (e: React.PointerEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsRotating(true);
        setSelectedIds([id]); // Rotation only supports single element for now
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    // RESIZE LOGIC
    const handleResizeDown = (e: React.PointerEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        
        let currentSelected = selectedIds;
        if (!currentSelected.includes(id)) {
            currentSelected = [id];
            setSelectedIds(currentSelected);
        }
        
        setDragStartMouse({ x: e.clientX, y: e.clientY });
        setResizingId(id);
        
        const initialSizes = activeElements.filter(el => currentSelected.includes(el.id)).map(el => ({ id: el.id, w: el.width, h: el.height, x: el.x, y: el.y }));
        setResizeStartElements(initialSizes);
        
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    // CONTAINER LOGIC
    const handleContainerPointerDown = (e: React.PointerEvent) => {
        if (!containerRef.current) return;
        setSelectedIds([]);
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setLassoStart({ x, y });
        setLassoCurrent({ x, y });
        setIsLassoing(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (draggingId && containerRef.current && !isRotating && !isResizing) {
            const deltaX = e.clientX - dragStartMouse.x;
            const deltaY = e.clientY - dragStartMouse.y;
            
            const newFloors = [...floors];
            newFloors[activeFloorIndex].elements = newFloors[activeFloorIndex].elements.map(el => {
                if (selectedIds.includes(el.id)) {
                    const startPos = dragStartElements.find(s => s.id === el.id);
                    if (startPos) {
                        let nx = startPos.x + deltaX;
                        let ny = startPos.y + deltaY;
                        nx = Math.round(nx / 10) * 10;
                        ny = Math.round(ny / 10) * 10;
                        return { ...el, x: nx, y: ny };
                    }
                }
                return el;
            });
            setFloors(newFloors); 
        } else if (isRotating && selectedIds.length === 1 && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const el = activeElements.find(x => x.id === selectedIds[0]);
            if (!el) return;

            const cx = el.x + (el.width / 2);
            const cy = el.y + (el.height / 2);
            const mx = e.clientX - containerRect.left;
            const my = e.clientY - containerRect.top;
            
            let angle = Math.atan2(my - cy, mx - cx) * (180 / Math.PI);
            angle = angle + 90; 
            if (angle < 0) angle += 360;
            angle = Math.round(angle / 15) * 15;

            const newFloors = [...floors];
            newFloors[activeFloorIndex].elements = newFloors[activeFloorIndex].elements.map(x => 
                x.id === selectedIds[0] ? { ...x, rotation: angle } : x
            );
            setFloors(newFloors);
        } else if (isResizing && containerRef.current) {
            const deltaX = e.clientX - dragStartMouse.x;
            const deltaY = e.clientY - dragStartMouse.y;
            
            const mainStartSize = resizeStartElements.find(s => s.id === resizingId);
            if (!mainStartSize) return;

            const scaleX = Math.max(0.1, (mainStartSize.w + deltaX) / mainStartSize.w);
            const scaleY = Math.max(0.1, (mainStartSize.h + deltaY) / mainStartSize.h);

            // Determine pivot (top-left of the selected group)
            const minX = Math.min(...resizeStartElements.map(e => e.x));
            const minY = Math.min(...resizeStartElements.map(e => e.y));
            
            const newFloors = [...floors];
            newFloors[activeFloorIndex].elements = newFloors[activeFloorIndex].elements.map(x => {
                if (selectedIds.includes(x.id)) {
                    const startSize = resizeStartElements.find(s => s.id === x.id);
                    if (startSize) {
                        let nw = startSize.w * scaleX;
                        let nh = startSize.h * scaleY;
                        let nx = minX + (startSize.x - minX) * scaleX;
                        let ny = minY + (startSize.y - minY) * scaleY;
                        
                        nw = Math.max(20, Math.round(nw / 10) * 10);
                        nh = Math.max(20, Math.round(nh / 10) * 10);
                        nx = Math.round(nx / 10) * 10;
                        ny = Math.round(ny / 10) * 10;
                        
                        return { ...x, width: nw, height: nh, x: nx, y: ny };
                    }
                }
                return x;
            });
            setFloors(newFloors);
        } else if (isLassoing && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setLassoCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (draggingId) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            setDraggingId(null);
            pushHistory(floors);
        } else if (isRotating) {
            setIsRotating(false);
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            pushHistory(floors);
        } else if (isResizing) {
            setIsResizing(false);
            setResizingId(null);
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            pushHistory(floors);
        } else if (isLassoing) {
            setIsLassoing(false);
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            
            const minX = Math.min(lassoStart.x, lassoCurrent.x);
            const maxX = Math.max(lassoStart.x, lassoCurrent.x);
            const minY = Math.min(lassoStart.y, lassoCurrent.y);
            const maxY = Math.max(lassoStart.y, lassoCurrent.y);

            const toggledElements = activeElements.filter(el => {
                const cx = el.x + el.width / 2;
                const cy = el.y + el.height / 2;
                return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
            });

            if (toggledElements.length > 0) {
                setSelectedIds(toggledElements.map(t => t.id));
            }
        }
    };

    const addFloor = () => {
        const id = `floor_${Date.now()}`;
        const newFloors = [...floors, { id, name: `Lantai ${floors.length + 1}`, elements: [] }];
        pushHistory(newFloors);
        setActiveFloorId(id);
    };

    const deleteActiveFloor = () => {
        if (floors.length <= 1) return showAlert('Oops', 'Minimal harus ada 1 lantai.', { variant: 'error' });
        if (activeElements.some(e => ['BILLIARD', 'CAFE'].includes(e.type))) {
            return showAlert('Error', 'Kosongkan Meja dari lantai ini sebelum menghapus lantai.', { variant: 'error' });
        }
        const newFloors = floors.filter(f => f.id !== activeFloorId);
        pushHistory(newFloors);
        setActiveFloorId(newFloors[0].id);
    };

    if (!hasPermission('SYSTEM_CONFIG')) return <div className="p-10 text-center font-bold text-slate-400">Akses Ditolak</div>;

    const singleSelectedElement = selectedIds.length === 1 ? activeElements.find(e => e.id === selectedIds[0]) : null;

    return (
        <div className="h-[calc(100vh-80px)] overflow-hidden flex flex-col bg-slate-100">
            {/* Top Toolbar */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 z-20 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Box className="w-6 h-6 text-indigo-600" />
                        Layout Ruangan
                    </h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Multi-Floor Canvas Designer</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 text-slate-600 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent">
                            <Undo2 className="w-5 h-5" />
                        </button>
                        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 text-slate-600 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent">
                            <Redo2 className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-slate-900 text-white font-black rounded-xl flex items-center gap-2 hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-300">
                        <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Layout'}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar */}
                <div className="w-72 bg-white border-r border-slate-200 flex flex-col z-10 shadow-lg">
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-3">Tarik / Tambah Elemen</h3>
                        <button onClick={handleAutoPlaceTables} className="w-full py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 text-sm border border-indigo-100 shadow-sm">
                            <RotateCcw className="w-4 h-4" /> Panggil Semua Meja
                        </button>
                        <p className="text-[10px] text-center text-slate-400 mt-2">Menarik meja yang belum ada di denah mana pun.</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        <div>
                            <div className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2"><Home className="w-4 h-4" /> STRUKTUR & FASILITAS</div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => addDecoration('WALL', 'Tembok', 200, 20)} className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl hover:bg-slate-100 hover:ring-2 ring-slate-200 transition-all border border-slate-200 gap-2">
                                    <div className="w-16 h-2 bg-slate-400 rounded-full"></div>
                                    <span className="text-[10px] font-bold text-slate-600">Tembok</span>
                                </button>
                                <button onClick={() => addDecoration('STAIRS', 'Tangga', 80, 80)} className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl hover:bg-slate-100 hover:ring-2 ring-slate-200 transition-all border border-slate-200 gap-2">
                                    <div className="w-12 h-10 bg-[repeating-linear-gradient(0deg,#cbd5e1,#cbd5e1_4px,#f1f5f9_4px,#f1f5f9_8px)] rounded-md border border-slate-300"></div>
                                    <span className="text-[10px] font-bold text-slate-600">Tangga</span>
                                </button>
                                <button onClick={() => addDecoration('TOILET', 'Toilet', 80, 80)} className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl hover:bg-slate-100 hover:ring-2 ring-slate-200 transition-all border border-slate-200 gap-2">
                                    <div className="w-10 h-10 bg-sky-400 rounded-lg flex items-center justify-center text-white"><Wind className="w-5 h-5"/></div>
                                    <span className="text-[10px] font-bold text-slate-600">Toilet</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> AREA KERJA</div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => addDecoration('CASHIER', 'Kasir', 120, 60)} className="flex flex-col items-center justify-center p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-200 gap-2">
                                    <div className="w-16 h-6 bg-emerald-500 rounded-md"></div>
                                    <span className="text-[10px] font-bold text-emerald-700">Meja Kasir</span>
                                </button>
                                <button onClick={() => addDecoration('BAR', 'Bar / Dapur', 150, 60)} className="flex flex-col items-center justify-center p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-all border border-purple-200 gap-2">
                                    <div className="w-16 h-6 bg-purple-500 rounded-md"></div>
                                    <span className="text-[10px] font-bold text-purple-700">Bar / KDS</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2"><Coffee className="w-4 h-4" /> FURNITUR & DEKOR</div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => addDecoration('SOFA_U', 'Sofa U', 120, 100)} className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 gap-2">
                                    <div className="w-12 h-10 border-[6px] border-b-0 border-slate-400 rounded-t-xl rounded-b-sm"></div>
                                    <span className="text-[10px] font-bold text-slate-600">Sofa U</span>
                                </button>
                                <button onClick={() => addDecoration('SOFA_L', 'Sofa L', 100, 100)} className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 gap-2">
                                    <div className="w-10 h-10 border-[6px] border-r-0 border-b-0 border-slate-400 rounded-tl-xl rounded-b-sm rounded-r-sm"></div>
                                    <span className="text-[10px] font-bold text-slate-600">Sofa L</span>
                                </button>
                                <button onClick={() => addDecoration('PLANT', 'Tanaman', 50, 50)} className="flex flex-col items-center justify-center p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-all border border-green-200 gap-2">
                                    <div className="w-8 h-8 bg-green-500 border-[4px] border-green-700 rounded-full"></div>
                                    <span className="text-[10px] font-bold text-green-700">Tanaman</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 flex flex-col bg-slate-200 relative">
                    
                    <div className="bg-white/90  p-2 m-4 rounded-2xl flex items-center gap-2 absolute top-0 left-0 z-20 shadow-md border border-slate-200">
                        {floors.map(f => (
                            <button 
                                key={f.id}
                                onClick={() => { setActiveFloorId(f.id); setSelectedIds([]); }}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeFloorId === f.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                {f.name}
                            </button>
                        ))}
                        <div className="w-px h-6 bg-slate-300 mx-2"></div>
                        <button onClick={addFloor} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all tooltip-trigger">
                            <Plus className="w-5 h-5" />
                        </button>
                        {floors.length > 1 && (
                            <button onClick={deleteActiveFloor} className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all ml-1">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div 
                        ref={containerRef}
                        className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden"
                        style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '30px 30px', backgroundPosition: '-15px -15px' }}
                        onPointerDown={handleContainerPointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    >
                        {activeElements.map((el) => {
                            const styleOpts = getShapeStyles(el.type);
                            const isSelected = selectedIds.includes(el.id);
                            
                            return (
                                <div
                                    key={el.id}
                                    id={`element-${el.id}`}
                                    onPointerDown={(e) => handlePointerDown(e, el.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`absolute flex flex-col items-center justify-center font-bold text-xs select-none touch-none transition-shadow group ${isSelected ? 'z-50 shadow-2xl ring-4 ring-indigo-500/50' : 'z-10 hover:ring-2 hover:ring-indigo-300 cursor-move shadow-md'}`}
                                    style={{
                                        left: el.x,
                                        top: el.y,
                                        width: el.width,
                                        height: el.height,
                                        transform: `rotate(${el.rotation}deg)`,
                                        backgroundColor: styleOpts.bg,
                                        color: styleOpts.color,
                                        borderRadius: styleOpts.radius,
                                        border: (styleOpts as any).border,
                                        borderBottom: (styleOpts as any).borderBottom,
                                        borderRight: (styleOpts as any).borderRight,
                                        ...( (styleOpts as any).background ? { background: (styleOpts as any).background } : {} ),
                                        zIndex: isSelected ? 100 : el.zIndex || 10
                                    }}
                                >
                                    <div className="flex flex-col items-center justify-center gap-1 opacity-90 pointer-events-none w-full h-full relative z-10">
                                        {el.type === 'BILLIARD' && <Gamepad2 className="w-5 h-5" />}
                                        {el.type === 'CAFE' && <Coffee className="w-4 h-4" />}
                                        {['BILLIARD', 'CAFE', 'CASHIER', 'BAR'].includes(el.type) && (
                                            <span className="text-center px-1 truncate w-full">{el.label}</span>
                                        )}
                                    </div>

                                    {/* Resize handle is shown for ALL selected elements */}
                                    {isSelected && (
                                        <div 
                                            className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-indigo-600 rounded-sm shadow-lg flex items-center justify-center cursor-nwse-resize z-50 hover:scale-110 transition-transform"
                                            onPointerDown={(e) => handleResizeDown(e, el.id)}
                                        >
                                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                                        </div>
                                    )}

                                    {/* Rotation handle only if exactly ONE element is selected */}
                                    {isSelected && selectedIds.length === 1 && (
                                        <div 
                                            className="absolute -top-10 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-indigo-600 rounded-full shadow-lg flex items-center justify-center cursor-alias z-50 hover:scale-110 transition-transform"
                                            onPointerDown={(e) => handleRotateDown(e, el.id)}
                                        >
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-4 bg-indigo-600"></div>
                                        </div>
                                    )}

                                </div>
                            );
                        })}

                        {/* Lasso selection box */}
                        {isLassoing && (
                            <div 
                                className="absolute border-2 border-indigo-500/50 bg-indigo-500/10 pointer-events-none z-50"
                                style={{
                                    left: Math.min(lassoStart.x, lassoCurrent.x),
                                    top: Math.min(lassoStart.y, lassoCurrent.y),
                                    width: Math.abs(lassoCurrent.x - lassoStart.x),
                                    height: Math.abs(lassoCurrent.y - lassoStart.y),
                                }}
                            />
                        )}
                    </div>
                    
                    {/* Floating Toolbar - adapt for single vs multi */}
                    {selectedIds.length > 0 && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5 z-40 border border-slate-700">
                            
                            {selectedIds.length === 1 && singleSelectedElement ? (
                                <>
                                    <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
                                        <span className="font-black text-sm">{singleSelectedElement.label}</span>
                                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">{Math.round(singleSelectedElement.rotation)}°</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs text-slate-400 flex items-center gap-1"><Maximize className="w-3 h-3"/> {singleSelectedElement.width}x{singleSelectedElement.height}</div>
                                        
                                        {!['BILLIARD', 'CAFE'].includes(singleSelectedElement.type) && (
                                            <button 
                                                onClick={() => removeElement(singleSelectedElement.id)}
                                                className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-full transition-colors ml-2"
                                                title="Hapus Elemen"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <span className="font-black text-sm">{selectedIds.length} Objek Terpilih</span>
                                    <span className="text-xs text-slate-400">Tekan dan seret untuk memindahkan semuanya</span>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
