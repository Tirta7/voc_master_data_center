import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Gamepad2, Coffee, Layers, Hand, MousePointer2 } from 'lucide-react';

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
}

interface Floor {
    id: string;
    name: string;
    elements: FloorElement[];
}

interface FloorPlanMapProps {
    localAssignments: { type: 'CAFE' | 'BILLIARD'; id: number }[];
    onToggleTable: (type: 'CAFE' | 'BILLIARD', id: number) => void;
    tableOccupancy: any;
    waiterColorClass?: string;
}

export default function FloorPlanMap({ localAssignments, onToggleTable, tableOccupancy, waiterColorClass = 'bg-indigo-600 border-indigo-700 text-white' }: FloorPlanMapProps) {
    const [floors, setFloors] = useState<Floor[]>([]);
    const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [zoom, setZoom] = useState(1);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isLassoing, setIsLassoing] = useState(false);
    const [lassoStart, setLassoStart] = useState({ x: 0, y: 0 });
    const [lassoCurrent, setLassoCurrent] = useState({ x: 0, y: 0 });
    
    // Pan Mode States
    const [interactionMode, setInteractionMode] = useState<'pan' | 'select'>('pan');
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

    useEffect(() => {
        const fetchLayout = async () => {
            try {
                const res = await axios.get('/settings');
                if (res.data.floorPlanLayout) {
                    const parsed = typeof res.data.floorPlanLayout === 'string' 
                        ? JSON.parse(res.data.floorPlanLayout) 
                        : res.data.floorPlanLayout;
                    
                    if (parsed.floors && parsed.floors.length > 0) {
                        setFloors(parsed.floors);
                        setActiveFloorId(parsed.floors[0].id);
                    } else if (parsed.elements) {
                        setFloors([{ id: 'floor_1', name: 'Lantai 1', elements: parsed.elements }]);
                        setActiveFloorId('floor_1');
                    }
                }
            } catch (e) {
                console.error('Failed to load floor plan map', e);
            } finally {
                setLoading(false);
            }
        };
        fetchLayout();
    }, []);

    const activeFloor = floors.find(f => f.id === activeFloorId);
    const elements = activeFloor?.elements || [];

    const minX_bounds = elements.length > 0 ? Math.min(...elements.map(e => e.x)) : 0;
    const minY_bounds = elements.length > 0 ? Math.min(...elements.map(e => e.y)) : 0;
    const maxX_bounds = elements.length > 0 ? Math.max(...elements.map(e => e.x + (e.width || 0))) : 0;
    const maxY_bounds = elements.length > 0 ? Math.max(...elements.map(e => e.y + (e.height || 0))) : 0;

    const offsetX = Math.max(0, minX_bounds - 50);
    const offsetY = Math.max(0, minY_bounds - 50);

    const dynamicWidth = Math.max(300, maxX_bounds - offsetX + 50);
    const dynamicHeight = Math.max(300, maxY_bounds - offsetY + 50);

    useEffect(() => {
        if (wrapperRef.current && dynamicWidth > 0 && dynamicHeight > 0) {
            const ww = wrapperRef.current.clientWidth - 40;
            const wh = wrapperRef.current.clientHeight - 40;
            if (ww > 0 && wh > 0) {
                const scaleX = ww / dynamicWidth;
                const scaleY = wh / dynamicHeight;
                setZoom(Math.max(0.3, Math.min(scaleX, scaleY, 1)));
            }
        }
    }, [activeFloorId, dynamicWidth, dynamicHeight]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!containerRef.current || !activeFloor) return;
        
        if (interactionMode === 'pan') {
            if (!wrapperRef.current) return;
            setIsPanning(true);
            setPanStart({
                x: e.clientX,
                y: e.clientY,
                scrollLeft: wrapperRef.current.scrollLeft,
                scrollTop: wrapperRef.current.scrollTop
            });
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        setLassoStart({ x, y });
        setLassoCurrent({ x, y });
        setIsLassoing(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (interactionMode === 'pan' && isPanning && wrapperRef.current) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            wrapperRef.current.scrollLeft = panStart.scrollLeft - dx;
            wrapperRef.current.scrollTop = panStart.scrollTop - dy;
            return;
        }

        if (!isLassoing || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setLassoCurrent({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (interactionMode === 'pan' && isPanning) {
            setIsPanning(false);
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            return;
        }

        if (!isLassoing) return;
        setIsLassoing(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        const minX = Math.min(lassoStart.x, lassoCurrent.x);
        const maxX = Math.max(lassoStart.x, lassoCurrent.x);
        const minY = Math.min(lassoStart.y, lassoCurrent.y);
        const maxY = Math.max(lassoStart.y, lassoCurrent.y);

        const toggledElements = elements.filter(el => {
            if (!['BILLIARD', 'CAFE'].includes(el.type)) return false;
            const cx = (el.x - offsetX) + el.width / 2;
            const cy = (el.y - offsetY) + el.height / 2;
            return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
        });

        if (toggledElements.length > 0) {
            const firstAssigned = localAssignments.some(la => la.type === toggledElements[0].type && la.id === toggledElements[0].tableId);
            
            toggledElements.forEach(el => {
                if (!el.tableId) return;
                const isAssigned = localAssignments.some(la => la.type === el.type && la.id === el.tableId);
                if (firstAssigned === isAssigned) {
                    onToggleTable(el.type as 'CAFE' | 'BILLIARD', el.tableId);
                }
            });
        }
    };

    const getShapeStyles = (type: string) => {
        switch(type) {
            case 'BILLIARD': return { radius: '8px' };
            case 'CAFE': return { radius: '50%' };
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

    if (loading) return <div className="p-10 text-center animate-pulse text-slate-400 font-bold">Memuat Denah Ruangan...</div>;

    if (floors.length === 0) {
        return (
            <div className="p-10 text-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                <p className="font-bold mb-2">Denah Ruangan Belum Dibuat</p>
                <p className="text-sm">Silakan buat denah di menu Settings &gt; Layout Ruangan.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
                {floors.length > 1 ? (
                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-max border border-slate-200/60 shadow-inner">
                        <div className="pl-3 pr-1 text-slate-400"><Layers className="w-4 h-4" /></div>
                        {floors.map(f => (
                            <button
                                type="button"
                                key={f.id}
                                onClick={() => setActiveFloorId(f.id)}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeFloorId === f.id ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                                {f.name}
                            </button>
                        ))}
                    </div>
                ) : <div />}

                <div className="flex items-center gap-4 bg-white px-3 py-2 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setInteractionMode('pan')}
                            className={`p-1.5 rounded-lg transition-all ${interactionMode === 'pan' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                            title="Geser Peta (Pan)"
                        >
                            <Hand className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setInteractionMode('select')}
                            className={`p-1.5 rounded-lg transition-all ${interactionMode === 'select' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                            title="Pilih Banyak Meja (Lasso Select)"
                        >
                            <MousePointer2 className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="w-px h-6 bg-slate-200" />
                    
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600 pr-2">
                        <span>Zoom: {Math.round(zoom * 100)}%</span>
                        <input 
                            type="range" 
                            min="0.3" 
                            max="2" 
                            step="0.1" 
                            value={zoom} 
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-24 accent-indigo-600"
                        />
                    </div>
                </div>
            </div>

            <div ref={wrapperRef} className="w-full border-2 border-slate-200 rounded-[2rem] bg-slate-50 overflow-auto custom-scrollbar" style={{ height: '60vh' }}>
                <div className="relative" style={{ width: dynamicWidth * zoom, height: dynamicHeight * zoom, minWidth: '100%', minHeight: '100%' }}>
                    <div 
                        ref={containerRef}
                        className={`absolute overflow-hidden ${interactionMode === 'select' ? 'touch-none cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                        style={{ 
                            left: '50%',
                            top: '50%',
                            width: `${dynamicWidth}px`, 
                            height: `${dynamicHeight}px`, 
                            backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', 
                            backgroundSize: '20px 20px', 
                            backgroundPosition: `${-offsetX % 20}px ${-offsetY % 20}px`,
                            transform: `translate(-50%, -50%) scale(${zoom})`,
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    >
                {elements.map((el) => {
                    const isTable = ['BILLIARD', 'CAFE'].includes(el.type);
                    const isAssigned = isTable && localAssignments.some(la => la.type === el.type && la.id === el.tableId);
                    const occupants = isTable && el.tableId ? (tableOccupancy[el.type]?.[el.tableId] || []) : [];
                    const isOccupiedByOthers = occupants.length > 0;
                    
                    const styleOpts = getShapeStyles(el.type);

                    let bgStyle = (styleOpts as any).bg || '';
                    let textStyle = (styleOpts as any).color || '';
                    
                    if (isTable) {
                        if (isAssigned) {
                            textStyle = 'text-white';
                        } else if (isOccupiedByOthers) {
                            bgStyle = '#fef3c7';
                            textStyle = 'text-amber-900 border-2 border-amber-200';
                        } else {
                            bgStyle = '#ffffff';
                            textStyle = 'text-slate-500 border-2 border-slate-200 hover:border-indigo-300';
                        }
                    }

                    return (
                        <div
                            key={el.id}
                            onPointerDown={(e) => {
                                if (isTable && el.tableId) {
                                    e.stopPropagation();
                                    onToggleTable(el.type as 'CAFE' | 'BILLIARD', el.tableId);
                                }
                            }}
                            className={`absolute flex flex-col items-center justify-center font-bold text-[10px] select-none shadow-sm transition-all duration-200 ${isTable ? 'cursor-pointer hover:shadow-md hover:scale-105' : 'pointer-events-none'} ${isAssigned ? waiterColorClass : textStyle}`}
                            style={{
                                left: el.x - offsetX,
                                top: el.y - offsetY,
                                width: el.width,
                                height: el.height,
                                transform: `rotate(${el.rotation}deg)`,
                                backgroundColor: isAssigned ? undefined : bgStyle,
                                borderRadius: styleOpts.radius,
                                border: (styleOpts as any).border,
                                borderBottom: (styleOpts as any).borderBottom,
                                borderRight: (styleOpts as any).borderRight,
                                ...( (styleOpts as any).background ? { background: (styleOpts as any).background } : {} ),
                                zIndex: isTable ? 20 : 10
                            }}
                        >
                            <div className="flex flex-col items-center gap-1 opacity-70 w-full h-full justify-center">
                                {el.type === 'BILLIARD' && <Gamepad2 className="w-4 h-4" />}
                                {el.type === 'CAFE' && <Coffee className="w-3 h-3" />}
                                {['BILLIARD', 'CAFE', 'CASHIER', 'BAR'].includes(el.type) && (
                                    <span className="text-center px-1 truncate w-full uppercase tracking-widest">{el.label}</span>
                                )}
                            </div>
                            
                            {isOccupiedByOthers && !isAssigned && (
                                <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded-full shadow">
                                    {occupants[0].name.substring(0,3)}
                                </div>
                            )}
                            {isAssigned && (
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white shadow"></div>
                            )}
                        </div>
                    );
                })}

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
            </div>
            </div>

            {/* Legend dipped outside canvas */}
            <div className="flex flex-wrap items-center justify-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-indigo-600"></div> Area Anda</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-300"></div> Area Orang Lain</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-white border border-slate-300 shadow-sm"></div> Area Kosong</div>
                <div className="flex items-center gap-2 border-l border-slate-300 pl-4 italic text-[10px]">Tahan & Usap (Lasso) untuk menyeleksi banyak meja.</div>
            </div>
        </div>
    );
}
