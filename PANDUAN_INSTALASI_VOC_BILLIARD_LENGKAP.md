# 📘 PANDUAN INSTALASI LENGKAP
# VOC BILLIARD MANAGEMENT SYSTEM
### Docker + Cloudflare Tunnel Edition — Versi 3.0

> **Untuk siapa dokumen ini?**
> - **Tirta (Kantor Pusat)** — Bagian A: Proses buka cabang baru
> - **Teknisi Lapangan** — Bagian B: Proses instalasi di PC client
> - **Pemilik Cabang** — Bagian C: Penggunaan sehari-hari

---

## 🏗️ ARSITEKTUR SISTEM (Gambaran Besar)

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET / CLOUD                          │
│                                                             │
│   GitHub Container Registry (ghcr.io)                      │
│   ├── ghcr.io/tirta7/voc-backend:latest  (NestJS API)      │
│   └── ghcr.io/tirta7/voc-frontend:latest (Next.js UI)      │
│                                                             │
│   Cloudflare Global Network                                 │
│   ├── [kota].vocbilliard.online → Frontend                 │
│   ├── api.[kota].vocbilliard.online → Backend              │
│   └── mqtt.[kota].vocbilliard.online → MQTT WebSocket      │
└─────────────────────┬───────────────────────────────────────┘
                      │ Cloudflare Tunnel (Terenkripsi)
┌─────────────────────▼───────────────────────────────────────┐
│                   PC CLIENT (di lokasi billiard)             │
│                                                             │
│   Docker Desktop                                            │
│   ├── 🗄️  voc_postgres   → Database (port 5432)            │
│   ├── ⚡  voc_redis       → Cache/Session (port 6379)       │
│   ├── 📡  voc_mosquitto   → MQTT Broker (port 1883/8083)   │
│   ├── 🖥️  voc_backend     → API NestJS (port 4000)         │
│   ├── 🌐  voc_frontend    → UI Next.js (port 3000)         │
│   └── 🔒  voc_cloudflared → Tunnel ke Cloudflare           │
│                                                             │
│   Akses LAN:  http://[IP-PC]:3000                           │
│   Akses HP:   http://[IP-PC]:3000/billing                   │
│   Akses IoT:  mqtt://[IP-PC]:1883 (ESP32/sensor meja)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 DAFTAR LENGKAP FILE DAN FUNGSINYA

### Di Kantor Pusat (`D:\Billiard_APPS\`)

| File | Fungsi | Kapan Dijalankan |
|------|--------|-----------------|
| `BUKA_CABANG_BARU.bat` | Generate folder installer baru per cabang | **Setiap ada cabang baru** |
| `INSTALLER_CLIENT/` | Template folder installer (master) | Tidak dijalankan langsung |
| `INSTALLER_[kota]/` | Hasil generate, dikirim ke client | Setelah `BUKA_CABANG_BARU.bat` |

### Di Folder Installer Client (`INSTALLER_[kota]\`)

| File | Fungsi | Siapa yang Menjalankan | Butuh Admin? |
|------|--------|----------------------|:---:|
| `INSTALL.bat` | **Instalasi pertama kali** | Teknisi (sekali saja) | ✅ Ya |
| `MULAI.bat` | Menjalankan semua layanan | Pemilik (setiap hari) | ✅ Ya |
| `STOP.bat` | Mematikan semua layanan | Pemilik (setiap hari) | ❌ Tidak |
| `STOP_ALL_SERVICES.bat` | Matikan paksa (emergency) | Teknisi | ❌ Tidak |
| `UPDATE.bat` | Update ke versi terbaru | Teknisi | ✅ Ya |
| `STATUS.bat` | Cek status semua container | Teknisi/Pemilik | ❌ Tidak |
| `CEK_LOG.bat` | Ambil log error backend | Teknisi | ✅ Ya |
| `RESET_LISENSI.bat` | Reset cache lisensi aplikasi | Teknisi | ❌ Tidak |
| `RESET_TOTAL.bat` | ⚠️ Hapus semua data, fresh install | Teknisi (darurat) | ✅ Ya |
| `docker-compose.yml` | Konfigurasi Docker | **JANGAN DIUBAH** | — |
| `mosquitto.conf` | Konfigurasi MQTT Broker | **JANGAN DIUBAH** | — |
| `.token` | Token rahasia instalasi | Diisi Tirta sebelum kirim | — |
| `.token.example` | Template file .token | Referensi saja | — |
| `.env` | Konfigurasi otomatis (dibuat saat install) | Otomatis | — |
| `cloudflare/config.yml` | Routing tunnel Cloudflare | Otomatis (generate) | — |
| `cloudflare/credentials.json` | Kunci tunnel Cloudflare | Otomatis (generate) | — |
| `backend_logs.txt` | File hasil `CEK_LOG.bat` | Dibuat otomatis | — |

