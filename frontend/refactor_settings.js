const fs = require('fs');

const filePath = 'd:/Billiard_APPS/frontend/src/app/admin/settings/billiard/page.tsx';

function run() {
    let content = fs.readFileSync(filePath, 'utf-8');

    // 2. Add categories state and helpers
    if (!content.includes('const [categories, setCategories] = useState')) {
        content = content.replace(
            `const [packages, setPackages] = useState<any[]>([]);`,
            `const [packages, setPackages] = useState<any[]>([]);\n    const [categories, setCategories] = useState<any[]>([]);\n\n    const getCategorySetting = (categoryId: number) => {\n        if (!globalSettings || !globalSettings.customPricingDynamic) return { basePrice: 0, timeSlots: [] };\n        const found = globalSettings.customPricingDynamic.find((c: any) => c.categoryId === categoryId);\n        return found || { basePrice: 0, timeSlots: [] };\n    };\n\n    const updateCategorySetting = (categoryId: number, newSetting: any) => {\n        const currentDynamics = globalSettings?.customPricingDynamic || [];\n        const index = currentDynamics.findIndex((c: any) => c.categoryId === categoryId);\n        \n        let newDynamics = [...currentDynamics];\n        if (index >= 0) {\n            newDynamics[index] = { ...newDynamics[index], ...newSetting };\n        } else {\n            newDynamics.push({ categoryId, ...newSetting });\n        }\n        setGlobalSettings({ ...globalSettings, customPricingDynamic: newDynamics });\n    };`
        );
    }

    // 3. Add fetchCategories
    if (!content.includes('const fetchCategories = async () => {')) {
        content = content.replace(
            `    const fetchPackages = async () => {`,
            `    const fetchCategories = async () => {\n        try {\n            const res = await axios.get('/categories');\n            setCategories(res.data);\n        } catch(err) {}\n    };\n\n    const fetchPackages = async () => {`
        );
    }

    // UPDATE USE EFFECT
    if (!content.includes('fetchCategories();')) {
        content = content.replace(
            `        fetchPackages();\n        fetchGlobalSettings();\n    }, []);`,
            `        fetchPackages();\n        fetchGlobalSettings();\n        fetchCategories();\n    }, []);`
        );
    }

    // 4. Update getActiveRate & isAnySlotActive
    content = content.replace(
        `        return 0;
    };

    const isAnySlotActive = (config: any) => {
        if (!config || !config.timeSlots || config.timeSlots.length === 0) return false;`,
        `        return Number(config?.basePrice || 0);
    };

    const isAnySlotActive = (config: any) => {
        if (!config) return false;
        if (!config.timeSlots || config.timeSlots.length === 0) return Number(config.basePrice || 0) > 0;`
    );

    content = content.replace(
        `            if (endVal < startVal) { // Crossover
                if (timeVal >= startVal || timeVal < endVal) return true;
            } else {
                if (timeVal >= startVal && timeVal < endVal) return true;
            }
        }
        return false;
    };`,
        `            if (endVal < startVal) { // Crossover
                if (timeVal >= startVal || timeVal < endVal) return true;
            } else {
                if (timeVal >= startVal && timeVal < endVal) return true;
            }
        }
        return Number(config?.basePrice || 0) > 0;
    };`
    );


    // Write the modified state back
    fs.writeFileSync(filePath, content, 'utf-8');

    // 5. Replace grid section using line by line approach
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

    const startLineIdx = lines.findIndex(l => l.includes('<div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">'));
    const endLineIdx = lines.findIndex((l, idx) => idx > startLineIdx && l.includes('<button') && lines[idx+1].includes('onClick={handleSaveGlobal}'));

    if (startLineIdx !== -1 && endLineIdx !== -1) {
        const replacementJSX = `<div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
                                {categories.filter((c:any) => c.isActive && (c.assetType === 'BILLIARD' || c.assetType === 'PLAYSTATION')).map((cat:any) => {
                                    const isVip = cat.name.toLowerCase().includes('vip');
                                    const isPs = cat.assetType === 'PLAYSTATION';
                                    
                                    // Base Theme
                                    let theme = {
                                        bg: 'bg-slate-50',
                                        border: 'border-slate-100',
                                        dot: 'bg-slate-400',
                                        text: 'text-slate-700',
                                        btnBg: 'bg-slate-500 hover:bg-slate-600',
                                        btnShadow: 'shadow-slate-100',
                                        iconText: 'text-slate-600',
                                        iconBg: 'bg-slate-100'
                                    };
                                    
                                    if (isPs && isVip) {
                                        theme = { bg: 'bg-indigo-50/50', border: 'border-indigo-100', dot: 'bg-indigo-500', text: 'text-indigo-700', btnBg: 'bg-indigo-600 hover:bg-indigo-700', btnShadow: 'shadow-indigo-100', iconText: 'text-indigo-600', iconBg: 'bg-indigo-100' };
                                    } else if (isPs) {
                                        theme = { bg: 'bg-blue-50/50', border: 'border-blue-100', dot: 'bg-blue-500', text: 'text-blue-700', btnBg: 'bg-blue-500 hover:bg-blue-600', btnShadow: 'shadow-blue-100', iconText: 'text-blue-600', iconBg: 'bg-blue-100' };
                                    } else if (isVip) {
                                        theme = { bg: 'bg-purple-50/50', border: 'border-purple-100', dot: 'bg-purple-500', text: 'text-purple-700', btnBg: 'bg-purple-600 hover:bg-purple-700', btnShadow: 'shadow-purple-100', iconText: 'text-purple-600', iconBg: 'bg-purple-100' };
                                    } else {
                                        theme = { bg: 'bg-slate-50/50', border: 'border-slate-100', dot: 'bg-slate-500', text: 'text-slate-700', btnBg: 'bg-slate-700 hover:bg-slate-800', btnShadow: 'shadow-slate-100', iconText: 'text-slate-600', iconBg: 'bg-slate-200' };
                                    }

                                    const config = getCategorySetting(cat.id);

                                    return (
                                        <div key={cat.id} className={\`\${theme.bg} p-6 rounded-3xl border \${theme.border} space-y-4\`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={\`w-2 h-2 rounded-full \${theme.dot}\`}></div>
                                                <h3 className={\`font-black \${theme.text} uppercase tracking-widest text-xs\`}>{cat.name}</h3>
                                                {isAnySlotActive(config) ? (
                                                    <div className="ml-auto bg-emerald-100 text-emerald-700 px-3 py-1 rounded-xl text-[10px] font-black animate-pulse flex items-center gap-1.5 shadow-sm shadow-emerald-50">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                        AKTIF: Rp {getActiveRate(config).toLocaleString()}
                                                    </div>
                                                ) : (
                                                    <div className="ml-auto bg-rose-500 text-white px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-rose-200 animate-bounce cursor-help group relative">
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        <span>ERROR: SLOT TIDAK DITEMUKAN</span>
                                                        <div className="absolute bottom-full right-0 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] leading-relaxed rounded-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl border border-slate-700">
                                                            <div className="flex items-center gap-2 mb-1 text-rose-400">
                                                                <Clock className="w-3 h-3" />
                                                                <span className="font-black uppercase">Peringatan Penting</span>
                                                            </div>
                                                            Jam {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} tidak terdaftar di slot manapun. Harap tambahkan slot baru agar sistem bisa menentukan harga!
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {!isAnySlotActive(config) && (
                                                <div className="bg-rose-50 border-2 border-dashed border-rose-200 p-5 rounded-[2rem] flex flex-col items-center text-center gap-3 animate-in zoom-in-95 duration-300">
                                                    <div className="p-4 bg-white rounded-2xl shadow-sm ring-4 ring-rose-100/50">
                                                        <CalendarOff className="w-8 h-8 text-rose-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest">Pricing Error</h4>
                                                        <p className="text-[10px] text-rose-600 font-bold leading-relaxed max-w-[200px]">
                                                            Tidak ada harga yang berlaku untuk jam <span className="underlineDecoration-rose-300">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>. Sistem tidak akan bisa menghitung tagihan dengan benar!
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-4 pt-2">
                                                
                                                {/* BASE PRICE INPUT */}
                                                <div className="mb-4">
                                                    <div className="flex items-center gap-1 ml-1 mb-1">
                                                        <DollarSign className={\`w-2 h-2 \${theme.iconText}\`} />
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarif Dasar Per Jam</span>
                                                    </div>
                                                    <InputField
                                                        label=""
                                                        type="number"
                                                        className={\`w-full pl-7 pr-4 py-3 bg-white hover:bg-slate-50 focus:bg-white rounded-xl font-black text-sm outline-none border-2 border-slate-200 focus:border-indigo-400 transition-all shadow-sm\`}
                                                        value={config.basePrice}
                                                        savedValue={lastSavedGlobalSettings?.customPricingDynamic?.find((c:any) => c.categoryId === cat.id)?.basePrice}
                                                        isEditing={true}
                                                        onChange={(val) => {
                                                            updateCategorySetting(cat.id, { basePrice: Number(val) || 0 });
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex justify-between items-center px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className={\`p-1.5 \${theme.iconBg} rounded-lg\`}>
                                                            <Clock className={\`w-3.5 h-3.5 \${theme.iconText}\`} />
                                                        </div>
                                                        <label className={\`block text-[10px] font-black \${theme.text} uppercase tracking-widest\`}>Atur Slot Waktu Spesifik</label>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            updateCategorySetting(cat.id, {
                                                                timeSlots: [...(config.timeSlots||[]), { start: '00:00', end: '00:00', price: config.basePrice || 0 }]
                                                            });
                                                        }}
                                                        className={\`px-3 py-1.5 \${theme.btnBg} text-white rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all shadow-lg \${theme.btnShadow} active:scale-95\`}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        <span>TAMBAH SLOT</span>
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    {(config.timeSlots || []).length === 0 && (
                                                        <div className={\`flex flex-col items-center justify-center py-8 bg-white/50 rounded-3xl border border-dashed \${theme.border}\`}>
                                                            <div className={\`p-3 \${theme.iconBg} rounded-2xl mb-3\`}>
                                                                <Info className={\`w-5 h-5 \${theme.iconText}\`} />
                                                            </div>
                                                            <p className={\`text-xs font-bold \${theme.text}\`}>Belum ada slot khusus diatur.</p>
                                                        </div>
                                                    )}
                                                    {(config.timeSlots || []).map((slot: any, idx: number) => (
                                                        <div key={idx} className={\`bg-white/70 backdrop-blur-sm p-3 rounded-[1rem] border \${theme.border} shadow-sm hover:shadow-md transition-all group relative animate-in zoom-in-95 duration-300 overflow-hidden\`}>
                                                            <div className={\`absolute top-0 left-0 w-0.5 h-full \${theme.dot} opacity-20 group-hover:opacity-40 transition-opacity\`}></div>
                                                            <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
                                                                <div className="flex-1 space-y-0.5">
                                                                    <div className="flex items-center gap-1 ml-1">
                                                                        <Timer className={\`w-2 h-2 \${theme.iconText}\`} />
                                                                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Rentang Waktu</span>
                                                                    </div>
                                                                    <div className="flex items-center bg-slate-50/50 p-0.5 rounded-lg border border-slate-100/30 focus-within:border-slate-300 focus-within:bg-white transition-all">
                                                                        <input type="time" className="flex-1 bg-transparent rounded-md p-1 font-black text-[10px] outline-none text-center text-slate-700" value={slot.start} onChange={(e) => {
                                                                            const newSlots = [...config.timeSlots];
                                                                            newSlots[idx].start = e.target.value;
                                                                            updateCategorySetting(cat.id, { timeSlots: newSlots });
                                                                        }} />
                                                                        <div className="px-1 text-slate-200">
                                                                            <div className="w-2 h-[1px] bg-slate-200 rounded-full"></div>
                                                                        </div>
                                                                        <input type="time" className="flex-1 bg-transparent rounded-md p-1 font-black text-[10px] outline-none text-center text-slate-700" value={slot.end} onChange={(e) => {
                                                                            const newSlots = [...config.timeSlots];
                                                                            newSlots[idx].end = e.target.value;
                                                                            updateCategorySetting(cat.id, { timeSlots: newSlots });
                                                                        }} />
                                                                    </div>
                                                                </div>

                                                                <div className="lg:w-[120px] xl:w-[140px] space-y-0.5">
                                                                    <div className="flex items-center gap-1 ml-1">
                                                                        <DollarSign className={\`w-2 h-2 \${theme.iconText}\`} />
                                                                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Tarif Per Jam</span>
                                                                    </div>
                                                                    <InputField
                                                                        label=""
                                                                        type="number"
                                                                        className={\`w-full pl-7 pr-2 py-1.5 bg-slate-50/50 hover:bg-slate-100 focus:bg-white rounded-lg font-black text-xs outline-none border border-slate-100/30 focus:border-slate-300 transition-all \${theme.text} shadow-inner\`}
                                                                        value={slot.price}
                                                                        savedValue={lastSavedGlobalSettings?.customPricingDynamic?.find((c:any) => c.categoryId === cat.id)?.timeSlots?.[idx]?.price}
                                                                        isEditing={true}
                                                                        onChange={(val) => {
                                                                            const newSlots = [...config.timeSlots];
                                                                            newSlots[idx].price = val;
                                                                            updateCategorySetting(cat.id, { timeSlots: newSlots });
                                                                        }}
                                                                    />
                                                                </div>

                                                                <div className="flex items-center justify-end lg:pt-3">
                                                                    <button
                                                                        onClick={() => {
                                                                            const newSlots = config.timeSlots.filter((_: any, i: number) => i !== idx);
                                                                            updateCategorySetting(cat.id, { timeSlots: newSlots });
                                                                        }}
                                                                        className="p-1.5 bg-rose-50 text-rose-400 hover:text-white hover:bg-rose-500 rounded-md transition-all shadow-sm active:scale-90 group/del"
                                                                    >
                                                                        <Trash2 className="w-3 h-3 group-hover/del:scale-110 transition-transform" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>`;
        lines.splice(startLineIdx, endLineIdx - startLineIdx, replacementJSX);
        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
        console.log('Successfully applied all changes.');
    } else {
        console.log('Could not find start or end index.');
    }
}
run();
