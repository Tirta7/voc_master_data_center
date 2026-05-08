# 🎱 VOC Billiard System — Panduan Deployment

## 📋 Kebutuhan Per Lokasi (Tiap Tempat Billiard)

| Kebutuhan | Spesifikasi |
|---|---|
| **OS** | Windows 10 / 11 (64-bit) |
| **RAM** | Minimal 4 GB (8 GB lebih lancar) |
| **Storage** | 10 GB tersedia |
| **Jaringan** | WiFi Router (HP waiter dan PC server harus 1 jaringan) |
| **Internet** | Hanya saat instalasi pertama (~2 GB download) |

> **Docker TIDAK diperlukan!** — Aplikasi langsung berjalan di Windows.

---

## 🚀 Metode 1: Instalasi dari USB (TERCEPAT)

Cocok jika Anda yang datang ke tiap lokasi untuk setup.

### Persiapan USB (1x saja di PC Anda):
1. Copy seluruh folder `Billiard_APPS` ke USB
2. USB siap dibawa ke semua lokasi

### Di PC server tiap lokasi:
```
1. Colokkan USB
2. Copy folder Billiard_APPS ke D:\
3. Klik kanan INSTALL.bat → "Run as administrator"
4. Ikuti instruksi di layar (~20-30 menit)
5. Selesai — browser terbuka otomatis
```

---

## 🌐 Metode 2: Instalasi dari Internet (PC Baru Kosong)

Cocok jika tidak bisa bawa USB atau setup remote.

```
1. Salin file MULAI_DARI_SINI.bat ke PC baru (via email/WA)
2. Klik kanan → "Run as administrator"
3. Pilih lokasi instalasi (default D:\Billiard_APPS)
4. Tunggu download + install otomatis (~30-45 menit)
5. Selesai!
```

---

## 📱 Untuk HP Waiter (Tanpa Install Apapun)

HP waiter **hanya butuh browser** — tidak perlu install apapun.

### Android (Chrome):
1. Sambungkan HP ke WiFi yang sama dengan PC server
2. Buka Chrome → ketik `http://[IP SERVER]:3001`
3. Tap **⋮** → **"Add to Home Screen"** → **"Add"**
4. ✅ Ikon aplikasi muncul di home screen

### iPhone/iPad (Safari):
1. Buka Safari → ketik `http://[IP SERVER]:3001`
2. Tap **□↑** (Share) → **"Add to Home Screen"** → **"Add"**
3. ✅ Ikon aplikasi muncul di home screen

> **Cara cek IP Server:** Buka `DEPLOY.bat` — IP akan ditampilkan otomatis

---

## 🛠️ File-file Penting

| File | Kapan Digunakan |
|---|---|
| `MULAI_DARI_SINI.bat` | PC baru kosong — download dari internet |
| `INSTALL.bat` | Instalasi dari USB / folder lokal |
| `DEPLOY.bat` | **Setiap hari** — mulai semua layanan |
| `UPDATE_APP.bat` | Update versi terbaru dari GitHub |
| `STOP_APP.bat` | Matikan semua layanan |
| `BUILD_DISTRIBUSI.bat` | Buat paket untuk client (tanpa source code) |

---

## 🔒 Proteksi Source Code (Sangat Penting)

Jika Anda ingin menginstall di PC client tanpa mereka bisa melihat atau mengambil source code `.ts`, `.tsx`, atau firmware `.ino`, ikuti langkah ini:

1. **Di PC Anda (Developer):**
   - Jalankan `BUILD_DISTRIBUSI.bat`.
   - Script akan mem-build aplikasi dan membuat folder baru bernama `DISTRIBUSI\`.
2. **Kirim ke Client:**
   - Copy **hanya** isi folder `DISTRIBUSI\` ke USB.
   - Di PC client, jalankan `INSTALL.bat` yang ada di dalam folder tersebut.
3. **Hasilnya:**
   - Client hanya mendapatkan file yang sudah di-compile (binari).
   - Folder `src/` dan file firmware tidak akan ada di PC client.

---

---

## 🔄 Rutinitas Harian Operator

```
Pagi (nyalakan PC):
  → Aplikasi otomatis berjalan (sudah dikonfigurasi saat install)
  → Jika tidak muncul: klik shortcut "▶ VOC Billiard - START" di Desktop

