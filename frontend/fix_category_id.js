const fs = require('fs');
const filePath = 'd:/Billiard_APPS/frontend/src/app/admin/settings/billiard/page.tsx';

let content = fs.readFileSync(filePath, 'utf-8');

// 1. Ganti type form data
content = content.replace(
    "        tableCategory: 'REGULAR' | 'VIP' | 'PS_REGULAR' | 'PS_VIP'; // New field",
    "        categoryId: number | null;"
);

// 2. Ganti inisialisasi awal
content = content.replace(
    "        tableCategory: 'REGULAR',",
    "        categoryId: null,"
);

// Di fungsi resetForm()
content = content.replace(
    "            tableCategory: 'REGULAR',",
    "            categoryId: null,"
);

// Di handleEditPackage()
content = content.replace(
    "            tableCategory: pkg.tableCategory || 'REGULAR',",
    "            categoryId: pkg.categoryId || null,"
);

// 3. Di fungsi map categories untuk Paket Baru
content = content.replace(
    "const isSelected = formData.tableCategory === cat.name;",
    "const isSelected = formData.categoryId === cat.id;"
);
content = content.replace(
    "onClick={() => setFormData({ ...formData, tableCategory: cat.name })}",
    "onClick={() => setFormData({ ...formData, categoryId: cat.id })}"
);

// 4. Di list packages (Daftar Paket)
// Mencari blok ini:
/*
                                                pkg.tableCategory === 'VIP' ? 'bg-purple-500' :
                                                pkg.tableCategory === 'PS_REGULAR' ? 'bg-blue-500' :
                                                pkg.tableCategory === 'PS_VIP' ? 'bg-indigo-500' : 'bg-slate-400'
                                            }`}></div>
                                            <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">
                                                Station {pkg.tableCategory?.replace('_', ' ')}
                                            </span>
*/
const listTarget = `                                                pkg.tableCategory === 'VIP' ? 'bg-purple-500' :
                                                pkg.tableCategory === 'PS_REGULAR' ? 'bg-blue-500' :
                                                pkg.tableCategory === 'PS_VIP' ? 'bg-indigo-500' : 'bg-slate-400'
                                            }\`}></div>
                                            <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">
                                                Station {pkg.tableCategory?.replace('_', ' ')}
                                            </span>`;

const listTargetCRLF = listTarget.replace(/\n/g, '\r\n');

const listReplacement = `                                                categories.find((c:any) => c.id === pkg.categoryId)?.name?.toLowerCase().includes('vip') ? 'bg-purple-500' :
                                                categories.find((c:any) => c.id === pkg.categoryId)?.assetType === 'PLAYSTATION' ? 'bg-blue-500' : 'bg-slate-400'
                                            }\`}></div>
                                            <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">
                                                Station {categories.find((c:any) => c.id === pkg.categoryId)?.name || 'UNKNOWN'}
                                            </span>`;

if (content.includes(listTarget)) {
    content = content.replace(listTarget, listReplacement);
    console.log("Replaced list target (LF)");
} else if (content.includes(listTargetCRLF)) {
    content = content.replace(listTargetCRLF, listReplacement);
    console.log("Replaced list target (CRLF)");
} else {
    // try regex as fallback
    content = content.replace(/pkg\.tableCategory === 'VIP'[\s\S]*?Station \{pkg\.tableCategory\?\.replace\('_', ' '\)\}[\s\S]*?<\/span>/, listReplacement);
    console.log("Used regex for list replacement");
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Done modifying form state to categoryId.");
