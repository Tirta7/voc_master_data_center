const fs = require('fs');

const filePath = 'd:/Billiard_APPS/frontend/src/app/admin/settings/billiard/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Normalize line endings to LF for easy replacing, then back to CRLF if needed
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

const startMarker = `<div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">`;
const endMarker = `<button\n                                onClick={handleSaveGlobal}`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const newTabContent = `                            {/* TAB NAVIGATION */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {[
                                    { id: 'REGULAR', label: 'REGULAR', activeClass: 'bg-indigo-600 text-white shadow-indigo-200 border-indigo-600' },
                                    { id: 'VIP', label: 'VIP', activeClass: 'bg-purple-600 text-white shadow-purple-200 border-purple-600' },
                                    { id: 'PS_REGULAR', label: 'PS REGULAR', activeClass: 'bg-blue-600 text-white shadow-blue-200 border-blue-600' },
                                    { id: 'PS_VIP', label: 'PS VIP', activeClass: 'bg-violet-600 text-white shadow-violet-200 border-violet-600' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={\`px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all \${
                                            activeTab === tab.id ? tab.activeClass + ' shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50 border-2 border-slate-100 hover:border-slate-300'
                                        }\`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* TAB CONTENT */}
                            <div className="bg-white border border-slate-100 p-6 xl:p-8 rounded-[2rem] shadow-sm animate-in fade-in duration-300">
                                {(() => {
                                    let config, theme, title, dotColor, setConfig;
                                    if (activeTab === 'REGULAR') {
                                        config = globalSettings?.customDurationPricingRegular;
                                        theme = 'indigo'; title = 'Meja REGULAR'; dotColor = 'bg-indigo-500';
                                        setConfig = (newC: any) => setGlobalSettings({ ...globalSettings, customDurationPricingRegular: newC });
                                    } else if (activeTab === 'VIP') {
                                        config = globalSettings?.customDurationPricingVip;
                                        theme = 'purple'; title = 'Meja VIP'; dotColor = 'bg-purple-500';
                                        setConfig = (newC: any) => setGlobalSettings({ ...globalSettings, customDurationPricingVip: newC });
                                    } else if (activeTab === 'PS_REGULAR') {
                                        config = globalSettings?.customDurationPricingPsRegular;
                                        theme = 'blue'; title = 'Meja PS REGULAR'; dotColor = 'bg-blue-500';
                                        setConfig = (newC: any) => setGlobalSettings({ ...globalSettings, customDurationPricingPsRegular: newC });
                                    } else {
                                        config = globalSettings?.customDurationPricingPsVip;
                                        theme = 'violet'; title = 'Meja PS VIP'; dotColor = 'bg-violet-500';
                                        setConfig = (newC: any) => setGlobalSettings({ ...globalSettings, customDurationPricingPsVip: newC });
                                    }

                                    return (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                                                <div className={\`w-2 h-2 rounded-full \${dotColor} animate-pulse\`}></div>
                                                <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">{title}</h3>
                                                {isAnySlotActive(config) ? (
                                                    <div className="ml-auto bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                        AKTIF: Rp {getActiveRate(config).toLocaleString()}
                                                    </div>
                                                ) : (
                                                    <div className="ml-auto bg-rose-50 border border-rose-100 text-rose-600 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5">
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        SLOT TIDAK DITEMUKAN
                                                    </div>
                                                )}
                                            </div>

                                            {/* Base Price */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2 ml-1">
                                                    <DollarSign className={\`w-3.5 h-3.5 text-\${theme}-500\`} />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarif Dasar Per Jam</span>
                                                </div>
                                                <InputField
                                                    label=""
                                                    type="number"
                                                    className={\`w-full max-w-xs pl-7 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-xl font-black text-sm outline-none border border-slate-200 focus:border-\${theme}-400 transition-all\`}
                                                    value={config?.basePrice || 0}
                                                    isEditing={true}
                                                    onChange={(val) => setConfig({ ...(config || {timeSlots:[]}), basePrice: Number(val) || 0 })}
                                                />
                                            </div>

                                            {/* Time Slots */}
                                            <div className="pt-4 border-t border-slate-100">
                                                <div className="flex justify-between items-center px-1 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className={\`w-4 h-4 text-\${theme}-600\`} />
                                                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-widest">Slot Waktu Khusus</label>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const current = config || { basePrice: 0, timeSlots: [] };
                                                            setConfig({ ...current, timeSlots: [...(current.timeSlots||[]), { start: '00:00', end: '00:00', price: current.basePrice || 0 }] });
                                                        }}
                                                        className={\`px-4 py-2 bg-\${theme}-50 text-\${theme}-700 hover:bg-\${theme}-600 hover:text-white border border-\${theme}-100 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all active:scale-95\`}
                                                    >
                                                        <Plus className="w-3 h-3" /> TAMBAH SLOT
                                                    </button>
                                                </div>

                                                {(config?.timeSlots || []).length === 0 && (
                                                    <div className="text-center py-6 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                                        Belum ada slot waktu khusus diatur.
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                    {(config?.timeSlots || []).map((slot: any, idx: number) => (
                                                        <div key={idx} className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex flex-col xl:flex-row gap-3 items-center group">
                                                            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 focus-within:border-indigo-400 flex-1 w-full xl:w-auto">
                                                                <input type="time" className="bg-transparent rounded-md p-1 font-black text-xs outline-none text-center text-slate-700 w-full" value={slot.start} onChange={(e) => {
                                                                    const newSlots = [...config.timeSlots];
                                                                    newSlots[idx].start = e.target.value;
                                                                    setConfig({ ...config, timeSlots: newSlots });
                                                                }} />
                                                                <span className="text-slate-300 font-bold px-1">-</span>
                                                                <input type="time" className="bg-transparent rounded-md p-1 font-black text-xs outline-none text-center text-slate-700 w-full" value={slot.end} onChange={(e) => {
                                                                    const newSlots = [...config.timeSlots];
                                                                    newSlots[idx].end = e.target.value;
                                                                    setConfig({ ...config, timeSlots: newSlots });
                                                                }} />
                                                            </div>
                                                            <div className="flex gap-2 items-center w-full xl:w-auto">
                                                                <InputField
                                                                    label="" type="number"
                                                                    className="w-full xl:w-28 pl-7 pr-2 py-2 bg-white rounded-xl font-black text-xs outline-none border border-slate-200 focus:border-indigo-400"
                                                                    value={slot.price}
                                                                    isEditing={true}
                                                                    onChange={(val) => {
                                                                        const newSlots = [...config.timeSlots];
                                                                        newSlots[idx].price = val;
                                                                        setConfig({ ...config, timeSlots: newSlots });
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        const newSlots = config.timeSlots.filter((_: any, i: number) => i !== idx);
                                                                        setConfig({ ...config, timeSlots: newSlots });
                                                                    }}
                                                                    className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>\n`;
    content = content.substring(0, startIndex) + newTabContent + content.substring(endIndex);
    console.log("Replaced Set Durasi Manual");
} else {
    console.log("Set Durasi Manual markers NOT found!");
}