> [!TIP]
> **Kabar Baik (Update V3.0+):** 
> Kunci **VAPID** untuk Push Notification, konfigurasi **Tunnel DNS** Cloudflare, dan proteksi persisten untuk ikon **PWA (Logo)** sekarang **SUDAH TERINJEKSI OTOMATIS 100%** ke dalam template installer saat `BUKA_CABANG_BARU.bat` dijalankan! Tidak perlu khawatir error notifikasi atau logo yang kembali menjadi "S" di sisi cabang!

---

# ═══════════════════════════════════════════
# BAGIAN A — KANTOR PUSAT (Tirta)
# ═══════════════════════════════════════════

> Lakukan di PC `D:\Billiard_APPS` sebelum mengirim ke client.

---

## 📌 STEP A1 — Jalankan `BUKA_CABANG_BARU.bat`

**Lokasi:** `D:\Billiard_APPS\BUKA_CABANG_BARU.bat`

### Cara Menjalankan:
1. Double-klik file `BUKA_CABANG_BARU.bat`
2. Ketik nama kota cabang baru ketika diminta:

```
Masukkan nama kota cabang baru (huruf kecil semua tanpa spasi, contoh: gresik):
```

### ⚠️ Aturan Penulisan Nama Kota (WAJIB DIPATUHI):

| ✅ Benar | ❌ Salah | Alasan |
|----------|----------|--------|
| `gresik` | `Gresik` | Harus huruf kecil semua |
| `kotabaru` | `kota baru` | Tanpa spasi |
| `banjarbaru` | `banjar-baru` | Tanpa tanda hubung |
| `padangsidimpuan` | `Padang Sidimpuan` | Huruf kecil + tanpa spasi |

> [!IMPORTANT]
> Nama kota ini akan menjadi **subdomain permanen**: `[kota].vocbilliard.online`
> Tidak bisa diubah setelah tunnel dibuat tanpa proses manual di dashboard Cloudflare.

### Apa yang Terjadi Secara Otomatis (±10–30 detik):

```
[1/4] Membuat Cloudflare Tunnel baru "gresik-branch"
      → cloudflared tunnel create gresik-branch
      → Mendapat Tunnel UUID unik (contoh: abc123-...)
      → Credentials disimpan di C:\Users\tirta\.cloudflared\[UUID].json

[2/4] Mendaftarkan 3 subdomain DNS ke Cloudflare
      → gresik.vocbilliard.online        (Frontend)
      → api.gresik.vocbilliard.online    (Backend API)
      → mqtt.gresik.vocbilliard.online   (MQTT WebSocket)
      → Langsung aktif di DNS global!

[3/4] Menduplikasi folder INSTALLER_CLIENT → INSTALLER_gresik
      → xcopy semua file termasuk subfolder cloudflare/

[4/4] Inject konfigurasi khusus cabang gresik
      → Menulis cloudflare/config.yml baru (dengan UUID + subdomain gresik)
      → Menyalin credentials.json dari folder .cloudflared
      → Mengganti teks "pekalongan" → "gresik" di:
         • docker-compose.yml
         • INSTALL.bat
         • MULAI.bat
```

### Hasil Akhir:

Folder baru terbuat di `D:\Billiard_APPS\INSTALLER_gresik\` dengan isi:
```
📁 INSTALLER_gresik/
├── 📄 INSTALL.bat          ← Sudah dikonfigurasi untuk gresik
├── 📄 MULAI.bat            ← Sudah dikonfigurasi untuk gresik
├── 📄 STOP.bat
├── 📄 STOP_ALL_SERVICES.bat
├── 📄 UPDATE.bat
├── 📄 STATUS.bat
├── 📄 CEK_LOG.bat
├── 📄 RESET_LISENSI.bat
├── 📄 RESET_TOTAL.bat
├── 📄 docker-compose.yml   ← "pekalongan" sudah diganti "gresik"
├── 📄 mosquitto.conf
├── 📄 .token.example       ← Template
├── 📁 cloudflare/
│   ├── 📄 config.yml       ← UUID + subdomain gresik (otomatis)
│   └── 📄 credentials.json ← Kunci tunnel gresik (otomatis)
└── ❌ .token               ← BELUM ADA! Harus dibuat manual
```

---

## 📌 STEP A2 — Buat dan Isi File `.token` (WAJIB)

> [!CAUTION]
> Ini adalah **satu-satunya langkah manual** yang harus Anda lakukan.
> Tanpa file `.token`, instalasi di PC client akan **GAGAL**.

### Langkah Detail:

**1. Masuk ke folder hasil generate:**
```
D:\Billiard_APPS\INSTALLER_gresik\
```

**2. Salin file template:**
- Temukan file `.token.example`
- Salin (Ctrl+C) → Tempel (Ctrl+V) di folder yang sama
- Rename salinannya menjadi `.token` (hapus kata `.example`)

> [!NOTE]
> Windows mungkin menyembunyikan file yang diawali titik.
> Jika tidak terlihat: buka File Explorer → View → centang **Hidden items**

**3. Buka `.token` dengan Notepad, isi sesuai tabel berikut:**

```ini
# ================================================================
# STATUS WAJIB/OPSIONAL SETIAP BARIS:
# ================================================================

