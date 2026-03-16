
import os

file_path = r'D:\Billiard_APPS\frontend\src\app\admin\settings\page.tsx'

whatsapp_tab_content = """                            {activeTab === 'whatsapp' && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic ml-2">WhatsApp Gateway (Baileys)</h3>
                                            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60 ml-2">Hubungkan sistem dengan nomor WhatsApp untuk notifikasi otomatis</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                                                waStatus?.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-600' : 
                                                waStatus?.status === 'CONNECTING' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                                            }`}>
                                                <div className={`w-2 h-2 rounded-full ${
                                                    waStatus?.status === 'CONNECTED' ? 'bg-emerald-500' : 
                                                    waStatus?.status === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                                                }`}></div>
                                                {waStatus?.status || 'UNKNOWN'}
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={fetchWaStatus}
                                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${waLoading ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                                                        <Zap className="w-6 h-6 text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-black tracking-tight">Status Koneksi</h4>
                                                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Server-side Library</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    {waStatus?.status === 'CONNECTED' ? (
                                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                                                            <div className="flex items-center gap-4 mb-2">
                                                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                                                <p className="font-black text-emerald-500">WHATSAPP TERHUBUNG</p>
                                                            </div>
                                                            <p className="text-xs text-white/60 leading-relaxed font-medium">Sistem siap mengirimkan notifikasi kartu member, tanda terima, dan peringatan saldo secara otomatis.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                                                            <div className="flex items-center gap-4 mb-2">
                                                                <AlertCircle className="w-6 h-6 text-amber-400" />
                                                                <p className="font-black text-amber-500">BELUM TERHUBUNG</p>
                                                            </div>
                                                            <p className="text-xs text-white/50 leading-relaxed font-medium">Scan QR Code di samping untuk menghubungkan nomor WhatsApp utama Bisnis dengan sistem Baileys.</p>
                                                        </div>
                                                    )}

                                                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                                        <h5 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">LOG AKTIVITAS</h5>
                                                        <div className="font-mono text-[9px] text-indigo-300 space-y-2">
                                                            <p className="opacity-50">[{new Date().toLocaleTimeString()}] System initializing...</p>
                                                            <p className="opacity-80">[{new Date().toLocaleTimeString()}] Baileys: {waStatus?.status}</p>
                                                            {waStatus?.qr && <p className="text-amber-400 animate-pulse">[{new Date().toLocaleTimeString()}] New QR generated, waiting for scan...</p>}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row gap-3">
                                                        <button 
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    const token = localStorage.getItem('token');
                                                                    await axios.post(`${API_URL}/whatsapp/reconnect`, {}, {
                                                                        headers: { Authorization: `Bearer ${token}` }
                                                                    });
                                                                    fetchWaStatus();
                                                                    alert('Signal reconnect dikirim. Silakan tunggu 5-10 detik.');
                                                                } catch (err) {
                                                                    alert('Gagal mengirim signal reconnect');
                                                                }
                                                            }}
                                                            className="flex-1 py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                                        >
                                                            Reconnect
                                                        </button>
                                                        {waStatus?.status === 'CONNECTED' && (
                                                            <button 
                                                                type="button"
                                                                onClick={handleWaLogout}
                                                                className="flex-1 py-4 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/20 rounded-2xl text-[10px] font-black text-rose-400 uppercase tracking-widest transition-all active:scale-95"
                                                            >
                                                                Disconnect / Logout
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center group transition-all hover:border-indigo-100">
                                            {waStatus?.status === 'CONNECTED' ? (
                                                <div className="space-y-6">
                                                    <div className="w-32 h-32 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mx-auto shadow-xl shadow-emerald-100 transition-transform group-hover:scale-110">
                                                        <CheckCircle2 className="w-16 h-16" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Koneksi Berhasil</h4>
                                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Nomor Anda Telah Tertaut</p>
                                                    </div>
                                                    <div className="pt-6 border-t border-slate-50 w-full">
                                                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Jika Anda ingin mengganti nomor, silakan Logout dari aplikasi WhatsApp di HP Anda pada menu <span className="text-slate-900 font-bold">Linked Devices</span>.</p>
                                                    </div>
                                                </div>
                                            ) : waStatus?.qr ? (
                                                <div className="space-y-8 flex flex-col items-center">
                                                    <div className="p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-indigo-100 relative group/qr">
                                                        <div className="absolute -inset-2 bg-indigo-500/10 rounded-[3rem] blur-xl opacity-0 group-hover/qr:opacity-100 transition-opacity"></div>
                                                        <QRCodeCanvas 
                                                            value={waStatus.qr} 
                                                            size={220} 
                                                            level="H"
                                                            includeMargin={true}
                                                            className="relative z-10"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest mx-auto w-fit">
                                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                                            Menunggu Scan...
                                                        </div>
                                                        <h4 className="text-lg font-black text-slate-800 tracking-tight italic uppercase">Scan QR Code</h4>
                                                        <p className="text-[11px] text-slate-400 font-bold max-w-[240px] leading-relaxed uppercase tracking-widest">
                                                            Pilih 'Tautkan Perangkat' di WhatsApp HP Anda dan arahkan ke layar ini.
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mx-auto animate-pulse">
                                                        <MessageCircle className="w-16 h-16" />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Menyiapkan Library...</p>
                                                        <p className="text-[10px] text-slate-400 font-bold max-w-[200px]">QR Code akan muncul dalam beberapa saat. Silakan tunggu.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* BROADCAST SECTION */}
                                    {waStatus?.status === 'CONNECTED' && (
                                        <div className="bg-slate-50 border-2 border-slate-100 rounded-[3rem] p-10">
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                                    <Zap className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">WhatsApp Broadcast</h4>
                                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Marketing & Pengumuman ke Member</p>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Isi Pesan Broadcast</label>
                                                    <textarea 
                                                        value={broadcastMsg}
                                                        onChange={(e) => setBroadcastMsg(e.target.value)}
                                                        placeholder="Contoh: Promo Spesial Weekend! Main 2 Jam Gratis 1 Jam. Berlaku hari ini..."
                                                        className="w-full p-6 bg-white border-2 border-slate-100 border-dashed rounded-3xl text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all min-h-[120px] resize-none shadow-sm"
                                                    />
                                                </div>

                                                <button 
                                                    type="button"
                                                    disabled={!broadcastMsg.trim() || isBroadcastingLocal}
                                                    onClick={handleWaBroadcast}
                                                    className="w-full md:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                                                >
                                                    {isBroadcastingLocal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                                    {isBroadcastingLocal ? 'Memroses...' : 'Kirim Ke Semua Member'}
                                                </button>

                                                <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
                                                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                                    <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase">
                                                        Hati-hati: Hindari mengirim pesan terlalu sering atau mengandung spam agar nomor tidak diblokir oleh WhatsApp. 
                                                        Sistem akan memberikan jeda otomatis 2-4 detik antar pesan.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* MESSAGE TEMPLATES SECTION */}
                                    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 mt-10">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                                <MessageCircle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">Customized Message Templates</h4>
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Atur isi pesan otomatis untuk Member</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Pendaftaran Member (Registration)</label>
                                                    <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Welcome Message</span>
                                                </div>
                                                <textarea 
                                                    value={settings.waTemplateWelcome || ''}
                                                    onChange={(e) => setSettings({ ...settings, waTemplateWelcome: e.target.value })}
                                                    placeholder="Contoh: Halo {{name}}, selamat bergabung! ID Member Anda: {{code}}"
                                                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all min-h-[150px] resize-none"
                                                />
                                                <div className="flex flex-wrap gap-2 px-2">
                                                    {['name', 'code', 'category', 'expiry'].map(tag => (
                                                        <span key={tag} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg cursor-help" title={`Placeholder untuk ${tag}`}>{'{{'}{tag}{'}}'}</span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sesi Billiard Selesai (Session End)</label>
                                                    <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Billing Notification</span>
                                                </div>
                                                <textarea 
                                                    value={settings.waTemplateSessionEnd || ''}
                                                    onChange={(e) => setSettings({ ...settings, waTemplateSessionEnd: e.target.value })}
                                                    placeholder="Contoh: Sesi {{table}} selesai! Total: Rp {{grand_total}}"
                                                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all min-h-[150px] resize-none"
                                                />
                                                <div className="flex flex-wrap gap-2 px-2">
                                                    {['name', 'table', 'duration', 'grand_total', 'balance', 'order_details'].map(tag => (
                                                        <span key={tag} className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg cursor-help" title={`Placeholder untuk ${tag}`}>{'{{'}{tag}{'}}'}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-8 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-4">
                                            <Info className="w-5 h-5 text-indigo-600 shrink-0" />
                                            <div>
                                                <p className="text-[10px] text-indigo-900 font-bold uppercase mb-1">Panduan Template:</p>
                                                <p className="text-[9px] text-indigo-800/70 font-medium leading-relaxed">
                                                    Gunakan kode kurawal double <span className="font-bold underline">{'{{tag}}'}</span> untuk menyisipkan data otomatis. Kosongkan template untuk kembali ke pesan standar sistem. <span className="font-black">{'{{order_details}}'}</span> akan menampilkan daftar item yang dipesan.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* OWNER REPORT CONFIGURATION SECTION */}
                                    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 mt-10">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                                                <BarChart3 className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">Laporan Owner (PDF)</h4>
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Kirim Laporan Otomatis ke WhatsApp Owner</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <InputField
                                                label="Nomor WhatsApp Owner"
                                                value={settings.ownerPhone}
                                                savedValue={lastSavedSettings?.ownerPhone}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, ownerPhone: val })}
                                                placeholder="Contoh: 628123456789"
                                                helper="Gunakan format internasional (628...). Laporan akan dikirim ke nomor ini."
                                            />
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Laporan Otomatis</p>
                                                        <p className="text-xs font-bold text-slate-600">Kirim laporan harian setiap hari</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={settings.autoReportEnabled}
                                                            onChange={(e) => setSettings({ ...settings, autoReportEnabled: e.target.checked })}
                                                            className="sr-only peer" 
                                                        />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </div>
                                                {settings.autoReportEnabled && (
                                                    <InputField
                                                        label="Jadwal Kirim (WIB)"
                                                        type="time"
                                                        value={settings.reportSchedule}
                                                        savedValue={lastSavedSettings?.reportSchedule}
                                                        isEditing={true}
                                                        onChange={(val) => setSettings({ ...settings, reportSchedule: val })}
                                                        helper="Laporan harian akan dikirim otomatis setiap jam ini."
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* NOTIFICATION POLICY SECTION */}
                                    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 mt-10">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                                                <ShieldOff className="w-6 h-6 text-indigo-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">Kebijakan Notifikasi</h4>
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Aturan sistem cut-off & peringatan otomatis</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <InputField
                                                label="Batas Saldo Cut-off (Rp)"
                                                type="number"
                                                value={settings.balanceBuffer}
                                                savedValue={lastSavedSettings?.balanceBuffer}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, balanceBuffer: val })}
                                                placeholder="Contoh: 2000"
                                                helper="Sistem akan menghentikan sesi meja otomatis jika sisa saldo member mencapai angka ini."
                                            />
                                            <InputField
                                                label="Peringatan WA (Menit)"
                                                type="number"
                                                value={settings.balanceWarningMinutes}
                                                savedValue={lastSavedSettings?.balanceWarningMinutes}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, balanceWarningMinutes: val })}
                                                placeholder="Contoh: 15"
                                                helper="Menit sisa waktu bermain sebelum sistem mengirim notifikasi WhatsApp peringatan saldo menipis."
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-8 md:p-10 mt-10">
                                        <div className="flex items-start gap-5">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                                                <Info className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-4">
                                                <h5 className="font-black text-indigo-900 uppercase tracking-tight">Kenapa Menggunakan Baileys?</h5>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-black text-indigo-700 tracking-widest uppercase">Gratis & Tanpa API Pihak Ke-3</p>
                                                        <p className="text-[11px] text-indigo-900/60 leading-relaxed font-medium capitalize">Anda tidak perlu membayar biaya berlangganan bulanan karena sistem berjalan langsung di server lokal Anda.</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-black text-indigo-700 tracking-widest uppercase">Keamanan Data & Privasi</p>
                                                        <p className="text-[11px] text-indigo-900/60 leading-relaxed font-medium capitalize">Pesan dikirim langsung melalui nomor Anda tanpa melalui intermediary, menjaga kerahasiaan data member.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
"""

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I'll use a more aggressive approach: find the start and end markers and replace everything in between.
start_marker = "activeTab === 'whatsapp' && ("
# We need to find the correct closing tag. 
# Since there might be nested braces, let's find the closing tag for the whatsapp tab.
# It's usually )} followed by some closing tags for columns or major containers.