Jika ada masalah:
  → Klik "▶ VOC Billiard - START" di Desktop
  → Atau jalankan DEPLOY.bat
```

---

## 🔧 Troubleshooting

### HP tidak bisa akses aplikasi
```
✓ Pastikan HP dan PC server di WiFi yang SAMA
✓ Cek IP server: buka DEPLOY.bat, lihat baris "HP / PC : http://..."
✓ Coba matikan Windows Firewall sementara untuk test
✓ Buka port: Windows Defender → Allow app → tambahkan Node.js
```

### Aplikasi error setelah restart PC
```
→ Jalankan DEPLOY.bat di Desktop
→ Atau tunggu beberapa menit (PM2 auto-restart)
```

### Cek status layanan
```
Buka Command Prompt → ketik:
pm2 list
```

### Lihat log error
```
pm2 logs VOC-Backend --lines 50
pm2 logs VOC-Frontend --lines 50
```

### Ganti IP server (pindah router/WiFi)
```
→ Jalankan lagi INSTALL.bat
→ Atau edit file:
   backend\.env          → ganti APP_URL=http://[IP BARU]:4000
   frontend\.env.local   → ganti kedua URL ke [IP BARU]
→ Restart: pm2 restart all
```

---

## 💾 Backup Database

Jalankan di Command Prompt (sebagai Administrator):
```batch
cd D:\Billiard_APPS
node update_ip.js
```

Atau backup manual (ganti dengan path psql yang benar):
```batch
set PGPASSWORD=VocBilliard2024!
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -p 4538 billiard_db > backup_billiard.sql
```

---

## 📞 Port yang Digunakan

| Port | Layanan | Diakses oleh |
|---|---|---|
| **3001** | Frontend Web | Semua PC/HP (browser) |
| **4000** | Backend API | Frontend secara otomatis |
| **1883** | MQTT TCP | ESP32 hardware |
| **8083** | MQTT WebSocket | Browser (real-time) |
| **4538** | PostgreSQL | Backend (internal) |
| **6379** | Redis | Backend (internal) |

---

## 📦 Arsitektur Multi-Lokasi

```
Tempat Billiard A          Tempat Billiard B          Tempat Billiard C
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│  PC Server A    │        │  PC Server B    │        │  PC Server C    │
│  Windows 10/11  │        │  Windows 10/11  │        │  Windows 10/11  │
│  ┌───────────┐  │        │  ┌───────────┐  │        │  ┌───────────┐  │
│  │ Node.js   │  │        │  │ Node.js   │  │        │  │ Node.js   │  │
│  │ PM2       │  │        │  │ PM2       │  │        │  │ PM2       │  │
│  │ PostgreSQL│  │        │  │ PostgreSQL│  │        │  │ PostgreSQL│  │
│  │ Redis     │  │        │  │ Redis     │  │        │  │ Redis     │  │
│  │ Mosquitto │  │        │  │ Mosquitto │  │        │  │ Mosquitto │  │
│  └───────────┘  │        │  └───────────┘  │        │  └───────────┘  │
│  IP: 192.168.1.x│        │  IP: 192.168.1.x│        │  IP: 192.168.1.x│
└────────┬────────┘        └────────┬────────┘        └────────┬────────┘
         │ WiFi Lokal               │ WiFi Lokal               │ WiFi Lokal
    ┌────┴─────┐               ┌────┴─────┐               ┌────┴─────┐
    │HP Waiter │               │HP Waiter │               │HP Waiter │
    │ Browser  │               │ Browser  │               │ Browser  │
    └──────────┘               └──────────┘               └──────────┘

Setiap lokasi BERDIRI SENDIRI — data tidak saling terhubung.
```
