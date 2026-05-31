const fs = require('fs');
const filePath = 'd:/Billiard_APPS/frontend/src/app/admin/settings/billiard/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr1 = `                {/* List Section */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Daftar Paket</h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Kelola Paket & Tarif Aktif</p>
                        </div>`;

const replacement1 = `                {/* List Section */}
                <div className="lg:col-span-12 xl:col-span-7">
                    <div className="bg-white/80 backdrop-blur-xl p-6 lg:p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-indigo-50/50 sticky top-8 h-[calc(100vh-4rem)] flex flex-col">
                        
                        {/* Header stays at top */}
                        <div className="flex-shrink-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Daftar Paket</h2>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Kelola Paket & Tarif Aktif</p>
                                </div>`;

const targetStr2 = `                    {/* DAFTAR PAKET TABS */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mt-2">`;

const replacement2 = `                            {/* DAFTAR PAKET TABS */}
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mt-6 mb-2">`;

const targetStr3 = `                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">`;

const replacement3 = `                        </div>
                        
                        {/* Scrollable List Container */}
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2 no-scrollbar mt-2 pb-8">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">`;

const targetStr4 = `                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}`;

const replacement4 = `                                </div>
                            );
                        })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}`;

// Helper to normalize newlines
const normalizeLineEndings = (str) => str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

let normalizedContent = normalizeLineEndings(content);

normalizedContent = normalizedContent.replace(normalizeLineEndings(targetStr1), normalizeLineEndings(replacement1));
normalizedContent = normalizedContent.replace(normalizeLineEndings(targetStr2), normalizeLineEndings(replacement2));
normalizedContent = normalizedContent.replace(normalizeLineEndings(targetStr3), normalizeLineEndings(replacement3));
normalizedContent = normalizedContent.replace(normalizeLineEndings(targetStr4), normalizeLineEndings(replacement4));

fs.writeFileSync(filePath, normalizedContent, 'utf-8');
console.log('Successfully wrapped List in Card!');