# Let's find the start index
start_idx = content.find(start_marker)
if start_idx != -1:
    # Now find the end of this block.
    # The block ends with )} and then the next tab starts or the main container ends.
    # In Step 2571, line 1941 was )} and line 1942 was the closing tags for the tabs content container.
    
    # Let's search for the end of the block.
    # We can look for the next activeTab check or the end of the component.
    # But a safer way is to find the closing )} for this specific block.
    
    # Actually, I'll just find the "next" occurrence of activeTab === '...' or the end of the file.
    # But wait, there are no more tabs after whatsapp?
    # Let's check. cfd, then whatsapp, then what?
    
    # In the provided walkthrough/logs, whatsapp seems to be the last tab.
    
    # Let's find the closing )} of the whatsapp tab.
    # It followed the Baileys explanation.
    
    end_marker = "                            )}\n" # This is very specific to the formatting.
    end_idx = content.find(end_marker, start_idx)
    
    if end_idx != -1:
        # We also need to include the end_marker itself.
        end_idx += len(end_marker)
        
        new_content = content[:start_idx] + whatsapp_tab_content + content[end_idx:]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Replaced whatsapp tab from {start_idx} to {end_idx}")
    else:
        # If )}\n is not found, maybe just )}
        end_marker = "                            )}"
        end_idx = content.find(end_marker, start_idx)
        if end_idx != -1:
            end_idx += len(end_marker)
            new_content = content[:start_idx] + whatsapp_tab_content + content[end_idx:]
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Replaced whatsapp tab from {start_idx} to {end_idx} (fallback marker)")
        else:
            print("Error: Could not find end of whatsapp tab block.")
else:
    print("Error: Could not find start of whatsapp tab block.")
