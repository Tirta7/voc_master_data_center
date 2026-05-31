const fs = require('fs');
const filePath = 'd:/Billiard_APPS/frontend/src/app/admin/settings/billiard/page.tsx';

let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, tableCategory: 'REGULAR' })}
                                                    className={\`py-3 rounded-xl text-[10px] font-black border-2 transition-all \${formData.tableCategory === 'REGULAR' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-white text-slate-400'}\`}
                                                >
                                                    REGULAR
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, tableCategory: 'VIP' })}
                                                    className={\`py-3 rounded-xl text-[10px] font-black border-2 transition-all \${formData.tableCategory === 'VIP' ? 'border-purple-600 bg-purple-50 text-purple-600' : 'border-slate-100 bg-white text-slate-400'}\`}
                                                >
                                                    VIP
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, tableCategory: 'PS_REGULAR' })}
                                                    className={\`py-3 rounded-xl text-[10px] font-black border-2 transition-all \${formData.tableCategory === 'PS_REGULAR' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 bg-white text-slate-400'}\`}
                                                >
                                                    PS REGULAR
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, tableCategory: 'PS_VIP' })}
                                                    className={\`py-3 rounded-xl text-[10px] font-black border-2 transition-all \${formData.tableCategory === 'PS_VIP' ? 'border-violet-600 bg-violet-50 text-violet-600' : 'border-slate-100 bg-white text-slate-400'}\`}
                                                >
                                                    PS VIP
                                                </button>
                                            </div>`;

const targetStrCRLF = targetStr.replace(/\n/g, '\r\n');

const replacement = `                                            <div className="grid grid-cols-2 gap-2">
                                                {categories.filter((c:any) => c.isActive && (c.assetType === 'BILLIARD' || c.assetType === 'PLAYSTATION')).map((cat:any) => {
                                                    const isSelected = formData.tableCategory === cat.name;
                                                    let activeClass = 'border-indigo-600 bg-indigo-50 text-indigo-600';
                                                    if (cat.name.toLowerCase().includes('vip') && cat.assetType === 'BILLIARD') activeClass = 'border-purple-600 bg-purple-50 text-purple-600';
                                                    if (cat.assetType === 'PLAYSTATION') activeClass = 'border-blue-600 bg-blue-50 text-blue-600';
                                                    if (cat.name.toLowerCase().includes('vip') && cat.assetType === 'PLAYSTATION') activeClass = 'border-violet-600 bg-violet-50 text-violet-600';
                                                    
                                                    return (
                                                        <button
                                                            key={cat.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, tableCategory: cat.name })}
                                                            className={\`py-3 rounded-xl text-[10px] font-black border-2 transition-all uppercase \${isSelected ? activeClass : 'border-slate-100 bg-white text-slate-400'}\`}
                                                        >
                                                            {cat.name}
                                                        </button>
                                                    )
                                                })}
                                            </div>`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacement);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Success (LF)");
} else if (content.includes(targetStrCRLF)) {
    content = content.replace(targetStrCRLF, replacement);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Success (CRLF)");
} else {
    console.log("String not found! Check indentation or string exact match.");
}