const listStartMarker = `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">`;
// find the last closing div of the page for end marker
const listEndMarker = `                    </div>\n                </div>\n            </div>\n        </div>`;

const listStartIndex = content.indexOf(listStartMarker);
const listEndIndex = content.lastIndexOf(listEndMarker);

if (listStartIndex !== -1 && listEndIndex !== -1) {
    const newListContent = `<div className="space-y-3">
                        {packages.map((pkg) => {
                            const isHourly = pkg.type === 'hourly';
                            const badgeColor = isHourly ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                            
                            return (
                                <div
                                    key={pkg.id}
                                    className={\`group bg-white rounded-2xl border transition-all p-4 hover:shadow-lg hover:-translate-y-0.5 flex flex-col md:flex-row md:items-center justify-between gap-4 \${
                                        editingPackageId === pkg.id ? 'border-indigo-500 shadow-md shadow-indigo-100' : 'border-slate-100'
                                    }\`}
                                >
                                    {/* Left: Info */}
                                    <div className="flex items-center gap-4 min-w-[250px]">
                                        <div className={\`px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase border \${badgeColor}\`}>
                                            {isHourly ? 'PLAYTIME' : 'DURATION'}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 uppercase">{pkg.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                Station {pkg.tableCategory || 'REGULAR'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Middle: Details */}
                                    <div className="flex-1 flex gap-2 overflow-x-auto pb-1 md:pb-0 items-center no-scrollbar">
                                        {pkg.type === 'fixed' ? (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 whitespace-nowrap">
                                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                <span className="text-[11px] font-black text-slate-700">{pkg.durationMinutes} Menit</span>
                                            </div>
                                        ) : (
                                            (pkg.timeSlots && pkg.timeSlots.length > 0) ? (
                                                pkg.timeSlots.map((slot: any, sIdx: number) => (
                                                    <div key={sIdx} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 whitespace-nowrap">
                                                        <span className="text-[10px] font-bold text-slate-500">{slot.start}-{slot.end}</span>
                                                        <span className="text-[10px] font-black text-indigo-600">Rp {slot.price.toLocaleString()}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-400 italic">Tidak ada slot khusus</span>
                                            )
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => handleEditPackage(pkg)} className="p-2 bg-slate-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all border border-slate-100 hover:border-transparent">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeletePackage(pkg.id)} className="p-2 bg-slate-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-slate-100 hover:border-transparent">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
\n`;
    content = content.substring(0, listStartIndex) + newListContent + content.substring(listEndIndex);
    console.log("Replaced Daftar Paket");
} else {
    console.log("Daftar Paket markers NOT found!");
}

if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Done");
