# 🎱 VOC Billiard System — Panduan Deployment

## 📋 Apa yang Dibutuhkan

| Kebutuhan | Spesifikasi Minimum |
|---|---|
| RAM | 4 GB (8 GB direkomendasikan) |
| Storage | 20 GB tersedia |
| OS | Windows 10/11 (64-bit) |
| Koneksi | WiFi/LAN yang sama dengan perangkat waiter |
| Internet | Hanya dibutuhkan saat instalasi pertama |

---

## 🚀 Instalasi di PC Baru (Server)

### Langkah 1 — Copy folder ini ke PC baru
Bisa via USB, jaringan, atau Google Drive.

### Langkah 2 — Jalankan installer
```
Klik kanan SETUP_PC_BARU.bat → Run as administrator
```

Script akan otomatis:
1. ✅ Mendeteksi IP jaringan Anda
2. ✅ Membuat file konfigurasi `.env`
3. ✅ Menginstall Docker Desktop (jika belum ada)
4. ✅ Build dan jalankan semua layanan
5. ✅ Membuat shortcut di Desktop

> **Estimasi waktu:** 10-20 menit (build pertama kali perlu download ~2GB image)

### Langkah 3 — Akses Aplikasi
Setelah instalasi selesai:
- **PC Server:** http://localhost:3001
- **PC/HP Client:** http://[IP SERVER]:3001

---

## 📱 Instalasi di HP Waiter (PWA — Gratis, Tanpa APK)

Tidak perlu install APK! Cukup buka browser di HP:

### Android (Chrome):
1. Buka Chrome → ketik `http://[IP SERVER]:3001`
2. Tap ikon **⋮** (titik tiga) di pojok kanan atas
3. Tap **"Add to Home Screen"** / **"Tambahkan ke Layar Utama"**
4. Tap **"Add"**
5. Aplikasi muncul di home screen seperti app biasa ✅

### iPhone/iPad (Safari):
1. Buka Safari → ketik `http://[IP SERVER]:3001`
2. Tap ikon **Share** (□↑) di bawah layar
3. Scroll ke bawah → tap **"Add to Home Screen"**
4. Tap **"Add"**
5. Aplikasi muncul di home screen ✅

> **Syarat:** HP waiter harus terhubung ke WiFi yang sama dengan PC server

---

## 🛠️ Operasi Sehari-hari

| File | Fungsi |
|---|---|
| `START_DOCKER.bat` | Mulai semua layanan |
| `STOP_DOCKER.bat` | Hentikan semua layanan |
| `UPDATE_APP.bat` | Update ke versi terbaru dari GitHub |
| `SETUP_PC_BARU.bat` | Instalasi di PC baru |

### Startup Otomatis (Rekomendasi)
Agar aplikasi otomatis berjalan saat PC dinyalakan:
1. Buat shortcut `START_DOCKER.bat`
2. Tekan `Win+R` → ketik `shell:startup`
3. Pindahkan shortcut ke folder yang terbuka

---

## 🔧 Troubleshooting

### Aplikasi tidak bisa diakses dari HP
- Pastikan HP dan PC server di WiFi yang sama
- Cek firewall: buka **Windows Defender Firewall** → **Allow an app** → tambahkan port 3001 dan 4000
- Coba akses: `http://[IP SERVER]:3001`

### Cara cek IP Server
Buka Command Prompt → ketik:
```
ipconfig
```
Cari baris `IPv4 Address` di bagian WiFi atau Ethernet.

### Docker tidak mau start
- Buka Docker Desktop dari Start Menu
- Tunggu hingga icon Docker di taskbar berhenti loading
- Jalankan `START_DOCKER.bat`

### Cek status layanan
```
docker compose ps
```
Semua container harus berstatus `healthy` atau `running`.

### Lihat log error
```
docker compose logs backend --tail=50
docker compose logs frontend --tail=50
```

---

## 💾 Backup Data

Data tersimpan di Docker volumes. Untuk backup:

```powershell
# Backup database
docker exec voc_postgres pg_dump -U postgres billiard_db > backup_$(Get-Date -Format "yyyyMMdd").sql
```

---

## 📞 Port yang Digunakan

| Port | Layanan |
|---|---|
| **3001** | Frontend (akses utama) |
| **4000** | Backend API |
| **1883** | MQTT (ESP32) |
| **8083** | MQTT WebSocket |
| **5432** | PostgreSQL |
| **6379** | Redis |
