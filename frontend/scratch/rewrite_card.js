const fs = require('fs');

const filePath = 'd:/Billiard_APPS/frontend/src/app/admin/settings/billiard/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `<div className="space-y-3">
                        {packages.filter(pkg => {
                            if (activePackageTab === 'ALL') return true;
                            const categoryObj = categories.find(c => c.id === pkg.categoryId);
                            const catName = categoryObj ? categoryObj.name : (pkg.tableCategory || 'REGULAR');
                            return catName === activePackageTab;
                        }).map((pkg) => {
                            const isHourly = pkg.type === 'hourly';
                            const badgeColor = isHourly ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                            
                            const categoryObj = categories.find(c => c.id === pkg.categoryId);
                            const catName = categoryObj ? categoryObj.name : (pkg.tableCategory || 'REGULAR');
                            
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
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className={\`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border \${
                                                    catName === 'VIP' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    catName === 'PS_REGULAR' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    catName === 'PS_VIP' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                                    'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                }\`}>
                                                    STATION {catName.replace('_', ' ')}
                                                </span>
                                            </div>
                                            {pkg.type === 'fixed' && (
                                                <div className="flex items-center gap-1 text-amber-600 mt-2">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-[11px] font-black">{pkg.durationMinutes} Menit</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Middle: Details */}
                                    <div className="flex-1 flex flex-wrap gap-2 items-center py-1">

                                        
                                        {(pkg.timeSlots && pkg.timeSlots.length > 0) ? (
                                            pkg.timeSlots.map((slot: any, sIdx: number) => (
                                                <div key={sIdx} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 whitespace-nowrap">
                                                    <span className="text-[10px] font-bold text-slate-500">{slot.start}-{slot.end}</span>
                                                    <span className={\`text-[10px] font-black \${pkg.type === 'fixed' ? 'text-amber-600' : 'text-indigo-600'}\`}>Rp {slot.price.toLocaleString()}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 italic">Tidak ada slot khusus</span>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEditPackage(pkg)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePackage(pkg.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Hapus"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>`;

const replacement = `<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                        {packages.filter(pkg => {
                            if (activePackageTab === 'ALL') return true;
                            const categoryObj = categories.find(c => c.id === pkg.categoryId);
                            const catName = categoryObj ? categoryObj.name : (pkg.tableCategory || 'REGULAR');
                            return catName === activePackageTab;
                        }).map((pkg) => {
                            const isHourly = pkg.type === 'hourly';
                            const badgeColor = isHourly ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                            
                            const categoryObj = categories.find(c => c.id === pkg.categoryId);
                            const catName = categoryObj ? categoryObj.name : (pkg.tableCategory || 'REGULAR');
                            
                            return (
                                <div
                                    key={pkg.id}
                                    className={\`group bg-white rounded-3xl border transition-all p-5 hover:shadow-xl hover:-translate-y-1 flex flex-col gap-4 relative \${
                                        editingPackageId === pkg.id ? 'border-indigo-500 shadow-lg shadow-indigo-100 ring-2 ring-indigo-500/20' : 'border-slate-100'
                                    }\`}
                                >
                                    {/* Actions Overlay Top Right */}
                                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-slate-100 z-10">
                                        <button
                                            onClick={() => handleEditPackage(pkg)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePackage(pkg.id)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Hapus"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Top: Header Info */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <div className={\`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border \${badgeColor}\`}>
                                                    {isHourly ? 'PLAYTIME' : 'DURATION'}
                                                </div>
                                                <span className={\`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border \${
                                                    catName === 'VIP' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    catName === 'PS_REGULAR' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    catName === 'PS_VIP' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                                    'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                }\`}>
                                                    STATION {catName.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800 uppercase pr-16 leading-tight">{pkg.name}</h3>
                                            {pkg.type === 'fixed' && (
                                                <div className="flex items-center gap-1.5 text-amber-600 mt-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-xs font-black">{pkg.durationMinutes} Menit</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom: Time Slots */}
                                    <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 flex-1 flex flex-col justify-center">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <div className="w-1 h-1 rounded-full bg-slate-300"></div> Varian Harga
                                        </h4>
                                        {(pkg.timeSlots && pkg.timeSlots.length > 0) ? (
                                            <div className="flex flex-col gap-1.5">
                                                {pkg.timeSlots.map((slot: any, sIdx: number) => (
                                                    <div key={sIdx} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm">
                                                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                                            {slot.start} - {slot.end}
                                                        </span>
                                                        <span className={\`text-[11px] font-black \${isHourly ? 'text-indigo-600' : 'text-amber-600'}\`}>Rp {slot.price.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-2 text-center border border-dashed border-slate-200 rounded-xl bg-white">
                                                <span className="text-[10px] font-bold text-slate-400 italic">Tidak ada slot khusus</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>`;

// Helper to normalize newlines
const normalizeLineEndings = (str) => str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

let normalizedContent = normalizeLineEndings(content);
let normalizedTarget = normalizeLineEndings(targetStr);
let normalizedReplacement = normalizeLineEndings(replacement);

if (normalizedContent.includes(normalizedTarget)) {
    const updatedContent = normalizedContent.replace(normalizedTarget, normalizedReplacement);
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    console.log('Successfully replaced card layout!');
} else {
    console.error('Target string not found!');
}