# WAJIB — GitHub Personal Access Token
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# JANGAN DIUBAH — Username GitHub pemilik image
GITHUB_USERNAME=tirta7

# WAJIB — Nama lokasi yang tampil di dashboard aplikasi
LOCATION_NAME=Billiard Gresik Utama

# OPSIONAL — Token WhatsApp notifikasi via Fonnte
FONNTE_TOKEN=

# WAJIB — Zona waktu Indonesia
TIMEZONE_ZONE=WIB
```

### Tabel Penjelasan Setiap Field:

| Field | Status | Contoh Isi | Keterangan |
|-------|--------|-----------|------------|
| `GITHUB_TOKEN` | 🔴 **WAJIB** | `ghp_abc123...` | Token untuk download image aplikasi dari cloud |
| `GITHUB_USERNAME` | ⛔ **JANGAN DIUBAH** | `tirta7` | Username pemilik image di GitHub |
| `LOCATION_NAME` | 🔴 **WAJIB** | `Billiard Gresik Utama` | Nama tampil di header dashboard |
| `FONNTE_TOKEN` | 🟡 **Opsional** | `abc123xyz` | Notifikasi WhatsApp. Kosongkan jika tidak pakai |
| `TIMEZONE_ZONE` | 🔴 **WAJIB** | `WIB` / `WITA` / `WIT` | Menentukan jam yang tampil di aplikasi |

### Cara Mendapatkan `GITHUB_TOKEN`:

1. Buka browser → https://github.com/settings/tokens/new
2. Login dengan akun GitHub Tirta
3. Isi form:
   - **Note:** tulis `VOC Client [nama kota]` (untuk identifikasi)
   - **Expiration:** pilih `No expiration` (agar tidak expired)
   - **Select scopes:** centang **`read:packages`** (hanya ini yang dibutuhkan)
4. Klik tombol hijau **"Generate token"**
5. **Segera copy token!** (hanya tampil sekali, tidak bisa dilihat lagi)
6. Paste ke file `.token` menggantikan `MASUKKAN_TOKEN_DISINI`

> [!WARNING]
> Token berlaku sesuai expiration yang dipilih.
> Jika token expired → client tidak bisa update.
> Direkomendasikan: pilih **"No expiration"** atau **"1 year"**.

### Pilihan `TIMEZONE_ZONE`:

| Nilai | Zona | Wilayah |
|-------|------|---------|
| `WIB` | UTC+7 | Jawa, Sumatera, Kalimantan Barat & Tengah |
| `WITA` | UTC+8 | Bali, NTB, NTT, Sulawesi, Kalimantan Timur & Selatan |
| `WIT` | UTC+9 | Maluku, Papua |

---

## 📌 STEP A3 — Verifikasi Isi Folder Sebelum Dikirim

**Checklist sebelum copy ke USB:**

- [ ] File `.token` sudah ada (bukan `.token.example`)
- [ ] `GITHUB_TOKEN` di `.token` sudah diisi (bukan `MASUKKAN_TOKEN_DISINI`)
- [ ] `LOCATION_NAME` di `.token` sudah diisi nama lokasi
- [ ] Folder `cloudflare/` berisi `config.yml` dan `credentials.json`
- [ ] `docker-compose.yml` sudah tidak ada kata `pekalongan` (sudah diganti nama kota)

**Cara verifikasi cepat via PowerShell:**
```powershell
# Cek isi .token
Get-Content "D:\Billiard_APPS\INSTALLER_gresik\.token"

# Cek tunnel name di config.yml
Get-Content "D:\Billiard_APPS\INSTALLER_gresik\cloudflare\config.yml"
```

---

## 📌 STEP A4 — Registrasi Lisensi & Owner Monitoring (GAS)

> [!IMPORTANT]
> Langkah ini sangat krusial agar aplikasi di cabang tidak terkunci (locked) saat pertama kali dijalankan, dan Owner bisa memonitor operasional cabang.

**1. Duplikasi File Google Apps Script (GAS) untuk Owner**
- Gandakan file `Master_Code.gs` untuk cabang baru (misal: `Branch_Gresik_Code.gs`).
- Deploy sebagai Web App dan dapatkan **GAS_WEBAPP_URL** yang baru.
- Catat URL tersebut (ini akan dipakai nanti atau diisikan otomatis ke `.env` cabang).
- Pastikan **GAS_SECRET** (contoh: `billiard123`) sudah disamakan.

**2. Daftarkan Cabang di VOC Central Command & License Center**
- Buka dashboard utama Anda: **VOC Central Command & License Center** (`https://script.google.com/macros/s/...`).
- Klik tombol **"Tambah Cabang Baru"**.
- Masukkan informasi cabang:
  - **Nama Cabang/Owner:** `Billiard Gresik Utama`
  - **WEBAPP URL:** (URL GAS Web App yang baru di-deploy)
  - **GAS SECRET:** `billiard123`
