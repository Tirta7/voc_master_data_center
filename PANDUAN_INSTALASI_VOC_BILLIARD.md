# 📋 PANDUAN INSTALASI VOC BILLIARD MANAGEMENT SYSTEM
### Versi Docker + Cloudflare Tunnel Edition
> Dokumen ini ditujukan untuk **Tirta (Kantor Pusat)** dan **Teknisi** yang bertugas instalasi di PC Client.

---

## 🗺️ GAMBARAN BESAR ALUR SISTEM

```
[KANTOR PUSAT — PC Tirta]          [TEKNISI / CLIENT]
────────────────────────           ──────────────────
1. Jalankan                        4. Copy folder ke PC Client
   BUKA_CABANG_BARU.bat     ─────► 5. Isi file .token
2. Masukkan nama kota              6. Jalankan INSTALL.bat
3. Folder INSTALLER_[kota]         7. Selesai! Aplikasi online ✅
   siap di D:\Billiard_APPS
```

---

## 📦 BAGIAN 1 — KANTOR PUSAT (Dilakukan Tirta)

> Lakukan ini **sebelum** mengirim folder ke teknisi/client.

---

### ✅ STEP 1 — Jalankan `BUKA_CABANG_BARU.bat`

**File:** `D:\Billiard_APPS\BUKA_CABANG_BARU.bat`

1. Double-klik file tersebut
2. Ketika diminta, masukkan nama kota cabang baru:

```
Masukkan nama kota cabang baru (huruf kecil semua tanpa spasi, contoh: gresik):
```

> [!IMPORTANT]
> **Aturan penulisan nama kota:**
> - Huruf kecil semua: ✅ `gresik` ❌ `Gresik` ❌ `GRESIK`
> - Tanpa spasi: ✅ `kotabaru` ❌ `kota baru`
> - Tanpa tanda baca: ✅ `banjarbaru` ❌ `banjar-baru`

**Script akan otomatis melakukan 4 hal:**

| Step | Yang Dilakukan | Hasil |
|------|---------------|-------|
| [1/4] | Buat Cloudflare Tunnel baru | Tunnel `gresik-branch` terdaftar |
| [2/4] | Daftarkan 3 subdomain DNS | `gresik.vocbilliard.online` aktif |
| [3/4] | Duplikat folder `INSTALLER_CLIENT` | Folder `INSTALLER_gresik` dibuat |
| [4/4] | Inject konfigurasi khusus cabang | `config.yml` + `credentials.json` diisi otomatis |

**Waktu proses:** ±10–30 detik ✅

---

### ✅ STEP 2 — Isi File `.token` (WAJIB)

Setelah script selesai, masuk ke folder hasil:
```
D:\Billiard_APPS\INSTALLER_gresik\
```

**Langkah:**
1. Lihat file `.token.example` — ini adalah template
2. **Salin** file `.token.example` → **rename** menjadi `.token` (hapus kata `.example`)
3. Buka file `.token` dengan Notepad, isi bagian berikut:

```ini
# ⬇️ WAJIB DIISI — GitHub Personal Access Token
GITHUB_TOKEN=MASUKKAN_TOKEN_DISINI

# ⬇️ Jangan diubah
GITHUB_USERNAME=tirta7

# ⬇️ WAJIB DIISI — Nama lokasi untuk ditampilkan di aplikasi
LOCATION_NAME=Billiard Gresik

# ⬇️ Opsional — Token WhatsApp notifikasi (boleh dikosongkan)
FONNTE_TOKEN=

# ⬇️ Zona waktu: WIB / WITA / WIT
TIMEZONE_ZONE=WIB
```

> [!IMPORTANT]
> **Cara mendapatkan GITHUB_TOKEN:**
> 1. Buka: https://github.com/settings/tokens/new
> 2. Pilih **"Classic"**
> 3. Centang scope: **`read:packages`**
> 4. Klik **Generate token**
> 5. Copy token (hanya tampil sekali!)
>
> Token ini adalah "kunci" untuk mengunduh image aplikasi dari cloud.

> [!WARNING]
> File `.token` JANGAN dishare atau diupload ke internet. Berisi token rahasia!