- Generate/Catat **LICENSE KEY** untuk cabang tersebut (contoh: `LIC-REM-B39H-GF4S`).
- Atur tanggal *Expired* sesuai paket langganan cabang.

> [!TIP]
> Nantinya, Teknisi akan melaporkan **Serial Number PC (Machine ID)** kepada Anda. Anda tinggal memasukkan Serial Number tersebut ke dalam dashboard Central Command agar lisensinya menjadi **ACTIVE** dan terikat (bind) ke PC cabang tersebut.

---

## 📌 STEP A5 — Kirim Folder ke PC Client

**Opsi transfer:**

| Metode | Kecepatan | Cocok Untuk |
|--------|-----------|------------|
| USB/Flashdisk | Cepat | PC di depan Anda / dikirim langsung |
| Google Drive | Sedang | Client jauh, Anda upload mereka download |
| Transfer LAN | Sangat cepat | PC dalam satu jaringan |
| Remote Desktop (AnyDesk/TeamViewer) | Tergantung internet | Remote instalasi dari jauh |

> [!TIP]
> **Cara terbaik untuk client jauh:**
> Upload folder `INSTALLER_gresik` ke Google Drive → bagikan link → minta client download & extract → lanjut ke Bagian B.

---

# ═══════════════════════════════════════════
# BAGIAN B — PC CLIENT (Teknisi Lapangan)
# ═══════════════════════════════════════════

> Lakukan di PC billiard yang akan dipasang sistem.

---

## 📌 STEP B1 — Persiapan PC Client

### Spesifikasi Minimum PC:

| Komponen | Minimum | Direkomendasikan | Catatan |
|----------|---------|-----------------|---------|
| **OS** | Windows 10 Home 64-bit | Windows 10/11 Pro 64-bit | Wajib 64-bit! |
| **RAM** | 8 GB | 16 GB | Docker butuh minimal 4 GB |
| **Storage** | 20 GB kosong | 50 GB kosong | Untuk Docker images + database |
| **CPU** | Intel Core i3 Gen 8 | Intel Core i5+ | Semakin cepat semakin baik |
| **Internet** | 5 Mbps | 20 Mbps+ | Untuk download image pertama kali |
| **Tipe Drive** | HDD | SSD | SSD jauh lebih responsif |

### Cek Windows 64-bit:
- Klik kanan **"This PC"** → Properties
- Cari **"System type"** → harus tertulis **"64-bit operating system"**

### Pastikan Fitur Windows Aktif:
1. Buka **Control Panel** → Programs → **"Turn Windows features on or off"**
2. Pastikan centang:
   - ✅ **Hyper-V** (semua sub-item)
   - ✅ **Virtual Machine Platform**
   - ✅ **Windows Subsystem for Linux**
3. Klik OK → Restart jika diminta

> [!NOTE]
> Jika Hyper-V tidak ada di daftar → PC Anda menggunakan Windows Home.
> Docker Desktop tetap bisa jalan di Windows Home via WSL2, cukup aktifkan:
> ✅ Virtual Machine Platform + ✅ Windows Subsystem for Linux

---

## 📌 STEP B2 — Salin Folder Installer ke PC

1. Colok USB / buka Google Drive
2. Salin seluruh folder `INSTALLER_[kota]` ke PC
3. Letakkan di lokasi yang mudah diingat, contoh:
   - `C:\VOC_Billiard\` ✅
   - `D:\Apps\INSTALLER_gresik\` ✅
   - Desktop ✅ (tidak masalah)

> [!WARNING]
> Jangan letakkan di folder yang path-nya mengandung spasi panjang atau karakter aneh.
> Contoh buruk: `C:\Users\Pemilik Billiard Jaya\Documents\Sistem Baru\`

---

## 📌 STEP B3 — Jalankan `INSTALL.bat`

1. Buka folder `INSTALLER_[kota]`
2. **Klik kanan** `INSTALL.bat` → pilih **"Run as administrator"**
3. Pada popup UAC yang muncul → klik **"Yes"**
4. Ikuti instruksi di layar

### Alur Lengkap 8 Tahap Instalasi:

---

#### 🔷 Tahap [1/8] — Cek Sistem Operasi
```
Sistem mengecek apakah PC menggunakan Windows 10 atau 11
```
- ✅ Windows 10/11 → lanjut
- ❌ Windows lain → error, harus upgrade OS

---

#### 🔷 Tahap [2/8] — Install Docker Desktop
```
Sistem mengecek apakah Docker Desktop sudah ada
```

**Skenario A — Docker sudah ada:**
```
[OK] Docker Desktop ditemukan → langsung lanjut ke tahap berikutnya
```

**Skenario B — Docker belum ada (pertama kali):**
```
[!] Docker Desktop tidak ditemukan. Menginstall otomatis...
```
→ Script akan install Docker via winget atau download langsung
→ **Setelah install selesai, muncul pesan:**

```
╔══════════════════════════════════════════╗
║  Docker Desktop berhasil diinstall!      ║
║  WAJIB RESTART komputer sekarang,        ║
║  lalu jalankan INSTALL.bat kembali.      ║
╚══════════════════════════════════════════╝
```

> [!IMPORTANT]
> **Jika muncul pesan restart:** Restart PC → Buka Docker Desktop dari Start Menu → Tunggu sampai ikon Docker di system tray berwarna **hijau** → Baru jalankan `INSTALL.bat` lagi.

**Skenario C — Docker ada tapi belum berjalan:**
```
[!] Docker Engine belum aktif. Membuka Docker Desktop...
    Menunggu Docker Engine siap (maks 120 detik)...
```
→ Script otomatis membuka Docker Desktop dan menunggu sampai siap

---

#### 🔷 Tahap [3/8] — Login ke GitHub Container Registry
```
Login ke ghcr.io dengan token dari file .token
```
- ✅ Login berhasil → lanjut
- ❌ Login gagal → token salah/expired → harus update `.token`

---

#### 🔷 Tahap [4/8] — Siapkan MQTT Broker
```
Memverifikasi file mosquitto.conf
→ Jika tidak ada: dibuat otomatis
→ Jika ada: dipakai langsung
```
- MQTT digunakan untuk komunikasi dengan perangkat ESP32 (sensor meja billiard)

---

#### 🔷 Tahap [5/8] — Buat File Konfigurasi (.env)
```
Sistem otomatis mendeteksi:
- IP LAN PC ini (untuk akses dari HP/PC lain)
- Membuat password database acak (aman)
- Membuat Machine ID unik (Serial Number PC)
- Menulis semua konfigurasi ke file .env
```

File `.env` yang dibuat berisi:
```ini
DB_USERNAME=postgres
DB_PASSWORD=voc12345678          ← Password acak, otomatis
DB_DATABASE=billiard_db
SERVER_IP=192.168.1.10           ← IP LAN PC terdeteksi otomatis
FONNTE_TOKEN=xxx                 ← Dari .token
GITHUB_TOKEN=xxx                 ← Dari .token
LOCATION_NAME=Billiard Gresik    ← Dari .token
LOCATION_ID=LOC_DESKTOP-ABC123   ← Nama komputer
TZ=Asia/Jakarta                  ← Dari TIMEZONE_ZONE di .token
MACHINE_ID=VOC-A1B2              ← Serial Number unik PC ini
LICENSE_KEY=                     ← Diisi nanti via dashboard
```

---

#### 🔷 Tahap [6/8] — Download Semua Komponen dari Cloud
```
Mengunduh semua image Docker dari ghcr.io dan Docker Hub:
- postgres:16-alpine           → Database PostgreSQL
- redis:7-alpine               → Cache & session
- eclipse-mosquitto:2.0        → MQTT Broker
- ghcr.io/tirta7/voc-backend   → API NestJS (custom)
- ghcr.io/tirta7/voc-frontend  → UI Next.js (custom)
- cloudflare/cloudflared       → Tunnel client
```

**Perkiraan waktu download (pertama kali):**

| Kecepatan Internet | Estimasi Waktu |
|-------------------|----------------|
| 5 Mbps | 25–40 menit |
| 10 Mbps | 15–25 menit |
| 20 Mbps+ | 10–15 menit |

> [!TIP]
> Jika download gagal, script otomatis mencoba ulang sampai **5 kali**.
> Biarkan saja, jangan tutup jendela.

---

#### 🔷 Tahap [7/8] — Jalankan Semua Layanan
```
docker compose up -d
```
Menjalankan 6 container sekaligus:

| Container | Nama | Status Awal |
|-----------|------|------------|
| PostgreSQL | `voc_postgres` | ~10 detik siap |
| Redis | `voc_redis` | ~5 detik siap |
| Mosquitto | `voc_mosquitto` | ~3 detik siap |
| Backend NestJS | `voc_backend` | ~60 detik siap |
| Frontend Next.js | `voc_frontend` | ~90 detik siap |
| Cloudflared | `voc_cloudflared` | ~30 detik siap |

---

#### 🔷 Tahap [8/8] — Health Check & Finalisasi
```
Menunggu http://localhost:3000 merespons (maks 2 menit)
Membuat 2 shortcut di Desktop:
  - "VOC Billiard"        → http://localhost:3000
  - "STOP VOC Billiard"   → STOP.bat
Browser otomatis terbuka ke http://localhost:3000
```

---

## 📌 STEP B4 — Verifikasi Instalasi Berhasil

Setelah browser terbuka, cek 3 hal ini:

### ✅ Cek 1 — Aplikasi Tampil
Buka browser → ketik `http://localhost:3000`
→ Harus muncul halaman login VOC Billiard

### ✅ Cek 2 — Akses dari HP
1. Sambungkan HP ke WiFi yang sama dengan PC
2. Buka browser HP → ketik `http://[IP-PC]:3000`
3. IP ditampilkan di akhir proses install
4. → Harus muncul halaman login