---

### ✅ STEP 3 — Kirim Folder ke Client

Folder yang dikirim: `D:\Billiard_APPS\INSTALLER_[kota]\`

**Pastikan isi folder sudah lengkap:**

```
📁 INSTALLER_gresik/
├── 📄 INSTALL.bat          ← File utama instalasi
├── 📄 MULAI.bat            ← Untuk menjalankan setelah install
├── 📄 STOP.bat             ← Untuk mematikan aplikasi
├── 📄 UPDATE.bat           ← Untuk update versi
├── 📄 STATUS.bat           ← Cek status layanan
├── 📄 CEK_LOG.bat          ← Cek log error
├── 📄 docker-compose.yml   ← Konfigurasi Docker (jangan diubah)
├── 📄 mosquitto.conf       ← Konfigurasi MQTT (jangan diubah)
├── 📄 .token               ← ✅ SUDAH DIISI (WAJIB ADA)
├── 📄 .token.example       ← Template (boleh ada/tidak)
└── 📁 cloudflare/
    ├── 📄 config.yml       ← Konfigurasi tunnel (otomatis)
    └── 📄 credentials.json ← Kredensial tunnel (otomatis)
```

> [!CAUTION]
> File `.token`, `cloudflare/credentials.json` **sudah unik per cabang**.
> Jangan campur aduk folder antar cabang!

**Cara transfer folder:**
- 💾 Copy ke USB/Flashdisk, lalu bawa ke PC client
- ☁️ Upload ke Google Drive, download di PC client
- 🌐 Transfer via LAN / remote desktop

---

## 💻 BAGIAN 2 — PC CLIENT (Dilakukan Teknisi / Pemilik Cabang)

---

### ✅ STEP 4 — Persiapan PC Client

**Persyaratan minimum PC:**

| Komponen | Minimum | Direkomendasikan |
|----------|---------|-----------------|
| OS | Windows 10 64-bit | Windows 11 64-bit |
| RAM | 8 GB | 16 GB |
| Storage | 20 GB kosong | 50 GB kosong |
| Internet | 5 Mbps stabil | 20 Mbps |
| CPU | Intel Core i3 gen 8+ | Core i5+ |

> [!IMPORTANT]
> PC harus terhubung internet saat instalasi pertama kali!
> Setelah instalasi selesai, aplikasi bisa jalan **tanpa internet** (mode LAN).
> Tetapi akses online (`*.vocbilliard.online`) tetap butuh internet.

---

### ✅ STEP 5 — Jalankan `INSTALL.bat`

1. Paste folder `INSTALLER_[kota]` ke PC client (terserah di drive mana)
2. **Klik kanan** `INSTALL.bat` → pilih **"Run as administrator"**
3. Klik **YES** pada popup UAC yang muncul
4. Tunggu proses selesai

**Proses otomatis yang terjadi (8 tahap):**

| Tahap | Aksi Otomatis | Waktu |
|-------|--------------|-------|
| [1/8] | Cek Windows 10/11 | Instan |
| [2/8] | Install Docker Desktop (jika belum ada) | 5–15 menit |
| [3/8] | Login ke GitHub Container Registry | Instan |
| [4/8] | Siapkan MQTT Broker | Instan |
| [5/8] | Buat file konfigurasi (.env) | Instan |
| [6/8] | Download semua komponen dari cloud | **10–25 menit** ⬅️ paling lama |
| [7/8] | Jalankan semua layanan | 1–2 menit |
| [8/8] | Health check & buat shortcut Desktop | 1–2 menit |

> [!NOTE]
> **Jika Docker baru diinstall pertama kali:**
> Script akan berhenti dan meminta restart komputer.
> Setelah restart, jalankan `INSTALL.bat` lagi — proses akan lanjut dari awal dan Docker sudah siap.

---

### ✅ STEP 6 — Selesai! Cek Akses Aplikasi

Setelah instalasi sukses, browser otomatis terbuka. Berikut alamat akses:

| Jenis Akses | Alamat | Keterangan |
|------------|--------|------------|
| 🖥️ Dari PC itu sendiri | `http://localhost:3000` | Selalu bisa |
| 📱 Dari HP/PC di WiFi yang sama | `http://[IP-PC]:3000` | Ditampilkan saat install |
| 🌐 Dari mana saja (online) | `https://[kota].vocbilliard.online` | Butuh internet |
| 💰 Halaman Kasir | `http://[IP-PC]:3000/billing` | Untuk kasir |