### ✅ Cek 3 — Akses Online Global
1. Buka browser (HP atau PC manapun, jaringan apapun)
2. Ketik: `https://gresik.vocbilliard.online`
3. → Harus muncul halaman login
4. Tunggu 1–2 menit setelah install jika belum muncul

> [!NOTE]
> Akses online membutuhkan PC selalu menyala dan terhubung internet.
> Jika PC dimatikan → akses online tidak bisa, tapi akses LAN tetap bisa saat PC dinyalakan kembali.

---

# ═══════════════════════════════════════════
# BAGIAN C — PENGGUNAAN SEHARI-HARI
# ═══════════════════════════════════════════

---

## 🟢 Menjalankan Aplikasi (Setiap Hari)

**Cara 1 — Via Shortcut Desktop (paling mudah):**
- Double-klik shortcut **"VOC Billiard"** di Desktop

**Cara 2 — Via file MULAI.bat:**
- Masuk ke folder `INSTALLER_[kota]`
- Double-klik `MULAI.bat` → klik Yes pada UAC

**Yang terjadi saat `MULAI.bat` dijalankan:**
1. Cek apakah Docker Engine aktif
2. Jika belum aktif → otomatis membuka Docker Desktop + menunggu
3. Menjalankan semua container (`docker compose up -d`)
4. Menampilkan IP LAN dan alamat akses
5. Membuka browser otomatis ke `http://localhost:3000`

---

## 🔴 Mematikan Aplikasi

**Cara 1 — Via Shortcut Desktop:**
- Double-klik shortcut **"STOP VOC Billiard"** di Desktop

**Cara 2 — Via `STOP.bat`:**
- Double-klik `STOP.bat`

**Yang terjadi:**
- Semua container dihentikan dengan aman (graceful shutdown)
- Data tidak hilang (tersimpan di Docker volumes)
- `STOP_ALL_SERVICES.bat` → versi yang lebih cepat (force stop)

> [!TIP]
> **Kapan harus matikan aplikasi?**
> Tidak perlu dimatikan setiap hari. Docker container akan restart otomatis (`restart: unless-stopped`) saat PC dinyalakan ulang.
> Matikan hanya jika PC akan dimatikan lama atau ada maintenance.

---

## 🔄 Update ke Versi Terbaru

**File:** `UPDATE.bat` → Run as administrator

**Yang terjadi:**
```
[1/3] Login ke registry GitHub dengan token
[2/3] Pull versi terbaru semua image dari ghcr.io
[3/3] Restart semua container dengan versi baru
```

**Waktu:** 5–15 menit tergantung ukuran update dan kecepatan internet

> [!IMPORTANT]
> Data (database, file) **tidak hilang** saat update.
> Data tersimpan di Docker volumes yang terpisah dari image.

---

## 📊 Cek Status Layanan

**File:** `STATUS.bat`

Menampilkan:
- Status setiap container (running/stopped/unhealthy)
- Penggunaan CPU, RAM setiap container
- IP LAN PC saat ini

**Contoh output normal:**
```
NAME             STATUS          CPU%    MEMORY
voc_postgres     Up (healthy)    0.5%    128MB
voc_redis        Up (healthy)    0.1%    32MB
voc_mosquitto    Up              0.0%    8MB
voc_backend      Up (healthy)    2.0%    256MB
voc_frontend     Up (healthy)    1.0%    512MB
voc_cloudflared  Up              0.2%    64MB
```

---

## 📋 Ambil Log Error

**File:** `CEK_LOG.bat` → Run as administrator

- Mengambil 100 baris log terakhir dari `voc_backend`
- Disimpan ke file `backend_logs.txt` di folder yang sama
- Kirim file ini ke developer jika ada masalah

---

## 🔑 Reset Lisensi

**File:** `RESET_LISENSI.bat`

**Kapan digunakan:**
- Aplikasi terkunci dan diminta lisensi padahal sudah valid
- Pindah ke PC baru (Machine ID berubah)

**Yang dilakukan:**
1. Hapus file lisensi di dalam container backend
2. Restart container backend
3. Aplikasi kembali ke mode trial / minta aktivasi ulang

---

## ⚠️ Reset Total (Hati-hati!)

**File:** `RESET_TOTAL.bat` → Run as administrator

> [!CAUTION]
> **SEMUA DATA AKAN TERHAPUS!**
> Gunakan hanya jika instalasi bermasalah dan tidak bisa diperbaiki cara lain.
> Seluruh database (transaksi, member, karyawan, dll) akan hilang permanen.

**Yang dilakukan:**
- `docker compose down -v` → hapus semua container + semua volumes (data)
- `docker compose up -d` → mulai ulang fresh dari awal

---

# ═══════════════════════════════════════════
# 🚨 TROUBLESHOOTING LENGKAP
# ═══════════════════════════════════════════

---

## ❌ Error: Docker tidak mau berjalan

**Gejala:** Muncul pesan "Docker Engine tidak bisa berjalan" atau ikon Docker di tray tidak hijau