> [!TIP]
> Shortcut **"VOC Billiard"** sudah otomatis dibuat di Desktop.
> Double-klik shortcut itu untuk membuka aplikasi dengan cepat.

---

## 🔄 PENGGUNAAN SEHARI-HARI

### Menjalankan Aplikasi (Setiap Hari)
```
Double-klik shortcut "VOC Billiard" di Desktop
— atau —
Double-klik MULAI.bat (Run as Administrator)
```

### Mematikan Aplikasi
```
Double-klik shortcut "STOP VOC Billiard" di Desktop
— atau —
Double-klik STOP.bat
```

### Update ke Versi Terbaru
```
Double-klik UPDATE.bat (Run as Administrator)
Butuh koneksi internet. Data tidak hilang.
```

### Cek Status Layanan
```
Double-klik STATUS.bat
```

---

## 🏗️ LAYANAN YANG BERJALAN (Info Teknis)

| Layanan | Fungsi | Port |
|---------|--------|------|
| PostgreSQL | Database utama | 5432 |
| Redis | Cache & session | 6379 |
| Mosquitto | MQTT Broker (ESP32) | 1883 / 8083 |
| Backend NestJS | API Server | 4000 |
| Frontend Next.js | Antarmuka pengguna | 3000 |
| Cloudflared | Tunnel akses online | — |

---

## 🚨 TROUBLESHOOTING

### ❌ Docker tidak bisa berjalan
- Pastikan Windows 10/11 **64-bit**
- Aktifkan fitur **Hyper-V** dan **WSL 2** di Windows Features
- Restart komputer → jalankan `INSTALL.bat` lagi

### ❌ Gagal download (token error)
- Token mungkin sudah expired (berlaku 90 hari)
- Buat token baru di: https://github.com/settings/tokens/new (scope: `read:packages`)
- Update isi `.token` → jalankan `INSTALL.bat` lagi

### ❌ Aplikasi tidak bisa dibuka
1. Jalankan `STATUS.bat` → cek layanan mana yang mati
2. Pastikan Docker Desktop berjalan (ikon di system tray)
3. Jalankan `MULAI.bat` untuk restart semua layanan

### ❌ Akses online tidak bisa (`*.vocbilliard.online`)
- Pastikan PC client terhubung internet
- Tunggu 1–2 menit setelah `MULAI.bat` dijalankan
- Jalankan `CEK_LOG.bat` → cari baris `cloudflared`

### ❌ Port sudah dipakai
- Ada aplikasi lain yang menggunakan port 3000/4000/1883
- Matikan aplikasi tersebut → jalankan `MULAI.bat`

---

## 📋 CHECKLIST TEKNISI (Cetak & Bawa)

### Di Kantor Pusat (Tirta):
- [ ] Jalankan `BUKA_CABANG_BARU.bat`
- [ ] Masukkan nama kota (huruf kecil, tanpa spasi)
- [ ] Masuk ke folder `INSTALLER_[kota]`
- [ ] Copy `.token.example` → rename jadi `.token`
- [ ] Isi `GITHUB_TOKEN` di file `.token`
- [ ] Isi `LOCATION_NAME` di file `.token`
- [ ] Copy seluruh folder ke USB/Drive

### Di PC Client:
- [ ] Paste folder dari USB ke PC client
- [ ] Pastikan PC terhubung internet
- [ ] Klik kanan `INSTALL.bat` → Run as administrator
- [ ] Klik YES pada popup UAC
- [ ] Tunggu sampai browser terbuka otomatis
- [ ] Cek akses online: `https://[kota].vocbilliard.online`
- [ ] ✅ Selesai!

---

*Dokumen ini dibuat otomatis berdasarkan analisis kode sumber VOC Billiard Management System.*
*Kontak developer: https://github.com/Tirta7/voc_master_data_center*