**Solusi bertahap:**
1. Buka Docker Desktop dari Start Menu → tunggu sampai ikon tray **hijau** (bisa 2-5 menit)
2. Jika gagal → Restart komputer → buka Docker Desktop manual → tunggu hijau
3. Cek di Windows Features:
   - Buka: `Control Panel → Programs → Turn Windows features on or off`
   - Pastikan **Hyper-V** dan **WSL2** ✅ dicentang → restart jika baru diaktifkan
4. Jika masih gagal → Update Docker Desktop ke versi terbaru dari [docker.com](https://www.docker.com/products/docker-desktop)

---

## ❌ Error: Token tidak valid / Login gagal

**Gejala:** `[ERROR] Gagal login ke ghcr.io!`

**Kemungkinan penyebab & solusi:**

| Penyebab | Solusi |
|----------|--------|
| Token expired | Buat token baru di GitHub → update file `.token` |
| Token salah paste | Cek tidak ada spasi tersembunyi di awal/akhir token |
| Scope kurang | Token harus punya scope `read:packages` |
| Username salah | `GITHUB_USERNAME` harus tetap `tirta7` |

**Setelah update `.token`:** Jalankan `INSTALL.bat` lagi (akan lanjut dari tahap login)

---

## ❌ Error: Gagal download setelah 5x percobaan

**Gejala:** `[ERROR] GAGAL MENGUNDUH SETELAH 5x PERCOBAAN`

**Solusi:**
1. Cek koneksi internet (buka YouTube, pastikan bisa putar video)
2. Coba ganti ke hotspot HP
3. Pastikan tidak ada **VPN/proxy** yang aktif
4. Restart router/modem
5. Jalankan `INSTALL.bat` lagi

---

## ❌ Aplikasi tidak bisa dibuka (localhost:3000)

**Solusi bertahap:**
1. Jalankan `STATUS.bat` → lihat container mana yang `stopped` atau `unhealthy`
2. Jika ada yang tidak running → jalankan `MULAI.bat`
3. Jika `voc_backend` unhealthy → tunggu 2 menit lagi (backend perlu waktu startup)
4. Jika `voc_frontend` unhealthy → tunggu 3 menit lagi
5. Jalankan `CEK_LOG.bat` → buka `backend_logs.txt` → cari baris ERROR

---

## ❌ Akses online tidak bisa (`*.vocbilliard.online`)

**Solusi bertahap:**
1. Pastikan PC terhubung internet
2. Jalankan `STATUS.bat` → cek apakah `voc_cloudflared` statusnya `Up`
3. Jika cloudflared `stopped` → jalankan `MULAI.bat`
4. Tunggu 1–3 menit setelah cloudflared naik
5. Coba dari HP pakai data seluler (bukan WiFi yang sama)

---

## ❌ Akses dari HP tidak bisa (IP:3000)

**Solusi:**
1. Pastikan HP dan PC di **WiFi yang sama**
2. Cek IP PC yang benar:
   - Jalankan `STATUS.bat` atau `MULAI.bat` → IP ditampilkan di akhir
   - Atau: buka CMD → ketik `ipconfig` → lihat IPv4 Address
3. Coba matikan Windows Firewall sementara untuk test
4. Jika berhasil setelah firewall dimatikan → tambahkan exception port 3000 & 4000

---

## ❌ Port sudah dipakai

**Gejala:** `Error: bind: address already in use`

**Solusi:**
1. Cari aplikasi yang menggunakan port 3000/4000/1883/5432
2. Buka Task Manager → tab Details → cari proses yang mencurigakan
3. Hentikan proses tersebut → jalankan `MULAI.bat`

---

## ❌ PC baru / ganti PC (Machine ID berubah)

**Situasi:** Aplikasi terkunci karena Machine ID berbeda dari yang terdaftar lisensi

**Solusi:**
1. Jalankan `RESET_LISENSI.bat`
2. Hubungi developer untuk aktivasi ulang dengan Machine ID baru
3. Machine ID baru tampil di akhir `INSTALL.bat` (format: `VOC-XXXX`)

---

# ═══════════════════════════════════════════
# 📊 REFERENSI TEKNIS
# ═══════════════════════════════════════════

## Port yang Digunakan

| Port | Container | Protokol | Fungsi |
|------|-----------|----------|--------|
| `3000` | voc_frontend | HTTP | Antarmuka web utama |
| `4000` | voc_backend | HTTP | REST API |
| `5432` | voc_postgres | TCP | PostgreSQL (internal) |
| `6379` | voc_redis | TCP | Redis (internal) |
| `1883` | voc_mosquitto | MQTT TCP | ESP32 sensor meja |
| `8083` | voc_mosquitto | WebSocket | Browser real-time |

## URL Akses Lengkap

| Jenis | URL | Kondisi |
|-------|-----|---------|
| PC Lokal | `http://localhost:3000` | PC harus nyala |
| LAN (HP/PC lain) | `http://[IP-PC]:3000` | HP & PC harus satu WiFi |
| Kasir/Billing | `http://[IP-PC]:3000/billing` | HP & PC harus satu WiFi |
| Admin Dashboard | `http://[IP-PC]:3000/admin` | HP & PC harus satu WiFi |
| Online Global | `https://[kota].vocbilliard.online` | PC harus nyala + internet |
| API Online | `https://api.[kota].vocbilliard.online` | PC harus nyala + internet |
| MQTT Online | `wss://mqtt.[kota].vocbilliard.online` | PC harus nyala + internet |

## Data Tersimpan (Docker Volumes)

| Volume | Isi | Hilang Jika |
|--------|-----|------------|
| `postgres_data` | Semua data database | `RESET_TOTAL.bat` dijalankan |
| `redis_data` | Cache & session | Aman saat restart normal |
| `mosquitto_data` | Log MQTT | Aman saat restart normal |
| `backend_storage` | File upload (foto, dll) | `RESET_TOTAL.bat` dijalankan |
| `backend_logs` | Log aplikasi backend | Aman saat restart normal |

---

# ═══════════════════════════════════════════
# ✅ CHECKLIST CETAK — TIRTA (KANTOR PUSAT)
# ═══════════════════════════════════════════

**Nama Cabang:** _________________________ | **Tanggal:** _____________

### Sebelum Generate:
- [ ] `cloudflared` login aktif (cek: `cloudflared tunnel list`)
- [ ] PC terhubung internet
- [ ] Nama kota sudah ditentukan (huruf kecil, tanpa spasi)

### Proses Generate:
- [ ] Jalankan `BUKA_CABANG_BARU.bat`
- [ ] Masukkan nama kota: ________________________
- [ ] Script selesai tanpa error
- [ ] Folder `INSTALLER_[kota]` terbuat

### Isi File `.token`:
- [ ] Salin `.token.example` → rename jadi `.token`
- [ ] `GITHUB_TOKEN` diisi (token aktif, scope: read:packages)
- [ ] `LOCATION_NAME` diisi: ______________________________
- [ ] `TIMEZONE_ZONE` diisi: WIB / WITA / WIT
- [ ] File disimpan

### Verifikasi:
- [ ] File `.token` ada (bukan `.token.example`)
- [ ] `cloudflare/config.yml` berisi tunnel ID yang benar
- [ ] `cloudflare/credentials.json` ada dan tidak kosong
- [ ] `docker-compose.yml` menggunakan nama kota yang benar (bukan `pekalongan`)

### Pengiriman & Registrasi:
- [ ] Folder dikopi ke USB / Google Drive
- [ ] Token GitHub dikomunikasikan ke teknisi (aman)
- [ ] Script GAS (Owner Monitoring) sudah di-deploy
- [ ] Cabang baru sudah didaftarkan di **VOC Central Command & License Center**
- [ ] Menunggu Teknisi mengirimkan Machine ID (Serial Number PC) untuk aktivasi Lisensi

---

# ═══════════════════════════════════════════
# ✅ CHECKLIST CETAK — TEKNISI LAPANGAN
# ═══════════════════════════════════════════

**Lokasi:** _________________________ | **Tanggal:** _____________ | **Teknisi:** _____________

### Persiapan PC:
- [ ] Windows 10/11 64-bit
- [ ] RAM ≥ 8 GB
- [ ] Storage kosong ≥ 20 GB
- [ ] Internet tersedia dan stabil
- [ ] Hyper-V / WSL2 diaktifkan (jika Windows Home: aktifkan WSL2)

### Proses Instalasi:
- [ ] Folder `INSTALLER_[kota]` disalin ke PC
- [ ] File `.token` ada di dalam folder
- [ ] Klik kanan `INSTALL.bat` → Run as administrator → klik Yes
- [ ] Tunggu proses selesai
- [ ] Jika diminta restart (Docker baru install) → restart → buka Docker Desktop → tunggu hijau → jalankan `INSTALL.bat` lagi
- [ ] Browser otomatis terbuka → halaman login tampil

### Verifikasi Akhir:
- [ ] Akses `http://localhost:3000` → berhasil
- [ ] Akses dari HP `http://[IP]:3000` → berhasil
- [ ] Akses online `https://[kota].vocbilliard.online` → berhasil
- [ ] Shortcut "VOC Billiard" ada di Desktop
- [ ] Machine ID dicatat: VOC-______ (untuk aktivasi lisensi)

### Informasi untuk Dilaporkan ke Tirta:
- IP LAN PC: _______________
- Machine ID: VOC-___________
- OS Windows: _______________
- Nama Komputer (hostname): _______________

---

*Dokumen ini dibuat berdasarkan analisis kode sumber aktual `INSTALL.bat`, `BUKA_CABANG_BARU.bat`, `docker-compose.yml`, dan semua file `.bat` dalam sistem VOC Billiard Management System.*
*Developer: Tirta — https://github.com/Tirta7/voc_master_data_center*
